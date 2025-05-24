import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet,TextInput, ScrollView, 
  KeyboardAvoidingView, Platform} from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';

import { validEmail, validPasswordSignup, validPhoneNumber } from '../utils/validation';
import supabase from '../config/supabase';

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
  
  const roles = [
    { label: 'Client', value: 'client' },
    { label: 'Agent', value: 'agent' },
    { label: 'Company', value: 'company' },
    { label: 'Admin', value: 'admin' }
  ];
  const messaging_apps = [
    { label: 'WhatsApp', value: 'whatsapp' },
    { label: 'Telegram', value: 'telegram' }
    ];
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
        throw new Error('Please fill in all required fields');
      }

      // Validate email format
      if (!validEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate password
      if (!validPasswordSignup(password)) {
        throw new Error('Password must be at least 8 characters with letters and numbers');
      }

      // Validate password confirmation
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Prepare role-specific data
      let userData = { role };

      switch (role) {
        case 'client':
          if (!first_name || !second_name || !client_country) {
            throw new Error('Please fill in all client fields');
          }
          userData = {
            ...userData,
            first_name,
            second_name,
            country: client_country
          };
          break;

        case 'agent':
          if (!first_name || !second_name || !company_email || !agent_phone) {
            throw new Error('Please fill in all agent fields');
          }
          if (!validEmail(company_email)) {
            throw new Error('Please enter a valid company email');
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
            throw new Error('Please fill in all admin fields');
          }
          userData = {
            ...userData,
            first_name,
            second_name
          };
          break;

        case 'company':
          if ( !admin_email) {
            throw new Error('Please fill in all company fields');
          }
          if (!validEmail(admin_email)) {
            throw new Error('Please enter a valid admin email');
          }
          userData = {
            ...userData,
            
            admin_email
          };
          break;
      }

      setLoading(true);
      
      // Sign up user with Supabase
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;

      alert('Registration successful! Please check your email for verification.');
      
      // Wait for 5 seconds before navigating
      setTimeout(() => {
        navigation.navigate('Signin');
      }, 5000);
      
    } catch (error) {
      alert(error.message);
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
      <Text h3 style={styles.title}>Sign Up</Text>
      <View style={styles.form}>
        <Input
          placeholder="Email"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          errorMessage={email && !validEmail(email) ? 'Please enter a valid email address' : ''}
        />
        
        <Input
          placeholder="Password"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          errorMessage={password && !validPasswordSignup(password) ? 
            "Password must be at least 8 characters with uppercase, lowercase, and numbers" : ""}
        />
        <Text style={styles.passwordHint}>
          Password must contain at least 8 characters, including uppercase, lowercase, and numbers
        </Text>
        
        <Input
          placeholder="Confirm Password"
          onChangeText={setConfirmPassword}
          value={confirmPassword}
          secureTextEntry
          errorMessage={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''}
        />
        
       

        {/* Common fields for Client, Agent, and Admin */}
        {['client', 'agent', 'admin'].includes(role) && (
          <>
            <Input
              placeholder="First Name"
              onChangeText={text => setFirstName(text.slice(0, 30))}
              value={first_name}
              maxLength={30}
              errorMessage={first_name === '' ? 'First name is required' : ''}
            />
            <Input
              placeholder="Second Name"
              onChangeText={text => setSecondName(text.slice(0, 30))}
              value={second_name}
              maxLength={30}
              errorMessage={second_name === '' ? 'Second name is required' : ''}
            />
          </>
        )}

        {/* Client specific fields */}
        {role === 'client' && (
          <>
            <Text style={styles.label}>Select Country:</Text>
            {loadingCountries ? (
              <Text style={styles.loadingText}>Loading countries...</Text>
            ) : countriesError ? (
              <Text style={styles.errorText}>{countriesError}</Text>
            ) : (
              <Dropdown
                style={styles.clientCountries}
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
                activeColor="#e8e8e8"
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
              placeholder="Company Email"
              onChangeText={setCompanyEmail}
              value={company_email}
              keyboardType="email-address"
              autoCapitalize="none"
              errorMessage={company_email === '' ? 'Company email is required' : 
                (company_email && !validEmail(company_email)) ? 'Please enter a valid email' : ''}
            />
            <>
            <Text style={styles.label}>Messaging App:</Text>
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
                errorMessage={agent_phone === '' ? 'Phone number is required' : 
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
              placeholder="Admin Email"
              onChangeText={setAdminEmail}
              value={admin_email}
              keyboardType="email-address"
              autoCapitalize="none"
              errorMessage={admin_email === '' ? 'Admin email is required' : 
                (admin_email && !validEmail(admin_email)) ? 'Please enter a valid email' : ''}
            />
          </>
        )}
         <Text style={styles.label}>Select Role:</Text>
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
          title="Sign Up"
          onPress={handleSignup}
          loading={loading}
          containerStyle={styles.signupButton}
        />
        <Button
          title="Back to Sign In"
          type="clear"
          onPress={() => navigation.goBack()}
        />
      </View>
      </ScrollView>
       </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },

 scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100, // Add extra padding at the bottom
  },
  passwordHint: {
    fontSize: 12,
    color: '#86939e',
    marginLeft: 10,
    marginBottom: 15,
  },
  phoneHint: {
    fontSize: 12,
    color: '#86939e',
    marginLeft: 10,
    marginBottom: 15,
  },
  title: {
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    marginVertical: 10,
    marginLeft: 10,
    color: '#86939e',
  },
  dropdown: {
    height: 50,
    marginHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#86939e',
  },
  signupButton: {
    marginTop: 20,
  },
  loadingText: {
    color: '#86939e',
    textAlign: 'center',
    marginVertical: 10,
  },
  errorText: {
    color: '#ff190c',
    textAlign: 'center',
    marginVertical: 10,
  },
  dropdownItemContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItem: {
    fontSize: 16,
    color: '#333',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  clientCountries:{
    height: 50,
    marginHorizontal: 10,
    paddingBottom:20,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 12, 
  
  },
  
});
