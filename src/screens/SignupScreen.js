import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet,TextInput, ScrollView, 
  KeyboardAvoidingView, Platform} from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import {signOut,notAllowedAuthenticatedUser} from '../utils/auth';
import { validEmail, validPasswordSignup, validPhoneNumber } from '../utils/validation';
import supabase from '../config/supabase';
import {MESSAGING_APPS} from '../config/CONSTANTS'
import {showAlert} from "../components/ShowAlert";
import LanguageSelector from '../components/LanguageSelector';
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';
// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function SignupScreen({ navigation }) {
  const { language,t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);
  const [first_name, setFirstName] = useState('');
  const [second_name, setSecondName] = useState('');
  const [company_name, setCompanyyName] = useState('');
  const [admin_email, setAdminEmail] = useState('');
  const [company_email, setCompanyEmail] = useState('');
  const [messaging_app, setMessagingApp] = useState('');
  const [agent_phone, setAgentPhone] = useState('');
  const [client_country, setClientCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
  const [countrySearch, setCountrySearch] = useState('');
   const [showPassword, setShowPassword] = useState(false);
  const roles = [
    { label: t('SignupScreen', 'client'), value: 'client' },
    { label: t('SignupScreen', 'agent'), value: 'agent' },
    { label: t('SignupScreen', 'company'), value: 'company' },
    { label: t('SignupScreen', 'admin'), value: 'admin' }
  ];
  const messaging_apps = MESSAGING_APPS.map(app => { return { label: app, value: app }});
 useEffect(() => {
  // Define async function inside
  const handleAsyncWork = async () => {
    try {
      const isAllowed = await notAllowedAuthenticatedUser();
      if (!isAllowed) {
        console.log("an Authenticated User trying to access non auth screen");
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };
  
  // Call it immediately
  handleAsyncWork();
}, [navigation]);
  // Fetch countries from Supabase
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true);
        setCountriesError(null);
        
        const { data, error } = await supabase
          .from('countries')
          .select('id, country_name')
          .order('country_name');
        
        if (error) {
          throw error;
        }
        
        const formattedCountries = data.map(country => ({
          label: country.country_name,
          value: country.id
        }));
        setCountries(formattedCountries);
      } catch (error) {
        console.error('Error fetching countries:', error);
        setCountriesError('Unable to load countries. Please try again later.');
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  const handleSignup = async () => {
    try {
      // Validate required fields
      if (!email || !password || !confirmPassword) {
        throw new Error(t('SignupScreen', 'validationError'));
      }

      // Validate email format
      if (!validEmail(email.trim())) {
        throw new Error(t('SignupScreen', 'invalidEmail'));
      }

      // Validate password
      if (!validPasswordSignup(password)) {
        throw new Error(t('SignupScreen', 'invalidPassword'));
      }

      // Validate password confirmation
      if (password !== confirmPassword) {
        throw new Error(t('SignupScreen', 'passwordMismatch'));
      }

      // Prepare role-specific data
      let userData = { role };

      switch (role) {
        case 'client':
          if (!first_name || !second_name || !client_country) {
            throw new Error(t('SignupScreen', 'validationError'));
          }
          userData = {
            ...userData,
            first_name,
            second_name,
            country: client_country
          };
          break;

        case 'agent':
          if (!first_name || !second_name || !company_email || !agent_phone || !messaging_app) {
            throw new Error(t('SignupScreen', 'validationError'));
          }
          if (!validEmail(company_email)) {
            throw new Error(t('SignupScreen', 'invalidEmail'));
          }
          if (!validPhoneNumber(agent_phone)) {
            throw new Error('Please enter a valid phone number');
          }
          userData = {
            ...userData,
            first_name,
            second_name,
            company_email,
            phone_number: agent_phone,
            messaging_app
          };
          break;

        case 'admin':
          if (!first_name || !second_name) {
            throw new Error(t('SignupScreen', 'validationError'));
          }
          userData = {
            ...userData,
            first_name,
            second_name
          };
          break;

        case 'company':
          if ( !admin_email) {
            throw new Error(t('SignupScreen', 'validationError'));
          }
          if (!validEmail(admin_email)) {
            throw new Error(t('SignupScreen', 'invalidEmail'));
          }
          userData = {
            ...userData,
            
            admin_email
          };
          break;
      }

      setLoading(true);
     
      // Sign up user with Supabase
      const trimmedEmail=email.trim();
      loweredEmail= trimmedEmail.toLowerCase();
     
      const { error } = await supabase.auth.signUp({
       email: loweredEmail,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;

      showAlert(t('SignupScreen', 'registrationSuccess'));
      
      // Wait for 5 seconds before navigating
      setTimeout(async () => {
        try {
          await signOut(navigation, 'Signin');
        } catch (error) {
          console.error('Error during sign out after registration:', error);
          // Fallback if signOut fails
          navigation.navigate('Signin');
        }
      }, 5000);
      
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView 
    style={styles.container}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
  >
   <ScrollView 
    contentContainerStyle={styles.scrollContainer}
    showsVerticalScrollIndicator={true}
    keyboardShouldPersistTaps="handled"
  >
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      <Text style={styles.title}>{t('SignupScreen', 'title')}</Text>
      <View style={styles.form}>
        <Input
          placeholder={t('SignupScreen', 'email')}
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          errorMessage={email && !validEmail(email) ? t('SignupScreen', 'invalidEmail') : ''}
        />
        
        <Input
          placeholder={t('SignupScreen', 'password')}
          onChangeText={setPassword}
          value={password}
          secureTextEntry={!showPassword}
          errorMessage={password && !validPasswordSignup(password) ? 
            t('SignupScreen', 'invalidPassword') : ""}
           rightIcon={{ 
             type: 'font-awesome', 
             name: showPassword ? 'eye-slash' : 'eye',
             size: theme.responsiveComponents.icon.medium,
             color: theme.colors.textSecondary,
             onPress: () => setShowPassword(!showPassword)
}}
    />
  
        
        <Text style={styles.passwordHint}>
          Password must contain at least 8 characters, including uppercase, lowercase, and numbers
        </Text>
        
        <Input
          placeholder={t('SignupScreen', 'confirmPassword')}
          onChangeText={setConfirmPassword}
          value={confirmPassword}
          secureTextEntry={!showPassword}
          errorMessage={confirmPassword && password !== confirmPassword ? t('SignupScreen', 'passwordMismatch') : ''}
            rightIcon={{ 
             type: 'font-awesome', 
             name: showPassword ? 'eye-slash' : 'eye',
             size: theme.responsiveComponents.icon.medium,
             color: theme.colors.textSecondary,
             onPress: () => setShowPassword(!showPassword)
}}
    />
  
        
        
       

        {/* Common fields for Client, Agent, and Admin */}
        {['client', 'agent', 'admin'].includes(role) && (
          <>
            <Input
              placeholder={t('SignupScreen', 'firstName')}
              onChangeText={text => setFirstName(text.slice(0, 30))}
              value={first_name}
              maxLength={30}
              errorMessage={first_name === '' ? t('SignupScreen', 'firstName') + ' is required' : ''}
            />
            <Input
              placeholder={t('SignupScreen', 'secondName')}
              onChangeText={text => setSecondName(text.slice(0, 30))}
              value={second_name}
              maxLength={30}
              errorMessage={second_name === '' ? t('SignupScreen', 'secondName') + ' is required' : ''}
            />
          </>
        )}

        {/* Client specific fields */}
        {role === 'client' && (
          <>
            <Text style={styles.label}>{t('SignupScreen', 'clientCountry')}:</Text>
            {loadingCountries ? (
              <Text style={styles.loadingText}>Loading countries...</Text>
            ) : countriesError ? (
              <Text style={styles.errorText}>{t('SignupScreen', 'countriesError')}</Text>
            ) : (
              <Dropdown
                style={[styles.dropdown,styles.clientCountries]}
                data={countries}
                labelField="label"
                valueField="value"
                value={client_country}
                onChange={item => {
                  setClientCountry(item.value);
                  setCountrySearch('');
                }}
                placeholder="Select country..."
      
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                activeColor={theme.colors.primaryLight}
                search
                searchPlaceholder="Search country..."
                searchQuery={countrySearch}
                onChangeSearchQuery={setCountrySearch}
                searchField="label"
                maxHeight={300}
                renderItem={(item) => (
                  <View style={styles.dropdownItemContainer}>
                    <Text style={styles.dropdownItem}>
                      {item.label}
                    </Text>
                  </View>
                )}
                dropdownPosition="auto"
                keyboardAvoiding={true}
              />
            )}
           </>
        )}

        {/* Agent specific fields */}
        {role === 'agent' && (
          <>
            <Input
              placeholder={t('SignupScreen', 'companyEmail')}
              onChangeText={setCompanyEmail}
              value={company_email}
              keyboardType="email-address"
              autoCapitalize="none"
              errorMessage={company_email === '' ? t('SignupScreen', 'companyEmail') + ' is required' : 
                (company_email && !validEmail(company_email)) ? t('SignupScreen', 'invalidEmail') : ''}
            />
            <>
            <Text style={styles.label}>{t('SignupScreen', 'messagingApp')} for Clients to contact you:</Text>
    <Dropdown
      data={messaging_apps}
      labelField="label"
      valueField="value"
      value={messaging_app}
      onChange={item => setMessagingApp(item.value)}
      placeholder="Select messaging app"
      style={styles.dropdown}
      placeholderStyle={styles.placeholderStyle}
      selectedTextStyle={styles.selectedTextStyle}
      activeColor="#e8e8e8"
    />
              <Input
                placeholder="Phone Number (e.g. +1234567890)"
                onChangeText={setAgentPhone}
                value={agent_phone}
                keyboardType="phone-pad"
                errorMessage={agent_phone === '' ? t('SignupScreen', 'agentPhone') + ' is required' : 
                  (agent_phone && !validPhoneNumber(agent_phone)) ? 'Please enter a valid international phone number' : ''}
              />
              <Text style={styles.phoneHint}>
                Phone number must start with country code (e.g. +20 for Egypt)
              </Text>
            </>
          </>
        )}

        {/* Company specific fields */}
        {role === 'company' && (
          <>
            
            <Input
              placeholder={t('SignupScreen', 'adminEmail')}
              onChangeText={setAdminEmail}
              value={admin_email}
              keyboardType="email-address"
              autoCapitalize="none"
              errorMessage={admin_email === '' ? t('SignupScreen', 'adminEmail') + ' is required' : 
                (admin_email && !validEmail(admin_email)) ? t('SignupScreen', 'invalidEmail') : ''}
            />
          </>
        )}
         <Text style={styles.label}>{t('SignupScreen', 'role')}:</Text>
        <Dropdown
          data={roles}
          labelField="label"
          valueField="value"
          value={role}
          onChange={item => setRole(item.value)}
          placeholder="Select role"
          style={styles.dropdown}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          activeColor="#e8e8e8"
        />
        <Button
          title={t('SignupScreen', 'createAccount')}
          onPress={handleSignup}
          loading={loading}
          containerStyle={styles.signupButton}
        />
        <Button
          title={t('SignupScreen', 'backToLogin')}
          type="clear"
          onPress={() => navigation.navigate("Signin")}
        />
         <Button
          title={t('SignupScreen', 'contactUs')}
          type="clear"
          onPress={() => navigation.navigate("ContactUs")}
        />
      </View>
      </ScrollView>
       </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundWhite,
  },

  scrollContainer: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingBottom: 100,
  },
  
  passwordHint: {
    fontSize: theme.responsiveTypography.fontSize.xs,
    color: theme.colors.textLight,
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  
  phoneHint: {
    fontSize: theme.responsiveTypography.fontSize.xs,
    color: theme.colors.textLight,
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  
  title: {
    textAlign: 'center',
    marginTop: responsive(50, 60, 60, 60, 60),
    marginBottom: theme.spacing.xxxl,
    fontSize: theme.responsiveTypography.h3.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  
  form: {
    flex: 1,
  },
  
  label: {
    fontSize: theme.responsiveTypography.fontSize.md,
    marginVertical: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
    color: theme.colors.textLight,
    fontWeight: theme.typography.fontWeight.medium,
  },
  
  dropdown: {
    height: theme.responsiveComponents.input.height,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  selectedTextStyle: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
  },
  
  placeholderStyle: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textLight,
  },
  
  signupButton: {
    marginTop: theme.spacing.xl,
  },
  
  loadingText: {
    color: theme.colors.textLight,
    fontSize: theme.responsiveTypography.fontSize.sm,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
  },
  
  errorText: {
    color: theme.colors.error,
    fontSize: theme.responsiveTypography.fontSize.sm,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
  },
  
  dropdownItemContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  
  dropdownItem: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.text,
  },
  
  searchInput: {
    height: 40,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  
  clientCountries: {
    marginBottom: theme.spacing.xl,
  },
  
  languageSelectorContainer: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.xl,
  },
});

