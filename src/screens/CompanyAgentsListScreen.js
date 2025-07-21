import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  Button,
  Card,
  SearchBar,
  Icon
} from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser } from '../utils/auth';

const CompanyAgentsListScreen = ({ navigation }) => {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);

  const fetchAgents = async () => {
    try {
      setRefreshing(true);
      
      // Get current user
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'User not found. Please log in again.');
        navigation.navigate('Login');
        return;
      }
      
      // Fetch agents for this company
      const { data, error } = await supabase
        .from('agents')
        .select(`
          id,
          first_name,
          second_name,
          agent_country,
          countries (
            country_name
          )
        `)
        .eq('company_id', currentUser.id);

      if (error) throw error;
      
      setAgents(data);
      setFilteredAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
      Alert.alert('Error', 'Failed to load agents list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const checkUserAndFetchAgents = async () => {
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
        
        setUser(currentUser);

        // Fetch agents
        await fetchAgents();
      } catch (error) {
        console.error('Error fetching agents:', error);
        Alert.alert('Error', 'Failed to load agents list');
        setLoading(false);
      }
    };

    checkUserAndFetchAgents();
  }, [navigation]);

  const updateSearch = (text) => {
    setSearch(text);
    
    if (text.trim() === '') {
      setFilteredAgents(agents);
      return;
    }
    
    const filtered = agents.filter(agent => {
      const fullName = `${agent.first_name} ${agent.second_name}`.toLowerCase();
      const searchTerm = text.toLowerCase();
      
      return agent.first_name.toLowerCase().includes(searchTerm) || 
             agent.second_name.toLowerCase().includes(searchTerm) ||
             fullName.includes(searchTerm);
    });
    
    setFilteredAgents(filtered);
  };

  const handleDeleteAgent = async (agentId, agentName) => {
    try {
      // Confirm deletion
      Alert.alert(
        'Confirm Deletion',
        `Are you sure you want to delete agent ${agentName}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            onPress: async () => {
              // Get current user again to check permissions
              const currentUser = await getCurrentUser();
              
              if (!currentUser) {
                Alert.alert('Error', 'User not found. Please log in again.');
                return;
              }
              
              // Check if user is permitted to work
              if (currentUser.app_metadata?.permitted_to_work !== true) {
                Alert.alert('Permission Denied', 'You do not have permission to delete agents.');
                return;
              }
              
              // Delete the agent
              const { error } = await supabase
                .from('agents')
                .delete()
                .eq('id', agentId);
              
              if (error) throw error;
              
              // Update the agents list
              setAgents(agents.filter(agent => agent.id !== agentId));
              setFilteredAgents(filteredAgents.filter(agent => agent.id !== agentId));
              
              Alert.alert('Success', 'Agent deleted successfully');
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting agent:', error);
      Alert.alert('Error', 'Failed to delete agent');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text h4 style={styles.headerTitle}>Your Agents</Text>
        <Button
         title="Refresh Agents"
          type="clear"
          loading={refreshing}
          onPress={fetchAgents}
          buttonStyle={styles.refreshButton}
        />
      </View>
      
      <SearchBar
        placeholder="Search agents..."
        onChangeText={updateSearch}
        value={search}
        containerStyle={styles.searchBarContainer}
        inputContainerStyle={styles.searchBarInputContainer}
        lightTheme
        round
      />
      
      <ScrollView style={styles.scrollView}>
        {filteredAgents.length === 0 ? (
          <Card containerStyle={styles.noAgentsCard}>
            <Text style={styles.noAgentsText}>No agents found</Text>
          </Card>
        ) : (
          filteredAgents.map(agent => (
            <Card key={agent.id} containerStyle={styles.agentCard}>
              <View style={styles.agentHeader}>
                
                <Text style={styles.agentName}>
                  {agent.first_name} {agent.second_name}
                </Text>
               
              </View>
              
              <Text style={styles.agentCountry}>
                Country: {agent.countries?.country_name || 'Not specified'}
              </Text>
              
              <View style={styles.actionButtons}>
                <Button
                  title="View Profile"
                  type="outline"
                  buttonStyle={styles.viewButton}
                  onPress={() => navigation.navigate("Home",{screen: "CompanyAgentProfile",params:
                    { agentId: agent.id }})}
                />
                
                <Button
                  icon={<Icon name="trash-outline" type="ionicon" color="#fff" size={20} />}
                  buttonStyle={styles.deleteButton}
                  onPress={() => handleDeleteAgent(agent.id, `${agent.first_name} ${agent.second_name}`)}
                />
              </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 22,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchBarInputContainer: {
    backgroundColor: '#e1e1e1',
  },
  scrollView: {
    flex: 1,
  },
  agentCard: {
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  agentName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  agentId: {
    fontSize: 14,
    color: '#666',
  },
  agentCountry: {
    fontSize: 16,
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    borderColor: '#007bff',
    borderRadius: 5,
    paddingHorizontal: 20,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 5,
    paddingHorizontal: 20,
  },
  noAgentsCard: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  noAgentsText: {
    fontSize: 16,
    color: '#666',
  },
});

export default CompanyAgentsListScreen;
