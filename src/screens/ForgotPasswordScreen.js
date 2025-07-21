import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import Constants from 'expo-constants';
import {validEmail} from '../utils/validation';
export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
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
          redirectTo = 'findmehotels://reset-password';
          screen=redirectTo;
        }
      } else {
        // For production, use your app's custom URL scheme
        redirectTo = 'findmehotels://reset-password';
        screen=redirectTo;
      }
        
      }
      redirectTo="https://687cc7aca90e378ee9f06618--bucolic-banoffee-2f9450.netlify.app/supabase_redirect.html";
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (error) throw error;
      
      Alert.alert(
        'Success', 
        'Password reset instructions have been sent to your email',
        [{ text: 'OK', onPress: () => navigation.navigate('Signin') }]
      );
    } catch (error) {
      console.error('Reset password error:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text h3 style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>
      
      <Input
        placeholder="Email"
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        leftIcon={{ type: 'font-awesome', name: 'envelope' }}
      />
      
      <Button
        title="Send Reset Instructions"
        onPress={handleResetPassword}
        loading={loading}
        buttonStyle={styles.button}
      />
      
      <Button
        title="Back to Login"
        type="clear"
        onPress={() => navigation.navigate('Signin')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
  },
});
