import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  
} from 'react-native';
import { Text, Card, Divider, Icon } from 'react-native-elements';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';

import { theme, commonStyles, screenSize, responsive ,breakpoints} from '../styles//theme';
import {showAlert} from "../components/ShowAlert";
import { useTranslation} from '../config/localization';

export default function AgentAgentOffersScreen() {
  const { t,language } = useTranslation();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const fetchOffers = async () => {
    try {
      setLoading(true);
      
      // Check if user is an agent
      const isAgent = await checkUserRole('agent');
      if (!isAgent) {
        showAlert(t('AgentAgentOffersScreen', 'accessDenied'), t('AgentAgentOffersScreen', 'onlyAgentsAccess'));
        navigation.navigate('Home');
        return;
      }
      
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('AgentAgentOffersScreen', 'error'), t('AgentAgentOffersScreen', 'userNotFound'));
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
          updated_at,
          travel_requests (
            id, 
            updated_at,
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

  const formatDate = (dateString) => {
    if (!dateString) return t('AgentAgentOffersScreen', 'na');
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
 const activeOfferState=(reqUpdated , offerUpdated)=>{
         const reqDate=new Date(reqUpdated);
         const offerDate=new Date(offerUpdated);
        if(reqDate > offerDate){return t('AgentAgentOffersScreen', 'needsUpdating');}
        return t('AgentAgentOffersScreen', 'viewOffer');
};
  const viewTravelRequestDetails = (requestId, offerId) => {
    navigation.navigate('AgentTravelRequestDetails', {
      requestId: requestId,
      offerId: offerId
     });
  };

  const renderChildrenAges = (children) => {
    if (!children || children.length === 0) return t('AgentAgentOffersScreen', 'noChildren');
    return children.map(age => age).join(', ');
  };

const getStatusColor = (status) => {
  switch (status) {
    case 'accepted':
      return theme.colors.success;
    case 'rejected':
      return theme.colors.error;
    case 'viewed':
      return theme.colors.statusViewed;
    case 'not viewed':
      return theme.colors.statusNotViewed;
    default:
      return theme.colors.outdated;
  }
};

  const getStatusText = (status) => {
    return t('AgentAgentOffersScreen', status.replace(' ', ''));
  };

  return (
    <>
    <ScrollView 
      style={styles.container}
      ref={scrollViewRef} 
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Text h4 style={styles.screenTitle}>{t('AgentAgentOffersScreen', 'title')}</Text>
      
      {!isPermittedToWork && (
        <Card containerStyle={styles.warningCard}>
          <Text style={styles.warningText}>
            {t('AgentAgentOffersScreen', 'accountInactiveWarning')}
          </Text>
        </Card>
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : offers.length === 0 ? (
        <Card containerStyle={styles.noOffersCard}>
          <Text style={styles.noOffersText}>{t('AgentAgentOffersScreen', 'noOffersYet')}</Text>
        </Card>
      ) : (
       <View style={commonStyles.offerGridContainer}>
        {offers.map((offer) => {
          const outdated = isOfferOutdated(offer.travel_requests?.start_date);
          return (
           <View 
          key={offer.id}
          style={[
            commonStyles.offerGridItem,
            { width: getGridItemWidth() }
          ]}
        >
            <Card 
              key={offer.id} 
              containerStyle={[
                styles.offerCard, 
                outdated && styles.outdatedOfferCard
              ]}
            >
              <View style={styles.offerHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(offer.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(offer.status)}</Text>
                </View>
                {outdated && (
                  <View style={styles.outdatedBadge}>
                    <Text style={styles.statusText}>{t('AgentAgentOffersScreen', 'outdated')}</Text>
                  </View>
                )}
              </View>
              
              <Divider style={styles.divider} />
              
              {offer.travel_requests && (
                <View style={styles.requestDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="map-marker" type="font-awesome" size={theme.responsiveComponents.icon.small} color={outdated ? theme.colors.outdatedText : theme.colors.primary}  />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>{t('AgentAgentOffersScreen', 'destination')}</Text>
                      {offer.travel_requests.countries?.country_name || t('AgentAgentOffersScreen', 'na')}, 
                      {offer.travel_requests.areas?.area_name || t('AgentAgentOffersScreen', 'na')}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="calendar" type="font-awesome" size={theme.responsiveComponents.icon.small} color={outdated ? theme.colors.outdatedText : theme.colors.primary} />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>{t('AgentAgentOffersScreen', 'dates')}</Text>
                      {formatDate(offer.travel_requests.start_date)} to {formatDate(offer.travel_requests.end_date)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="users" type="font-awesome" size={theme.responsiveComponents.icon.small} color={outdated ? theme.colors.outdatedText : theme.colors.primary}  />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>{t('AgentAgentOffersScreen', 'people')}</Text>
                      {offer.travel_requests.adults} {t('AgentAgentOffersScreen', 'adults')},{' '}
                      {offer.travel_requests.children.length} {t('AgentAgentOffersScreen', 'children')}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Icon name="clock-o" type="font-awesome" size={theme.responsiveComponents.icon.small} color={outdated ? theme.colors.outdatedText : theme.colors.primary} />
                    <Text style={[styles.detailText, outdated && styles.outdatedText]}>
                      <Text style={[styles.detailLabel, outdated && styles.outdatedLabel]}>{t('AgentAgentOffersScreen', 'created')}</Text>
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
                  {outdated ? t('AgentAgentOffersScreen', 'viewOutdatedOffer') : activeOfferState(offer.travel_requests.updated_at, offer.updated_at)}
                </Text>
                <Icon name="arrow-right" type="font-awesome" size={theme.responsiveComponents.icon.small} color={theme.colors.textWhite} />
              </TouchableOpacity>
            </Card>
            </View>
          );
        })}
        </View>
      )}
    </ScrollView>
    {offers.length > 0 && (
      <TouchableOpacity
        style={styles.scrollToTopButton}
        onPress={() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }}
      >
        <Icon 
          name="arrow-up" 
          type="font-awesome" 
          size={theme.responsiveComponents.icon.medium} 
          color={theme.colors.textWhite} 
        />
      </TouchableOpacity>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
  },
  screenTitle: {
    textAlign: 'center',
    marginVertical: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  warningCard: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.warningLight,
    borderColor: theme.colors.accentLight,
  },
  warningText: {
    color: theme.colors.warning,
    textAlign: 'center',
    padding: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
  },
  loader: {
    marginTop: theme.spacing.xxxl,
  },
  offerCard: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  outdatedOfferCard: {
    opacity: 0.8,
    backgroundColor: theme.colors.outdatedBackground,
    borderColor: theme.colors.outdatedBorder,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  offerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.components.statusBadge.paddingHorizontal,
    paddingVertical: theme.components.statusBadge.paddingVertical,
    borderRadius: theme.components.statusBadge.borderRadius,
  },
  outdatedBadge: {
    paddingHorizontal: theme.components.statusBadge.paddingHorizontal,
    paddingVertical: theme.components.statusBadge.paddingVertical,
    borderRadius: theme.components.statusBadge.borderRadius,
    backgroundColor: theme.colors.outdated,
  },
  statusText: {
    color: theme.colors.textWhite,
    fontSize: theme.components.statusBadge.fontSize,
    fontWeight: theme.components.statusBadge.fontWeight,
  },
  outdatedText: {
    color: theme.colors.outdated,
  },
  outdatedLabel: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.outdated,
  },
  divider: {
    marginVertical: theme.spacing.sm,
  },
  requestDetails: {
    marginTop: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  detailText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
  },
  detailLabel: {
    fontWeight: theme.typography.fontWeight.bold,
  },
  viewButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
  },
  activeViewButton: {
    backgroundColor: theme.colors.primary,
  },
  outdatedViewButton: {
    backgroundColor: theme.colors.outdated,
  },
  viewButtonText: {
    color: theme.colors.textWhite,
    fontWeight: theme.typography.fontWeight.bold,
    marginRight: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
  },
  noOffersCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  noOffersText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scrollToTopButton: {
  position: 'absolute',
  bottom: 5,
  right: 20,
  backgroundColor: theme.colors.primary,
  width: responsive(35, 40, 40, 40, 40),
  height: responsive(35, 40, 40, 40, 40),
  borderRadius: 25,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
  ...theme.shadows.lg,
},
});