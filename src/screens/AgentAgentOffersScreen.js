import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native';
import { Text, Card, Divider, Icon } from 'react-native-elements';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';

export default function AgentAgentOffersScreen() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  const navigation = useNavigation();

  const fetchOffers = async () => {
    try {
      setLoading(true);
      
      // Check if user is an agent
      const isAgent = await checkUserRole('agent');
      if (!isAgent) {
        Alert.alert('Access Denied', 'Only agents can access this page.');
        navigation.navigate('Home');
        return;
      }
      
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      // Check if user is permitted to work (but still show offers)
      if (user?.app_metadata?.permitted_to_work === false) {
        setIsPermittedToWork(false);
      }

      const { data: offers, error } = await supabase
        .from('offers')
        .select(`
          id, 
          status, 
          created_at,
          travel_requests (
            id, 
            start_date,
            end_date,
            adults,
            children,
            countries!travel_requests_request_country_fkey ( country_name ),
            areas ( area_name )
          )
        `)
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching offers:', error);
      } else {
        
        setOffers(offers);
      }
    } catch (error) {
      console.error('Error in fetchOffers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  // Fetch offers when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchOffers();
    }, [])
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOfferOutdated = (startDate) => {
    if (!startDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(startDate) < new Date(today);
  };

  const viewTravelRequestDetails = (requestId, offerId) => {
    navigation.navigate('AgentTravelRequestDetails', {
      requestId: requestId,
      offerId: offerId
     });
  };

  const renderChildrenAges = (children) => {
    if (!children || children.length === 0) return 'No children';
    return children.map(age => age).join(', ');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return '#28a745'; // green
      case 'rejected':
        return '#dc3545'; // red
      case 'viewed':
        return '#17a2b8'; // blue
      case 'not viewed':
        return '#ffc107'; // yellow
      default:
        return '#6c757d'; // gray
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Text h4 style={styles.screenTitle}>My Offers</Text>
      
      {!isPermittedToWork && (
        <Card containerStyle={styles.warningCard}>
          <Text style={styles.warningText}>
            Your account is currently inactive. You can view your existing offers but cannot create new ones.
          </Text>
        </Card>
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : offers.length === 0 ? (
        <Card containerStyle={styles.noOffersCard}>
          <Text style={styles.noOffersText}>You haven't created any offers yet.</Text>
        </Card>
      ) : (
        offers.map((offer) => {
          const outdated = isOfferOutdated(offer.travel_requests?.start_date);
          return (
            <Card 
              key={offer.id} 
              containerStyle={[
                styles.offerCard, 
                outdated && styles.outdatedOfferCard
              ]}
            >
              <View style={styles.offerHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(offer.status) }]}>
                  <Text style={styles.statusText}>{offer.status}</Text>
                </View>
                {outdated && (
                  <View style={styles.outdatedBadge}>
                    <Text style={styles.outdatedText}>Outdated</Text>
                  </View>
                )}
              </View>
              
              <Divider style={styles.divider} />
              
              {offer.travel_requests && (
                <View style={styles.requestDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="map-marker" type="font-awesome" size={16} color={outdated ? "#999" : "#007bff"} />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>Destination: </Text>
                      {offer.travel_requests.countries?.country_name || 'N/A'}, 
                      {offer.travel_requests.areas?.area_name || 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="calendar" type="font-awesome" size={16} color={outdated ? "#999" : "#007bff"} />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>Dates: </Text>
                      {formatDate(offer.travel_requests.start_date)} to {formatDate(offer.travel_requests.end_date)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="users" type="font-awesome" size={16} color={outdated ? "#999" : "#007bff"} />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>People: </Text>
                      {offer.travel_requests.adults} adults,{' '}
                      {offer.travel_requests.children.length} Children
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="clock-o" type="font-awesome" size={16} color={outdated ? "#999" : "#007bff"} />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>Created: </Text>
                      {formatDate(offer.created_at)}
                    </Text>
                  </View>
                </View>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.viewButton, 
                  outdated ? styles.outdatedViewButton : styles.activeViewButton
                ]}
                onPress={() => viewTravelRequestDetails(offer.travel_requests.id, offer.id)}
              >
                <Text style={styles.viewButtonText}>
                  {outdated ? "View Outdated Offer" : "Update Offer"}
                </Text>
                <Icon name="arrow-right" type="font-awesome" size={16} color="#fff" />
              </TouchableOpacity>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  screenTitle: {
    textAlign: 'center',
    marginVertical: 15,
    color: '#333',
  },
  warningCard: {
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
  },
  warningText: {
    color: '#856404',
    textAlign: 'center',
    padding: 5,
  },
  loader: {
    marginTop: 50,
  },
  offerCard: {
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outdatedOfferCard: {
    opacity: 0.8,
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  outdatedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#6c757d',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  outdatedText: {
    color: '#6c757d',
  },
  outdatedLabel: {
    fontWeight: 'bold',
    color: '#6c757d',
  },
  divider: {
    marginVertical: 10,
  },
  requestDetails: {
    marginTop: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  viewButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
  },
  activeViewButton: {
    backgroundColor: '#007bff',
  },
  outdatedViewButton: {
    backgroundColor: '#6c757d',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
  },
  noOffersCard: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  noOffersText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});