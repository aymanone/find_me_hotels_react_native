import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  
  ActivityIndicator 
} from 'react-native';
import { Card, Button, Icon } from 'react-native-elements';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import supabase from '../config/supabase';
import format from 'date-fns/format';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, responsive } from '../styles/theme';
import {  useTranslation } from '../config/localization';

const ClientUpdatedRequestsScreen = ({ navigation }) => {
  const { t,language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState(null);
 

  useEffect(() => {
    checkClientStatus();
  }, []);

  const checkClientStatus = async () => {
    try {
      const isUserClient = await checkUserRole('client');
      setIsClient(isUserClient);
      
      if (!isUserClient) {
        showAlert(t('ClientUpdatedRequestsScreen', 'accessDeniedTitle'), t('ClientUpdatedRequestsScreen', 'accessDenied'));
        navigation.goBack();
        return;
      }
      
      fetchRequests();
    } catch (error) {
      console.error('Error checking client status:', error);
      setError(t('ClientUpdatedRequestsScreen', 'failedToVerifyPermissions'));
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = await getCurrentUser();
      if (!user) throw new Error(t('ClientUpdatedRequestsScreen', 'userNotFound'));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('travel_requests_agent')
        .select('id, min_budget, max_budget, country_name, area_name, adults, children, meals, offers_number, created_at')
        .eq('creator_id', user.id)
        .eq('new_offers', true)
        .gte('start_date', today.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError(t('ClientUpdatedRequestsScreen', 'failedToLoadRequests'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleRetry = () => {
    setError(null);
    fetchRequests();
  };

  const handleRequestPress = (requestId) => {
    navigation.navigate('ClientTravelRequestDetails', { id:requestId });
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return t('ClientUpdatedRequestsScreen', 'invalidDate');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
       <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('ClientUpdatedRequestsScreen', 'loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
       <Icon name="alert-circle-outline" type="ionicon" size={responsive(40, 50, 50, 60, 60)} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.buttonContainer}>
          <Button
            title={t('ClientUpdatedRequestsScreen', 'retry')}
            onPress={handleRetry}
            buttonStyle={styles.retryButton}
          />
          <Button
            title={t('ClientUpdatedRequestsScreen', 'goBack')}
            onPress={() => navigation.goBack()}
            buttonStyle={styles.backButton}
            titleStyle={{ color:  theme.colors.primary }}
            type="outline"
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('ClientUpdatedRequestsScreen', 'requestsWithNewOffers')}</Text>
        <Text style={styles.requestCount}>
          {requests.length} {requests.length === 1 ? t('ClientUpdatedRequestsScreen', 'request') : t('ClientUpdatedRequestsScreen', 'requests')} {t('ClientUpdatedRequestsScreen', 'withNewOffers')}
        </Text>
        <Button
          title={t('ClientUpdatedRequestsScreen', 'refresh')}
          onPress={onRefresh}
          icon={<Icon name="refresh-outline" type="ionicon" size={theme.responsiveComponents.icon.medium} color={theme.colors.textWhite} />}
          buttonStyle={styles.refreshButton}
        />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
         <Icon name="information-circle-outline" type="ionicon" size={responsive(40, 50, 50, 60, 60)} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>{t('ClientUpdatedRequestsScreen', 'noUpdatedRequestsFound')}</Text>
          <Text style={styles.emptySubText}>
            {t('ClientUpdatedRequestsScreen', 'whenYouReceiveNewOffers')}
          </Text>
        </View>
      ) : (
        requests.map((request) => (
          <TouchableOpacity 
            key={request.id} 
            onPress={() => handleRequestPress(request.id)}
            activeOpacity={0.7}
          >
            <Card containerStyle={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{formatDate(request.created_at)}</Text>
                <View style={styles.offersContainer}>
                  <Icon name="notifications" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.notification} />
                  <Text style={styles.offersText}>
                    {request.offers_number} {request.offers_number === 1 ? t('ClientUpdatedRequestsScreen', 'offer') : t('ClientUpdatedRequestsScreen', 'offers')}
                  </Text>
                </View>
              </View>

              <Card.Divider />

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="location-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary}  />
                  <Text style={styles.infoLabel}>{t('ClientUpdatedRequestsScreen', 'destination')}</Text>
                </View>
                <Text style={styles.infoValue}>
                  {request.country_name}{request.area_name ? `, ${request.area_name}` : ''}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="people-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary}  />
                  <Text style={styles.infoLabel}>{t('ClientUpdatedRequestsScreen', 'travelers')}</Text>
                </View>
                <Text style={styles.infoValue}>
                  {request.adults} {request.adults === 1 ? t('ClientUpdatedRequestsScreen', 'adult') : t('ClientUpdatedRequestsScreen', 'adults')}
                  {request.children && request.children.length > 0 ? 
                    `, ${request.children.length} ${request.children.length === 1 ? t('ClientUpdatedRequestsScreen', 'child') : t('ClientUpdatedRequestsScreen', 'children')}` : 
                    ''}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="cash-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary}  />
                  <Text style={styles.infoLabel}>{t('ClientUpdatedRequestsScreen', 'budget')}</Text>
                </View>
                <Text style={styles.infoValue}>
                  ${request.min_budget} - ${request.max_budget}
                </Text>
              </View>

              {request.meals && request.meals.length > 0 && (
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Icon name="restaurant-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
                    <Text style={styles.infoLabel}>{t('ClientUpdatedRequestsScreen', 'meals')}</Text>
                  </View>
                  <Text style={styles.infoValue}>
                    {Array.isArray(request.meals) ? request.meals.join(', ') : request.meals}
                  </Text>
                </View>
              )}

              <View style={styles.viewDetailsContainer}>
                <Text style={styles.viewDetailsText}>{t('ClientUpdatedRequestsScreen', 'viewDetails')}</Text>
               <Icon name="chevron-forward-outline" type="ionicon" size={theme.responsiveComponents.icon.small} color={theme.colors.primary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  
  errorText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.error,
    textAlign: 'center',
  },
  
  buttonContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
    width: '80%',
    justifyContent: 'space-around',
  },
  
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xxxl,
    borderRadius: theme.borderRadius.md,
  },
  
  backButton: {
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xxxl,
    borderRadius: theme.borderRadius.md,
  },
  
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundWhite,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: theme.spacing.sm,
  },
  
  headerTitle: {
    fontSize: theme.responsiveTypography.h2.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  
  requestCount: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  
  refreshButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxxl,
    backgroundColor: theme.colors.backgroundWhite,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  
  emptyText: {
    fontSize: theme.responsiveTypography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  
  emptySubText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  
  card: {
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  
  dateText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textLight,
  },
  
  offersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.notificationLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  
  offersText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.notification,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  
  infoRow: {
    ...commonStyles.responsiveInfoRow,
  },
  
  infoItem: {
    ...commonStyles.responsiveInfoItem,
  },
  
  infoLabel: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  
  infoValue: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    flex: 1,
    color: theme.colors.text,
  },
  
  viewDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  
  viewDetailsText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
});
export default ClientUpdatedRequestsScreen;
