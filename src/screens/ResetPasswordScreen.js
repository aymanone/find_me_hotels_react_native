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
  const [mode, setMode] = useState(null); // 'email' | 'phone'
  const [otpCode, setOtpCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resending, setResending] = useState(false);

  const { setIsResettingPassword } = useAuth();

  // Extract params: email accounts arrive with tokens from the reset link,
  // phone accounts arrive with just the phone number (no magic-link equivalent exists)
  const { access_token, refresh_token, phone } = route.params || {};

  // Set up the session when component mounts (email path), or wait for a
  // code to be entered (phone path - handled by handleVerifyCode below)
  useEffect(() => {
    const setupSession = async () => {
      if (access_token && refresh_token) {
        setMode('email');
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
      } else if (phone) {
        setMode('phone');
        const { data } = await supabase.auth.getSession();
  if (data.session) {
    setIsResettingPassword(true);
    setSessionEstablished(true);
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
  }, [access_token, refresh_token, phone, navigation, setIsResettingPassword]);

  const handleVerifyCode = async () => {
    if (!otpCode) {
      showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'enterCode') || 'Please enter the code you received');
      return;
    }
    try {
      setVerifyingCode(true);
      // verifyOtp authenticates the user directly and establishes a session -
      // no separate setSession call needed, unlike the email/token_hash path.
      setIsResettingPassword(true); 
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otpCode.trim(),
        type: 'sms',
      });
      if (error) throw error;
      setIsResettingPassword(true);
      setSessionEstablished(true);
    } catch (error) {
       setIsResettingPassword(false)
      console.error('Verify code error:', error.message);
      showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'invalidCode') || 'That code is invalid or expired');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResending(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      showAlert(t('Alerts', 'success'), t('ResetPasswordScreen', 'codeResent') || 'A new code has been sent');
    } catch (error) {
      console.error('Resend code error:', error.message);
      showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'resetError'));
    } finally {
      setResending(false);
    }
  };

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
        [{ text: 'OK', onPress: () => setIsResettingPassword(false) }]
      );
    } catch (error) {
      console.error('Update password error:', error.message);
       const samePassword =
    error?.code === 'same_password' ||
    /different from the old password/i.test(error?.message || '');

  if (samePassword) {
    // Recoverable: stay on the screen with the flag still on
    setPasswordError(
      t('ResetPasswordScreen', 'samePassword') ||
        'Please choose a password different from your old one'
    );
    return; // `finally` still turns the loading spinner off
  }
      // Reset flag on error
      
      showAlert(t('Alerts', 'error'), t('ResetPasswordScreen', 'resetError'), [
        { text: t('ResetPasswordScreen', 'tryAgain') || 'Try again' },
          {
            text: t('ResetPasswordScreen', 'skipForNow') || 'Skip for now',
            onPress: () => setIsResettingPassword(false),
          },
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

      {mode === 'phone' && !sessionEstablished ? (
        <>
          <Text style={styles.subtitle}>
            {t('ResetPasswordScreen', 'enterCode') || 'Enter the code we sent you'}
          </Text>

          <Input
            placeholder="123456"
            onChangeText={setOtpCode}
            value={otpCode}
            keyboardType="number-pad"
            disabled={verifyingCode}
          />

          <Button
            title={t('ResetPasswordScreen', 'verifyCode') || 'Verify code'}
            onPress={handleVerifyCode}
            loading={verifyingCode}
            buttonStyle={styles.button}
          />

          <Button
            title={t('ResetPasswordScreen', 'resendCode') || 'Resend code'}
            type="clear"
            onPress={handleResendCode}
            loading={resending}
          />
          <Button
  title={t('ResetPasswordScreen', 'backToSignin') || 'Back to sign in'}
  type="clear"
  onPress={() => navigation.navigate('Signin')}
/>
        </>
      ) : (
        <>
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
          <Button
  title={t('ResetPasswordScreen', 'skipForNow') || 'Skip for now'}
  type="clear"
  disabled={loading}
  onPress={() => setIsResettingPassword(false)}
/>
        </>
      )}
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
