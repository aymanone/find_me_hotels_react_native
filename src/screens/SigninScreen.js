import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser,notAllowedAuthenticatedUser } from '../utils/auth';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
 

  const handleLogin = async () => {
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      // The navigation will be handled automatically by our AppNavigator
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    
    notAllowedAuthenticatedUser();
  }, [navigation]);
  return (
    <View style={styles.container}>
      <Text h3 style={styles.title}>Find Me Hotels</Text>
      <Input
        placeholder="Email"
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
      />
      <Input
        placeholder="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
      />
      <Button
        title="Login"
        onPress={handleLogin}
        loading={loading}
      />
      <Button
        title="Sign up"
        type="clear"
        onPress={() => navigation.navigate('Signup')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
});
