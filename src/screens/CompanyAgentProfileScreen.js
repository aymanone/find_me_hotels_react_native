import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  Card,
  Divider,
  Button,
  Icon,
  Input,
  Switch
} from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { validEmail } from '../utils/validation';
import {showAlert} from "../components/ShowAlert";
const CompanyAgentProfileScreen = ({ route, navigation }) => {
  const { agentId } = route.params;
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState(null);
  const [countries, setCountries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  const [stats, setStats] = useState({
    totalOffers: 0,
    acceptedOffers: 0,
    rejectedOffers: 0,
    pendingOffers: 0,
    viewedOffers: 0,
    notViewedOffers: 0
  });

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        // Check if user is a company
        const isCompany = await checkUserRole('company');
        if (!isCompany) {
          showAlert('Access Denied', 'Only companies can access this page.');
          navigation.navigate('Home');
          return;
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          showAlert('Error', 'User not found. Please log in again.');
          await signOut(navigation);
          return;
        }
        
        // Check if user is permitted to work
        if (user?.app_metadata?.permitted_to_work === false) {
          setIsPermittedToWork(false);
        }

        // Fetch agent details
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select(`
            *,
            countries (
              id,
              country_name
            )
          `)
          .eq('id', agentId)
          .single();

        if (agentError) throw agentError;

        // Make sure this agent belongs to the current company
        if (agentData.company_id !== user.id) {
          showAlert('Access Denied', 'You can only view your own agents.');
          navigation.navigate('CompanyAgentsList');
          return;
        }

        setAgent(agentData);
        setEditedAgent({
          first_name: agentData.first_name,
          second_name: agentData.second_name,
          country_id: agentData.agent_country,
          permitted_to_work: agentData.permitted_to_work !== false,
          // Include email if agent hasn't signed up yet
          ...(agentData.user_id ? {} : { agent_email: agentData.agent_email })
        });

        // Fetch all countries for dropdown
        const { data: countriesData, error: countriesError } = await supabase
          .from('countries')
          .select('id, country_name')
          .order('country_name');

        if (countriesError) throw countriesError;
        setCountries(countriesData);
      
        // Fetch agent statistics
        if (agentData.user_id) {
          const { data: offersData, error: offersError } = await supabase
            .rpc('get_agent_offers_summary', { company: user.id, agent: agentData.id });

          if (offersError) throw offersError;

          // Calculate statistics
          const totalOffers = offersData[0].total_offers || 0;
          const acceptedOffers = offersData[0].accepted_offers || 0;
          const rejectedOffers = offersData[0].rejected_offers || 0;
          const viewedOffers = offersData[0].viewed_offers || 0;
          const notViewedOffers = offersData[0].not_viewed_offers || 0;

          setStats({
            totalOffers,
            acceptedOffers,
            rejectedOffers,
            viewedOffers,
            notViewedOffers
          });
        }else{
          // If agent hasn't signed up yet, set all stats to 0
          setStats({
            totalOffers: 0,
            acceptedOffers: 0,
            rejectedOffers: 0,
            viewedOffers: 0,
            notViewedOffers: 0
          });
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
           showAlert(
      'Error', 
      'Failed to load profile data',
      [
        { text: 'Try Again', onPress: () => {
            setTimeout(() => fetchAgentData(), 100);
} },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
    return;
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId, navigation]);

  const handleEditButtonPress = async () => {
    try {
      // Get current user to check latest permission status
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      // Check if user is permitted to work before allowing edit
      if (user?.app_metadata?.permitted_to_work === false) {
        setIsPermittedToWork(false); // Update the state to reflect current permission
        showAlert(
          'Permission Denied',
          'Your account is currently inactive. You cannot edit agent profiles.'
        );
        return;
      }
      
      // If we're canceling edit mode, reset the form
      if (isEditing) {
        // Reset edited agent to original values
        setEditedAgent({
          first_name: agent.first_name,
          second_name: agent.second_name,
          country_id: agent.agent_country,
          permitted_to_work: agent.permitted_to_work !== false,
          // Include email if agent hasn't signed up yet
          ...(agent.user_id ? {} : { agent_email: agent.agent_email })
        });
      }
      setIsEditing(!isEditing);
    } catch (error) {
      console.error('Error checking permissions:', error);
      showAlert('Error', 'Failed to verify permissions. Please try again.');
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Check again if user is permitted to work before saving changes
      if (!isPermittedToWork) {
        showAlert(
          'Permission Denied',
          'Your account is currently inactive. You cannot update agent profiles.'
        );
        return;
      }
      
      setSaving(true);
      
      // Validate inputs
      if (!editedAgent.first_name.trim() || !editedAgent.second_name.trim()) {
        showAlert('Validation Error', 'First name and last name are required');
        setSaving(false);
        return;
      }

      // Validate email if agent hasn't signed up yet
      if (!agent.user_id) {
        if (!editedAgent.agent_email || !validEmail(editedAgent.agent_email)) {
          showAlert('Validation Error', 'Please enter a valid email address');
          setSaving(false);
          return;
        }
      }

      // Get current user again to ensure we have the latest data
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }

      // Prepare update data
      const updateData = {
        first_name: editedAgent.first_name,
        second_name: editedAgent.second_name,
        agent_country: editedAgent.country_id,
        permitted_to_work: editedAgent.permitted_to_work
      };

      // Include email update only if agent hasn't signed up yet
      if (!agent.user_id) {
        updateData.agent_email = editedAgent.agent_email;
      }

      // Update agent in database
      const { error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId);

      if (error) throw error;

      // Update local state
      setAgent({
        ...agent,
        first_name: editedAgent.first_name,
        second_name: editedAgent.second_name,
        agent_country: editedAgent.country_id,
        permitted_to_work: editedAgent.permitted_to_work,
        ...(agent.user_id ? {} : { agent_email: editedAgent.agent_email }),
        countries: countries.find(c => c.id === editedAgent.country_id)
      });

      setIsEditing(false);
      showAlert('Success', 'Agent profile updated successfully');
    } catch (error) {
      console.error('Error updating agent:', error);
      showAlert('Error', 'Failed to update agent profile');
    } finally {
      setSaving(false);
    }
  };

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
      {!isPermittedToWork && (
        <Card containerStyle={styles.warningCard}>
          <View style={styles.warningContainer}>
            <Icon name="alert-circle-outline" type="ionicon" color="#856404" size={24} />
            <Text style={styles.warningText}>
              Your account is currently inactive. You can view agent profiles but cannot make changes.
            </Text>
          </View>
        </Card>
      )}
      
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
          
          <Button
            icon={<Icon name={isEditing ? "close" : "edit"} type="material" size={20} color="white" />}
            title={isEditing ? "Cancel" : "Edit Profile"}
            onPress={handleEditButtonPress}
            buttonStyle={[
              styles.editButton, 
              isEditing && { backgroundColor: '#dc3545' },
              !isPermittedToWork && { backgroundColor: '#6c757d' }
            ]}
            containerStyle={styles.editButtonContainer}
            disabled={!isPermittedToWork}
          />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.infoSection}>
          {isEditing ? (
            <>
              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>First Name:</Text>
                <Input
                  value={editedAgent.first_name}
                  onChangeText={(text) => setEditedAgent({...editedAgent, first_name: text})}
                  containerStyle={styles.editInput}
                  inputStyle={styles.editInputText}
                />
              </View>

              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>Last Name:</Text>
                <Input
                  value={editedAgent.second_name}
                  onChangeText={(text) => setEditedAgent({...editedAgent, second_name: text})}
                  containerStyle={styles.editInput}
                  inputStyle={styles.editInputText}
                />
              </View>

              {!agent.user_id && (
                <View style={styles.editRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Input
                    value={editedAgent.agent_email}
                    onChangeText={(text) => setEditedAgent({...editedAgent, agent_email: text})}
                    containerStyle={styles.editInput}
                    inputStyle={styles.editInputText}
                  />
                </View>
              )}

              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>Country:</Text>
                <View style={styles.dropdownContainer}>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    inputSearchStyle={styles.inputSearchStyle}
                    iconStyle={styles.iconStyle}
                    data={countries.map(country => ({
                      label: country.country_name,
                      value: country.id
                    }))}
                    search
                    maxHeight={300}
                    labelField="label"
                    valueField="value"
                    placeholder="Select country"
                    searchPlaceholder="Search..."
                    value={editedAgent.country_id}
                    onChange={item => {
                      setEditedAgent({...editedAgent, country_id: item.value});
                    }}
                    renderItem={item => (
                      <View style={styles.dropdownItem}>
                        <Text style={styles.textItem}>{item.label}</Text>
                      </View>
                    )}
                  />
                </View>
              </View>

              <View style={styles.editRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchLabel, !editedAgent.permitted_to_work && styles.inactiveText]}>
                    {editedAgent.permitted_to_work ? 'Active' : 'Inactive'}
                  </Text>
                  <Switch
                    value={editedAgent.permitted_to_work}
                    onValueChange={(value) => setEditedAgent({...editedAgent, permitted_to_work: value})}
                    trackColor={{ false: "#dc3545", true: "#28a745" }}
                    thumbColor={editedAgent.permitted_to_work ? "#f5dd4b" : "#f4f3f4"}
                  />
                </View>
              </View>

              <Button
                title="Save Changes"
                onPress={handleSaveChanges}
                buttonStyle={styles.saveButton}
                loading={saving}
                disabled={saving}
              />
            </>
          ) : (
            <>
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
            </>
          )}
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
  warningCard: {
    borderRadius: 10,
    margin: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#856404',
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
  editButton: {
    backgroundColor: '#007bff',
    width: 150,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  editButtonContainer: {
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
  editRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 16,
  },
  editInput: {
    width: '100%',
  },
  editInputText: {
    fontSize: 16,
  },
  dropdownContainer: {
    width: '100%',
    marginVertical: 5,
  },
  dropdown: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#aaa',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  dropdownItem: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textItem: {
    flex: 1,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  inactiveText: {
    color: '#dc3545',
  },
  saveButton: {
    backgroundColor: '#28a745',
    width: '100%',
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
