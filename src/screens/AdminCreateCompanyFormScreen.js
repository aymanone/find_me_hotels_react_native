import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole } from '../utils/auth';
import { validEmail, validPhoneNumber, validURL } from '../utils/validation';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
 
const AdminCreateCompanyFormScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [countries, setCountries] = useState([]);
  
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [address, setAddress] = useState('');
  const [url, setUrl] = useState('');
  const [phone, setPhone] = useState('');
  
  // Error states
  const [errors, setErrors] = useState({
    companyName: '',
    companyCountry: '',
    companyEmail: '',
    address: '',
    url: '',
    phone: '',
  });

  useEffect(() => {
    checkAdminStatus();
    fetchCountries();
  }, []);

  

  const checkAdminStatus = async () => {
     
    try {
      const isUserAdmin = await checkUserRole('admin');
      setIsAdmin(isUserAdmin);
      
      if (!isUserAdmin) {
        Alert.alert('Access Denied', 'You do not have permission to access this page.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify your permissions.');
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
      Alert.alert('Error', 'Failed to load countries list.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      companyName: '',
      companyCountry: '',
      companyEmail: '',
      address: '',
      url: '',
      phone: '',
    };

    // Validate company name
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required';
      isValid = false;
    }

    // Validate country
    if (!companyCountry) {
      newErrors.companyCountry = 'Please select a country';
      isValid = false;
    }

    // Validate email
    if (!companyEmail.trim()) {
      newErrors.companyEmail = 'Email is required';
      isValid = false;
    } else if (!validEmail(companyEmail)) {
      newErrors.companyEmail = 'Please enter a valid email';
      isValid = false;
    }

    // Validate address
    if (!address.trim()) {
      newErrors.address = 'Address is required';
      isValid = false;
    }

    // Validate URL if provided
    if (url.trim() && !validURL(url)) {
      newErrors.url = 'Please enter a valid URL';
      isValid = false;
    }

    // Validate phone if provided
    if (phone.trim() && !validPhoneNumber(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCreateCompany = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      // Prepare company data
      const companyData = {
        company_name: companyName,
        company_country: companyCountry,
        company_email: companyEmail,
        address: address,
        admin_id: user.id
      };
      
      // Add optional fields if they exist
      if (url.trim()) companyData.url = url;
      if (phone.trim()) companyData.phone = phone;
      
      // Insert company into database
 //   const { data, error } = await supabase.rpc('debug_jwt_roles');
//console.log('JWT roles debug:', data, error);
  
      const { data, error } = await supabase
      .from('companies')
       .insert([companyData]);
      
      if (error) throw error;
      
      Alert.alert(
        'Success',
        'Company created successfully!',
        [{ text: 'OK' }]
      );
      
      // Reset form
      setCompanyName('');
      setCompanyCountry('');
      setCompanyEmail('');
      setAddress('');
      setUrl('');
      setPhone('');
      
    } catch (error) {
      console.error('Error creating company:', error);
      Alert.alert('Error', 'Failed to create company. Please try again.');
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create New Company</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={[styles.input, errors.companyName ? styles.inputError : null]}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Enter company name"
        />
        {errors.companyName ? <Text style={styles.errorText}>{errors.companyName}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Company Email *</Text>
        <TextInput
          style={[styles.input, errors.companyEmail ? styles.inputError : null]}
          value={companyEmail}
          onChangeText={setCompanyEmail}
          placeholder="Enter company email"
          keyboardType="email-address"
        />
        {errors.companyEmail ? <Text style={styles.errorText}>{errors.companyEmail}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
  <Text style={styles.label}>Country *</Text>
  <Dropdown
    style={[styles.dropdown, errors.companyCountry ? styles.inputError : null]}
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
    value={companyCountry}
    onChange={item => {
      setCompanyCountry(item.value);
    }}
    renderItem={item => (
      <View style={styles.dropdownItem}>
        <Text style={styles.textItem}>{item.label}</Text>
      </View>
    )}
  />
  {errors.companyCountry ? <Text style={styles.errorText}>{errors.companyCountry}</Text> : null}
</View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, errors.address ? styles.inputError : null]}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter company address"
          multiline
        />
        {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Website URL (Optional)</Text>
        <TextInput
          style={[styles.input, errors.url ? styles.inputError : null]}
          value={url}
          onChangeText={setUrl}
          placeholder="Enter company website URL"
          keyboardType="url"
        />
        {errors.url ? <Text style={styles.errorText}>{errors.url}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone Number (Optional)</Text>
        <TextInput
          style={[styles.input, errors.phone ? styles.inputError : null]}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter company phone number"
          keyboardType="phone-pad"
        />
        {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleCreateCompany}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Create Company</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
});

export default AdminCreateCompanyFormScreen;