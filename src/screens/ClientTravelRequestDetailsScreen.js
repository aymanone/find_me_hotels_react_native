import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator,TouchableOpacity } from 'react-native';
import { Text, Card, Button, Divider,Icon } from 'react-native-elements';
import { format } from 'date-fns';
import supabase from '../config/supabase';
import { checkUserRole } from '../utils/auth';

export default function ClientTravelRequestDetailsScreen({ route, navigation }) {
  const { id } = route.params;
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
   const [requestSectionExpanded, setRequestSectionExpanded] = useState(true);
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
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

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
      
        <Text h4>Offers</Text>
        {offers.length > 0 ? (
          offers.map((offer, index) => (
            <View key={index} style={styles.offerContainer}>
              <Text style={styles.offerText}>Provider: {offer.provider_name}</Text>
              <Text style={styles.offerText}>Price: ${offer.price}</Text>
              <Text style={styles.offerText}>Details: {offer.details}</Text>
              <Divider style={{ marginVertical: 5 }} />
            </View>
          ))
        ) : (
          <Text style={styles.noOffersText}>No offers yet</Text>
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
});
