import React, { useEffect,useState } from 'react';
import { View, StyleSheet,  Platform } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import Constants from 'expo-constants';
import {validEmail} from '../utils/validation';
import {signOut,notAllowedAuthenticatedUser} from '../utils/auth';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';

export default function ForgotPasswordScreen({ navigation }) {
  const { t,language } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
useEffect(() => {
  // Define async function inside
  const handleAsyncWork = async () => {
    try {
      const isAllowed = await notAllowedAuthenticatedUser();
      if (!isAllowed) {
         console.log("an Authenticated User trying to access nn auth screen");
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };
  
  // Call it immediately
  handleAsyncWork();
}, [navigation]);
  const handleResetPassword = async () => {
    if (!email) {
      showAlert(t('Alerts', 'error'), t('ForgotPasswordScreen', 'enterEmail'));
      return;
    }
     if (!validEmail(email.trim())) {
      showAlert(t('ContactUsScreen', 'invalidEmail') || 'Please enter a valid email address');
      return;
    }
    try {
      setLoading(true);
      
      // Determine the appropriate redirect URL based on platform
      let redirectTo;
     let screen='';
      
      if (Platform.OS === 'web') {
        // For web, redirect to the web reset page
        redirectTo = `${window.location.origin}/reset-password`;
        screen=redirectTo;
      } else {
        // For mobile, use deep linking with the correct format
        if (__DEV__) {
        // In development, we need to use a URL that works with Expo's development server
        // but is compatible with React Native's Linking
        
        // Get the development server URL from Constants
        // This works even with React Native's Linking because we're just using Constants to get the host
        const devHost = Constants.manifest?.hostUri?.split(':').slice(0, 2).join(':');
        
        if (devHost) {
          // Format for Expo development: exp://192.168.1.109:8081/--/reset-password short url is https://shorturl.at/9ZxIQ
          redirectTo = `exp://${devHost}/--/reset-password`;
          screen=redirectTo;
        } else {
          // Fallback to your app's custom URL scheme
          redirectTo = 'alghorfa://reset-password';
          screen=redirectTo;
        }
      } else {
        // For production, use your app's custom URL scheme
        redirectTo = 'alghorfa://reset-password';
        screen=redirectTo;
      }
        
      }
      redirectTo="https://bucolic-banoffee-2f9450.netlify.app/supabase_redirect.html";
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectTo,
      });

      if (error) throw error;
      
     showAlert (
        t('Alerts', 'success'), 
        t('ForgotPasswordScreen', 'resetSuccess'),
        [{ text: 'OK', onPress: () => navigation.navigate('Signin') }]
      );
    } catch (error) {
      console.error('Reset password error:', error.message);
     showAlert (t('Alerts', 'error'), t('ForgotPasswordScreen', 'resetError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      <Text  style={styles.title}>{t('ForgotPasswordScreen', 'title')}</Text>
      <Text style={styles.subtitle}>
        {t('ForgotPasswordScreen', 'enterEmail')}
      </Text>
      
      <Input
        placeholder={t('ForgotPasswordScreen', 'email')}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        leftIcon={{ 
           type: 'font-awesome', 
           name: 'envelope',
           size: theme.responsiveComponents.icon.medium,
           color: theme.colors.textSecondary
}}
      />
      
      <Button
        title={t('ForgotPasswordScreen', 'resetPassword')}
        onPress={handleResetPassword}
        loading={loading}
        buttonStyle={styles.button}
      />
      
      <Button
        title={t('ForgotPasswordScreen', 'backToLogin')}
        type="clear"
        onPress={() => navigation.navigate('Signin')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  
  languageSelectorContainer: {
    position: 'absolute',
    top: responsive(40, 50, 50, 50, 50),
    right: theme.spacing.xl,
    zIndex: 1,
  },
  
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    fontSize: theme.responsiveTypography.h3.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  
  button: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
});
