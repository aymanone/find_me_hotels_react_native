import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Card, Button, Icon } from 'react-native-elements';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import supabase from '../config/supabase';
import { format } from 'date-fns';

const ClientUpdatedRequestsScreen = ({ navigation }) => {
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
        Alert.alert('Access Denied', 'You do not have permission to access this page.');
        navigation.goBack();
        return;
      }
      
      fetchRequests();
    } catch (error) {
      console.error('Error checking client status:', error);
      setError('Failed to verify your permissions.');
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const user = await getCurrentUser();
      if (!user) throw new Error('User not found');
      
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
      setError('Failed to load your updated requests. Please try again.');
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
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading your updated requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle-outline" type="ionicon" size={50} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Retry"
            onPress={handleRetry}
            buttonStyle={styles.retryButton}
          />
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            buttonStyle={styles.backButton}
            titleStyle={{ color: '#007AFF' }}
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
          colors={['#0000ff']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests with New Offers</Text>
        <Text style={styles.requestCount}>
          {requests.length} {requests.length === 1 ? 'request' : 'requests'} with new offers
        </Text>
        <Button
          title="Refresh"
          onPress={onRefresh}
          icon={<Icon name="refresh-outline" type="ionicon" size={20} color="white" />}
          buttonStyle={styles.refreshButton}
        />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="information-circle-outline" type="ionicon" size={50} color="#8E8E93" />
          <Text style={styles.emptyText}>No updated requests found</Text>
          <Text style={styles.emptySubText}>
            When you receive new offers for your travel requests, they will appear here.
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
                  <Icon name="notifications" type="ionicon" size={16} color="#FF9500" />
                  <Text style={styles.offersText}>
                    {request.offers_number} {request.offers_number === 1 ? 'offer' : 'offers'}
                  </Text>
                </View>
              </View>

              <Card.Divider />

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="location-outline" type="ionicon" size={16} color="#007AFF" />
                  <Text style={styles.infoLabel}>Destination:</Text>
                </View>
                <Text style={styles.infoValue}>
                  {request.country_name}{request.area_name ? `, ${request.area_name}` : ''}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="people-outline" type="ionicon" size={16} color="#007AFF" />
                  <Text style={styles.infoLabel}>Travelers:</Text>
                </View>
                <Text style={styles.infoValue}>
                  {request.adults} {request.adults === 1 ? 'adult' : 'adults'}
                  {request.children && request.children.length > 0 ? 
                    `, ${request.children.length} ${request.children.length === 1 ? 'child' : 'children'}` : 
                    ''}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="cash-outline" type="ionicon" size={16} color="#007AFF" />
                  <Text style={styles.infoLabel}>Budget:</Text>
                </View>
                <Text style={styles.infoValue}>
                  ${request.min_budget} - ${request.max_budget}
                </Text>
              </View>

              {request.meals && request.meals.length > 0 && (
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Icon name="restaurant-outline" type="ionicon" size={16} color="#007AFF" />
                    <Text style={styles.infoLabel}>Meals:</Text>
                  </View>
                  <Text style={styles.infoValue}>
                    {Array.isArray(request.meals) ? request.meals.join(', ') : request.meals}
                  </Text>
                </View>
              )}

              <View style={styles.viewDetailsContainer}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Icon name="chevron-forward-outline" type="ionicon" size={16} color="#007AFF" />
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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    width: '80%',
    justifyContent: 'space-around',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
  },
  backButton: {
    borderColor: '#007AFF',
    paddingHorizontal: 30,
  },
  header: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  requestCount: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  card: {
    borderRadius: 10,
    marginBottom: 10,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  offersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  offersText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 4,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  infoLabel: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
});

export default ClientUpdatedRequestsScreen;
