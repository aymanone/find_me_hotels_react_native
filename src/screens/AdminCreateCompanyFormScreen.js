import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import { validEmail, validPhoneNumber, validURL } from '../utils/validation';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import {showAlert} from "../components/ShowAlert";
import { useTranslation } from '../config/localization';
const AdminCreateCompanyFormScreen = () => {
  const navigation = useNavigation();
  const { t,language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [countries, setCountries] = useState([]);
  const [isPermittedToWork, setIsPermittedToWork] = useState(true);
  const [licenseNum, setLicenseNum] = useState('');
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
   licenseNum: '', 
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
        showAlert(t('AdminCreateCompanyFormScreen', 'accessDenied'), t('AdminCreateCompanyFormScreen', 'permissionDenied'));
        navigation.goBack();
        return;
      }
      // Check if the user is permitted to work
      const  user  = await getCurrentUser();
    if (user?.app_metadata?.permitted_to_work === false) {
      setIsPermittedToWork(false);
    }
    } catch (error) {
      console.error('Error checking admin status:', error);
      showAlert(t('Alerts', 'error'), t('AdminCreateCompanyFormScreen', 'failedVerifyPermissions'));
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
      showAlert(t('Alerts', 'error'), t('AdminCreateCompanyFormScreen', 'loadCountriesError'));
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
      newErrors.companyName = t('AdminCreateCompanyFormScreen', 'companyNameRequired');
      isValid = false;
    }

    // Validate country
    if (!companyCountry) {
      newErrors.companyCountry = t('AdminCreateCompanyFormScreen', 'companyCountryRequired');
      isValid = false;
    }

    // Validate email
    if (!companyEmail.trim()) {
      newErrors.companyEmail = t('AdminCreateCompanyFormScreen', 'companyEmailRequired');
      isValid = false;
    } else if (!validEmail(companyEmail)) {
      newErrors.companyEmail = t('AdminCreateCompanyFormScreen', 'companyEmailInvalid');
      isValid = false;
    }

    // Validate address
    if (!address.trim()) {
      newErrors.address = t('AdminCreateCompanyFormScreen', 'companyAddressRequired');
      isValid = false;
    }
   if (licenseNum.trim() && licenseNum.trim().length < 2) {
  newErrors.licenseNum = t('AdminCreateCompanyFormScreen', 'licenseNumLength');
  isValid = false;
  }
    // Validate URL if provided
    if (url.trim() && !validURL(url)) {
      newErrors.url = t('AdminCreateCompanyFormScreen', 'companyUrlInvalid');
      isValid = false;
    }

    // Validate phone if provided
    if (phone.trim() && !validPhoneNumber(phone)) {
      newErrors.phone = t('AdminCreateCompanyFormScreen', 'companyPhoneInvalid');
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
      const  user  = await getCurrentUser();
      
      if (!user) throw "problems validating the user";
       // Re-fetch countries to ensure we have the latest data
    const { data: refreshedCountries, error: countriesError } = await supabase
      .from('countries')
      .select('id, country_name')
      .order('country_name', { ascending: true });
    
    if (countriesError) throw new Error(t('AdminCreateCompanyFormScreen', 'loadCountriesError'));
    
    // Check if the selected country still exists
    const countryStillExists = refreshedCountries.some(country => country.id === companyCountry);
    
    if (!countryStillExists) {
      setErrors(prev => ({
        ...prev,
        companyCountry: t('AdminCreateCompanyFormScreen', 'countryNotAvailable')
      }));
      
      // Update the countries list with fresh data
      setCountries(refreshedCountries || []);
      
      // Reset the country selection
      setCompanyCountry('');
      
      throw new Error(t('AdminCreateCompanyFormScreen', 'countryNotAvailable'));
    }
    
      // Prepare company data
      const companyData = {
        company_name: companyName,
        company_country: companyCountry,
        company_email: companyEmail,
        address: address,
        admin_id: user.id,
        license_num:licenseNum
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
      
      showAlert(
        t('Alerts', 'success'),
        t('AdminCreateCompanyFormScreen', 'createSuccess'),
        [{ text: t('Alerts', 'ok') }]
      );
      
      // Reset form
      setCompanyName('');
      setCompanyCountry('');
      setCompanyEmail('');
      setAddress('');
      setUrl('');
      setPhone('');
      setLicenseNum('');
    } catch (error) {
      console.error('Error creating company:', error);
      showAlert(t('Alerts', 'error'), t('AdminCreateCompanyFormScreen', 'createError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !countries.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>{t('AdminCreateCompanyFormScreen', 'loading')}</Text>
      </View>
    );
  }
  const PermissionWarning = () => (
  <View style={styles.warningContainer}>
    <Text style={styles.warningIcon}>⚠️</Text>
    <Text style={styles.warningTitle}>{t('AdminCreateCompanyFormScreen', 'permissionWarning')}</Text>
    <Text style={styles.warningText}>
      {t('AdminCreateCompanyFormScreen', 'notPermittedToWork')}
    </Text>
  </View>
);

  return (
    <>
      {!isPermittedToWork ? (
      <PermissionWarning />
    ) : (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('AdminCreateCompanyFormScreen', 'title')}</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('AdminCreateCompanyFormScreen', 'companyName')} *</Text>
        <TextInput
          style={[styles.input, errors.companyName ? styles.inputError : null]}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder={t('AdminCreateCompanyFormScreen', 'companyNamePlaceholder')}
        />
        {errors.companyName ? <Text style={styles.errorText}>{errors.companyName}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('AdminCreateCompanyFormScreen', 'companyEmail')} *</Text>
        <TextInput
          style={[styles.input, errors.companyEmail ? styles.inputError : null]}
          value={companyEmail}
          onChangeText={setCompanyEmail}
          placeholder={t('AdminCreateCompanyFormScreen', 'companyEmailPlaceholder')}
          keyboardType="email-address"
        />
        {errors.companyEmail ? <Text style={styles.errorText}>{errors.companyEmail}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
  <Text style={styles.label}>{t('AdminCreateCompanyFormScreen', 'companyCountry')} *</Text>
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
    placeholder={t('AdminCreateCompanyFormScreen', 'selectCountryPlaceholder')}
    searchPlaceholder={t('AdminCreateCompanyFormScreen', 'searchCountry')}
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
        <Text style={styles.label}>{t('AdminCreateCompanyFormScreen', 'companyAddress')} *</Text>
        <TextInput
          style={[styles.input, errors.address ? styles.inputError : null]}
          value={address}
          onChangeText={setAddress}
          placeholder={t('AdminCreateCompanyFormScreen', 'companyAddressPlaceholder')}
          multiline
        />
        {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
      </View>
      <View style={styles.formGroup}>
  <Text style={styles.label}>{t('AdminCreateCompanyFormScreen', 'licenseNumber')}</Text>
  <TextInput
    style={[styles.input, errors.licenseNum ? styles.inputError : null]}
    value={licenseNum}
    onChangeText={setLicenseNum}
    placeholder={t('AdminCreateCompanyFormScreen', 'licenseNumberPlaceholder')}
  />
  {errors.licenseNum ? <Text style={styles.errorText}>{errors.licenseNum}</Text> : null}
</View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('AdminCreateCompanyFormScreen', 'companyUrl')} (Optional)</Text>
        <TextInput
          style={[styles.input, errors.url ? styles.inputError : null]}
          value={url}
          onChangeText={setUrl}
          placeholder={t('AdminCreateCompanyFormScreen', 'companyUrlPlaceholder')}
          keyboardType="url"
        />
        {errors.url ? <Text style={styles.errorText}>{errors.url}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('AdminCreateCompanyFormScreen', 'companyPhone')} (Optional)</Text>
        <TextInput
          style={[styles.input, errors.phone ? styles.inputError : null]}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('AdminCreateCompanyFormScreen', 'companyPhonePlaceholder')}
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
          <Text style={styles.buttonText}>{t('AdminCreateCompanyFormScreen', 'createCompany')}</Text>
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

export default AdminCreateCompanyFormScreen;
