import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { Text, Button, Input, Icon } from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole , getCurrentUser,signOut} from '../utils/auth';
import { validPasswordSignup } from '../utils/validation';
import {showAlert} from "../components/ShowAlert";
import { useTranslation} from '../config/localization';

export default function AdminAdminProfileScreen({ navigation }) {
  const { t,language } = useTranslation();
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
      const isAdmin = await checkUserRole("admin");
      
      if (!isAdmin) {
        setError(t('AdminAdminProfileScreen', 'accessDenied'));
        setLoading(false);
        return;
      }
      
      // Fetch admin details
       const user = await getCurrentUser();
      if (!user) {
        showAlert(t('AdminAdminProfileScreen', 'error'), t('AdminAdminProfileScreen', 'userNotFound'));
        await signOut(navigation);
        return;
      }
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setAdmin(data);
      } else {
        setError(t('AdminAdminProfileScreen', 'profileNotFound'));
      }
    } catch (err) {
      console.error('Error loading admin profile:', err);
      setError(t('AdminAdminProfileScreen', 'loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validate passwords
    if (!newPassword || !confirmPassword) {
      showAlert(t('AdminAdminProfileScreen', 'error'), t('AdminAdminProfileScreen', 'passwordFieldsRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert(t('AdminAdminProfileScreen', 'error'), t('AdminAdminProfileScreen', 'passwordsDoNotMatch'));
      return;
    }

    if (!validPasswordSignup(newPassword)) {
      showAlert(t('AdminAdminProfileScreen', 'error'), t('AdminAdminProfileScreen', 'passwordRequirements'));
      return;
    }

    setUpdating(true);
    
    try {
         const user = await getCurrentUser();
        if (!user) {
          showAlert(t('AdminAdminProfileScreen', 'error'), t('AdminAdminProfileScreen', 'userNotFound'));
          await signOut(navigation);
          return;
        }
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      showAlert(t('AdminAdminProfileScreen', 'success'), t('AdminAdminProfileScreen', 'passwordUpdateSuccess'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error updating password:', err);
      showAlert(t('AdminAdminProfileScreen', 'error'), t('AdminAdminProfileScreen', 'passwordUpdateError'));
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
          title={t('AdminAdminProfileScreen', 'reload')} 
          onPress={loadAdminProfile} 
          containerStyle={styles.buttonContainer}
        />
        <Button 
          title={t('AdminAdminProfileScreen', 'goBack')} 
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
          <Text h4 style={styles.sectionTitle}>{t('AdminAdminProfileScreen', 'adminProfile')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminAdminProfileScreen', 'firstName')}</Text>
            <Text style={styles.value}>{admin.first_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminAdminProfileScreen', 'lastName')}</Text>
            <Text style={styles.value}>{admin.second_name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminAdminProfileScreen', 'email')}</Text>
            <Text style={styles.value}>{admin.admin_email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('AdminAdminProfileScreen', 'permissionStatus')}</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator, 
                admin.permitted_to_work ? styles.statusActive : styles.statusInactive
              ]} />
              <Text style={styles.value}>
                {admin.permitted_to_work ? t('AdminAdminProfileScreen', 'permittedToWork') : t('AdminAdminProfileScreen', 'notPermittedToWork')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.passwordSection}>
          <Text h4 style={styles.sectionTitle}>{t('AdminAdminProfileScreen', 'changePassword')}</Text>
          
          <Input
            placeholder={t('AdminAdminProfileScreen', 'newPassword')}
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
            placeholder={t('AdminAdminProfileScreen', 'confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            containerStyle={styles.inputContainer}
          />
          
          <Button
            title={t('AdminAdminProfileScreen', 'updatePassword')}
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
