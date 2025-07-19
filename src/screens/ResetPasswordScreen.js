import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import { validPasswordSignup } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPasswordScreen({ navigation, route }) {
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
            Alert.alert('Error', 'Failed to authenticate your reset request. Please try again.');
            setIsResettingPassword(false); // Reset flag on error
            navigation.navigate('Signin');
            return;
          }
          
          setSessionEstablished(true);
        } catch (err) {
          console.error('Session setup error:', err.message);
          Alert.alert('Error', 'Authentication failed. Please request a new password reset link.');
          setIsResettingPassword(false); // Reset flag on error
          navigation.navigate('Signin');
        }
      } else {
        Alert.alert('Error', 'Invalid reset link. Please request a new password reset.');
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
      setPasswordError('Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Check if session is established
    if (!sessionEstablished) {
      Alert.alert('Error', 'Authentication session not established. Please try again.');
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
      
      Alert.alert(
        'Success', 
        'Your password has been updated successfully',
        [{ text: 'OK', onPress: () => navigation.navigate('Signin') }]
      );
    } catch (error) {
      console.error('Update password error:', error.message);
      // Reset flag on error
      setIsResettingPassword(false);
      Alert.alert('Error', error.message, [
        { text: 'OK', onPress: () => navigation.navigate('Signin') }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text h3 style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>
        Please enter your new password below.
      </Text>
      
      <Input
        placeholder="New Password"
        onChangeText={(text) => {
          setPassword(text);
          setPasswordError('');
        }}
        value={password}
        secureTextEntry={!showPassword}
        rightIcon={{ 
          type: 'font-awesome', 
          name: showPassword ? 'eye-slash' : 'eye',
          onPress: () => setShowPassword(!showPassword)
        }}
        errorMessage={passwordError}
        disabled={!sessionEstablished || loading}
      />
      
      <Input
        placeholder="Confirm New Password"
        onChangeText={setConfirmPassword}
        value={confirmPassword}
        secureTextEntry={!showPassword}
        disabled={!sessionEstablished || loading}
      />
      
      <Button
        title={sessionEstablished ? "Update Password" : "Authenticating..."}
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
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#007bff',
  },
});
