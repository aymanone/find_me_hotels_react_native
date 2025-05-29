import React, { useState, useEffect, useRef ,useCallback} from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Button, ButtonGroup, Card, Icon, Badge } from 'react-native-elements';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import supabase from '../config/supabase';
import { checkUserRole } from '../utils/auth';
import { unsubscribeChannels } from '../utils/channelUtils';

export default function ClientTravelRequestList({ navigation }) {
  const [travelRequests, setTravelRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterIndex, setFilterIndex] = useState(0); // 0: Active, 1: All
  const [highlightedRequests, setHighlightedRequests] = useState({});
  const subscriptionRef = useRef([]);

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

  // Fetch travel requests and set up subscription
  // With this useFocusEffect:
useFocusEffect(
  useCallback(() => {
    // When screen comes into focus
    fetchTravelRequests();
    setupSubscription();
    
    // When screen loses focus (cleanup)
    return () => {
      if (subscriptionRef.current.length > 0) {
        unsubscribeChannels(subscriptionRef.current);
        subscriptionRef.current = [];
      }
    };
  }, [filterIndex])
);

  const fetchTravelRequests = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Build query
      let query = supabase
        .from('travel_requests_full')
        .select('id, creator_id, status, offers_number, request_area, request_country, start_date, end_date, area_name, country_name')
        .eq('creator_id', user.id)
        .order('start_date', { ascending: false })
        .order('end_date', { ascending: false });

      // Apply filter if showing only active requests
      if (filterIndex === 0) {
        const today = new Date();
        query = query
          .eq('status', 'active')
          .gte('start_date', today.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTravelRequests(data || []);
    } catch (error) {
      console.error('Error fetching travel requests:', error.message);
      alert('Failed to load travel requests');
    } finally {
      setLoading(false);
    }
  };

  const setupSubscription = async () => {
    try {
      // Clean up previous subscription if exists
      if (subscriptionRef.current.length > 0) {
        unsubscribeChannels(subscriptionRef.current);
        subscriptionRef.current = [];
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to changes
      const travelRequestsChannel = supabase
        .channel('travel_requests_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'travel_requests',
          filter: `creator_id=eq.${user.id}`
        }, (payload) => {
          handleSubscriptionUpdate(payload);
        })
        .subscribe();

      subscriptionRef.current.push(travelRequestsChannel);
    } catch (error) {
      console.error('Error setting up subscription:', error.message);
    }
  };

  const handleSubscriptionUpdate = (payload) => {
    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
      const updatedRequest = payload.new;
      
      // Update the travel requests list
      setTravelRequests(prevRequests => {
        const existingIndex = prevRequests.findIndex(req => req.id === updatedRequest.id);
        
        if (existingIndex >= 0) {
          // Check if offers_number changed
          if (prevRequests[existingIndex].offers_number !== updatedRequest.offers_number) {
            // Highlight this request
            setHighlightedRequests(prev => ({
              ...prev,
              [`${updatedRequest.id}+${updatedRequest.offers_number}+${updatedRequest.status}`]: true
            }));
          }
          
          // Update the request in the array
          const newRequests = [...prevRequests];
          newRequests[existingIndex] = updatedRequest;
          return newRequests;
        } else {
          // Add new request to the array
          return [...prevRequests, updatedRequest];
        }
      });
    } else if (payload.eventType === 'DELETE') {
      // Remove deleted request from the list
      setTravelRequests(prevRequests => 
        prevRequests.filter(req => req.id !== payload.old.id)
      );
    }
  };

  const isRequestActive = (request) => {
    const today = new Date();
    const startDate = new Date(request.start_date);
    return request.status === 'active' && startDate >= today;
  };

  const getCardStyle = (request) => {
    const requestKey = `${request.id}+${request.offers_number}+${request.status}`;
    const isHighlighted = highlightedRequests[requestKey];
    const isActive = isRequestActive(request);

    return {
      ...styles.card,
      borderColor: isHighlighted ? '#FFD700' : isActive ? '#28a745' : '#d0d0d0',
      borderWidth: isHighlighted ? 2 : 1,
      backgroundColor: isActive ? '#ffffff' : '#f8f9fa',
      opacity: isActive ? 1 : 0.7,
    };
  };

  const handleRequestPress = (item) => {
    // Remove highlight when request is focused
    const requestKey = `${item.id}+${item.offers_number}+${item.status}`;
    if (highlightedRequests[requestKey]) {
      setHighlightedRequests(prev => {
        const updated = { ...prev };
        delete updated[requestKey];
        return updated;
      });
    }
    
    // Navigate to details
    navigation.navigate('ClientTravelRequestDetails', { id: item.id });
  };

  const renderTravelRequest = ({ item }) => {
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);
    const requestKey = `${item.id}+${item.offers_number}+${item.status}`;
    const isHighlighted = highlightedRequests[requestKey];
    
    return (
      <TouchableOpacity onPress={() => handleRequestPress(item)}>
        <Card containerStyle={getCardStyle(item)}>
          {/* Destination Row */}
          <View style={styles.row}>
            <Icon name="map-marker" type="font-awesome" size={16} color="#007bff" />
            <Text style={styles.label}>Destination:</Text>
            <Text style={styles.value}>
              {item.country_name}{item.area_name ? `, ${item.area_name}` : ''}
            </Text>
            
            {isHighlighted && (
              <Badge
                value="New Offers"
                status="warning"
                containerStyle={styles.newOffersBadge}
                textStyle={styles.newOffersBadgeText}
              />
            )}
          </View>

          {/* Dates Row */}
          <View style={styles.row}>
            <Icon name="calendar" type="font-awesome" size={16} color="#007bff" />
            <Text style={styles.label}>Dates:</Text>
            <Text style={styles.value}>
              {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
            </Text>
          </View>

          {/* Info Row */}
          <View style={styles.row}>
            <Icon name="info-circle" type="font-awesome" size={16} color="#007bff" />
            <Text style={styles.label}>Status:</Text>
            <Text style={[
              styles.statusText,
              { color: isRequestActive(item) ? '#28a745' : '#6c757d' }
            ]}>
              {item.status.toUpperCase()}
            </Text>
            <Text style={styles.offersText}>
              {item.offers_number} {item.offers_number === 1 ? 'offer' : 'offers'}
            </Text>
            <Icon 
              name="chevron-right" 
              type="font-awesome" 
              size={16} 
              color="#007bff"
              containerStyle={styles.chevronIcon}
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text h4 style={styles.title}>My Travel Requests</Text>
      
      {/* Filter Toggle */}
      <ButtonGroup
        onPress={setFilterIndex}
        selectedIndex={filterIndex}
        buttons={['Active Requests', 'All Requests']}
        containerStyle={styles.filterContainer}
      />
      
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : travelRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No travel requests found</Text>
          <Button
            title="Create New Request"
            onPress={() => navigation.navigate('TravelRequestForm')}
            containerStyle={styles.newRequestButton}
          />
        </View>
      ) : (
        <>
          <FlatList
            data={travelRequests}
            renderItem={renderTravelRequest}
            keyExtractor={item => `${item.id}+${item.offers_number}+${item.status}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
          
          
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  filterContainer: {
    marginBottom: 16,
    height: 40,
  },
  listContainer: {
    paddingBottom: 80, // Space for floating button
  },
  card: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontWeight: 'bold',
    marginLeft: 8,
    marginRight: 4,
  },
  value: {
    flex: 1,
  },
  statusText: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  offersText: {
    backgroundColor: '#007bff',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
  },
  chevronIcon: {
    marginLeft: 'auto',
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  newRequestButton: {
    width: '80%',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  floatingButtonStyle: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  newOffersBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  newOffersBadgeText: {
    fontSize: 10,
  },
});
