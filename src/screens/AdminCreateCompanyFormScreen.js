import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole, getCurrentUser } from '../utils/auth';
import { validEmail, validPhoneNumber, validURL } from '../utils/validation';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive } from '../styles//theme';
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
          <ActivityIndicator size="small" color={theme.colors.textWhite}  />
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
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    color: theme.typography.h2.color,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.label.fontSize,
    marginBottom: theme.typography.label.marginBottom,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.typography.label.color,
  },
  input: {
    borderWidth: theme.components.input.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.components.input.borderRadius,
    padding: theme.spacing.md,
    fontSize: theme.components.input.fontSize,
    backgroundColor: theme.colors.backgroundWhite,
    height: theme.components.input.height,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xs,
  },
  dropdown: {
    height: theme.components.input.height,
    borderColor: theme.colors.border,
    borderWidth: theme.components.input.borderWidth,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundWhite,
  },
  placeholderStyle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textLight,
  },
  selectedTextStyle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: theme.typography.fontSize.md,
  },
  iconStyle: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
  },
  dropdownItem: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textItem: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  button: {
   backgroundColor: theme.colors.primary,
  padding: theme.spacing.lg,
  borderRadius: theme.borderRadius.md,
  alignItems: 'center',
  marginTop: theme.spacing.xl,
  marginBottom: 40,
  
  justifyContent: 'center',
  minHeight: theme.components.button.height, 
  },
  buttonText: {
    color: theme.colors.textWhite,
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.bold,
  lineHeight: theme.typography.fontSize.lg * 1.4,
  textAlignVertical: 'center',
  includeFontPadding: false,  
  },
  warningContainer: {
    backgroundColor: theme.colors.warningContainer,
    borderColor: theme.colors.warningBorder,
    borderWidth: theme.components.warningBox.borderWidth,
    borderRadius: theme.components.warningBox.borderRadius,
    padding: theme.components.warningBox.padding,
    marginVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: theme.typography.warningIcon.fontSize,
    marginBottom: theme.typography.warningIcon.marginBottom,
  },
  warningTitle: {
    fontSize: theme.typography.warningTitle.fontSize,
    fontWeight: theme.typography.warningTitle.fontWeight,
    color: theme.typography.warningTitle.color,
    marginBottom: theme.typography.warningTitle.marginBottom,
  },
  warningText: {
    fontSize: theme.typography.warningText.fontSize,
    color: theme.typography.warningText.color,
    textAlign: theme.typography.warningText.textAlign,
    lineHeight: theme.typography.warningText.lineHeight,
  },
});

export default AdminCreateCompanyFormScreen;
