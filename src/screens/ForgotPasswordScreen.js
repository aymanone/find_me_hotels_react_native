import React, { useEffect,useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import Constants from 'expo-constants';
import {validEmail, validPhoneNumber} from '../utils/validation';
import {signOut,notAllowedAuthenticatedUser} from '../utils/auth';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';
import OtpStep, { getResendDelay } from '../components/OtpStep';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPasswordScreen({ navigation, route }) {
  const { t,language } = useTranslation();
  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [contact_method, setContactMethod] = useState(route?.params?.method === 'phone' ? 'phone' : 'email'); // 'email' | 'phone'
  const [phone, setPhone] = useState(route?.params?.phone ?? '');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [otpMeta, setOtpMeta] = useState(null); // { phone, sendCount, nextSendAt }
  const { setIsResettingPassword } = useAuth();
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
    if (contact_method === 'phone') {
      const cleanPhone = phone.replace(/[\s\-().]/g, '');
      if (!cleanPhone) {
        showAlert(t('Alerts', 'error'), t('ForgotPasswordScreen', 'enterPhone'));
        return;
      }
      if (!validPhoneNumber(cleanPhone)) {
        showAlert(t('Alerts', 'error'), t('ForgotPasswordScreen', 'invalidPhone'));
        return;
      }

      // A code was already sent to this number (user pressed "Change phone number" and came back):
      // reopen the code step without sending again, so the resend timer can't be skipped
      if (otpMeta?.phone === cleanPhone) {
        setStep('otp');
        return;
      }

      try {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
          phone: cleanPhone,
          options: { channel: 'whatsapp', shouldCreateUser: false },
        });
        if (error) {
          if (error.status === 429) throw error;
          // Any other error (e.g. number not registered): same screen as success,
          // so nobody can find out which numbers have an account
          console.error('Send code error:', error.message);
        }
        setOtpMeta({
          phone: cleanPhone,
          sendCount: 1,
          nextSendAt: Date.now() + getResendDelay(1) * 1000,
        });
        setStep('otp');
      } catch (error) {
        console.error('Send code error:', error.message);
        showAlert(
          t('Alerts', 'error'),
          error.status === 429 ? t('OtpStep', 'tooManyRequests') : t('ForgotPasswordScreen', 'resetError')
        );
      } finally {
        setLoading(false);
      }
      return;
    }

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
      redirectTo="https://supabase-handlers.vercel.app/";
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

  if (step === 'otp' && otpMeta) {
    return (
      <View style={styles.container}>
        <View style={styles.languageSelectorContainer}>
          <LanguageSelector />
        </View>
        <OtpStep
          phone={otpMeta.phone}
          sendCount={otpMeta.sendCount}
          nextSendAt={otpMeta.nextSendAt}
          onResent={({ sendCount, nextSendAt }) =>
            setOtpMeta(prev => ({ ...prev, sendCount, nextSendAt }))
          }
          // The flag must be on BEFORE the code is checked, otherwise the new session
          // can switch the app to the main screens before the password is changed
          onBeforeVerify={() => setIsResettingPassword(true)}
          onVerifyError={() => setIsResettingPassword(false)}
          onVerified={() => navigation.replace('ResetPassword', { phone: otpMeta.phone })}
          onChangeNumber={() => setStep('form')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      <Text  style={styles.title}>{t('ForgotPasswordScreen', 'title')}</Text>
      <Text style={styles.subtitle}>
        {contact_method === 'phone'
          ? t('ForgotPasswordScreen', 'enterPhone')
          : t('ForgotPasswordScreen', 'enterEmail')}
      </Text>

      <View style={styles.contactToggleRow}>
        <TouchableOpacity onPress={() => setContactMethod('email')}>
          <Text style={[styles.contactToggleText, contact_method === 'email' && styles.contactToggleTextActive]}>
            {t('ForgotPasswordScreen', 'email')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.contactToggleSeparator}>{'\u2022'}</Text>
        <TouchableOpacity onPress={() => setContactMethod('phone')}>
          <Text style={[styles.contactToggleText, contact_method === 'phone' && styles.contactToggleTextActive]}>
            {t('ForgotPasswordScreen', 'phone')}
          </Text>
        </TouchableOpacity>
      </View>

      {contact_method === 'phone' ? (
        <>
        <Input
          placeholder="+201234567890"
          onChangeText={setPhone}
          value={phone}
          autoCapitalize="none"
          keyboardType="phone-pad"
          leftIcon={{
            type: 'font-awesome',
            name: 'phone',
            size: theme.responsiveComponents.icon.medium,
            color: theme.colors.textSecondary
          }}
        />
        <Text style={styles.phoneHint}>{t('ForgotPasswordScreen', 'phoneHint')}</Text>
        </>
      ) : (
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
      )}
      
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

  contactToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },

  contactToggleText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textLight,
    fontWeight: '500',
  },

  contactToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  phoneHint: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  contactToggleSeparator: {
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.borderDark,
  },
  
  button: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
});
