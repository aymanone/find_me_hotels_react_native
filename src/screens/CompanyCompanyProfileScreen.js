import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Linking
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Icon, 
  Divider,
  Input,
  Overlay
} from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { validPasswordSignup } from '../utils/validation';
import { showAlert } from "../components/ShowAlert";
import {  useTranslation} from '../config/localization';

const CompanyCompanyProfileScreen = ({ navigation }) => {
  const { t,language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
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
    const fetchCompanyProfile = async () => {
      try {
        // Check if user has company role
        const isValidCompany = await checkUserRole('company');
        if (!isValidCompany) {
          showAlert(
            t('CompanyCompanyProfileScreen', 'accessDenied'),
            t('CompanyCompanyProfileScreen', 'accessDeniedMessage')
          );
          navigation.goBack();
          return;
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          showAlert(
            t('CompanyCompanyProfileScreen', 'error'),
            t('CompanyCompanyProfileScreen', 'userNotFound')
          );
          await signOut(navigation);
          return;
        }

        // Fetch company data
        const { data, error } = await supabase
          .from('companies')
          .select(`
            id, 
            company_name, 
            company_email, 
            address, 
            url, 
            user_id,
            countries (
              country_name
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching company data:', error);
          showAlert(
            t('CompanyCompanyProfileScreen', 'error'),
            t('CompanyCompanyProfileScreen', 'failedToLoadProfile'),
            [
              { 
                text: t('CompanyCompanyProfileScreen', 'tryAgain'), 
                onPress: () => {
                  setTimeout(() => fetchCompanyProfile(), 100);
                }  
              },
              { text: t('CompanyCompanyProfileScreen', 'cancel'), style: 'cancel' }
            ]
          ); 
          return;
        }

        setCompany(data);
      } catch (error) {
        console.error('Error in fetchCompanyProfile:', error);
        showAlert(
          t('CompanyCompanyProfileScreen', 'error'),
          t('CompanyCompanyProfileScreen', 'unexpectedError')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
  }, [navigation]);

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setPasswordError('');
  };

  const confirmPasswordChange = () => {
    // Validate passwords
    if (passwordData.password !== passwordData.confirmPassword) {
      setPasswordError(t('CompanyCompanyProfileScreen', 'passwordsDoNotMatch'));
      return;
    }

    if (!validPasswordSignup(passwordData.password)) {
      setPasswordError(t('CompanyCompanyProfileScreen', 'passwordRequirements'));
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
      showAlert(
        t('CompanyCompanyProfileScreen', 'security'),
        t('CompanyCompanyProfileScreen', 'passwordUpdateSuccess')
      );
    } catch (error) {
      console.error('Error updating password:', error.message);
      showAlert(
        t('CompanyCompanyProfileScreen', 'error'),
        t('CompanyCompanyProfileScreen', 'passwordUpdateError')
      );
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const openUrl = (url) => {
    if (!url) return;
    
    // Add http:// if not present
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `http://${url}`;
    }
    
    Linking.canOpenURL(fullUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(fullUrl);
        } else {
          showAlert(
            t('CompanyCompanyProfileScreen', 'error'),
            t('CompanyCompanyProfileScreen', 'cannotOpenUrl', { url: fullUrl })
          );
        }
      })
      .catch(err => console.error('Error opening URL:', err));
  };

  const handleDeleteAccount = async () => {
    try {
      // Get current user to verify permissions
      const user = await getCurrentUser();
      if (!user) {
        showAlert(
          t('CompanyCompanyProfileScreen', 'error'),
          t('CompanyCompanyProfileScreen', 'userNotFound')
        );
        await signOut(navigation);
        return;
      }

      // Check if user has permission to delete
      if (user.id !== company.user_id || user.app_metadata?.permitted_to_work !== true) {
        showAlert(
          t('CompanyCompanyProfileScreen', 'accessDenied'),
          t('CompanyCompanyProfileScreen', 'deleteAccountDenied')
        );
        return;
      }

      // Confirm deletion
      showAlert(
        t('CompanyCompanyProfileScreen', 'deleteAccountConfirmTitle'),
        t('CompanyCompanyProfileScreen', 'deleteAccountConfirmMessage'),
        [
          { text: t('CompanyCompanyProfileScreen', 'cancel'), style: 'cancel' },
          { 
            text: t('CompanyCompanyProfileScreen', 'delete'), 
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete company from database
                const { error } = await supabase
                  .from('companies')
                  .delete()
                  .eq('id', company.id);

                if (error) {
                  console.error('Error deleting company:', error);
                  showAlert(
                    t('CompanyCompanyProfileScreen', 'error'),
                    t('CompanyCompanyProfileScreen', 'deleteAccountError')
                  );
                  return;
                }

                showAlert(
                  t('CompanyCompanyProfileScreen', 'accountDeleted'),
                  t('CompanyCompanyProfileScreen', 'accountDeletedMessage'),
                  [
                    { 
                      text: t('CompanyCompanyProfileScreen', 'ok'), 
                      onPress: async () => {
                        // Sign out user after successful deletion
                        await signOut(navigation);
                      }
                    }
                  ]
                );
              } catch (error) {
                console.error('Error in delete process:', error);
                showAlert(
                  t('CompanyCompanyProfileScreen', 'error'),
                  t('CompanyCompanyProfileScreen', 'deleteProcessError')
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleDeleteAccount:', error);
      showAlert(
        t('CompanyCompanyProfileScreen', 'error'),
        t('CompanyCompanyProfileScreen', 'unexpectedError')
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {t('CompanyCompanyProfileScreen', 'profileNotFound')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('CompanyCompanyProfileScreen', 'companyProfile')}
        </Text>
        <Divider style={styles.divider} />
        
        {/* Company Name */}
        <View style={styles.infoRow}>
          <Icon name="business-outline" type="ionicon" size={20} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.label}>
              {t('CompanyCompanyProfileScreen', 'companyName')}
            </Text>
            <Text style={styles.value}>{company.company_name}</Text>
          </View>
        </View>
        
        {/* Company Email */}
        <View style={styles.infoRow}>
          <Icon name="mail-outline" type="ionicon" size={20} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.label}>
              {t('CompanyCompanyProfileScreen', 'email')}
            </Text>
            <Text style={styles.value}>{company.company_email}</Text>
          </View>
        </View>
        
        {/* Company Country */}
        {company.countries && (
          <View style={styles.infoRow}>
            <Icon name="globe-outline" type="ionicon" size={20} color="#007bff" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>
                {t('CompanyCompanyProfileScreen', 'country')}
              </Text>
              <Text style={styles.value}>{company.countries.country_name}</Text>
            </View>
          </View>
        )}
        
        {/* Company Address (if available) */}
        {company.address && (
          <View style={styles.infoRow}>
            <Icon name="location-outline" type="ionicon" size={20} color="#007bff" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>
                {t('CompanyCompanyProfileScreen', 'address')}
              </Text>
              <Text style={styles.value}>{company.address}</Text>
            </View>
          </View>
        )}
        
        {/* Company URL (if available) */}
        {company.url && (
          <View style={styles.infoRow}>
            <Icon name="globe-outline" type="ionicon" size={20} color="#007bff" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>
                {t('CompanyCompanyProfileScreen', 'website')}
              </Text>
              <TouchableOpacity onPress={() => openUrl(company.url)}>
                <Text style={styles.linkValue}>{company.url}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>

      {/* Password Change Card */}
      <Card containerStyle={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('CompanyCompanyProfileScreen', 'security')}
        </Text>
        <Divider style={styles.divider} />
        
        {!isChangingPassword ? (
          <Button
            title={t('CompanyCompanyProfileScreen', 'changePassword')}
            icon={<Icon name="lock-closed-outline" type="ionicon" color="white" size={20} style={styles.buttonIcon} />}
            buttonStyle={styles.securityButton}
            onPress={() => setIsChangingPassword(true)}
          />
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                {t('CompanyCompanyProfileScreen', 'newPassword')}
              </Text>
              <View style={styles.passwordInputContainer}>
                <Input
                  value={passwordData.password}
                  onChangeText={(value) => handlePasswordChange('password', value)}
                  placeholder={t('CompanyCompanyProfileScreen', 'enterNewPassword')}
                  secureTextEntry={!showPassword}
                  rightIcon={
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      type="ionicon"
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  containerStyle={styles.passwordInput}
                />
              </View>
              
              <Text style={styles.inputLabel}>
                {t('CompanyCompanyProfileScreen', 'confirmPassword')}
              </Text>
              <View style={styles.passwordInputContainer}>
                <Input
                  value={passwordData.confirmPassword}
                  onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
                  placeholder={t('CompanyCompanyProfileScreen', 'confirmNewPassword')}
                  secureTextEntry={!showPassword}
                  errorMessage={passwordError}
                  containerStyle={styles.passwordInput}
                />
              </View>
              
              <View style={styles.passwordButtonsContainer}>
                <Button
                  title={t('CompanyCompanyProfileScreen', 'cancel')}
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
                  title={t('CompanyCompanyProfileScreen', 'updatePassword')}
                  buttonStyle={styles.saveButton}
                  containerStyle={styles.passwordButtonContainer}
                  onPress={confirmPasswordChange}
                />
              </View>
            </View>
          </>
        )}
      </Card>

      {/* Delete Account Button */}
      <Card containerStyle={styles.dangerCard}>
        <Text style={styles.dangerTitle}>
          {t('CompanyCompanyProfileScreen', 'dangerZone')}
        </Text>
        <Divider style={styles.divider} />
        <Text style={styles.dangerText}>
          {t('CompanyCompanyProfileScreen', 'deleteAccountWarning')}
        </Text>
        <Button
          title={t('CompanyCompanyProfileScreen', 'deleteAccount')}
          icon={<Icon name="trash-outline" type="ionicon" color="white" size={20} style={styles.buttonIcon} />}
          buttonStyle={styles.deleteButton}
          onPress={handleDeleteAccount}
        />
      </Card>

      {/* Password Change Confirmation Overlay */}
      <Overlay
        isVisible={passwordConfirmVisible}
        onBackdropPress={() => setPasswordConfirmVisible(false)}
        overlayStyle={styles.overlay}
      >
        <Text style={styles.overlayTitle}>
          {t('CompanyCompanyProfileScreen', 'changePasswordTitle')}
        </Text>
        <Text style={styles.overlayText}>
          {t('CompanyCompanyProfileScreen', 'changePasswordConfirmation')}
        </Text>
        <View style={styles.overlayButtons}>
          <Button
            title={t('CompanyCompanyProfileScreen', 'cancel')}
            type="outline"
            buttonStyle={styles.cancelButton}
            containerStyle={styles.overlayButtonContainer}
            onPress={() => setPasswordConfirmVisible(false)}
          />
          <Button
            title={passwordChangeLoading ? t('CompanyCompanyProfileScreen', 'updating') : t('CompanyCompanyProfileScreen', 'confirm')}
            buttonStyle={styles.saveButton}
            containerStyle={styles.overlayButtonContainer}
            onPress={updatePassword}
            disabled={passwordChangeLoading}
            loading={passwordChangeLoading}
          />
        </View>
      </Overlay>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  card: {
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  divider: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  linkValue: {
    fontSize: 16,
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  dangerCard: {
    borderRadius: 10,
    marginBottom: 15,
    borderColor: '#dc3545',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 15,
  },
  dangerText: {
    marginBottom: 15,
    color: '#555',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 5,
  },
  buttonIcon: {
    marginRight: 10,
  },
  securityButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  passwordInputContainer: {
    marginBottom: 10,
  },
  passwordInput: {
    paddingHorizontal: 0,
  },
  passwordButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  passwordButtonContainer: {
    width: '48%',
  },
  saveButton: {
    backgroundColor: '#28a745',
    borderRadius: 5,
  },
  cancelButton: {
    borderColor: '#6c757d',
    borderRadius: 5,
  },
  overlay: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  overlayText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  overlayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayButtonContainer: {
    width: '48%',
  },
});

export default CompanyCompanyProfileScreen;
