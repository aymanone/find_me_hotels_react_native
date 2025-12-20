import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Share, Platform , Dimensions} from 'react-native';
import { Text, Card, Button, Divider, Icon } from 'react-native-elements';
import format from 'date-fns/format';
import supabase from '../config/supabase';
import {inDateReq} from '../utils/dateUtils';
import { checkUserRole, signOut, getCurrentUser } from '../utils/auth';
import { Dropdown } from 'react-native-element-dropdown';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive,breakpoints } from '../styles//theme';
import { useTranslation} from '../config/localization';

export default function ClientTravelRequestDetailsScreen({ route, navigation }) {
  const { t,language } = useTranslation();
  const { id } = route.params;
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestSectionExpanded, setRequestSectionExpanded] = useState(false);
  const [offersSectionExpanded, setOffersSectionExpanded] = useState(false);
  const [refreshingOffers, setRefreshingOffers] = useState(false);
  const [visitedOffers, setVisitedOffers] = useState({});  // Using an object
   const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  
  // Add sort state variables
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' for bigger first
  
  // Sort options data
  const sortFieldOptions = [
    { label: t('ClientTravelRequestDetailsScreen', 'createdDate'), value: 'created_at' },
    { label: t('ClientTravelRequestDetailsScreen', 'updatedDate'), value: 'updated_at' },
    { label: t('ClientTravelRequestDetailsScreen', 'maxCost'), value: 'max_cost' },
    { label: t('ClientTravelRequestDetailsScreen', 'minCost'), value: 'min_cost' },
    { label: t('ClientTravelRequestDetailsScreen', 'maxRating'), value: 'max_rating' },
    { label: t('ClientTravelRequestDetailsScreen', 'minRating'), value: 'min_rating' },
    { label: t('ClientTravelRequestDetailsScreen', 'numberOfHotels'), value: 'num_of_hotels' },
  ];
  
  const sortDirectionOptions = [
    { label: t('ClientTravelRequestDetailsScreen', 'biggerFirst'), value: 'desc' },
    { label: t('ClientTravelRequestDetailsScreen', 'smallerFirst'), value: 'asc' },
  ];
 
  const offerUpToDateState = (offer) => {
    // Check if the offer is new or updated
    if (new Date(offer.updated_at) < new Date(request.updated_at)) {
      return t('ClientTravelRequestDetailsScreen', 'beforeLastUpdate');
    }
    if( offer.new_update) {
      return t('ClientTravelRequestDetailsScreen', 'newUpdates');
    }
    return t('ClientTravelRequestDetailsScreen', 'upToDate');
  };
  
  // Function to sort offers based on current sort settings
  const getSortedOffers = () => {
    if (!offers || offers.length === 0) return [];
    
    return [...offers].sort((a, b) => {
      let valueA, valueB;
      
      // Handle date fields differently
      if (sortField === 'created_at' || sortField === 'updated_at') {
        valueA = new Date(a[sortField]).getTime();
        valueB = new Date(b[sortField]).getTime();
      } else {
        valueA = a[sortField];
        valueB = b[sortField];
      }
      
      // Handle null/undefined values
      if (valueA === null || valueA === undefined) valueA = sortDirection === 'asc' ? Infinity : -Infinity;
      if (valueB === null || valueB === undefined) valueB = sortDirection === 'asc' ? Infinity : -Infinity;
      
      // Sort based on direction
      if (sortDirection === 'asc') {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  };

  // Check if user is a client
  useEffect(() => {
    const checkRole = async () => {
      const isClient = await checkUserRole('client');
      if (!isClient) {
        showAlert(t('ClientTravelRequestDetailsScreen', 'accessDenied'));
        navigation.goBack();
      }
    };

    checkRole();
  }, [id]);
  
  // Fetch travel request details and offers
  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        setLoading(true);
       
        //const user = await getCurrentUser();
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          
          showAlert(t('ClientTravelRequestDetailsScreen', 'error'), t('ClientTravelRequestDetailsScreen', 'userNotFound'));
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
        if (!requestData) throw new Error(t('ClientTravelRequestDetailsScreen', 'requestNotFound'));

        setRequest(requestData);
        

        // Fetch offers for this request
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('request_id', id)
          .order('created_at', { ascending: false });

        if (offersError) throw offersError;
        setOffers(offersData || []);
       if(request && request.new_offers) {
  // Update new_offers field to false
  const { error } = await supabase
    .from('travel_requests')
    .update({ new_offers: false })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating new_offers status:', error);
  }
} 
      
      } catch (error) {
        console.error('Error fetching request details:', error.message);
           showAlert(
      t('ClientTravelRequestDetailsScreen', 'error'), 
      t('ClientTravelRequestDetailsScreen', 'failedLoadRequestDetails'),
      [
        { text: t('ClientTravelRequestDetailsScreen', 'tryAgain'), onPress: () => {
            setTimeout(() => fetchRequestDetails(), 100);
                  } },
        { text: t('ClientTravelRequestDetailsScreen', 'cancel'), style: 'cancel' }
      ]
    );
        return;
      } finally {
        setLoading(false);
 
      }
    };

    fetchRequestDetails();
  }, [id]);
  // Handle window resize for responsive grid
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);
  
  // Helper to calculate grid item width dynamically
  const getGridItemWidth = () => {
    const width = windowDimensions.width;
     if (width < breakpoints.md) {
    return 1; // Mobile: 1 column (< 414px)
  } else if (width < breakpoints.xl) {
    return 2; // Tablet: 2 columns (414px - 1024px)
  } else {
    return 3; // Desktop: 3 columns (> 1024px)
  }
  
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
       <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Modify your existing code where you navigate to offer details
  const viewOfferDetails = (offerId) => {
    // Mark this offer as visited
    setVisitedOffers(prev => ({ ...prev, [offerId]: true }));

    // Navigate to the offer details screen
    navigation.navigate( 'ClientOfferDetails',{ offerId }
    );
  };

  const refreshOffers = async () => {
    try {
      setRefreshingOffers(true);

      // Get the most recent offer's creation date if we have offers
      let updatedAtFilter = '';
      if (offers.length > 0) {
        // Sort offers by created_at to find the most recent one
        const sortedOffers = [...offers].sort((a, b) =>
          new Date(b.updated_at) - new Date(a.updated_at)
        );
        updatedAtFilter = sortedOffers[0].updated_at;

        // Fetch only new offers (created after our most recent one)
        const { data: newOffersData, error: newOffersError } = await supabase
          .from('offers')
          .select(`num_of_hotels,status, min_rating, max_rating, min_cost, max_cost,
    updated_at, created_at, new_update`)
          .eq('request_id', id)
          .gt('updated_at', updatedAtFilter)
          .order('created_at', { ascending: false });

        if (newOffersError) throw newOffersError;

        // If we have new offers, update the existing ones or add new ones
        if (newOffersData && newOffersData.length > 0) {
          setOffers(prevOffers => {
            // Create a map of existing offers by ID for quick lookup
            const existingOffersMap = {};
            prevOffers.forEach(offer => {
              existingOffersMap[offer.id] = true;
            });
            
            // Count how many are updates vs. new offers
            let updateCount = 0;
            let newCount = 0;
            
            // Process each new/updated offer
            const updatedOffers = newOffersData.map(newOffer => {
              if (existingOffersMap[newOffer.id]) {
                updateCount++;
                return newOffer; // This will replace the existing offer
              } else {
                newCount++;
                return newOffer; // This is a completely new offer
              }
            });
            
            // Create a new array with updated offers replacing old ones
            const result = prevOffers.filter(offer => 
              !updatedOffers.some(updatedOffer => updatedOffer.id === offer.id)
            );
            
            // Add all the new/updated offers
            result.push(...updatedOffers);
            
            // Sort by updated_at (newest first)
            result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            
            // Show appropriate message
            if (updateCount > 0 && newCount > 0) {
              showAlert(`${newCount} ${t('ClientTravelRequestDetailsScreen', 'newOffer')}${newCount > 1 ? 's' : ''} ${t('ClientTravelRequestDetailsScreen', 'and')} ${updateCount} ${t('ClientTravelRequestDetailsScreen', 'updatedOffer')}${updateCount > 1 ? 's' : ''} ${t('ClientTravelRequestDetailsScreen', 'found')}!`);
            } else if (updateCount > 0) {
              showAlert(`${updateCount} ${t('ClientTravelRequestDetailsScreen', 'offer')}${updateCount > 1 ? 's' : ''} ${t('ClientTravelRequestDetailsScreen', 'haveBeenUpdated')}!`);
            } else if (newCount > 0) {
              showAlert(`${newCount} ${t('ClientTravelRequestDetailsScreen', 'newOffer')}${newCount > 1 ? 's' : ''} ${t('ClientTravelRequestDetailsScreen', 'found')}!`);
            }
            
            return result;
          });
        } else {
          showAlert(t('ClientTravelRequestDetailsScreen', 'noOffersUpdatesAvailable'));
        }
      } else {
        // If we don't have any offers yet, fetch all offers
        const { data: allOffersData, error: allOffersError } = await supabase
          .from('offers')
          .select(`num_of_hotels,status, min_rating, max_rating, min_cost, max_cost,
    updated_at, created_at, new_update`)
          .eq('request_id', id)
          .order('created_at', { ascending: false });

        if (allOffersError) throw allOffersError;
        setOffers(allOffersData || []);

        if (allOffersData.length === 0) {
          showAlert(t('ClientTravelRequestDetailsScreen', 'noOffersAvailableYet'));
        }
      }
    } catch (error) {
      console.error('Error refreshing offers:', error.message);
      showAlert(t('ClientTravelRequestDetailsScreen', 'failedRefreshOffers'));
    } finally {
      setRefreshingOffers(false);
    }
  };

  const handleDeleteRequest = () => {
    showAlert(
      t('ClientTravelRequestDetailsScreen', 'deleteRequest'),
      t('ClientTravelRequestDetailsScreen', 'areYouSureDeleteRequest'),
      [
        {
          text: t('ClientTravelRequestDetailsScreen', 'cancel'),
          style: "cancel"
        },
        {
          text: t('ClientTravelRequestDetailsScreen', 'delete'),
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete the request from Supabase
              const { error } = await supabase
                .from('travel_requests')
                .delete()
                .eq('id', id);
                
              if (error) throw error;
              
              showAlert(t('ClientTravelRequestDetailsScreen', 'success'), t('ClientTravelRequestDetailsScreen', 'travelRequestDeletedSuccessfully'));
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting travel request:', error.message);
              showAlert(t('ClientTravelRequestDetailsScreen', 'error'), t('ClientTravelRequestDetailsScreen', 'failedDeleteTravelRequest'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  const shareRequest = async () => {
  if (!request) return;
  
  try {
    const requestUrl = `https://alghorfa.net/travel-request/${id}`;
    const simpleText = `${t('ClientTravelRequestDetailsScreen', 'travelRequestLabel')} ${request.country_name}${request.area_name ? `, ${request.area_name}` : ''}
${t('ClientTravelRequestDetailsScreen', 'travelers')}: ${request.adults} ${t('ClientTravelRequestDetailsScreen', 'adults')}${request.children?.length > 0 ? `, ${request.children.length} ${t('ClientTravelRequestDetailsScreen', 'children')}` : ''}
${t('ClientTravelRequestDetailsScreen', 'budgetLabel')} $${request.min_budget} - $${request.max_budget}
${requestUrl}`;
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Share.share({
        message: simpleText,
        title: t('ClientTravelRequestDetailsScreen', 'travelRequestTitle'),
        url: requestUrl,
      });
    } else if (Platform.OS === 'web' && navigator.share) {
      await navigator.share({
        title: t('ClientTravelRequestDetailsScreen', 'travelRequestTitle'),
        text: simpleText,
        url: requestUrl,
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(simpleText);
      showAlert(
        t('ClientTravelRequestDetailsScreen', 'success'), 
        t('ClientTravelRequestDetailsScreen', 'requestCopiedToClipboard')
      );
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error sharing:', error);
      showAlert(
        t('ClientTravelRequestDetailsScreen', 'error'), 
        t('ClientTravelRequestDetailsScreen', 'failedToShareRequest')
      );
    }
  }
};

  return (
    <ScrollView style={styles.container}>
      {/* Action Buttons Row */}
      <View style={styles.actionButtonsContainer}>
     {  inDateReq(request) &&  ( <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            // Navigate to the ClientApp drawer first, then to the Home tab, then to the NewRequest tab
            navigation.navigate(
               'ClientTabs',
              
                {screen: 'NewRequest',
                params: { requestId: id }
              }
            );
          }}
        > 
        <Icon name="edit" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
          <Text style={styles.actionButtonText}>{t('ClientTravelRequestDetailsScreen', 'edit')}</Text>
        </TouchableOpacity>)}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeleteRequest}
        >
         <Icon name="trash" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.error} />
          <Text style={styles.actionButtonText}>{t('ClientTravelRequestDetailsScreen', 'delete')}</Text>
        </TouchableOpacity>
      </View>

      <Card containerStyle={styles.card}>
       <View style={styles.sectionHeaderWithShare}>
  <TouchableOpacity
    style={styles.sectionHeaderTouch}
    onPress={() => setRequestSectionExpanded(!requestSectionExpanded)}
  >
    <Text h4 style={styles.sectionTitle}>{t('ClientTravelRequestDetailsScreen', 'requestDetails')}</Text>
    <Icon
  name={requestSectionExpanded ? 'chevron-up' : 'chevron-down'}
  type="font-awesome"
  size={theme.responsiveComponents.icon.medium}
  color={theme.colors.primary}
/>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={styles.shareButton}
    onPress={shareRequest}
  >
      <Icon 
  name="share-social-outline" 
  type="ionicon" 
  color={theme.colors.primary}
  size={theme.responsiveComponents.icon.large}
  />
  </TouchableOpacity>
</View>
        {requestSectionExpanded && (
          <View style={styles.sectionContent}>
            {/* Dates Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'startDate')}</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(request.start_date), 'MMM dd, yyyy')}
                </Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'endDate')}</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(request.end_date), 'MMM dd, yyyy')}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Destinations Row */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'destination')}</Text>
                <Text style={styles.infoValue}>{request.country_name}</Text>
                {request.area_name && (
                  <Text style={styles.infoValue}>{request.area_name}</Text>
                )}
              </View>
            </View>

            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'nationality')}</Text>
                <Text style={styles.infoValue}>{request.travelers_nationality_name}</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            {/* Travelers Column */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'travelers')}</Text>
                <Text style={styles.infoValue}>
                  {request.adults} {request.adults === 1 ? t('ClientTravelRequestDetailsScreen', 'adult') : t('ClientTravelRequestDetailsScreen', 'adults')}
                </Text>
              </View>
            </View>
            {request.children && request.children.length > 0 ? (
              <View>
                <Text style={styles.infoValue}>
                  {request.children.length} {request.children.length === 1 ? t('ClientTravelRequestDetailsScreen', 'child') : t('ClientTravelRequestDetailsScreen', 'children')}
                </Text>
                <Text style={[styles.infoValue, styles.childrenAges]}>
                  {t('ClientTravelRequestDetailsScreen', 'ages')}: {request.children.join(', ')}
                </Text>
              </View>
            ) : (
              <Text style={styles.infoValue}>{t('ClientTravelRequestDetailsScreen', 'noChildren')}</Text>
            )}
            <Divider style={styles.divider} />

            {/* Hotel Info Column */}
            <View style={styles.infoRow}>
              <View style={styles.fullWidth}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'hotelInformation')}</Text>
                <Text style={styles.infoValue}>
                  {request.hotel_rating} {t('ClientTravelRequestDetailsScreen', 'stars')}
                </Text>
                <Text style={styles.infoValue}>
                  {request.rooms} {request.rooms === 1 ? t('ClientTravelRequestDetailsScreen', 'room') : t('ClientTravelRequestDetailsScreen', 'rooms')}
                </Text>
                {request.meals && request.meals.length > 0 ? (
                  <Text style={styles.infoValue}>
                    {t('ClientTravelRequestDetailsScreen', 'meals')}: {request.meals.join(', ')}
                  </Text>
                ) : (
                  <Text style={styles.infoValue}>{t('ClientTravelRequestDetailsScreen', 'noMealsSpecified')}</Text>
                )}
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Budget Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'minBudget')}</Text>
                <Text style={styles.infoValue}>${request.min_budget}</Text>
              </View>
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'maxBudget')}</Text>
                <Text style={styles.infoValue}>${request.max_budget}</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Notes Row */}
            {request.notes && (
              <View style={styles.infoRow}>
                <View style={styles.fullWidth}>
                  <Text style={styles.infoLabel}>{t('ClientTravelRequestDetailsScreen', 'notes')}</Text>
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
          <Text h4 style={styles.sectionTitle}>{t('ClientTravelRequestDetailsScreen', 'offers')} ({offers.length})</Text>
         <Icon
  name={requestSectionExpanded ? 'chevron-up' : 'chevron-down'}
  type="font-awesome"
  size={theme.responsiveComponents.icon.medium}
  color={theme.colors.primary}
/>
        </TouchableOpacity>

        <View style={styles.refreshButtonContainer}>
          <Button
            title={refreshingOffers ? t('ClientTravelRequestDetailsScreen', 'loading') : t('ClientTravelRequestDetailsScreen', 'refreshOffersBtn')}
            type="outline"
            disabled={refreshingOffers}
            buttonStyle={styles.refreshButton}
            titleStyle={styles.refreshButtonText}
            onPress={refreshOffers}
          />
        </View>

        {offersSectionExpanded && (
          <View style={styles.sectionContent}>
            {/* Add sort options if there are offers */}
            {offers.length > 0 && (
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>{t('ClientTravelRequestDetailsScreen', 'sortBy')}</Text>
                <View style={styles.sortDropdownsContainer}>
                  <Dropdown
                    data={sortFieldOptions}
                    labelField="label"
                    valueField="value"
                    value={sortField}
                    onChange={item => setSortField(item.value)}
                    style={styles.sortDropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    containerStyle={styles.dropdownContainer}
                  />
                  <Dropdown
                    data={sortDirectionOptions}
                    labelField="label"
                    valueField="value"
                    value={sortDirection}
                    onChange={item => setSortDirection(item.value)}
                    style={styles.sortDropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    containerStyle={styles.dropdownContainer}
                  />
                </View>
              </View>
            )}
            
           {offers.length > 0 ? (
  <View style={commonStyles.offerGridContainer}>
    {getSortedOffers().map((offer, index) => (
      <View 
        key={index} 
        style={[
          commonStyles.offerGridItem,
          { width: getGridItemWidth() }
        ]}
      >
        <Card containerStyle={styles.offerCard}>
            <View style={styles.offerHeader}>
                    <Text style={styles.offerTitle}>{t('ClientTravelRequestDetailsScreen', 'offer')} #{index + 1}</Text>
                    <View style={styles.statusContainer}>
                   <Text style={[styles.statusText, { color: offer.status === 'not viewed' ? theme.colors.warning : theme.colors.success }]}>
                        {offerUpToDateState(offer)} {offer.status === 'not viewed' ? t('ClientTravelRequestDetailsScreen', 'notViewed') : t('ClientTravelRequestDetailsScreen', 'viewed')}
                      </Text>
                    </View>
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.offerDetailsContainer}>
                    <View style={styles.offerDetailRow}>
                      <Icon name="cash-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary}  />
                      <Text style={styles.offerDetailText}>
                        {t('ClientTravelRequestDetailsScreen', 'priceRange')}: ${offer.min_cost} - ${offer.max_cost}
                      </Text>
                    </View>

                    <View style={styles.offerDetailRow}>
                      <Icon name="star" type="ionicon" size={theme.responsiveComponents.icon.small} color="#FFD700" />
                      <Text style={styles.offerDetailText}>
                        {t('ClientTravelRequestDetailsScreen', 'hotelsRating')}: {offer.min_rating} - {offer.max_rating} {t('ClientTravelRequestDetailsScreen', 'stars')}
                      </Text>
                    </View>

                    <View style={styles.offerDetailRow}>
                      <Icon name="business" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary}/>
                      <Text style={styles.offerDetailText}>
                        {t('ClientTravelRequestDetailsScreen', 'numHotels')}: {offer.num_of_hotels}
                      </Text>
                    </View>
                  </View>

                  <Button
                    title={t('ClientTravelRequestDetailsScreen', 'viewDetails')}
                  icon={<Icon name="eye-outline" type="ionicon" color={theme.colors.textWhite} size={theme.responsiveComponents.icon.small}  />}
                    buttonStyle={[
                      styles.viewDetailsButton,
                      visitedOffers[offer.id] && styles.visitedButton
                    ]}
                    iconContainerStyle={styles.buttonIcon}
                    onPress={() => viewOfferDetails(offer.id)}
                  />
        </Card>
      </View>
    ))}
  </View>
) : (
  <Text style={styles.noOffersText}>...</Text>
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
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  card: {
    padding: theme.responsiveSpacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
    marginBottom: theme.responsiveSpacing.md,
    marginHorizontal: theme.responsiveSpacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.responsiveSpacing.lg,
    backgroundColor: theme.colors.backgroundGray,
  },
  sectionTitle: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    margin: 0,
    color: theme.colors.text,
  },
  sectionContent: {
    padding: theme.responsiveSpacing.lg,
  },
  infoRow: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: theme.responsiveSpacing.md,
  },
  infoColumn: {
    flex: 1,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  fullWidth: {
    width: '100%',
  },
  childrenAges: {
    flexWrap: 'wrap',
    marginTop: 2,
  },
  infoLabel: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  infoValue: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
    marginBottom: 2,
  },
  divider: {
    marginVertical: theme.responsiveSpacing.md,
    backgroundColor: theme.colors.borderLight,
  },
  notesContainer: {
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.responsiveSpacing.sm,
    backgroundColor: theme.colors.backgroundWhite,
  },
  notesText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
  },
  noOffersText: {
    fontSize: theme.responsiveTypography.fontSize.md,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
    marginTop: theme.responsiveSpacing.md,
    textAlign: 'center',
  },
  offerCard: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.responsiveSpacing.md,
    padding: 0,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  offerHeader: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: screenSize.isXSmall ? 'flex-start' : 'center',
    padding: theme.responsiveSpacing.md,
    backgroundColor: theme.colors.backgroundGray,
  },
  offerTitle: {
    fontSize: theme.responsiveTypography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: screenSize.isXSmall ? theme.spacing.xs : 0,
  },
  statusContainer: {
    paddingHorizontal: theme.responsiveSpacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundWhite,
  },
  statusText: {
    fontSize: theme.responsiveTypography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  offerDetailsContainer: {
    padding: theme.responsiveSpacing.md,
  },
  offerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  offerDetailText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
  },
  viewDetailsButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 0,
    marginTop: theme.spacing.sm,
  },
  buttonIcon: {
    marginRight: theme.spacing.sm,
  },
  refreshButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.responsiveSpacing.lg,
    paddingTop: 0,
    paddingBottom: theme.responsiveSpacing.sm,
    backgroundColor: theme.colors.backgroundGray,
  },
  refreshButton: {
    paddingHorizontal: theme.responsiveSpacing.sm,
    height: responsive(32, 36, 36, 36, 36),
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  refreshButtonText: {
    fontSize: theme.responsiveTypography.fontSize.xs,
    color: theme.colors.primary,
  },
  visitedButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.responsiveSpacing.md,
    paddingVertical: theme.responsiveSpacing.sm,
    backgroundColor: theme.colors.backgroundWhite,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive(6, 8, 8, 8, 8),
    paddingHorizontal: responsive(8, 12, 12, 12, 12),
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.xs,
  },
  editButton: {
    backgroundColor: theme.colors.backgroundGray,
    borderColor: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: theme.colors.backgroundGray,
    borderColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    marginLeft: theme.spacing.xs,
    color: theme.colors.text,
  },
  sortContainer: {
    marginBottom: theme.responsiveSpacing.md,
    padding: theme.responsiveSpacing.sm,
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: theme.borderRadius.md,
  },
  sortLabel: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.responsiveSpacing.sm,
    color: theme.colors.text,
  },
  sortDropdownsContainer: {
    flexDirection: screenSize.isXSmall ? 'column' : 'row',
    justifyContent: 'space-between',
  },
  sortDropdown: {
    width: screenSize.isXSmall ? '100%' : '48%',
    height: responsive(38, 40, 40, 40, 40),
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.responsiveSpacing.sm,
    backgroundColor: theme.colors.backgroundWhite,
    marginBottom: screenSize.isXSmall ? theme.spacing.sm : 0,
  },
  dropdownPlaceholder: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textLight,
  },
  dropdownSelectedText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.text,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.backgroundWhite,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHeaderWithShare: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.responsiveSpacing.lg,
    backgroundColor: theme.colors.backgroundGray,
  },
  sectionHeaderTouch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  shareButton: {
    padding: theme.responsiveSpacing.sm,
    marginLeft: theme.spacing.sm,
  },
});

