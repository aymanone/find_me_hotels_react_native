import React, { useState, useEffect } from 'react';
import { View, StyleSheet,} from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import { validPasswordSignup } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';

export default function ResetPasswordScreen({ navigation, route }) {
  const { t,language } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [sessionEstablished, setSessionEstablished] = useState(false);

  const { setIsResettingPassword } = useAuth();

  // Extract tokens from route params
  const { access_token, refresh_token } = route.params || {};

  // Set up the session when component mounts
  useEffect(() => {
    const setupSession = async () => {
      if (access_token && refresh_token) {
        try {
          // Set the resetting flag before setting session
          setIsResettingPassword(true);
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          
          if (error) {
            console.error('Error setting session:', error.message);
            showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'resetError'));
            setIsResettingPassword(false); // Reset flag on error
            navigation.navigate('Signin');
            return;
          }
          
          setSessionEstablished(true);
        } catch (err) {
          console.error('Session setup error:', err.message);
          showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'resetError'));
          setIsResettingPassword(false); // Reset flag on error
          navigation.navigate('Signin');
        }
      } else {
        showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'resetError'));
        navigation.navigate('Signin');
      }
    };

    setupSession();
    
    // Cleanup function to reset flag when component unmounts
    return () => {
      setIsResettingPassword(false);
    };
  }, [access_token, refresh_token, navigation, setIsResettingPassword]);

  const handleUpdatePassword = async () => {
    // Validate password
    if (!validPasswordSignup(password)) {
      setPasswordError(t('ResetPasswordScreen', 'invalidPassword'));
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'passwordMismatch'));
      return;
    }

    // Check if session is established
    if (!sessionEstablished) {
      showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'resetError'));
      return;
    }

    try {
      setLoading(true);
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      // Reset the flag before showing success and navigating
      setIsResettingPassword(false);
      
      showAlert(
        t('Alerts', 'success'), 
        t('ResetPasswordScreen', 'resetSuccess'),
        [{ text: 'OK', onPress: () => navigation.navigate('Signin') }]
      );
    } catch (error) {
      console.error('Update password error:', error.message);
      // Reset flag on error
      setIsResettingPassword(false);
      showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'resetError'), [
        { text: 'OK', onPress: () => navigation.navigate('Signin') }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      <Text  style={styles.title}>{t('ResetPasswordScreen', 'title')}</Text>
      <Text style={styles.subtitle}>
        {t('ResetPasswordScreen', 'enterNewPassword')}
      </Text>
      
      <Input
        placeholder={t('ResetPasswordScreen', 'newPassword')}
        onChangeText={(text) => {
          setPassword(text);
          setPasswordError('');
        }}
        value={password}
        secureTextEntry={!showPassword}
        rightIcon={{ 
             type: 'font-awesome', 
             name: showPassword ? 'eye-slash' : 'eye',
             size: theme.responsiveComponents.icon.medium,
             color: theme.colors.textSecondary,
             onPress: () => setShowPassword(!showPassword)
       }}
        errorMessage={passwordError}
        disabled={!sessionEstablished || loading}
      />
      
      <Input
        placeholder={t('ResetPasswordScreen', 'confirmPassword')}
        onChangeText={setConfirmPassword}
        value={confirmPassword}
        secureTextEntry={!showPassword}
        disabled={!sessionEstablished || loading}
      />
      
      <Button
        title={sessionEstablished ? t('ResetPasswordScreen', 'resetPassword') : t('Alerts', 'loading')}
        onPress={handleUpdatePassword}
        loading={loading}
        disabled={!sessionEstablished || loading}
        buttonStyle={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  
  languageSelectorContainer: {
    position: 'absolute',
    top: responsive(40, 50, 50, 50, 50),
    right: theme.spacing.xl,
    zIndex: 1,
  },
  
  title: {
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    fontSize: theme.responsiveTypography.h3.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  
  subtitle: {
    marginBottom: theme.spacing.xxxl,
    textAlign: 'center',
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  
  button: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
});