import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import { validPasswordSignup } from '../utils/validation';

export default function ResetPasswordScreen({ navigation, route }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

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

    try {
      setLoading(true);
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      Alert.alert(
        'Success', 
        'Your password has been updated successfully',
        [{ text: 'OK', onPress: () => navigation.navigate('Signin') }]
      );
    } catch (error) {
      console.error('Update password error:', error.message);
      Alert.alert('Error', error.message);
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
      />
      
      <Input
        placeholder="Confirm New Password"
        onChangeText={setConfirmPassword}
        value={confirmPassword}
        secureTextEntry={!showPassword}
      />
      
      <Button
        title="Update Password"
        onPress={handleUpdatePassword}
        loading={loading}
        buttonStyle={styles.button}
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
