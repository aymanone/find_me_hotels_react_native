import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image,KeyboardAvoidingView,Platform } from 'react-native';
import { Button, Input, Text, Icon } from 'react-native-elements';
import supabase from '../config/supabase';
import { notAllowedAuthenticatedUser } from '../utils/auth';
import { showAlert } from "../components/ShowAlert";
import { theme, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';
import OtpStep, { getResendDelay } from '../components/OtpStep';
import { validPhoneNumber } from '../utils/validation';

export default function LoginScreen({ navigation, route, isModal = false, onAuthSuccess }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [contact_method, setContactMethod] = useState('phone'); // 'email' | 'phone'
  const [phone, setPhone] = useState('+');
  const [step, setStep] = useState('form'); // 'form' | 'otp' (only for phone accounts that never confirmed their number)
  const [otpMeta, setOtpMeta] = useState(null); // { phone, sendCount, nextSendAt }

  const cleanPhoneNumber = (v) => v.replace(/[\s\-().]/g, '');

  const isPhoneNotConfirmed = (error) =>
    error?.code === 'phone_not_confirmed' || /phone not confirmed/i.test(error?.message ?? '');

  // Account exists but the number was never verified: send a code and show the code step
  const startPhoneVerification = async (cleanPhone) => {
    if (otpMeta?.phone !== cleanPhone) {
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
        options: { channel: 'whatsapp', shouldCreateUser: false },
      });
      if (error) throw error;
      setOtpMeta({
        phone: cleanPhone,
        sendCount: 1,
        nextSendAt: Date.now() + getResendDelay(1) * 1000,
      });
    }
    setStep('otp');
  };

  const handleLogin = async () => {
    try {
      setLoading(true);

      if (contact_method === 'phone') {
        const cleanPhone = cleanPhoneNumber(phone);
        if (!validPhoneNumber(cleanPhone)) {
          showAlert(t('SigninScreen', 'invalidPhone'));
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          phone: cleanPhone,
          password,
        });
        if (error) {
          if (isPhoneNotConfirmed(error)) {
            await startPhoneVerification(cleanPhone);
            return;
          }
          throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      }

      if (isModal && onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (error) {
      showAlert(
        error?.status === 429 ? t('OtpStep', 'tooManyRequests') : t('SigninScreen', 'loginError')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleAsyncWork = async () => {
      try {
        const isAllowed = await notAllowedAuthenticatedUser();
        if (!isAllowed) {
           console.log("an Authenticated User trying to access auth screen");
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    handleAsyncWork();
  }, [navigation]);

  // If the offer-link redirect sent us here with a known phone number
  // (WhatsApp client, no email on file), prefill the phone field.
  useEffect(() => {
    if (route?.params?.prefillPhone) {
      setContactMethod('phone');
      setPhone(route.params.prefillPhone);
    }
  }, [route?.params?.prefillPhone]);

  if (step === 'otp' && otpMeta) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        style={{flex:1}}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { justifyContent: 'center' }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.languageSelectorContainer}>
              <LanguageSelector />
            </View>
            <View style={{ marginTop: responsive(100, 120, 120, 120, 120) }}>
              <OtpStep
                phone={otpMeta.phone}
                sendCount={otpMeta.sendCount}
                nextSendAt={otpMeta.nextSendAt}
                onResent={({ sendCount, nextSendAt }) =>
                  setOtpMeta(prev => ({ ...prev, sendCount, nextSendAt }))
                }
                // The code check signs the user in; the app (or the parent modal) takes it from here
                onVerified={() => {
                  if (isModal && onAuthSuccess) onAuthSuccess();
                }}
                onChangeNumber={() => setStep('form')}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
     <KeyboardAvoidingView
     behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    style={{flex:1}}
    >
    <ScrollView 
      contentContainerStyle={styles.container} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
     <View style={styles.contentWrapper}>
      {/* Language Selector */}
      <View style={[styles.languageSelectorContainer, isModal && { top: responsive(40, 50, 50, 50, 50) } ]}>
        <LanguageSelector />
      </View>
  {!isModal && (
    <View>
   {/* Hero Section with Logo */}
<View style={styles.heroSection}>
  <View style={styles.logoContainer}>
    <Image 
      source={require('../../assets/logo.png')} 
      style={styles.logo}
      resizeMode="cover"
    />
  </View>
   <Text style={styles.brandName}>
    {t('SigninScreen', 'title')}
  </Text>
  <Text style={styles.mainHeadline}>
    {t('SigninScreen', 'mainHeadline')}
  </Text>

  <View style={styles.keyBenefitsContainer}>
    <View style={styles.benefitItem}>
      <Icon 
        type="font-awesome" 
        name="eye-slash" 
        size={responsive(14, 16, 16, 16, 16)} 
        color={theme.colors.textWhite}
      />
      <Text style={styles.benefitText}>
        {t('SigninScreen', 'hiddenIdentity')}
      </Text>
    </View>
    
    <View style={styles.benefitItem}>
      <Icon 
        type="font-awesome" 
        name="tags" 
        size={responsive(14, 16, 16, 16, 16)} 
        color={theme.colors.textWhite}
      />
      <Text style={styles.benefitText}>
        {t('SigninScreen', 'cheaperPrices')}
      </Text>
    </View>
    
    <View style={styles.benefitItem}>
      <Icon 
        type="font-awesome" 
        name="check-circle" 
        size={responsive(14, 16, 16, 16, 16)} 
        color={theme.colors.textWhite}
      />
      <Text style={styles.benefitText}>
        {t('SigninScreen', 'trustedAgencies')}
      </Text>
    </View>
  </View>
</View>

{/* Primary CTA */}

  <View style={styles.ctaWrapper}>
    <TouchableOpacity 
      style={styles.primaryCTA}
      onPress={() => navigation.navigate('PublicTravelRequest')}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryCTAText}>
        {t('SigninScreen', 'submitNow')}
      </Text>
      <Icon 
        type="font-awesome-5"
        solid
        name="arrow-left" 
        size={responsive(16, 18, 18, 20, 20)} 
        color={theme.colors.textWhite} 
      />
    </TouchableOpacity>
    
    <Text style={styles.ctaSubtext}>
      {t('SigninScreen', 'freeService')} {'\u2022'} {t('SigninScreen', 'noRegistrationNeeded')}
    </Text>
  </View>


{/* Divider */}
<View style={styles.dividerContainer}>
  <View style={styles.dividerLine} />
  <Text style={styles.dividerText}>
    {t('SigninScreen', 'or')}
  </Text>
  <View style={styles.dividerLine} />
</View>
 </View>
 )}

        {/* Login Form */}
        <View style={[
  styles.formContainer,
  isModal && { marginTop: responsive(150, 150, 150, 150, 150) }
]}>
          <View style={styles.contactToggleRow}>
            <TouchableOpacity onPress={() => setContactMethod('email')}>
              <Text style={[
                styles.contactToggleText,
                contact_method === 'email' && styles.contactToggleTextActive,
              ]}>
                {t('SigninScreen', 'email')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.contactToggleSeparator}>{'\u2022'}</Text>
            <TouchableOpacity onPress={() => {
              setContactMethod('phone');
              if (!phone) setPhone('+'); // user only types the code and number
            }}>
              <Text style={[
                styles.contactToggleText,
                contact_method === 'phone' && styles.contactToggleTextActive,
              ]}>
                {t('SigninScreen', 'phone')}
              </Text>
            </TouchableOpacity>
          </View>

          {contact_method === 'phone' ? (
            <>
            <Input
              placeholder="+201234567890"
              onChangeText={setPhone}
              value={phone}
              autoCapitalize="none"
              keyboardType="phone-pad"
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              containerStyle={styles.inputWrapper}
              placeholderTextColor={theme.colors.textLight}
            />
            <Text style={styles.phoneHint}>{t('SigninScreen', 'phoneHint')}</Text>
            </>
          ) : (
            <Input
              placeholder={t('SigninScreen', 'email')}
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              containerStyle={styles.inputWrapper}
              placeholderTextColor={theme.colors.textLight}
            />
          )}

          <Input
            placeholder={t('SigninScreen', 'password')}
            onChangeText={setPassword}
            value={password}
            secureTextEntry={!showPassword}
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputText}
            containerStyle={styles.inputWrapper}
            placeholderTextColor={theme.colors.textLight}
            rightIcon={{ 
              type: 'font-awesome',
              name: showPassword ? 'eye-slash' : 'eye',
              size: responsive(16, 18, 18, 18, 18),
              color: theme.colors.textSecondary,
              onPress: () => setShowPassword(!showPassword)
            }}
          />

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() =>
              navigation.navigate(
                'ForgotPassword',
                contact_method === 'phone'
                  ? { method: 'phone', phone: cleanPhoneNumber(phone).length > 1 ? cleanPhoneNumber(phone) : '' }
                  : { method: 'email', email: email.trim() }
              )
            }
          >
            <Text style={styles.forgotPasswordText}>
              {t('SigninScreen', 'forgotPassword')}
            </Text>
          </TouchableOpacity>

          <Button
            title={t('SigninScreen', 'login')}
            onPress={handleLogin}
            loading={loading}
            buttonStyle={styles.loginButton}
            titleStyle={styles.loginButtonText}
            containerStyle={styles.buttonContainer}
          />
        </View>

        {/* Footer Actions */}
        <View style={styles.footerContainer}>
          {!isModal && (
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>
                {t('SigninScreen', 'signup')}
              </Text>
            </TouchableOpacity>
          )}
          
          {!isModal && <Text style={styles.footerSeparator}>•</Text>}

          <TouchableOpacity onPress={() => navigation.navigate('ContactUs')}>
            <Text style={styles.footerLink}>
              {t('SigninScreen', 'contactUs')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
    </ScrollView>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    alignItems:"center",
    paddingBottom:40,

  },
    contentWrapper: {
    width: '100%',
    maxWidth:700,
    alignSelf:"center",
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: responsive(40, 50, 50, 50, 50),
    right: responsive(20, 24, 24, 24, 24),
    zIndex: 10,
  },

  // Hero Section with Gradient
  heroSection: {
    backgroundColor: theme.colors.primary,
  paddingTop: responsive(100, 120, 120, 130, 130),
  paddingBottom: responsive(40, 50, 50, 60, 60),
  paddingHorizontal: responsive(20, 24, 24, 24, 24),
  alignItems: 'center',
  },

  // Logo Styles
  logoContainer: {
    marginBottom: responsive(16, 20, 20, 24, 24),
  },

  logoPlaceholder: {
    width: responsive(90, 100, 100, 110, 110),
    height: responsive(90, 100, 100, 110, 110),
    borderRadius: responsive(45, 50, 50, 55, 55),
    backgroundColor: theme.colors.backgroundWhite,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },

  // Uncomment when using actual logo image
  logo: {
      width: responsive(180, 200, 220, 240, 260),
      height: responsive(45, 50, 55, 60, 65),
     borderRadius: responsive(8, 10, 10, 12, 12),
      
    
  },

  brandName: {
    fontSize: responsive(24, 26, 28, 30, 32),
  fontWeight: '700',
  color: theme.colors.textWhite,
  letterSpacing: -0.5,
  textAlign: 'center',
 
  },

  // Travel Card - Overlapping hero
  cardWrapper: {
    paddingHorizontal: responsive(20, 24, 24, 24, 24),
    marginTop: responsive(-35, -40, -40, -45, -45),
    zIndex: 5,
  },

  createRequestCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: responsive(18, 20, 20, 22, 22),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.card,
  },

  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsive(12, 16, 16, 16, 16),
    flex: 1,
  },

  iconCircle: {
    width: responsive(36, 40, 40, 40, 40),
    height: responsive(36, 40, 40, 40, 40),
    backgroundColor: theme.colors.primary,
    borderRadius: responsive(18, 20, 20, 20, 20),
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTextContainer: {
    flex: 1,
    marginLeft: responsive(8, 12, 12, 12, 12),
  },

  cardTitle: {
    fontSize: responsive(15, 16, 16, 16, 16),
    fontWeight: '600',
    color: theme.colors.textWhite,
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: responsive(12, 13, 13, 13, 13),
    color: theme.colors.text,
  },

  // Form Section
  formSection: {
    flex: 1,
    backgroundColor: theme.colors.backgroundWhite,
    paddingHorizontal: responsive(20, 24, 24, 24, 24),
    paddingTop: responsive(32, 40, 40, 40, 40),
    paddingBottom: responsive(20, 24, 24, 24, 24),
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
  alignItems: 'center',
  marginBottom: responsive(24, 28, 28, 32, 32),
  paddingHorizontal: responsive(20, 24, 24, 24, 24),
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },

  dividerText: {
    marginHorizontal: responsive(12, 16, 16, 16, 16),
    fontSize: responsive(13, 14, 14, 14, 14),
    color: theme.colors.textLight,
    fontWeight: '500',
  },

  // Form
  formContainer: {
    marginBottom: responsive(20, 24, 24, 24, 24),
  },

  inputWrapper: {
    marginBottom: responsive(16, 20, 20, 20, 20),
  },

  phoneHint: {
    fontSize: responsive(11, 12, 12, 12, 12),
    color: theme.colors.textSecondary,
    marginTop: responsive(-12, -14, -14, -14, -14),
    marginBottom: responsive(14, 16, 16, 16, 16),
    paddingHorizontal: 10,
  },

  contactToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive(10, 12, 12, 12, 12),
  },

  contactToggleText: {
    fontSize: responsive(13, 14, 14, 14, 14),
    color: theme.colors.textLight,
    fontWeight: '500',
  },

  contactToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  contactToggleSeparator: {
    marginHorizontal: responsive(10, 12, 12, 12, 12),
    color: theme.colors.borderDark,
  },

  inputContainer: {
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 0,
  },

  inputText: {
    fontSize: responsive(14, 16, 16, 16, 16),
    color: theme.colors.text,
  },

  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: responsive(20, 24, 24, 24, 24),
    marginTop: responsive(-8, -8, -8, -8, -8),
     marginRight: responsive(8, 10, 10, 12, 12),
  },

  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: responsive(12, 13, 13, 14, 14),
    fontWeight: '600',
  },

  loginButton: {
    
    borderRadius: theme.borderRadius.md,
    paddingVertical: responsive(10, 12, 12, 12, 12),
    height: responsive(44, 48, 48, 48, 48),
  },

  loginButtonText: {
    fontSize: responsive(15, 16, 16, 16, 16),
    fontWeight: '700',
  },

  buttonContainer: {
    marginTop: theme.spacing.sm,
  },

  // Footer
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: responsive(16, 20, 20, 20, 20),
  },

  footerLink: {
    fontSize: responsive(13, 14, 14, 14, 14),
    color: theme.colors.primary,
    fontWeight: '600',
  },

  footerSeparator: {
    marginHorizontal: responsive(10, 12, 12, 12, 12),
    color: theme.colors.borderDark,
    fontSize: responsive(13, 14, 14, 14, 14),
  },


// Main headline
mainHeadline: {
 ...theme.responsiveTypography.formMainHeadline,
  marginTop: responsive(16, 20, 20, 24, 24),
  lineHeight: responsive(26, 28, 30, 32, 34),
  paddingHorizontal: responsive(10, 15, 20, 25, 30),
},

// Key benefits container
keyBenefitsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginTop: responsive(20, 24, 24, 28, 28),
  gap: responsive(12, 16, 16, 20, 20),
},

benefitItem: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  paddingVertical: responsive(8, 10, 10, 12, 12),
  paddingHorizontal: responsive(12, 14, 14, 16, 16),
  borderRadius: responsive(20, 22, 22, 24, 24),
  gap: responsive(6, 8, 8, 8, 8),
},

benefitText: {
 ...theme.responsiveTypography.formBenefitText,
},

// Primary CTA
ctaWrapper: {
  paddingHorizontal: responsive(20, 24, 24, 24, 24),
  marginTop: responsive(-20, -25, -25, -30, -30),
  marginBottom: responsive(24, 28, 28, 32, 32),
  alignItems: 'center',
  zIndex: 5,
},

primaryCTA: {
  backgroundColor: theme.colors.secondary,
  borderRadius: theme.borderRadius.lg,
  padding: responsive(16, 18, 20, 22, 22),
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  gap: responsive(10, 12, 12, 12, 12),
  ...theme.shadows.lg,
},

primaryCTAText: {
  fontSize: responsive(16, 17, 18, 18, 19),
  fontWeight: '700',
  color: theme.colors.textWhite,
},

ctaSubtext: {
  fontSize: responsive(12, 13, 13, 14, 14),
  color: theme.colors.textSecondary,
  marginTop: responsive(12, 14, 14, 16, 16),
  textAlign: 'center',
},

// Login section title
loginSectionTitle: {
  fontSize: responsive(16, 17, 18, 18, 19),
  fontWeight: '600',
  color: theme.colors.text,
  textAlign: 'center',
  marginBottom: responsive(20, 24, 24, 24, 24),
},

});
