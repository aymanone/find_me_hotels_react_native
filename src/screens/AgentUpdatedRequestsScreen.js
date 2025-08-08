import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  
} from 'react-native';
import { Text, Card, Button, Icon, Badge } from 'react-native-elements';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { format } from 'date-fns';
import {showAlert} from "../components/ShowAlert";
import { useTranslation } from '../config/localization';

const AgentUpdatedRequestsScreen = ({ navigation }) => {
  const { t,language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [updatedRequests, setUpdatedRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  

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
        <ActivityIndicator size="large" color="#0000ff" />
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
          <Icon name="information-circle-outline" type="ionicon" color="#0066cc" size={20} />
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
            colors={["#0066cc"]}
          />
        }
      >
        {updatedRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="checkmark-circle-outline" type="ionicon" size={60} color="#28a745" />
            <Text style={styles.emptyText}>{t('AgentUpdatedRequestsScreen', 'noUpdatedRequests')}</Text>
          </View>
        ) : (
          updatedRequests.map((item, index) => (
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
                <Icon name="calendar-outline" type="ionicon" size={16} color="#0066cc" />
                                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>{t('AgentUpdatedRequestsScreen', 'travelDates')}: </Text>
                    {formatDate(item.start_date)} - {formatDate(item.end_date)}
                  </Text>
              </View>
              
              {/* Travelers */}
              <View style={styles.detailRow}>
                <Icon name="people-outline" type="ionicon" size={16} color="#0066cc" />
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
                <Icon name="flag-outline" type="ionicon" size={16} color="#0066cc" />
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
                    color="#ffffff"
                    size={16}
                    style={{ marginRight: 10 }}
                  />
                }
                buttonStyle={styles.viewButton}
                onPress={() => handleViewRequest(item.request_id, item.offer_id)}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  badgeContainer: {
    padding: 2,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  infoText: {
    marginLeft: 8,
    color: '#0066cc',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: 8,
  },
  card: {
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  destination: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  updatedDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  statusBadgeContainer: {
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333333',
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  viewButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default AgentUpdatedRequestsScreen;
