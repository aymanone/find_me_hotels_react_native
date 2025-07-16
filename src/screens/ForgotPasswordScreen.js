import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import Constants from 'expo-constants';
import {validEmail} from '../utils/validation';
import {notAllowedAuthenticatedUser } from '../utils/auth';
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
      
      if (Platform.OS === 'web') {
        // For web, redirect to the web reset page
        redirectTo = `${window.location.origin}/reset-password`;
      } else {
        // For mobile, use deep linking with the correct format
        redirectTo = 'findmehotels://reset-password';
        //redirectTo='exp://192.168.1.109:8081/--/reset-password'
      }
      
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
 useEffect(() => {
    
    notAllowedAuthenticatedUser();
  }, [navigation]);
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
