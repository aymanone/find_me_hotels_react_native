import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { 
  Text, 
  Input, 
  Button, 
  Icon, 
  Card, 
  Divider 
} from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser, signOut } from '../utils/auth';
import { validPasswordSignup } from '../utils/validation';

export default function ClientClientProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [countries, setCountries] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    second_name: '',
    client_country: '',
  });
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    checkUserAccess();
    fetchCountries();
  }, []);

  const checkUserAccess = async () => {
    try {
      const isClient = await checkUserRole('client');
      if (!isClient) {
        Alert.alert(
          'Access Denied',
          'You do not have permission to access this page.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // Get user email
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.email) {
        setUserEmail(currentUser.email);
        fetchClientProfile(currentUser.id);
      } else {
        throw new Error('User information not available');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      Alert.alert('Error', 'Failed to verify your account. Please try again.');
      navigation.goBack();
    }
  };

  const fetchClientProfile = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          first_name,
          second_name,
          client_country,
          countries (
            id,
            country_name
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          first_name: data.first_name || '',
          second_name: data.second_name || '',
          client_country: data.client_country || '',
        });
      }
    } catch (error) {
      console.error('Error fetching client profile:', error);
      Alert.alert(
        'Error',
        'Failed to load your profile information.',
        [
          { text: 'Try Again', onPress: () => {
                setTimeout(() => checkUserAccess(), 100);
                   } },
          { text: 'Close', style: 'cancel', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, country_name')
        .order('country_name');

      if (error) throw error;
      
      // Format countries for dropdown
      const formattedCountries = data.map(country => ({
        label: country.country_name,
        value: country.id
      }));
      
      setCountries(formattedCountries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
      Alert.alert('Error', 'Failed to load countries list.');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing again
    if (passwordError) setPasswordError('');
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
        const user = await getCurrentUser();
        if (!user) {
          Alert.alert('Error', 'User not found. Please log in again.');
          await signOut(navigation);
          return;
        }
      const { error } = await supabase
        .from('clients')
        .update({
          first_name: formData.first_name,
          second_name: formData.second_name,
          client_country: formData.client_country,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      // Get updated country name
      const selectedCountry = countries.find(c => c.value === formData.client_country);
      
      // Update local profile data
      setProfile(prev => ({
        ...prev,
        first_name: formData.first_name,
        second_name: formData.second_name,
        client_country: formData.client_country,
        countries: {
          id: formData.client_country,
          country_name: selectedCountry ? selectedCountry.label : ''
        }
      }));
      
      setIsEditing(false);
      Alert.alert('Success', 'Your profile has been updated successfully.');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    try {
      // Validate passwords
      if (passwordData.password !== passwordData.confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }

      if (!validPasswordSignup(passwordData.password)) {
        setPasswordError('Password must be at least 8 characters long and include a number');
        return;
      }

      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.password
      });

      if (error) throw error;
      
      setPasswordData({ password: '', confirmPassword: '' });
      setIsChangingPassword(false);
      Alert.alert('Success', 'Your password has been updated successfully.');
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', 'Failed to update your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount }
      ]
    );
  };

  const deleteAccount = async () => {
    try {
      setLoading(true);
      
      // First delete the client record
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', profile.id);

      if (clientError) throw clientError;
      
      // Then sign out the user
      await signOut(navigation);
      
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete your account. Please try again.');
      setLoading(false);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card containerStyle={styles.card}>
          <Card.Title style={styles.cardTitle}>My Profile</Card.Title>
          <Divider style={styles.divider} />

          {/* Profile Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {isEditing ? (
              <>
                <Input
                  label="First Name"
                  value={formData.first_name}
                  onChangeText={(value) => handleInputChange('first_name', value)}
                  placeholder="Enter your first name"
                  containerStyle={styles.inputContainer}
                />
                
                <Input
                  label="Last Name"
                  value={formData.second_name}
                  onChangeText={(value) => handleInputChange('second_name', value)}
                  placeholder="Enter your last name"
                  containerStyle={styles.inputContainer}
                />
                
                <Text style={styles.pickerLabel}>Country</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  inputSearchStyle={styles.inputSearchStyle}
                  iconStyle={styles.iconStyle}
                  data={countries}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Select country"
                  value={formData.client_country}
                  onChange={item => {
                    handleInputChange('client_country', item.value);
                  }}
                  search
                  searchPlaceholder="Search country..."
                  renderItem={item => (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.textItem}>{item.label}</Text>
                    </View>
                  )}
                />
                
                <View style={styles.buttonRow}>
                  <Button
                    title="Cancel"
                    type="outline"
                    onPress={() => {
                      setFormData({
                        first_name: profile.first_name || '',
                        second_name: profile.second_name || '',
                        client_country: profile.client_country || '',
                      });
                      setIsEditing(false);
                    }}
                    containerStyle={styles.buttonContainer}
                  />
                  <Button
                    title="Save"
                    onPress={saveProfile}
                    containerStyle={styles.buttonContainer}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{userEmail || 'Not available'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>First Name:</Text>
                  <Text style={styles.infoValue}>{profile?.first_name || 'Not set'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Name:</Text>
                  <Text style={styles.infoValue}>{profile?.second_name || 'Not set'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Country:</Text>
                  <Text style={styles.infoValue}>
                    {profile?.countries?.country_name || 'Not set'}
                  </Text>
                </View>
                
                <Button
                  title="Edit Profile"
                  icon={<Icon name="edit" type="material" color="white" size={20} style={styles.buttonIcon} />}
                  onPress={() => setIsEditing(true)}
                  containerStyle={styles.fullButtonContainer}
                />
              </>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            {isChangingPassword ? (
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
                
                <View style={styles.buttonRow}>
                  <Button
                    title="Cancel"
                    type="outline"
                    onPress={() => {
                      setPasswordData({ password: '', confirmPassword: '' });
                      setPasswordError('');
                      setIsChangingPassword(false);
                    }}
                    containerStyle={styles.buttonContainer}
                  />
                  <Button
                    title="Update Password"
                    onPress={updatePassword}
                    containerStyle={styles.buttonContainer}
                  />
                </View>
              </>
            ) : (
              <Button
                title="Change Password"
                icon={<Icon name="lock" type="material" color="white" size={20} style={styles.buttonIcon} />}
                onPress={() => setIsChangingPassword(true)}
                containerStyle={styles.fullButtonContainer}
              />
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Delete Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <Button
              title="Delete Account"
              icon={<Icon name="delete" type="material" color="white" size={20} style={styles.buttonIcon} />}
              buttonStyle={styles.deleteButton}
              onPress={confirmDeleteAccount}
              containerStyle={styles.fullButtonContainer}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 10,
    padding: 15,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#86939e',
    marginLeft: 10,
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 5,
    marginBottom: 20,
    marginHorizontal: 10,
  },
  picker: {
  },
  dropdown: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 20,
    marginHorizontal: 10,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonContainer: {
    width: '48%',
  },
  fullButtonContainer: {
    width: '100%',
  },
  buttonIcon: {
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: 'red',
  },
});
