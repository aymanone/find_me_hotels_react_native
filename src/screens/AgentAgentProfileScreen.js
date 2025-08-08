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
import {useTranslation} from "../config/localization";
export default function AgentAgentProfileScreen({ navigation }) {
  const { t,language } = useTranslation();
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
        showAlert(t('AgentAgentProfileScreen', 'error'), t('AgentAgentProfileScreen', 'accessDenied'));
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
        showAlert(t('AgentAgentProfileScreen', 'error'), t('AgentAgentProfileScreen', 'userNotFound'));
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
      t('AgentAgentProfileScreen', 'error'), 
      t('AgentAgentProfileScreen', 'failedToLoadProfile'),
      [
        { text: t('AgentAgentProfileScreen', 'tryAgain'), onPress: () => {
            setTimeout(() => fetchAgentProfile(), 100);
             }  },
        { text: t('AgentAgentProfileScreen', 'cancel'), style: 'cancel' }
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
    setPasswordError(t('AgentAgentProfileScreen', 'passwordsDoNotMatch'));
    return;
  }

  if (!validPasswordSignup(passwordData.password)) {
    setPasswordError(t('AgentAgentProfileScreen', 'passwordRequirements'));
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
    showAlert(t('AgentAgentProfileScreen', 'success'), t('AgentAgentProfileScreen', 'passwordUpdatedSuccessfully'));
  } catch (error) {
    console.error('Error updating password:', error.message);
    showAlert(t('AgentAgentProfileScreen', 'error'), t('AgentAgentProfileScreen', 'failedToUpdatePassword'));
  } finally {
    setPasswordChangeLoading(false);
  }
};
  const handleSaveChanges = async () => {
    try {
      // Validate phone number
      if (!validPhoneNumber(phoneNumber)) {
        setPhoneError(t('AgentAgentProfileScreen', 'enterValidPhoneNumber'));
        return;
      }
      
      setPhoneError('');
      
      const user = await getCurrentUser();
      if (!user) {
        showAlert(t('AgentAgentProfileScreen', 'error'), t('AgentAgentProfileScreen', 'userNotFound'));
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
      
      showAlert(t('AgentAgentProfileScreen', 'success'), t('AgentAgentProfileScreen', 'profileUpdatedSuccessfully'));
      setEditMode(false);
      fetchAgentProfile();
    } catch (error) {
      console.error('Error updating profile:', error.message);
      showAlert(t('AgentAgentProfileScreen', 'error'), t('AgentAgentProfileScreen', 'failedToUpdateProfile'));
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
        showAlert(t('AgentAgentProfileScreen', 'error'), t('AgentAgentProfileScreen', 'userNotFound'));
        await signOut(navigation);
        return;
      }
      
      // Check if agent is permitted to work
      if (profileData && profileData.permitted_to_work === false) {
        showAlert(
          t('AgentAgentProfileScreen', 'cannotDeleteAccount'),
          t('AgentAgentProfileScreen', 'accountSuspendedDeleteError')
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
        t('AgentAgentProfileScreen', 'accountDeleted'),
        t('AgentAgentProfileScreen', 'accountDeletedSuccessfully'),
        [{ text: t('AgentAgentProfileScreen', 'ok'), onPress: () => signOut(navigation) }]
      );
    } catch (error) {
      console.error('Error deleting account:', error.message);
      showAlert(t('AgentAgentProfileScreen', 'error'), t('AgentAgentProfileScreen', 'failedToDeleteAccount'));
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
            <Text h4 style={styles.headerText}>{t('AgentAgentProfileScreen', 'agentProfile')}</Text>
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
            <Text style={styles.sectionTitle}>{t('AgentAgentProfileScreen', 'personalInformation')}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('AgentAgentProfileScreen', 'firstName')}:</Text>
              <Text style={styles.value}>{profileData?.first_name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('AgentAgentProfileScreen', 'lastName')}:</Text>
              <Text style={styles.value}>{profileData?.second_name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('AgentAgentProfileScreen', 'location')}:</Text>
              <Text style={styles.value}>{profileData?.countries?.country_name || t('AgentAgentProfileScreen', 'notSpecified')}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('AgentAgentProfileScreen', 'accountStatus')}:</Text>
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
                  {profileData?.permitted_to_work ? t('AgentAgentProfileScreen', 'active') : t('AgentAgentProfileScreen', 'suspended')}
                </Text>
              </View>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('AgentAgentProfileScreen', 'contactInformation')}</Text>
            
            {!editMode ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('AgentAgentProfileScreen', 'phoneNumber')}:</Text>
                  <Text style={styles.value}>{profileData?.phone_number}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('AgentAgentProfileScreen', 'messagingApp')}:</Text>
                  <Text style={styles.value}>{profileData?.messaging_app || t('AgentAgentProfileScreen', 'notSpecified')}</Text>
                </View>
              </>
            ) : (
              <>
                <Input
                  label={t('AgentAgentProfileScreen', 'phoneNumber')}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  errorMessage={phoneError}
                  keyboardType="phone-pad"
                  containerStyle={styles.inputContainer}
                />
                
                <Text style={styles.dropdownLabel}>{t('AgentAgentProfileScreen', 'messagingApp')}</Text>
                <View style={styles.dropdownContainer}>
                  <Dropdown
                    style={styles.dropdown}
                    data={MESSAGING_APPS.map(app => ({ label: app, value: app }))}
                    labelField="label"
                    valueField="value"
                    value={messagingApp}
                    onChange={item => setMessagingApp(item.value)}
                    placeholder={t('AgentAgentProfileScreen', 'selectMessagingApp')}
                  />
                </View>
                
                <Button
                  title={t('AgentAgentProfileScreen', 'saveChanges')}
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
  <Text style={styles.sectionTitle}>{t('AgentAgentProfileScreen', 'security')}</Text>
  
  {!isChangingPassword ? (
    <Button
      title={t('AgentAgentProfileScreen', 'changePassword')}
      icon={<Icon name="lock" type="material" color="#007bff" size={20} style={{ marginRight: 10 }} />}
      type="outline"
      buttonStyle={styles.securityButton}
      containerStyle={styles.buttonContainer}
      onPress={() => setIsChangingPassword(true)}
    />
  ) : (
    <>
      <Input
        label={t('AgentAgentProfileScreen', 'newPassword')}
        value={passwordData.password}
        onChangeText={(value) => handlePasswordChange('password', value)}
        placeholder={t('AgentAgentProfileScreen', 'enterNewPassword')}
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
        label={t('AgentAgentProfileScreen', 'confirmPassword')}
        value={passwordData.confirmPassword}
        onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
        placeholder={t('AgentAgentProfileScreen', 'confirmNewPassword')}
        secureTextEntry={!showPassword}
        errorMessage={passwordError}
        containerStyle={styles.inputContainer}
      />
      
      <View style={styles.passwordButtonsContainer}>
        <Button
          title={t('AgentAgentProfileScreen', 'cancel')}
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
          title={t('AgentAgentProfileScreen', 'updatePassword')}
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
                <Text style={styles.sectionTitle}>{t('AgentAgentProfileScreen', 'offerStatistics')}</Text>
                
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{offerStats.total_offers || 0}</Text>
                    <Text style={styles.statLabel}>{t('AgentAgentProfileScreen', 'totalOffers')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#28a745' }]}>{offerStats.accepted_offers || 0}</Text>
                    <Text style={styles.statLabel}>{t('AgentAgentProfileScreen', 'accepted')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#dc3545' }]}>{offerStats.rejected_offers || 0}</Text>
                    <Text style={styles.statLabel}>{t('AgentAgentProfileScreen', 'rejected')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#17a2b8' }]}>{offerStats.viewed_offers || 0}</Text>
                    <Text style={styles.statLabel}>{t('AgentAgentProfileScreen', 'viewed')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#ffc107' }]}>{offerStats.not_viewed_offers || 0}</Text>
                    <Text style={styles.statLabel}>{t('AgentAgentProfileScreen', 'notViewed')}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('AgentAgentProfileScreen', 'accountActions')}</Text>
            
            <Button
              title={t('AgentAgentProfileScreen', 'deleteAccount')}
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
  <Text style={styles.overlayTitle}>{t('AgentAgentProfileScreen', 'changePasswordConfirmTitle')}</Text>
  <Text style={styles.overlayText}>
    {t('AgentAgentProfileScreen', 'changePasswordConfirmMessage')}
  </Text>
  <View style={styles.overlayButtons}>
    <Button
      title={t('AgentAgentProfileScreen', 'cancel')}
      type="outline"
      buttonStyle={styles.cancelButton}
      containerStyle={styles.overlayButtonContainer}
      onPress={() => setPasswordConfirmVisible(false)}
    />
    <Button
      title={passwordChangeLoading ? t('AgentAgentProfileScreen', 'updating') : t('AgentAgentProfileScreen', 'confirm')}
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
        <Text style={styles.overlayTitle}>{t('AgentAgentProfileScreen', 'deleteAccountConfirmTitle')}</Text>
        <Text style={styles.overlayText}>
          {t('AgentAgentProfileScreen', 'deleteAccountConfirmMessage')}
        </Text>
        <View style={styles.overlayButtons}>
          <Button
            title={t('AgentAgentProfileScreen', 'cancel')}
            type="outline"
            buttonStyle={styles.cancelButton}
            containerStyle={styles.overlayButtonContainer}
            onPress={() => setDeleteConfirmVisible(false)}
          />
          <Button
            title={deleteLoading ? t('AgentAgentProfileScreen', 'deleting') : t('AgentAgentProfileScreen', 'delete')}
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
