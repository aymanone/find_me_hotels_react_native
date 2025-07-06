import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Text, Button, ButtonGroup, Card, Icon, Badge } from 'react-native-elements';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import supabase from '../config/supabase';
import { checkUserRole, signOut, getCurrentUser } from '../utils/auth';
import { unsubscribeChannels } from '../utils/channelUtils';
import {earliestDate} from '../utils/dateUtils'; // Import earliestDate function

export default function ClientTravelRequestList({ navigation }) {
  const [travelRequests, setTravelRequests] = useState([]);
  const [allTravelRequests, setAllTravelRequests] = useState([]); // Store all requests
  const [filteredRequests, setFilteredRequests] = useState([]); // Store filtered requests
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh
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
  // Apply filter when filterIndex changes or allTravelRequests updates
useEffect(() => {
  if (filterIndex === 0) {
    // Filter for active requests
    
    const todayBeginning = earliestDate(); // Get today's date at the start of the day
    setFilteredRequests(
      allTravelRequests.filter(
        request => 
          request.status === 'active' && 
          new Date(request.start_date) >= todayBeginning
      )
    );
  } else {
    // Show all requests
    setFilteredRequests(allTravelRequests);
  }
}, [filterIndex, allTravelRequests]);

  // Fetch travel requests and set up subscription
  // With this useFocusEffect:
useFocusEffect(
  useCallback(() => {
    // When screen comes into focus
    fetchTravelRequests();
    
    
    // When screen loses focus (cleanup)
    return () => {
      if (subscriptionRef.current.length > 0) {
        unsubscribeChannels(subscriptionRef.current);
        subscriptionRef.current = [];
      }
    };
  }, [])
);
const fetchTravelRequests = async () => {
  try {
    setLoading(true);
    
    // Get current user
     const user= await getCurrentUser();
            if(!user) {
              Alert.alert('Error', 'User not found. Please log in again.');
              await signOut(navigation);
              
              return;
            }
            
            

    // Build query for ALL travel requests (no filtering here)
    let query = supabase
      .from('travel_requests')
      .select('id, creator_id, status, offers_number, request_area, request_country, start_date, end_date')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    const { data: requestsData, error } = await query;
    if (error) throw error;
    
    if (requestsData && requestsData.length > 0) {
      // Extract unique country IDs and area IDs
      const countryIds = [...new Set(requestsData.map(req => req.request_country))];
      const areaIds = [...new Set(requestsData.map(req => req.request_area).filter(Boolean))];
      
      // Fetch countries in a single query
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, country_name')
        .in('id', countryIds);
      
      if (countriesError) throw countriesError;
      
      // Fetch areas in a single query
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, area_name')
        .in('id', areaIds);
      
      if (areasError) throw areasError;
      
      // Create lookup maps
      const countryMap = countriesData.reduce((map, country) => {
        map[country.id] = country.country_name;
        return map;
      }, {});
      
      const areaMap = areasData.reduce((map, area) => {
        map[area.id] = area.area_name;
        return map;
      }, {});
      
      // Combine data
      const combinedData = requestsData.map(request => ({
        ...request,
        country_name: countryMap[request.request_country] || 'Unknown',
        area_name: request.request_area ? areaMap[request.request_area] || 'Unknown' : null
      }));
      
      setAllTravelRequests(combinedData);
      // Filtered requests will be set by the useEffect
    } else {
      setAllTravelRequests([]);
      // Filtered requests will be set by the useEffect
    }
  } catch (error) {
    console.error('Error fetching travel requests:', error.message);
    alert('Failed to load travel requests');
  } finally {
    setLoading(false);
  }
};
 

  const isRequestActive = (request) => {
    const today = new Date();
    const todayBeginning=new Date(today.setHours(0, 0, 0, 0)); // Set to start of the day
    const startDate = new Date(request.start_date);
    return request.status === 'active' && startDate >= todayBeginning;
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
    navigation.navigate('ClientTravelRequestDetails', { id: item.id }
  );
  };

  const handleDeleteRequest = async (requestId) => {
    Alert.alert(
      "Delete Request",
      "Are you sure you want to delete this travel request?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete the request from Supabase
              const { error } = await supabase
                .from('travel_requests')
                .delete()
                .eq('id', requestId);
                
              if (error) throw error;
              
              // Remove the request from local state
              setAllTravelRequests(prev => 
                prev.filter(request => request.id !== requestId)
              );
              
              Alert.alert("Success", "Travel request deleted successfully");
            } catch (error) {
              console.error('Error deleting travel request:', error.message);
              Alert.alert("Error", "Failed to delete travel request. Please try again.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderTravelRequest = ({ item }) => {
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);
    const requestKey = `${item.id}+${item.offers_number}+${item.status}`;
    const isHighlighted = highlightedRequests[requestKey];
    
    return (
      <TouchableOpacity onPress={() => handleRequestPress(item)}>
        <Card containerStyle={getCardStyle(item)}>
          {/* Delete Button Row */}
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation(); // Prevent triggering the card's onPress
                handleDeleteRequest(item.id);
              }}
              style={styles.deleteButton}
            >
              <Icon name="trash" type="font-awesome" size={16} color="#dc3545" />
            </TouchableOpacity>
          </View>
          
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

  // Add this new function for manual refresh
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchTravelRequests();
      Alert.alert("Success", "Travel requests refreshed successfully");
    } catch (error) {
      console.error('Error refreshing travel requests:', error);
      Alert.alert("Error", "Failed to refresh travel requests");
    } finally {
      setRefreshing(false);
    }
  };

  // Modify your return statement to include the refresh button
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
      
      {/* Add refresh button */}
      <Button
        title={refreshing ? "Refreshing..." : "Refresh Requests"}
        type="outline"
        disabled={refreshing || loading}
        buttonStyle={styles.refreshButton}
        titleStyle={styles.refreshButtonText}
        onPress={handleRefresh}
        icon={
          <Icon 
            name="refresh" 
            type="font-awesome" 
            size={16} 
            color="#007bff" 
            containerStyle={{marginRight: 8}}
          />
        }
      />
      
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : filteredRequests.length === 0 ? (
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
            data={filteredRequests}
            renderItem={renderTravelRequest}
            keyExtractor={item => `${item.id}+${item.offers_number}+${item.status}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#007bff"]}
              />
            }
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
  deleteButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    
  },
  deleteButton: {
    padding: 3,
    backgroundColor: '#f8f9fa',
    
    
  },
  refreshButton: {
    marginBottom: 16,
    borderColor: '#007bff',
    borderRadius: 8,
    padding: 8,
  },
  refreshButtonText: {
    color: '#007bff',
    fontSize: 14,
  },
});
