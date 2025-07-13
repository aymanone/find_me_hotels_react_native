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
import { Text, Button, Input, Icon } from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole , getCurrentUser,signOut} from '../utils/auth';
import { validPasswordSignup } from '../utils/validation';

export default function AdminAdminProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if user is admin
      const user = await checkUserRole("admin");
      
      if (!user) {
        setError('You do not have permission to access this page.');
        setLoading(false);
        return;
      }
      
      // Fetch admin details
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setAdmin(data);
      } else {
        setError('Admin profile not found.');
      }
    } catch (err) {
      console.error('Error loading admin profile:', err);
      setError('Failed to load admin profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validate passwords
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (!validPasswordSignup(newPassword)) {
      Alert.alert('Error', 'Password must be at least 8 characters long and contain at least one number, one uppercase letter, and one special character.');
      return;
    }

    setUpdating(true);
    
    try {
         const user = await getCurrentUser();
        if (!user) {
          Alert.alert('Error', 'User not found. Please log in again.');
          await signOut(navigation);
          return;
        }
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      Alert.alert('Success', 'Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error updating password:', err);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          title="Reload" 
          onPress={loadAdminProfile} 
          containerStyle={styles.buttonContainer}
        />
        <Button 
          title="Go Back" 
          onPress={() => navigation.goBack()} 
          type="outline"
          containerStyle={styles.buttonContainer}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileSection}>
          <Text h4 style={styles.sectionTitle}>Admin Profile</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>First Name:</Text>
            <Text style={styles.value}>{admin.first_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Last Name:</Text>
            <Text style={styles.value}>{admin.second_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{admin.admin_email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Permission Status:</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator, 
                admin.permitted_to_work ? styles.statusActive : styles.statusInactive
              ]} />
              <Text style={styles.value}>
                {admin.permitted_to_work ? 'Permitted to work' : 'Not permitted to work'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.passwordSection}>
          <Text h4 style={styles.sectionTitle}>Change Password</Text>
          
          <Input
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            containerStyle={styles.inputContainer}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  type="ionicon" 
                />
              </TouchableOpacity>
            }
          />
          
          <Input
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            containerStyle={styles.inputContainer}
          />
          
          <Button
            title="Update Password"
            onPress={handlePasswordChange}
            loading={updating}
            containerStyle={styles.buttonContainer}
          />
        </View>
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
    padding: 20,
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
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    width: '35%',
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#F44336',
  },
  inputContainer: {
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%',
  },
});
