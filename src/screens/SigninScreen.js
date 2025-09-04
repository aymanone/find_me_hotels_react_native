import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser,notAllowedAuthenticatedUser } from '../utils/auth';
import {showAlert} from "../components/ShowAlert";
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';

export default function LoginScreen({ navigation }) {
  const { t,language } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      showAlert(t('SigninScreen', 'loginError'));
    } finally {
      setLoading(false);
    }
  };
 
useEffect(() => {
  // Define async function inside
  const handleAsyncWork = async () => {
    try {
      const isAllowed = await notAllowedAuthenticatedUser();
      if (!isAllowed) {
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };
  
  // Call it immediately
  handleAsyncWork();
}, [navigation]);
  return (
    <View style={styles.container}>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      <Text h3 style={styles.title}>{t('SigninScreen', 'title')}</Text>
      <Input
        placeholder={t('SigninScreen', 'email')}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
      />
      <Input
        placeholder={t('SigninScreen', 'password')}
        onChangeText={setPassword}
        value={password}
        secureTextEntry={!showPassword}
       rightIcon={{ 
          type: 'font-awesome',
          name: showPassword ? 'eye-slash' : 'eye',
          onPress: () => setShowPassword(!showPassword)
        }}
      />
      <Button
        title={t('SigninScreen', 'login')}
        onPress={handleLogin}
        loading={loading}
      />
      <Button
        title={t('SigninScreen', 'signup')}
        type="clear"
        onPress={() => navigation.navigate('Signup')}
      />
     <Button
        title={t('SigninScreen', 'forgotPassword')}
        type="clear"
        onPress={() => navigation.navigate('ForgotPassword')}
     />
      <Button
        title={t('SigninScreen', 'contactUs')}
        type="clear"
        onPress={() => navigation.navigate('ContactUs')}
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
  languageSelectorContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
});
