import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
   Dimensions,
  
} from 'react-native';
import { Text, Card, Button, Icon, Badge } from 'react-native-elements';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { format } from 'date-fns';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';

const AgentUpdatedRequestsScreen = ({ navigation }) => {
  const { t,language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [updatedRequests, setUpdatedRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));

  const fetchUpdatedRequests = async () => {
    try {
      setLoading(true);
      
              // Check if user is an agent
        const isAgent = await checkUserRole('agent');
        if (!isAgent) {
          showAlert(t('Alerts', 'accessDenied'), t('AgentUpdatedRequestsScreen', 'accessDenied'));
          navigation.goBack();
          return;
        }
      
              // Get current user
        const user = await getCurrentUser();
        if (!user) {
          showAlert(t('Alerts', 'error'), t('AgentUpdatedRequestsScreen', 'userNotFound'));
          await signOut(navigation);
          return;
        }
      
      // Fetch updated requests using RPC function
      // Note: Changed parameter name from 'agent_id' to 'agent' based on error logs
      const { data, error } = await supabase.rpc('agent_updated_requests_details', {
        agent: user.id
      });
      
      if (error) throw error;
      
      setUpdatedRequests(data || []);
          } catch (error) {
        console.error('Error fetching updated requests:', error);
        showAlert(t('Alerts', 'error'), t('AgentUpdatedRequestsScreen', 'loadError'));
      } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUpdatedRequests();
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
  
  if (width < 768) {
    return '100%';           // 1 column - mobile/tablet portrait
  } else if (width < 1200) {
    return '48%';            // 2 columns - tablet landscape/small desktop
  } else {
    return '32%';            // 3 columns - desktop
  }
};
  const onRefresh = () => {
    setRefreshing(true);
    fetchUpdatedRequests();
  };

  const handleViewRequest = (requestId, offerId) => {
    navigation.navigate("Home",{screen:'AgentTravelRequestDetails',params: { requestId, offerId }});
   
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with count */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{t('AgentUpdatedRequestsScreen', 'title')}</Text>
        <Badge 
          value={updatedRequests.length} 
          status="error" 
          containerStyle={styles.badgeContainer} 
          textStyle={styles.badgeText}
        />
      </View>
      
      {/* Info banner */}
      {updatedRequests.length > 0 && (
        <View style={styles.infoBanner}>
          <Icon name="information-circle-outline" type="ionicon" color={theme.colors.primary} size={theme.responsiveComponents.icon.medium} />
                      <Text style={styles.infoText}>
              {t('AgentUpdatedRequestsScreen', 'theseRequestsUpdated')}
            </Text>
        </View>
      )}
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {updatedRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="checkmark-circle-outline" type="ionicon" size={responsive(50, 60, 60, 60, 60)} color={theme.colors.success} />
            <Text style={styles.emptyText}>{t('AgentUpdatedRequestsScreen', 'noUpdatedRequests')}</Text>
          </View>
        ) : (
         <View style={commonStyles.offerGridContainer}>
         {updatedRequests.map((item, index) => (
          <View 
                key={item.request_id}
                style={[
                  commonStyles.offerGridItem,
                  { width: getGridItemWidth() }
                ]}
              >
            <Card key={item.request_id} containerStyle={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.requestInfo}>
                
                  <Text style={styles.destination}>
                  {item.request_area_name}, {item.request_country_name}
                  </Text>
                  <Text style={styles.updatedDate}>
                    {t('AgentUpdatedRequestsScreen', 'updatedDate')}: {formatDate(item.updated_at)}
                  </Text>
                </View>
                <Badge 
                  value="UPDATED" 
                  status="error" 
                  containerStyle={styles.statusBadgeContainer} 
                />
              </View>
              
              <Card.Divider />
              
              {/* Date Range */}
              <View style={styles.detailRow}>
                <Icon name="calendar-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary}  />
                                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>{t('AgentUpdatedRequestsScreen', 'travelDates')}: </Text>
                    {formatDate(item.start_date)} - {formatDate(item.end_date)}
                  </Text>
              </View>
              
              {/* Travelers */}
              <View style={styles.detailRow}>
                <Icon name="people-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>{t('AgentUpdatedRequestsScreen', 'travelers')}: </Text>
                    {item.adults} {item.adults === 1 ? t('AgentUpdatedRequestsScreen', 'adult') : t('AgentUpdatedRequestsScreen', 'adults')}
                    {item.children && item.children.length > 0 ? 
                      `, ${item.children.length} ${item.children.length === 1 ? t('AgentUpdatedRequestsScreen', 'child') : t('AgentUpdatedRequestsScreen', 'children')}` : 
                      `, ${t('AgentUpdatedRequestsScreen', 'noChildren')}`}
                  </Text>
              </View>
              
              {/* Nationality */}
              <View style={styles.detailRow}>
                <Icon name="flag-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>{t('AgentUpdatedRequestsScreen', 'nationality')}: </Text>
                    {item.travelers_nationality_name}
                  </Text>
              </View>
              
                              <Button
                  title={t('AgentUpdatedRequestsScreen', 'viewDetails')}
                icon={
                  <Icon
                    name="arrow-forward-outline"
                    type="ionicon"
                    color={theme.colors.textWhite}
                    size={theme.responsiveComponents.icon.small}
                    style={{ marginRight: theme.spacing.sm }}
                  />
                }
                buttonStyle={styles.viewButton}
                onPress={() => handleViewRequest(item.request_id, item.offer_id)}
              />
            </Card>
            </View>
          ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  badgeContainer: {
    padding: theme.components.badge.padding,
  },
  badgeText: {
    fontSize: theme.components.badge.fontSize,
    fontWeight: theme.components.badge.fontWeight,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.primary,
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
  },
  scrollView: {
    flex: 1,
    marginTop: theme.spacing.sm,
  },
  card: {
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  requestInfo: {
    flex: 1,
  },
  destination: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  updatedDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  statusBadgeContainer: {
    marginLeft: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  detailText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
  },
  detailLabel: {
    fontWeight: theme.typography.fontWeight.bold,
  },
  viewButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.huge,
  },
  emptyText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
export default AgentUpdatedRequestsScreen;
