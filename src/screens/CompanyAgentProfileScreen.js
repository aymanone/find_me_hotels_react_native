import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  Text,
  Card,
  Divider,
  Button,
  Icon
} from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser } from '../utils/auth';

const CompanyAgentProfileScreen = ({ route, navigation }) => {
  const { agentId } = route.params;
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOffers: 0,
    acceptedOffers: 0,
    rejectedOffers: 0,
    pendingOffers: 0
  });

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        // Check if user is a company
        const userRole = await checkUserRole('company');
        if (!userRole) {
          Alert.alert('Access Denied', 'Only companies can access this page.');
          navigation.navigate('Home');
          return;
        }

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          Alert.alert('Error', 'User not found. Please log in again.');
          navigation.navigate('Login');
          return;
        }

        // Fetch agent details
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select(`
            *,
            countries (
              country_name
            )
          `)
          .eq('id', agentId)
          .single();

        if (agentError) throw agentError;

        // Make sure this agent belongs to the current company
        if (agentData.company_id !== currentUser.id) {
          Alert.alert('Access Denied', 'You can only view your own agents.');
          navigation.navigate('CompanyAgentsList');
          return;
        }

        setAgent(agentData);

        // Fetch agent statistics
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('id, status')
          .eq('agent_id', agent.user_id);

        if (offersError) throw offersError;

        // Calculate statistics
        const totalOffers = offersData.length;
        const acceptedOffers = offersData.filter(offer => offer.status === 'accepted').length;
        const rejectedOffers = offersData.filter(offer => offer.status === 'rejected').length;
        const viewedOffers = offersData.filter(offer => offer.status === 'viewed').length;
        const notViewedOffers = offersData.filter(offer => offer.status === 'not viewed').length;

        setStats({
          totalOffers,
          acceptedOffers,
          rejectedOffers,
          viewedOffers,
          notViewedOffers
        });

      } catch (error) {
        console.error('Error fetching agent data:', error);
        Alert.alert('Error', 'Failed to load agent profile');
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Agent not found</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          buttonStyle={styles.backButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Icon
            name="person-circle-outline"
            type="ionicon"
            size={80}
            color="#007bff"
          />
          <Text style={styles.agentName}>
            {agent.first_name} {agent.second_name}
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.infoSection}>
         

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{agent.agent_email || 'Not provided'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Country:</Text>
            <Text style={styles.infoValue}>{agent.countries?.country_name || 'Not specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[
              styles.infoValue,
              { color: agent?.permitted_to_work ? '#28a745' : '#dc3545' }
            ]}>
              {agent?.permitted_to_work ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Joined:</Text>
            <Text style={styles.infoValue}>
              {new Date(agent.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Card>

      <Card containerStyle={styles.statsCard}>
        <Text style={styles.cardTitle}>Performance Statistics</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalOffers}</Text>
            <Text style={styles.statLabel}>Total Offers</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#28a745' }]}>{stats.acceptedOffers}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#dc3545' }]}>{stats.rejectedOffers}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#ffc107' }]}>{stats.viewedOffers}</Text>
            <Text style={styles.statLabel}>Viewed</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#dc3545' }]}>{stats.notViewedOffers}</Text>
            <Text style={styles.statLabel}>Not Viewed</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#dc3545',
  },
  backButton: {
    backgroundColor: '#007bff',
  },
  profileCard: {
    borderRadius: 10,
    margin: 10,
    padding: 10,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  agentName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  divider: {
    marginVertical: 10,
  },
  infoSection: {
    marginHorizontal: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 16,
  },
  statsCard: {
    borderRadius: 10,
    margin: 10,
    padding: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
});

export default CompanyAgentProfileScreen;