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
  Overlay,
} from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { validPasswordSignup } from '../utils/validation';
import {showAlert} from "../components/ShowAlert";
const CompanyCompanyProfileScreen = ({ navigation }) => {
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
          showAlert('Access Denied', 'You do not have permission to view this page.');
          navigation.goBack();
          return;
        }

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          showAlert('Error', 'User not found. Please log in again.');
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
      'Error', 
      'Failed to load profile data',
      [
        { text: 'Try Again', onPress: () => {
         setTimeout(() => fetchCompanyProfile(), 100);
}  },
        { text: 'Cancel', style: 'cancel' }
      ]
    ); 
          return;
        }

        setCompany(data);
      } catch (error) {
        console.error('Error in fetchCompanyProfile:', error);
        showAlert('Error', 'An unexpected error occurred');
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

const confirmPasswordChange = async () => {
  // Validate passwords
  if (passwordData.password !== passwordData.confirmPassword) {
    setPasswordError('Passwords do not match');
    return;
  }

  if (!validPasswordSignup(passwordData.password)) {
    setPasswordError('Password must be at least 8 characters with letters and numbers');
    return;
  }

  await updatePassword();
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
    
    showAlert('Success', 'Your password has been updated successfully.');
  } catch (error) {
    console.error('Error updating password:', error.message);
    showAlert('Error', 'Failed to update your password. Please try again.');
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
          showAlert('Error', `Cannot open URL: ${fullUrl}`);
        }
      })
      .catch(err => console.error('Error opening URL:', err));
  };

  const handleDeleteAccount = async () => {
    try {
      // Get current user to verify permissions
      const user = await getCurrentUser();
      if (!user) {
        showAlert('Error', 'User not found. Please log in again.');
        await signOut(navigation);
        return;
      }

      // Check if user has permission to delete
      if (user.id !== company.user_id || user.app_metadata?.permitted_to_work !== true) {
        showAlert('Access Denied', 'You do not have permission to delete this account.');
        return;
      }

      // Confirm deletion
      showAlert(
        'Delete Account',
        'Are you sure you want to delete your company account? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
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
                  showAlert('Error', 'Failed to delete company account');
                  return;
                }

                showAlert(
                  'Account Deleted',
                  'Your company account has been successfully deleted.',
                  [
                    { 
                      text: 'OK', 
                      onPress: async () => {
                        // Sign out user after successful deletion
                        await signOut(navigation);
                      }
                    }
                  ]
                );
              } catch (error) {
                console.error('Error in delete process:', error);
                showAlert('Error', 'An unexpected error occurred during deletion');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleDeleteAccount:', error);
      showAlert('Error', 'An unexpected error occurred');
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
        <Text style={styles.errorText}>Company profile not found or you don't have permission to view it.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card containerStyle={styles.card}>
        <Text style={styles.sectionTitle}>Company Profile</Text>
        <Divider style={styles.divider} />
        
        {/* Company Name */}
        <View style={styles.infoRow}>
          <Icon name="business-outline" type="ionicon" size={20} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.label}>Company Name:</Text>
            <Text style={styles.value}>{company.company_name}</Text>
          </View>
        </View>
        
        {/* Company Email */}
        <View style={styles.infoRow}>
          <Icon name="mail-outline" type="ionicon" size={20} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{company.company_email}</Text>
          </View>
        </View>
        
        {/* Company Country */}
        {company.countries && (
          <View style={styles.infoRow}>
            <Icon name="globe-outline" type="ionicon" size={20} color="#007bff" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>Country:</Text>
              <Text style={styles.value}>{company.countries.country_name}</Text>
            </View>
          </View>
        )}
        
        {/* Company Address (if available) */}
        {company.address && (
          <View style={styles.infoRow}>
            <Icon name="location-outline" type="ionicon" size={20} color="#007bff" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{company.address}</Text>
            </View>
          </View>
        )}
        
        {/* Company URL (if available) */}
        {company.url && (
          <View style={styles.infoRow}>
            <Icon name="globe-outline" type="ionicon" size={20} color="#007bff" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>Website:</Text>
              <TouchableOpacity onPress={() => openUrl(company.url)}>
                <Text style={styles.linkValue}>{company.url}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
      {/* Password Change Card */}
<Card containerStyle={styles.card}>
  <Text style={styles.sectionTitle}>Security</Text>
  <Divider style={styles.divider} />
  
  {!isChangingPassword ? (
    <Button
      title="Change Password"
      icon={<Icon name="lock-closed-outline" type="ionicon" color="white" size={20} style={styles.buttonIcon} />}
      buttonStyle={styles.securityButton}
      onPress={() => setIsChangingPassword(true)}
    />
  ) : (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>New Password</Text>
        <View style={styles.passwordInputContainer}>
          <Input
            value={passwordData.password}
            onChangeText={(value) => handlePasswordChange('password', value)}
            placeholder="Enter new password"
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
        
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={styles.passwordInputContainer}>
          <Input
            value={passwordData.confirmPassword}
            onChangeText={(value) => handlePasswordChange('confirmPassword', value)}
            placeholder="Confirm new password"
            secureTextEntry={!showPassword}
            errorMessage={passwordError}
            containerStyle={styles.passwordInput}
          />
        </View>
        
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
      </View>
    </>
  )}
</Card>
      {/* Delete Account Button */}
      <Card containerStyle={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Divider style={styles.divider} />
        <Text style={styles.dangerText}>
          Deleting your account will permanently remove all your data from our system.
          This action cannot be undone.
        </Text>
        <Button
          title="Delete Account"
          icon={<Icon name="trash-outline" type="ionicon" color="white" size={20} style={styles.buttonIcon} />}
          buttonStyle={styles.deleteButton}
          onPress={handleDeleteAccount}
        />
      </Card>
    </ScrollView>
 
  );
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
