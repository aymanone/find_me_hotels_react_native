import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator,TouchableOpacity } from 'react-native';
import { Text, Card, Button, Divider,Icon } from 'react-native-elements';
import { format } from 'date-fns';
import supabase from '../config/supabase';
import { checkUserRole,signOut ,getCurrentUser} from '../utils/auth';

export default function ClientTravelRequestDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
   const [requestSectionExpanded, setRequestSectionExpanded] = useState(false);
   const [offersSectionExpanded, setOffersSectionExpanded] = useState(false);
   const [refreshingOffers, setRefreshingOffers] = useState(false);
  const [visitedOffers, setVisitedOffers] = useState({});  // Using an object
  // Check if user is a client
  useEffect(() => {
    const checkRole = async () => {
      const isClient = await checkUserRole('client');
      if (!isClient) {
        alert('You do not have permission to access this page');
        navigation.goBack();
      }
    };
    
    checkRole();
  }, []);

  // Fetch travel request details and offers
  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        setLoading(true);
         const user= await getCurrentUser();
                if(!user) {
                  Alert.alert('Error', 'User not found. Please log in again.');
                  await signOut(navigation);
                  
                  return;
        
                }
              
        // Fetch travel request
        const { data: requestData, error: requestError } = await supabase
          .from('travel_requests_agent')
          .select('*')
          .eq('id', id)
          .eq('creator_id', user.id)
          .single();

        if (requestError) throw requestError;
        if (!requestData) throw new Error('Travel request not found');
        
        setRequest(requestData);

        // Fetch offers for this request
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('request_id', id)
          .order('created_at', { ascending: false });

        if (offersError) throw offersError;
        setOffers(offersData || []);
      } catch (error) {
        console.error('Error fetching request details:', error.message);
        alert('Failed to load request details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }
    // Modify your existing code where you navigate to offer details
  const viewOfferDetails = (offerId) => {
    // Mark this offer as visited
    setVisitedOffers(prev => ({...prev, [offerId]: true}));
    
    // Navigate to the offer details screen
    navigation.navigate('ClientRequest', {
      screen: 'ClientOfferDetailsScreen',
      params: { offerId }
    });
  };
  const refreshOffers = async () => {
  try {
    setRefreshingOffers(true);
    
    // Get the most recent offer's creation date if we have offers
    let createdAtFilter = '';
    if (offers.length > 0) {
      // Sort offers by created_at to find the most recent one
      const sortedOffers = [...offers].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      createdAtFilter = sortedOffers[0].created_at;
      
      // Fetch only new offers (created after our most recent one)
      const { data: newOffersData, error: newOffersError } = await supabase
        .from('offers')
        .select('*')
        .eq('request_id', id)
        .gt('created_at', createdAtFilter)
        .order('created_at', { ascending: false });
      
      if (newOffersError) throw newOffersError;
      
      // If we have new offers, add them to the existing ones
      if (newOffersData && newOffersData.length > 0) {
        setOffers(prevOffers => [...newOffersData, ...prevOffers]);
        alert(`${newOffersData.length} new offer(s) found!`);
      } else {
        alert('No new offers available');
      }
    } else {
      // If we don't have any offers yet, fetch all offers
      const { data: allOffersData, error: allOffersError } = await supabase
        .from('offers')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: false });
      
      if (allOffersError) throw allOffersError;
      setOffers(allOffersData || []);
      
      if (allOffersData.length === 0) {
        alert('No offers available yet');
      }
    }
  } catch (error) {
    console.error('Error refreshing offers:', error.message);
    alert('Failed to refresh offers');
  } finally {
    setRefreshingOffers(false);
  }
};

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.card}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setRequestSectionExpanded(!requestSectionExpanded)}
        >
          <Text h4 style={styles.sectionTitle}>Request Details</Text>
          <Icon
            name={requestSectionExpanded ? 'chevron-up' : 'chevron-down'}
            type="font-awesome"
            size={18}
            color="#007bff"
          />
        </TouchableOpacity>
         {requestSectionExpanded && (
          <View style={styles.sectionContent}>
            {/* Dates Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(request.start_date), 'MMM dd, yyyy')}
                </Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>End Date</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(request.end_date), 'MMM dd, yyyy')}
                </Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Destinations Row */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>Destination</Text>
                <Text style={styles.infoValue}>{request.country_name}</Text>
                {request.area_name && (
                  <Text style={styles.infoValue}>{request.area_name}</Text>
                )}
              </View>
            </View>
            
            <Divider style={styles.divider} />
             <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>Nationality</Text>
                <Text style={styles.infoValue}>{request.travelers_nationality_name}</Text>
               
              </View>
            </View>
             <Divider style={styles.divider} />
            {/* Travelers Column */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>Travelers</Text>
                <Text style={styles.infoValue}>
                  {request.adults} {request.adults === 1 ? 'Adult' : 'Adults'}
                </Text>
                
              </View>
            </View>
            {request.children && request.children.length > 0 ? (
  <View>
    <Text style={styles.infoValue}>
      {request.children.length} {request.children.length === 1 ? 'Child' : 'Children'}
    </Text>
    <Text style={[styles.infoValue, styles.childrenAges]}>
      Ages: {request.children.join(', ')}
    </Text>
  </View>
) : (
  <Text style={styles.infoValue}>No children</Text>
)}
            <Divider style={styles.divider} />
            
            {/* Hotel Info Column */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>Hotel Information</Text>
                <Text style={styles.infoValue}>
                  {request.hotel_rating} stars
                </Text>
                <Text style={styles.infoValue}>
                  {request.rooms} {request.rooms === 1 ? 'room' : 'rooms'}
                </Text>
                {request.meals && request.meals.length > 0 ? (
                  <Text style={styles.infoValue}>
                    Meals: {request.meals.join(', ')}
                  </Text>
                ) : (
                  <Text style={styles.infoValue}>No meals specified</Text>
                )}
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Budget Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Min Budget</Text>
                <Text style={styles.infoValue}>${request.min_budget}</Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Max Budget</Text>
                <Text style={styles.infoValue}>${request.max_budget}</Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Notes Row */}
            {request.notes && (
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.infoLabel}>Notes</Text>
                  <ScrollView style={styles.notesContainer}>
                    <Text style={styles.notesText}>{request.notes}</Text>
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        )}
  
      </Card>
      <Card containerStyle={styles.card}>
      
  <TouchableOpacity 
    style={styles.sectionHeader}
    onPress={() => setOffersSectionExpanded(!offersSectionExpanded)}
  >
    <Text h4 style={styles.sectionTitle}>Offers ({offers.length})</Text>
    <Icon
      name={offersSectionExpanded ? 'chevron-up' : 'chevron-down'}
      type="font-awesome"
      size={18}
      color="#007bff"
    />
  </TouchableOpacity>
  
  <View style={styles.refreshButtonContainer}>
    <Button
      title={refreshingOffers ? "Loading..." : "Get New Offers"}
      type="outline"
      disabled={refreshingOffers}
      buttonStyle={styles.refreshButton}
      titleStyle={styles.refreshButtonText}
      onPress={refreshOffers}
    />
  </View>

  {offersSectionExpanded && (
    <View style={styles.sectionContent}>
      {offers.length > 0 ? (
        offers.map((offer, index) => (
          <Card key={index} containerStyle={styles.offerCard}>
            <View style={styles.offerHeader}>
              <Text style={styles.offerTitle}>Offer #{index + 1}</Text>
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: offer.status === 'not viewed' ? '#FFA500' : '#28a745' }]}>
                  {offer.status}
                </Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.offerDetailsContainer}>
              <View style={styles.offerDetailRow}>
                <Icon name="cash-outline" type="ionicon" size={16} color="#28a745" />
                <Text style={styles.offerDetailText}>
                  Price Range: ${offer.min_cost} - ${offer.max_cost}
                </Text>
              </View>
              
              <View style={styles.offerDetailRow}>
                <Icon name="star" type="ionicon" size={16} color="#FFD700" />
                <Text style={styles.offerDetailText}>
                  Hotels Rating: {offer.min_rating} - {offer.max_rating} stars
                </Text>
              </View>
              
              <View style={styles.offerDetailRow}>
                <Icon name="business" type="ionicon" size={16} color="#007bff" />
                <Text style={styles.offerDetailText}>
                  Number of Hotels: {offer.num_of_hotels}
                </Text>
              </View>
            </View>
            
            <Button
              title="View Details"
              icon={<Icon name="eye-outline" type="ionicon" color="#fff" size={16} style={styles.buttonIcon} />}
              buttonStyle={[
                    styles.viewDetailsButton,
                    visitedOffers[offer.id] && styles.visitedButton
                  ]}
              onPress={() => viewOfferDetails(offer.id)}
            />
          </Card>
        ))
      ) : (
        <Text style={styles.noOffersText}>No offers yet for this request</Text>
      )}
    </View>
  )}
</Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom:40,
  },
   sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 0,
  },
  sectionContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoColumn: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  childrenAges: {
  flexWrap: 'wrap',
  marginTop: 2,
},
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  divider: {
    marginVertical: 12,
  },
  notesContainer: {
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  offerContainer: {
    marginTop: 10,
  },
  offerText: {
    fontSize: 14,
    marginBottom: 3,
  },
  noOffersText: {
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 10,
  },
  offerCard: {
  borderRadius: 8,
  marginBottom: 15,
  padding: 0,
  overflow: 'hidden',
},
offerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
  backgroundColor: '#f9f9f9',
},
offerTitle: {
  fontSize: 16,
  fontWeight: 'bold',
},
statusContainer: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  backgroundColor: '#f8f9fa',
},
statusText: {
  fontSize: 12,
  fontWeight: 'bold',
},
offerDetailsContainer: {
  padding: 12,
},
offerDetailRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
offerDetailText: {
  marginLeft: 8,
  fontSize: 14,
},
viewDetailsButton: {
  backgroundColor: '#007bff',
  borderRadius: 0,
  marginTop: 8,
},
buttonIcon: {
  marginRight: 8,
},
sectionHeaderWithButton: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  backgroundColor: '#f9f9f9',
},
sectionTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
refreshButtonContainer: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  paddingHorizontal: 16,
  paddingTop: 0,
  paddingBottom: 8,
  backgroundColor: '#f9f9f9',
},
refreshButton: {
  paddingHorizontal: 10,
  height: 36,
  borderColor: '#007bff',
},
refreshButtonText: {
  fontSize: 12,
  color: '#007bff',
},
 visitedButton: {
    backgroundColor: '#6c757d',  // Gray color for visited buttons
  },
});
