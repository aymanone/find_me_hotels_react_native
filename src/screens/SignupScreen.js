import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, 
  KeyboardAvoidingView, Platform} from 'react-native';
import { Button, Input, Text,  CheckBox,Icon } from 'react-native-elements';
import { Dropdown } from 'react-native-element-dropdown';
import {signOut,notAllowedAuthenticatedUser} from '../utils/auth';
import { validEmail, validPasswordSignup, validPhoneNumber } from '../utils/validation';
import supabase from '../config/supabase';
import {MESSAGING_APPS} from '../config/CONSTANTS'
import {showAlert} from "../components/ShowAlert";
import LanguageSelector from '../components/LanguageSelector';
import OtpStep, { getResendDelay } from '../components/OtpStep';
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

// Phone helpers (no external libraries)
// Removes spaces, dashes, dots, parentheses and leading zeros (local trunk prefix, e.g. 010... -> 10...)
const normalizeNationalPhone = (raw = '') =>
  raw.replace(/[\s\-().]/g, '').replace(/^0+/, '');

// National number only (without country code): digits only, 6 to 12 digits
const isValidNationalPhone = (raw = '') =>
  /^\d{6,12}$/.test(normalizeNationalPhone(raw));

export default function SignupScreen({ navigation, isModal = false, onAuthSuccess }) {
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
  const [contact_method, setContactMethod] = useState('phone'); // 'phone' | 'email', clients only
  const [client_phone, setClientPhone] = useState('');
  const [whatsapp_optin, setWhatsappOptin] = useState(false);
  const isPhoneSignup = role === 'client' && contact_method === 'phone';
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
   const [showPassword, setShowPassword] = useState(false);
  const debouncedPhone = useDebounce(client_phone, 500);
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [otpMeta, setOtpMeta] = useState(null); // { phone, sendCount, nextSendAt }
  const [phone_country, setPhoneCountry] = useState(''); // country of the phone number (can differ from client_country)
  const [phoneCodeTouched, setPhoneCodeTouched] = useState(false);
  const selectedPhoneCountry = useMemo(
    () => countries.find(c => c.value === phone_country),
    [countries, phone_country]
  );
  const roles = [
    { label: t('SignupScreen', 'client'), value: 'client' },
    { label: t('SignupScreen', 'agent'), value: 'agent' },
    { label: t('SignupScreen', 'company'), value: 'company' },
    { label: t('SignupScreen', 'admin'), value: 'admin' }
  ];
   const modalRoles = [
    { label: t('SignupScreen', 'client'), value: 'client' }
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
          .select('id, country_name, iso_code, call_code')
          .order('country_name');
        
        if (error) {
          throw error;
        }
        
        const formattedCountries = data.map(country => ({
          label: `${country.country_name} (${country.iso_code})`,
          name: country.country_name,
          callLabel: `${country.iso_code} +${String(country.call_code).replace(/\D/g, '')}`,
          search: `${country.country_name} ${country.iso_code} ${country.call_code}`,
          value: country.id,
          iso: country.iso_code,
          // works whether call_code is stored as "20" or "+20"
          callCode: '+' + String(country.call_code).replace(/\D/g, ''),
        }));
        setCountries(formattedCountries);
        // Main country: Egypt (matched by ISO code). Default for both the client country and the phone code
const egypt = formattedCountries.find(c => c.iso === 'EG');
if (egypt) {
  //setClientCountry(prev => prev || egypt.value);
  setPhoneCountry(prev => prev || egypt.value);
}

      } catch (error) {
        console.error('Error fetching countries:', error);
        setCountriesError('Unable to load countries. Please try again later.');
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Same behaviour as before for email signup; phone signup runs it after the code is verified
  const finishSignup = () => {
    showAlert(t('SignupScreen', 'registrationSuccess'));

    if (isModal && onAuthSuccess) {
      // Called from modal - DON'T sign out, notify parent
      onAuthSuccess();
    } else {
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
    }
  };

  const handleSignup = async () => {
    try {
      // Validate required fields
     if (!password || !confirmPassword) {
  throw new Error(t('SignupScreen', 'validationError'));
}

let fullPhone = '';

if (isPhoneSignup) {
  if (!client_phone || !selectedPhoneCountry) {
    throw new Error(t('SignupScreen', 'validationError'));
  }
  if (!isValidNationalPhone(client_phone)) {
    throw new Error(t('SignupScreen', 'invalidPhone'));
  }
  fullPhone = selectedPhoneCountry.callCode + normalizeNationalPhone(client_phone);
  if (!whatsapp_optin) {
    throw new Error(t('SignupScreen', 'whatsappOptinRequired'));
  }
} else {
  if (!email) {
    throw new Error(t('SignupScreen', 'validationError'));
  }
  if (!validEmail(email.trim())) {
    throw new Error(t('SignupScreen', 'invalidEmail'));
  }
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
          if ( !client_country) {
            throw new Error(t('SignupScreen', 'validationError'));
          }
          userData = {
            ...userData,
            first_name: "Unknown",
            second_name:"Unknown",
            country: client_country,
            whatsapp_optin: isPhoneSignup && whatsapp_optin
          };
          break;

        case 'agent':
          if (!first_name || !second_name || !company_email || !agent_phone || !messaging_app) {
            throw new Error(t('SignupScreen', 'validationError'));
          }
          if (!validEmail(company_email.trim())) {
            throw new Error(t('SignupScreen', 'invalidEmail'));
          }
          if (!validPhoneNumber(agent_phone)) {
            throw new Error(t('SignupScreen', 'invalidPhone'));
          }
          userData = {
            ...userData,
            first_name,
            second_name,
            company_email:company_email.trim().toLowerCase(),
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
          if (!validEmail(admin_email.trim())) {
            throw new Error(t('SignupScreen', 'invalidEmail'));
          }
          userData = {
            ...userData,
            
            admin_email:admin_email.trim().toLowerCase()
          };
          break;
      }

      // Code already sent to this number (user pressed "Change phone number" and came back):
      // don't create the account or send again, the resend timer keeps running in the code step
      if (isPhoneSignup && otpMeta?.phone === fullPhone) {
        setStep('otp');
        return;
      }

      setLoading(true);
     
      // Sign up user with Supabase
      const trimmedEmail=email.trim();
      const loweredEmail= trimmedEmail.toLowerCase();
     const signupPayload = isPhoneSignup
  ? { phone: fullPhone, password, options: { data: userData, channel: 'whatsapp' } }
  : { email: loweredEmail, password, options: { data: userData } };

const { error } = await supabase.auth.signUp(signupPayload);


      if (error) throw error;

      if (isPhoneSignup) {
        // Code sent by WhatsApp: go to the verification step
        setOtpMeta({
          phone: fullPhone,
          sendCount: 1,
          nextSendAt: Date.now() + getResendDelay(1) * 1000,
        });
        setStep('otp');
        return;
      }

      finishSignup();
      
    } catch (error) {
      showAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp' && otpMeta) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.languageSelectorContainer}>
            <LanguageSelector />
          </View>
          <OtpStep
            phone={otpMeta.phone}
            sendCount={otpMeta.sendCount}
            nextSendAt={otpMeta.nextSendAt}
            onResent={({ sendCount, nextSendAt }) =>
              setOtpMeta(prev => ({ ...prev, sendCount, nextSendAt }))
            }
            onVerified={finishSignup}
            onChangeNumber={() => setStep('form')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
             {/* Client specific fields */}
        {role === 'client' && (
  <View style={styles.toggleRow}>
    <Button
      title={t('SignupScreen', 'phone')}
      type={contact_method === 'phone' ? 'solid' : 'outline'}
      onPress={() => setContactMethod('phone')}
      containerStyle={{ flex: 1, marginRight: 8 }}
    />
    <Button
      title={t('SignupScreen', 'email')}
      type={contact_method === 'email' ? 'solid' : 'outline'}
      onPress={() => setContactMethod('email')}
      containerStyle={{ flex: 1 }}
    />
  </View>
)}

{role === 'client' && !isPhoneSignup && (
  <Input
    placeholder={t('SignupScreen', 'email')}
    onChangeText={setEmail}
    value={email}
    autoCapitalize="none"
    keyboardType="email-address"
    errorMessage={email && !validEmail(email.trim()) ? t('SignupScreen', 'invalidEmail') : ''}
  />
)}

{isPhoneSignup && (
  <>
    <View style={styles.phoneRow}>
      <Dropdown
        style={[styles.dropdown, styles.codeDropdown]}
        data={countries}
        labelField="callLabel"
        valueField="value"
        value={phone_country}
        onChange={item => {
          setPhoneCountry(item.value);
          setPhoneCodeTouched(true);
        }}
        placeholder="+"
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        activeColor={theme.colors.primaryLight}
        search
        inputSearchStyle={commonStyles.inputSearchStyle}
        searchPlaceholder={t('SignupScreen', 'searchCountryOrCode')}
        searchField="search"
        maxHeight={300}
        disable={loadingCountries || !!countriesError}
        renderItem={(item) => (
          <View style={styles.dropdownItemContainer}>
            <Text style={styles.dropdownItem}>
              {item.name} {item.callCode}
            </Text>
          </View>
        )}
        dropdownPosition="auto"
        keyboardAvoiding={true}
        autoScroll={false}
      />
      <Input
        containerStyle={styles.phoneInput}
        placeholder={t('SignupScreen', 'phonePlaceholder')}
        onChangeText={setClientPhone}
        value={client_phone}
        keyboardType="phone-pad"
        errorMessage={debouncedPhone && selectedPhoneCountry && !isValidNationalPhone(debouncedPhone)
          ? t('SignupScreen', 'invalidPhone') : ''}
      />
    </View>
    <Text style={styles.phoneHint}>
      {t('SignupScreen', 'phoneCodeHint')}
    </Text>
  </>
)}

{/* Client country (phone or email) */}
{role === 'client' && (
  <>
    <Text style={styles.label}>{t('SignupScreen', 'clientCountry')}:</Text>
    {loadingCountries ? (
      <Text style={styles.loadingText}>{t('SignupScreen', 'loadingCountries')}</Text>
    ) : countriesError ? (
      <Text style={styles.errorText}>{t('SignupScreen', 'countriesError')}</Text>
    ) : (
      <Dropdown
        style={[styles.dropdown, styles.clientCountries]}
        data={countries}
        labelField="label"
        valueField="value"
        value={client_country}
        onChange={item => {
          setClientCountry(item.value);
          if (!phoneCodeTouched) setPhoneCountry(item.value);
        }}
        placeholder={t('SignupScreen', 'selectCountry')}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        activeColor={theme.colors.primaryLight}
        search
        inputSearchStyle={commonStyles.inputSearchStyle}
        searchPlaceholder={t('SignupScreen', 'searchCountry')}
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
        autoScroll={false}
      />
    )}
  </>
)}

{isPhoneSignup && (
  <CheckBox
    checkedIcon={<Icon name="check-square" type="font-awesome-5" solid size={22} color={theme.colors.primary} />}
    uncheckedIcon={<Icon name="square" type="font-awesome-5" size={22} color={theme.colors.textLight} />}
    title={t('SignupScreen', 'whatsappOptin')}
    checked={whatsapp_optin}
    onPress={() => setWhatsappOptin(!whatsapp_optin)}
  />
)}
        {role !== 'client' && (
          <Input
            placeholder={t('SignupScreen', 'email')}
            onChangeText={setEmail}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            errorMessage={email && !validEmail(email.trim()) ? t('SignupScreen', 'invalidEmail') : ''}
          />
        )}
        
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
          {t('SignupScreen', 'passwordHint')}
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
        {[ 'agent', 'admin'].includes(role) && (
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
                (company_email && !validEmail(company_email.trim())) ? t('SignupScreen', 'invalidEmail') : ''}
            />
            <>
            <Text style={styles.label}>{t('SignupScreen', 'messagingApp')} for Clients to contact you:</Text>
    <Dropdown
      data={messaging_apps}
      labelField="label"
      valueField="value"
      value={messaging_app}
      onChange={item => setMessagingApp(item.value)}
      placeholder={t('SignupScreen', 'selectMessagingApp')}
      style={styles.dropdown}
      placeholderStyle={styles.placeholderStyle}
      selectedTextStyle={styles.selectedTextStyle}
      activeColor="#e8e8e8"
    />
              <Input
                placeholder={t('SignupScreen', 'agentPhonePlaceholder')}
                onChangeText={setAgentPhone}
                value={agent_phone}
                keyboardType="phone-pad"
                errorMessage={agent_phone === '' ? t('SignupScreen', 'agentPhone') + ' is required' : 
                  (agent_phone && !validPhoneNumber(agent_phone)) ? 'Please enter a valid international phone number' : ''}
              />
              <Text style={styles.phoneHint}>
                {t('SignupScreen', 'agentPhoneHint')}
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
                (admin_email && !validEmail(admin_email.trim())) ? t('SignupScreen', 'invalidEmail') : ''}
            />
          </>
        )}
         <Text style={styles.label}>{t('SignupScreen', 'role')}:</Text>
        <Dropdown
          data={isModal? modalRoles:roles}
          labelField="label"
          valueField="value"
          value={role}
          onChange={item => setRole(item.value)}
          placeholder={t('SignupScreen', 'selectRole')}
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
        <View style={styles.footerContainer}>

        {!isModal && (
          <>
        <Button
          title={t('SignupScreen', 'backToLogin')}
          type="clear"
          onPress={() => navigation.navigate("Signin")}
          buttonStyle={styles.footerButton}
         titleStyle={styles.footerButtonTitle}
         containerStyle={styles.footerButtonContainer}
        />

      <Text style={styles.footerSeparator}>•</Text>
          </>
        )}
         <Button
          title={t('SignupScreen', 'contactUs')}
          type="clear"
          onPress={() => navigation.navigate("ContactUs")}
          buttonStyle={styles.footerButton}
         titleStyle={styles.footerButtonTitle}
         containerStyle={styles.footerButtonContainer}
        />
        </View>
      </View>
      </ScrollView>
       </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
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
  footerContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: responsive(16, 20, 20, 20, 20),
},

footerButtonContainer: {
  // Remove default margins from Button
  margin: 0,
  padding: 0,
},

footerButton: {
  // Remove default padding from Button
  paddingHorizontal: 0,
  paddingVertical: 0,
  backgroundColor: 'transparent',
},

footerButtonTitle: {
  fontSize: responsive(13, 14, 14, 14, 14),
  color: theme.colors.text,
  fontWeight: '600',
},

footerSeparator: {
  marginHorizontal: responsive(10, 12, 12, 12, 12),
  color: theme.colors.borderDark,
  fontSize: responsive(13, 14, 14, 14, 14),
},
phoneRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
},
codeDropdown: {
  width: 110,
  marginRight: 0,
  marginBottom: theme.spacing.sm,
},
phoneInput: {
  flex: 1,
  paddingHorizontal: 0,
},

toggleRow: {
  flexDirection: 'row',
  marginHorizontal: theme.spacing.sm,
  marginBottom: theme.spacing.lg,
},
});

