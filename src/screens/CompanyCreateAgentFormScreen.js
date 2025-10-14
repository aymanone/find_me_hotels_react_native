import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,  } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import supabase from '../config/supabase';
import { checkUserRole,getCurrentUser ,signOut} from '../utils/auth';
import { validEmail } from '../utils/validation';
import {showAlert} from "../components/ShowAlert";
import { theme, commonStyles, screenSize, responsive } from '../styles//theme';
import { useTranslation} from '../config/localization';
const CompanyCreateAgentFormScreen = ({ navigation }) => {
  const { t,language } = useTranslation();
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
        showAlert(t('CompanyCreateAgentFormScreen', 'accessDenied'), t('CompanyCreateAgentFormScreen', 'permissionDenied'));
        navigation.goBack();
        return;
      }
      const  user = await getCurrentUser();
    if (user?.app_metadata?.permitted_to_work === false) {
      setIsPermittedToWork(false);
    }
    } catch (error) {
      console.error('Error checking company status:', error);
      showAlert(t('Alerts', 'error'), t('CompanyCreateAgentFormScreen', 'failedVerifyPermissions'));
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
      showAlert(t('Alerts', 'error'), t('CompanyCreateAgentFormScreen', 'loadCountriesError'));
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
      newErrors.firstName = t('CompanyCreateAgentFormScreen', 'firstNameRequired');
      isValid = false;
    }

    // Validate second name
    if (!secondName.trim()) {
      newErrors.secondName = t('CompanyCreateAgentFormScreen', 'secondNameRequired');
      isValid = false;
    }

    // Validate email
    if (!agentEmail.trim()) {
      newErrors.agentEmail = t('CompanyCreateAgentFormScreen', 'agentEmailRequired');
      isValid = false;
    } else if (!validEmail(agentEmail)) {
      newErrors.agentEmail = t('CompanyCreateAgentFormScreen', 'agentEmailInvalid');
      isValid = false;
    }

    // Validate country
    if (!agentCountry) {
      newErrors.agentCountry = t('CompanyCreateAgentFormScreen', 'workLocationRequired');
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
          showAlert(t('Alerts', 'error'), t('CompanyCreateAgentFormScreen', 'userNotFound'));
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
        agentCountry: t('CompanyCreateAgentFormScreen', 'countryNotAvailable')
      }));
      
      // Update the countries list with fresh data
      setCountries(refreshedCountries || []);
      
      // Reset the country selection
      setAgentCountry('');
      
      throw new Error(t('CompanyCreateAgentFormScreen', 'countryNotAvailable'));
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
      t('Alerts', 'success'),
      t('CompanyCreateAgentFormScreen', 'createSuccess'),
      [{ text: t('Alerts', 'ok') }]
    );
    
    // Reset form
    setFirstName('');
    setSecondName('');
    setAgentEmail('');
    setAgentCountry('');
    
  } catch (error) {
    console.error('Error creating agent:', error);
    showAlert(t('Alerts', 'error'), t('CompanyCreateAgentFormScreen', 'createError'));
  } finally {
    setLoading(false);
  }
};

  if (loading && !countries.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text>{t('CompanyCreateAgentFormScreen', 'loading')}</Text>
      </View>
    );
  }
// Add this component function inside your main component
const PermissionWarning = () => (
  <View style={styles.warningContainer}>
    <Text style={styles.warningIcon}>⚠️</Text>
    <Text style={styles.warningTitle}>{t('CompanyCreateAgentFormScreen', 'accessRestricted')}</Text>
    <Text style={styles.warningText}>
      {t('CompanyCreateAgentFormScreen', 'permissionDenied')}
    </Text>
  </View>
);
  return (
    <>
    {!isPermittedToWork ? (
      <PermissionWarning />
    ) : (
      
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('CompanyCreateAgentFormScreen', 'title')}</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('CompanyCreateAgentFormScreen', 'firstName')}</Text>
        <TextInput
          style={[styles.input, errors.firstName ? styles.inputError : null]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder={t('CompanyCreateAgentFormScreen', 'firstNamePlaceholder')}
        />
        {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('CompanyCreateAgentFormScreen', 'secondName')}</Text>
        <TextInput
          style={[styles.input, errors.secondName ? styles.inputError : null]}
          value={secondName}
          onChangeText={setSecondName}
          placeholder={t('CompanyCreateAgentFormScreen', 'secondNamePlaceholder')}
        />
        {errors.secondName ? <Text style={styles.errorText}>{errors.secondName}</Text> : null}
      </View>
      
     
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('CompanyCreateAgentFormScreen', 'workLocation')}</Text>
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
          placeholder={t('CompanyCreateAgentFormScreen', 'workLocationPlaceholder')}
          searchPlaceholder={t('CompanyCreateAgentFormScreen', 'searchCountry')}
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
        <Text style={styles.label}>{t('CompanyCreateAgentFormScreen', 'agentEmail')}</Text>
        <TextInput
          style={[styles.input, errors.agentEmail ? styles.inputError : null]}
          value={agentEmail}
          onChangeText={setAgentEmail}
          placeholder={t('CompanyCreateAgentFormScreen', 'agentEmailPlaceholder')}
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
          <ActivityIndicator size="small" color={theme.colors.textWhite}  />
        ) : (
          <Text style={styles.buttonText}>{t('CompanyCreateAgentFormScreen', 'createAgent')}</Text>
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
  paddingVertical: theme.spacing.md,
  paddingHorizontal: theme.spacing.xl,
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
export default CompanyCreateAgentFormScreen;
