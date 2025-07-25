import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,  } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole,getCurrentUser ,signOut} from '../utils/auth';
import { validEmail } from '../utils/validation';
import {showAlert} from "../components/ShowAlert";
const CompanyCreateAgentFormScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [countries, setCountries] = useState([]);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentCountry, setAgentCountry] = useState('');
  
  // Error states
  const [errors, setErrors] = useState({
    firstName: '',
    secondName: '',
    agentEmail: '',
    agentCountry: '',
  });

  useEffect(() => {
    checkCompanyStatus();
    fetchCountries();
  }, []);

  const checkCompanyStatus = async () => {
    try {
      const isUserCompany = await checkUserRole('company');
      setIsCompany(isUserCompany);
      
      if (!isUserCompany) {
        showAlert('Access Denied', 'You do not have permission to access this page.');
        navigation.goBack();
        return;
      }
      const  user = await getCurrentUser();
    if (user?.app_metadata?.permitted_to_work === false) {
      setIsPermittedToWork(false);
    }
    } catch (error) {
      console.error('Error checking company status:', error);
      showAlert('Error', 'Failed to verify your permissions.');
      navigation.goBack();
    }
  };

  const fetchCountries = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('countries')
        .select('id, country_name')
        .order('country_name', { ascending: true });
      
      if (error) throw error;
      
      setCountries(data || []);
      
    } catch (error) {
      console.error('Error fetching countries:', error);
      showAlert('Error', 'Failed to load countries list.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      firstName: '',
      secondName: '',
      agentEmail: '',
      agentCountry: '',
    };

    // Validate first name
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    // Validate second name
    if (!secondName.trim()) {
      newErrors.secondName = 'Second name is required';
      isValid = false;
    }

    // Validate email
    if (!agentEmail.trim()) {
      newErrors.agentEmail = 'Email is required';
      isValid = false;
    } else if (!validEmail(agentEmail)) {
      newErrors.agentEmail = 'Please enter a valid email';
      isValid = false;
    }

    // Validate country
    if (!agentCountry) {
      newErrors.agentCountry = 'Please select a work Location';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

 const handleCreateAgent = async () => {
  if (!validateForm()) return;

  try {
    setLoading(true);
     // Get current user
    const  user  = await getCurrentUser();
  
        if(!user) {
          showAlert('Error', 'User not found. Please log in again.');
          await signOut(navigation);
          
          return;

        }
    
        
    // Re-fetch countries to ensure we have the latest data
    const { data: refreshedCountries, error: countriesError } = await supabase
      .from('countries')
      .select('id, country_name')
      .order('country_name', { ascending: true });
    
    if (countriesError) throw new Error('Failed to validate country data. Please try again.');
    
    // Check if the selected country still exists
    const countryStillExists = refreshedCountries.some(country => country.id === agentCountry);
    
    if (!countryStillExists) {
      setErrors(prev => ({
        ...prev,
        agentCountry: 'The selected country is no longer available. Please select another country.'
      }));
      
      // Update the countries list with fresh data
      setCountries(refreshedCountries || []);
      
      // Reset the country selection
      setAgentCountry('');
      
      throw new Error('The selected country is no longer available. Please select another country.');
    }
    
   
    // Prepare agent data
    const agentData = {
      first_name: firstName,
      second_name: secondName,
      agent_country: agentCountry,
      agent_email: agentEmail,
      company_id: user.id
    };
    
    // Insert agent into database
    const { data, error } = await supabase
      .from('agents')
      .insert([agentData]);
    
    if (error) throw error;
    
    showAlert(
      'Success',
      'Agent created successfully!',
      [{ text: 'OK' }]
    );
    
    // Reset form
    setFirstName('');
    setSecondName('');
    setAgentEmail('');
    setAgentCountry('');
    
  } catch (error) {
    console.error('Error creating agent:', error);
    showAlert('Error',  'Failed to create agent. Please try again.');
  } finally {
    setLoading(false);
  }
};

  if (loading && !countries.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading...</Text>
      </View>
    );
  }
// Add this component function inside your main component
const PermissionWarning = () => (
  <View style={styles.warningContainer}>
    <Text style={styles.warningIcon}>⚠️</Text>
    <Text style={styles.warningTitle}>Access Restricted</Text>
    <Text style={styles.warningText}>
      Your account is currently not permitted to create new companies.
      Please contact the system administrator for assistance.
    </Text>
  </View>
);
  return (
    <>
    {!isPermittedToWork ? (
      <PermissionWarning />
    ) : (
      
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create New Agent</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={[styles.input, errors.firstName ? styles.inputError : null]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter first name"
        />
        {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Second Name *</Text>
        <TextInput
          style={[styles.input, errors.secondName ? styles.inputError : null]}
          value={secondName}
          onChangeText={setSecondName}
          placeholder="Enter second name"
        />
        {errors.secondName ? <Text style={styles.errorText}>{errors.secondName}</Text> : null}
      </View>
      
     
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>work Location *</Text>
        <Dropdown
          style={[styles.dropdown, errors.agentCountry ? styles.inputError : null]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          inputSearchStyle={styles.inputSearchStyle}
          iconStyle={styles.iconStyle}
          data={countries.map(country => ({
            label: country.country_name,
            value: country.id
          }))}
          search
          maxHeight={300}
          labelField="label"
          valueField="value"
          placeholder="Select country"
          searchPlaceholder="Search..."
          value={agentCountry}
          onChange={item => {
            setAgentCountry(item.value);
          }}
          renderItem={item => (
            <View style={styles.dropdownItem}>
              <Text style={styles.textItem}>{item.label}</Text>
            </View>
          )}
        />
        {errors.agentCountry ? <Text style={styles.errorText}>{errors.agentCountry}</Text> : null}
      </View>
       <View style={styles.formGroup}>
        <Text style={styles.label}>Agent Email *</Text>
        <TextInput
          style={[styles.input, errors.agentEmail ? styles.inputError : null]}
          value={agentEmail}
          onChangeText={setAgentEmail}
          placeholder="Enter agent email"
          keyboardType="email-address"
        />
        {errors.agentEmail ? <Text style={styles.errorText}>{errors.agentEmail}</Text> : null}
      </View>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleCreateAgent}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Create Agent</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  )}
</>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  dropdown: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#aaa',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  dropdownItem: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textItem: {
    flex: 1,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
   warningContainer: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEEBA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    marginVertical: 20,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default CompanyCreateAgentFormScreen;
