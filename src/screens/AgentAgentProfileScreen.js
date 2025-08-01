import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Divider, 
  Icon, 
  Input,
  Overlay
} from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import {MESSAGING_APPS} from '../config/CONSTANTS';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { validPhoneNumber, validPasswordSignup

 } from '../utils/validation';
import {showAlert} from "../components/ShowAlert";
export default function AgentAgentProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messagingApp, setMessagingApp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [offerStats, setOfferStats] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
const [passwordData, setPasswordData] = useState({
  password: '',
  confirmPassword: '',
});
const [showPassword, setShowPassword] = useState(false);
const [passwordError, setPasswordError] = useState('');
const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      const isAgent = await checkUserRole('agent');
      if (!isAgent) {
        showAlert('Access Denied', 'You do not have permission to access this page.');
        navigation.goBack();
        return;
      }
      
      fetchAgentProfile();
      fetchOfferStats();
    };
    
    checkPermission();
  }, []);

  const fetchAgentProfile = async () => {
    try {
      setLoading(true);
      
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          id,
          first_name,
          second_name,
          phone_number,
          messaging_app,
          agent_country,
          countries(country_name),
          permitted_to_work,
          company_id
        `)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      setProfileData(data);
      setPhoneNumber(data.phone_number || '');
      setMessagingApp(data.messaging_app || '');
    } catch (error) {
      console.error('Error fetching agent profile:', error.message);
       showAlert(
      'Error', 
      'Failed to load profile data',
      [
        { text: 'Try Again', onPress: () => {
            setTimeout(() => fetchAgentProfile(), 100);
             }  },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
     return; 
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferStats = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('agents')
        .select(`id, company_id,
          permitted_to_work, first_name, second_name,
          countries(country_name)`)
        .eq('user_id', user.id)
        .single();
      
      if (error || !data) throw error;
      
      const agentId = data.id;
      
      // Get offer statistics
      const { data: stats, error: statsError } = await supabase
        .rpc('get_agent_offers_summary', { company: data.company_id, agent: agentId });
      
      if (statsError) throw statsError;
      
      setOfferStats(stats[0]);
    } catch (error) {
      console.error('Error fetching offer stats:', error.message);
    }
  };
  const handlePasswordChange = (field, value) => {
  setPasswordData(prev => ({ ...prev, [field]: value }));
  setPasswordError('');
};

const confirmPasswordChange = () => {
  // Validate passwords
  if (passwordData.password !== passwordData.confirmPassword) {
    setPasswordError('Passwords do not match');
    return;
  }

  if (!validPasswordSignup(passwordData.password)) {
    setPasswordError('Password must be at least 8 characters with letters and numbers');
    return;
  }

  setPasswordConfirmVisible(true);
};

const updatePassword = async () => {
  try {
    setPasswordChangeLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: passwordData.password
    });

    if (error) throw error;
    
    setPasswordData({ password: '', confirmPassword: '' });
    setIsChangingPassword(false);
    setPasswordConfirmVisible(false);
    showAlert('Success', 'Your password has been updated successfully.');
  } catch (error) {
    console.error('Error updating password:', error.message);
    showAlert('Error', 'Failed to update your password. Please try again.');
  } finally {
    setPasswordChangeLoading(false);
  }
};
  const handleSaveChanges = async () => {
    try {
      // Validate phone number
      if (!validPhoneNumber(phoneNumber)) {
        setPhoneError('Please enter a valid phone number');
        return;
      }
      
      setPhoneError('');
      
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      const { error } = await supabase
        .from('agents')
        .update({
          phone_number: phoneNumber,
          messaging_app: messagingApp
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      showAlert('Success', 'Profile updated successfully');
      setEditMode(false);
      fetchAgentProfile();
    } catch (error) {
      console.error('Error updating profile:', error.message);
      showAlert('Error', 'Failed to update profile');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }
      
      // Check if agent is permitted to work
      if (profileData && profileData.permitted_to_work === false) {
        showAlert(
          'Cannot Delete Account',
          'Your account is currently suspended. You cannot delete your account at this time.'
        );
        setDeleteConfirmVisible(false);
        setDeleteLoading(false);
        return;
      }
      
      // Delete agent record
      const { error: deleteError } = await supabase
        .from('agents')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) throw deleteError;
      
      showAlert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [{ text: 'OK', onPress: () => signOut(navigation) }]
      );
    } catch (error) {
      console.error('Error deleting account:', error.message);
      showAlert('Error', 'Failed to delete account. Please try again later.');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.container}>
        <Card containerStyle={styles.card}>
          <View style={styles.headerContainer}>
            <Text h4 style={styles.headerText}>Agent Profile</Text>
            {!editMode ? (
              <Button
                type="clear"
                icon={<Icon name="edit" type="material" color="#007bff" />}
                onPress={() => setEditMode(true)}
              />
            ) : (
              <Button
                type="clear"
                icon={<Icon name="close" type="material" color="#dc3545" />}
                onPress={() => {
                  setEditMode(false);
                  setPhoneNumber(profileData.phone_number || '');
                  setMessagingApp(profileData.messaging_app || '');
                  setPhoneError('');
                }}
              />
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>First Name:</Text>
              <Text style={styles.value}>{profileData?.first_name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Last Name:</Text>
              <Text style={styles.value}>{profileData?.second_name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{profileData?.countries?.country_name || 'Not specified'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Account Status:</Text>
              <View style={styles.statusContainer}>
                <Icon
                  name={profileData?.permitted_to_work ? 'check-circle' : 'cancel'}
                  type="material"
                  color={profileData?.permitted_to_work ? '#28a745' : '#dc3545'}
                  size={16}
                  style={styles.statusIcon}
                />
                <Text style={[
                  styles.statusText,
                  { color: profileData?.permitted_to_work ? '#28a745' : '#dc3545' }
                ]}>
                  {profileData?.permitted_to_work ? 'Active' : 'Suspended'}
                </Text>
              </View>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {!editMode ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Phone Number:</Text>
                  <Text style={styles.value}>{profileData?.phone_number}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Messaging App:</Text>
                  <Text style={styles.value}>{profileData?.messaging_app || 'Not specified'}</Text>
                </View>
              </>
            ) : (
              <>
                <Input
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  errorMessage={phoneError}
                  keyboardType="phone-pad"
                  containerStyle={styles.inputContainer}
                />
                
                <Text style={styles.dropdownLabel}>Messaging App</Text>
                <View style={styles.dropdownContainer}>
                  <Dropdown
                    style={styles.dropdown}
                    data={MESSAGING_APPS.map(app => ({ label: app, value: app }))}
                    labelField="label"
                    valueField="value"
                    value={messagingApp}
                    onChange={item => setMessagingApp(item.value)}
                    placeholder="Select Messaging App"
                  />
                </View>
                
                <Button
                  title="Save Changes"
                  onPress={handleSaveChanges}
                  buttonStyle={styles.saveButton}
                  containerStyle={styles.buttonContainer}
                />
              </>
            )}
          </View>
          <Divider style={styles.divider} />

{/* Password Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Security</Text>
  
  {!isChangingPassword ? (
    <Button
      title="Change Password"
      icon={<Icon name="lock" type="material" color="#007bff" size={20} style={{ marginRight: 10 }} />}
      type="outline"
      buttonStyle={styles.securityButton}
      containerStyle={styles.buttonContainer}
      onPress={() => setIsChangingPassword(true)}
    />
  ) : (
    <>
      <Input
        label="New Password"
        value={passwordData.password}
        onChangeText={(value) => handlePasswordChange('password', value)}
        placeholder="Enter new password"
        secureTextEntry={!showPassword}
        rightIcon={
          <Icon
            name={showPassword ? 'eye-off' : 'eye'}
            type="ionicon"
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        containerStyle={styles.inputContainer}
      />
      
      <Input
        label="Confirm Password"
        value={passwordData.confirmPassword}
        onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
        placeholder="Confirm new password"
        secureTextEntry={!showPassword}
        errorMessage={passwordError}
        containerStyle={styles.inputContainer}
      />
      
      <View style={styles.passwordButtonsContainer}>
        <Button
          title="Cancel"
          type="outline"
          buttonStyle={styles.cancelButton}
          containerStyle={styles.passwordButtonContainer}
          onPress={() => {
            setPasswordData({ password: '', confirmPassword: '' });
            setPasswordError('');
            setIsChangingPassword(false);
          }}
        />
        <Button
          title="Update Password"
          buttonStyle={styles.saveButton}
          containerStyle={styles.passwordButtonContainer}
          onPress={confirmPasswordChange}
        />
      </View>
    </>
  )}
</View>
          {offerStats && (
            <>
              <Divider style={styles.divider} />
              
              {/* Offer Statistics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Offer Statistics</Text>
                
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{offerStats.total_offers || 0}</Text>
                    <Text style={styles.statLabel}>Total Offers</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#28a745' }]}>{offerStats.accepted_offers || 0}</Text>
                    <Text style={styles.statLabel}>Accepted</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#dc3545' }]}>{offerStats.rejected_offers || 0}</Text>
                    <Text style={styles.statLabel}>Rejected</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#17a2b8' }]}>{offerStats.viewed_offers || 0}</Text>
                    <Text style={styles.statLabel}>Viewed</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#ffc107' }]}>{offerStats.not_viewed_offers || 0}</Text>
                    <Text style={styles.statLabel}>Not Viewed</Text>
                  </View>
                </View>
              </View>
            </>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Actions</Text>
            
            <Button
              title="Delete Account"
              type="outline"
              buttonStyle={styles.deleteButton}
              titleStyle={styles.deleteButtonText}
              containerStyle={styles.buttonContainer}
              onPress={handleDeleteAccount}
            />
          </View>
        </Card>
      </ScrollView>
      {/* Password Change Confirmation Overlay */}
<Overlay
  isVisible={passwordConfirmVisible}
  onBackdropPress={() => setPasswordConfirmVisible(false)}
  overlayStyle={styles.overlay}
>
  <Text style={styles.overlayTitle}>Change Password</Text>
  <Text style={styles.overlayText}>
    Are you sure you want to change your password?
  </Text>
  <View style={styles.overlayButtons}>
    <Button
      title="Cancel"
      type="outline"
      buttonStyle={styles.cancelButton}
      containerStyle={styles.overlayButtonContainer}
      onPress={() => setPasswordConfirmVisible(false)}
    />
    <Button
      title={passwordChangeLoading ? "Updating..." : "Confirm"}
      buttonStyle={styles.saveButton}
      containerStyle={styles.overlayButtonContainer}
      onPress={updatePassword}
      disabled={passwordChangeLoading}
      loading={passwordChangeLoading}
    />
  </View>
</Overlay>
      {/* Delete Confirmation Overlay */}
      <Overlay
        isVisible={deleteConfirmVisible}
        onBackdropPress={() => setDeleteConfirmVisible(false)}
        overlayStyle={styles.overlay}
      >
        <Text style={styles.overlayTitle}>Delete Account</Text>
        <Text style={styles.overlayText}>
          Are you sure you want to delete your account? This action cannot be undone.
        </Text>
        <View style={styles.overlayButtons}>
          <Button
            title="Cancel"
            type="outline"
            buttonStyle={styles.cancelButton}
            containerStyle={styles.overlayButtonContainer}
            onPress={() => setDeleteConfirmVisible(false)}
          />
          <Button
            title={deleteLoading ? "Deleting..." : "Delete"}
            buttonStyle={styles.confirmDeleteButton}
            containerStyle={styles.overlayButtonContainer}
            onPress={confirmDeleteAccount}
            disabled={deleteLoading}
            loading={deleteLoading}
          />
        </View>
      </Overlay>
    </KeyboardAvoidingView>
  );
}

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
  card: {
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#555',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 5,
  },
  statusText: {
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 15,
  },
  dropdownLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    marginBottom: 15,
  },
  dropdown: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statItem: {
    alignItems: 'center',
    marginVertical: 10,
    width: '33%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 16,
    color: '#555',
  },
  deleteButton: {
    borderColor: '#dc3545',
  },
  deleteButtonText: {
    color: '#dc3545',
  },
  overlay: {
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  overlayText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  overlayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    borderColor: '#007bff',
  },
  confirmDeleteButton: {
    backgroundColor: '#dc3545',
  },
  overlayButtonContainer: {
    width: '48%',
  },
  securityButton: {
  borderColor: '#007bff',
},
passwordButtonsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 15,
},
passwordButtonContainer: {
  width: '48%',
},
});
