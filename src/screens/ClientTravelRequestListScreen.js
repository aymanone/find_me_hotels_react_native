import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Dimensions} from 'react-native';
import { Text, Button, ButtonGroup, Card, Icon, Badge } from 'react-native-elements';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import supabase from '../config/supabase';
import { checkUserRole, signOut, getCurrentUser } from '../utils/auth';
import { unsubscribeChannels } from '../utils/channelUtils';
import {earliestDate} from '../utils/dateUtils'; // Import earliestDate function
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive,breakpoints } from '../styles//theme';
import { useTranslation } from '../config/localization';

export default function ClientTravelRequestList({ navigation }) {
  const { t , language} = useTranslation();
  const [travelRequests, setTravelRequests] = useState([]);
  const [allTravelRequests, setAllTravelRequests] = useState([]); // Store all requests
  const [filteredRequests, setFilteredRequests] = useState([]); // Store filtered requests
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh
  const [filterIndex, setFilterIndex] = useState(0); // 0: Active, 1: All
  const [highlightedRequests, setHighlightedRequests] = useState({});
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const subscriptionRef = useRef([]);

  // Check if user is a client
  useEffect(() => {
    const checkRole = async () => {
      const isClient = await checkUserRole('client');
      if (!isClient) {
        showAlert(t('ClientTravelRequestListScreen', 'accessDenied'));
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
     
    };
  }, [])
);
// Handle window resize for responsive grid
useEffect(() => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    setWindowDimensions(window);
  });

  return () => subscription?.remove();
}, []);
// Helper to calculate number of columns based on screen width
const getNumColumns = () => {
  const width = windowDimensions.width;
   if (width < breakpoints.md) {
    return 1; // Mobile: 1 column
  } else if (width < breakpoints.xl) {
    return 2; // Tablet: 2 columns
  } else {
    return 3; // Desktop: 3 columns
  }
};

const numColumns = getNumColumns();
// Calculate card width as percentage based on number of columns
const getCardWidthPercentage = () => {
  if (numColumns === 1) return '100%';
  if (numColumns === 2) return '48%';  // Leaves 4% for spacing
  return '32%';  // Leaves 4% for spacing (3 columns)
};
const fetchTravelRequests = async () => {
  try {
    setLoading(true);
    
    // Get current user
     const user= await getCurrentUser();
            if(!user) {
              showAlert(t('ClientTravelRequestListScreen', 'error'), t('ClientTravelRequestListScreen', 'userNotFound'));
              await signOut(navigation);
              
              return;
            }
            
            

    // Build query for ALL travel requests (no filtering here)
    let query = supabase
      .from('travel_requests')
      .select('id, creator_id, status, offers_number, request_area, request_country, start_date, end_date, new_offers')
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
    showAlert(t('ClientTravelRequestListScreen', 'loadError'));
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
  borderColor: isHighlighted ? '#FFD700' : isActive ? theme.colors.success : theme.colors.border,
  borderWidth: isHighlighted ? 2 : 1,
  backgroundColor: isActive ? theme.colors.backgroundWhite : theme.colors.backgroundGray,
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
    showAlert(
      t('ClientTravelRequestListScreen', 'deleteRequest'),
      t('ClientTravelRequestListScreen', 'deleteConfirm'),
      [
        {
          text: t('ClientTravelRequestListScreen', 'cancel'),
          style: "cancel"
        },
        {
          text: t('ClientTravelRequestListScreen', 'delete'),
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
              
              showAlert(t('ClientTravelRequestListScreen', 'success'), t('ClientTravelRequestListScreen', 'deleteSuccess'));
            } catch (error) {
              console.error('Error deleting travel request:', error.message);
              showAlert(t('ClientTravelRequestListScreen', 'error'), t('ClientTravelRequestListScreen', 'deleteError'));
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
        <View style={{ width: getCardWidthPercentage() }}>
    <TouchableOpacity onPress={() => handleRequestPress(item)}>
      <Card containerStyle={getCardStyle(item)}>
        {/* Card Header with Delete Button */}
        <View style={styles.cardHeader}>
          {/* New Offers Indicator - only show if there are new offers */}
          {item.new_offers && (
            <View style={styles.newOffersIndicator}>
             <Icon name="bell" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.textWhite} />
              <Text style={styles.newOffersText}>{t('ClientTravelRequestListScreen', 'newOffers')}</Text>
            </View>
          )}
          
          {/* Delete Button - always at the right */}
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering the card's onPress
              handleDeleteRequest(item.id);
            }}
            style={styles.deleteButton}
          >
           <Icon name="trash" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
        
        {/* Destination Row */}
        <View style={styles.row}>
         <Icon name="map-marker" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
          <Text style={styles.label}>{t('ClientTravelRequestListScreen', 'destination')}:</Text>
          <Text style={styles.value}>
            {item.country_name}{item.area_name ? `, ${item.area_name}` : ''}
          </Text>
        </View>

        {/* Dates Row */}
        <View style={styles.row}>
         <Icon name="calendar" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
          <Text style={styles.label}>{t('ClientTravelRequestListScreen', 'dates')}:</Text>
          <Text style={styles.value}>
            {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
          </Text>
        </View>

        {/* Info Row */}
        <View style={styles.row}>
        <Icon name="info-circle" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
          <Text style={styles.label}>{t('ClientTravelRequestListScreen', 'status')}:</Text>
         <Text style={[
          styles.statusText,
             { color: isRequestActive(item) ? theme.colors.success : theme.colors.textSecondary }
            ]}>
            {item.status.toUpperCase()}
          </Text>
          <Text style={styles.offersText}>
            {item.offers_number} {item.offers_number === 1 ? t('ClientTravelRequestListScreen', 'offer') : t('ClientTravelRequestListScreen', 'offers')}
          </Text>
          <Icon 
            name="chevron-right" 
            type="font-awesome" 
            size={theme.responsiveComponents.icon.small} 
            color={theme.colors.primary}
            containerStyle={styles.chevronIcon}
          />
        </View>
      </Card>
    </TouchableOpacity>
    </View>
  );
  
  };

  // Add this new function for manual refresh
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchTravelRequests();
      showAlert(t('ClientTravelRequestListScreen', 'success'), t('ClientTravelRequestListScreen', 'refreshSuccess'));
    } catch (error) {
      console.error('Error refreshing travel requests:', error);
      showAlert(t('ClientTravelRequestListScreen', 'error'), t('ClientTravelRequestListScreen', 'refreshError'));
    } finally {
      setRefreshing(false);
    }
  };

  // Modify your return statement to include the refresh button
  return (
    <View style={styles.container}>
      <Text h4 style={styles.title}>{t('ClientTravelRequestListScreen', 'title')}</Text>
      
      {/* Filter Toggle */}
      <ButtonGroup
        onPress={setFilterIndex}
        selectedIndex={filterIndex}
        buttons={[t('ClientTravelRequestListScreen', 'activeRequests'), t('ClientTravelRequestListScreen', 'allRequests')]}
        containerStyle={styles.filterContainer}
      />
      
      {/* Add refresh button */}
      <Button
        title={refreshing ? t('ClientTravelRequestListScreen', 'refreshing') : t('ClientTravelRequestListScreen', 'refreshRequests')}
        type="outline"
        disabled={refreshing || loading}
        buttonStyle={styles.refreshButton}
        titleStyle={styles.refreshButtonText}
        onPress={handleRefresh}
        icon={
          <Icon 
            name="refresh" 
            type="font-awesome" 
            size={theme.responsiveComponents.icon.small} 
           color={theme.colors.primary} 
           containerStyle={{marginRight: theme.spacing.sm}}
          />
        }
      />
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('ClientTravelRequestListScreen', 'noRequests')}</Text>
          <Button
            title={t('ClientTravelRequestListScreen', 'createNewRequest')}
            onPress={() => navigation.navigate('TravelRequestForm')}
            containerStyle={styles.newRequestButton}
          />
        </View>
      ) : (
       <FlatList
    data={filteredRequests}
    renderItem={renderTravelRequest}
    keyExtractor={item => `${item.id}+${item.offers_number}+${item.status}`}
    contentContainerStyle={styles.listContainer}
    showsVerticalScrollIndicator={false}
    numColumns={numColumns}
    key={numColumns}
    columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : null}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        colors={[theme.colors.primary]}
      />
    }
  />
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.responsiveSpacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.responsiveSpacing.lg,
    fontSize: theme.responsiveTypography.fontSize.xl,
    color: theme.colors.text,
  },
  filterContainer: {
    marginBottom: theme.responsiveSpacing.lg,
    height: responsive(36, 40, 40, 40, 40),
  },
  listContainer: {
    paddingBottom: 80,
  },
  card: {
  borderRadius: theme.borderRadius.md,
  marginBottom: theme.responsiveSpacing.md,
  padding: theme.responsiveSpacing.md,
  width: '100%', // Take full width of the wrapper View
  margin: 0, // Remove any default margins
  ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  label: {
    fontWeight: theme.typography.fontWeight.bold,
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.xs,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
  },
  value: {
    flex: 1,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
  },
  statusText: {
    fontWeight: theme.typography.fontWeight.bold,
    marginRight: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.sm,
  },
  offersText: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.textWhite,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.responsiveTypography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
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
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.responsiveSpacing.lg,
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
    fontSize: theme.typography.fontSize.xs,
  },
  deleteButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.backgroundGray,
    marginLeft: 'auto',
    borderRadius: theme.borderRadius.sm,
  },
  refreshButton: {
    marginBottom: theme.responsiveSpacing.lg,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  refreshButtonText: {
    color: theme.colors.primary,
    fontSize: theme.responsiveTypography.fontSize.sm,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  newOffersIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
  },
  newOffersText: {
    color: theme.colors.textWhite,
    marginLeft: theme.spacing.xs,
    fontSize: theme.responsiveTypography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  spacer: {
    flex: 1,
  },
  columnWrapper: {
  justifyContent: 'flex-start',
  gap: theme.spacing.sm,
},
});

