import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Button, Input, Text, Icon } from 'react-native-elements';
import supabase from '../config/supabase';
import { notAllowedAuthenticatedUser } from '../utils/auth';
import { showAlert } from "../components/ShowAlert";
import { theme, responsive, screenSize } from '../styles/theme';
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';

export default function LoginScreen({ navigation, isModal = false, onAuthSuccess }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const trimmedEmail = email.trim();
      const loweredEmail = trimmedEmail.toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: loweredEmail,
        password,
      });

      if (error) throw error;
      
      if (isModal && onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (error) {
      showAlert(t('SigninScreen', 'loginError'));
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

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.title}>{t('SigninScreen', 'title') || 'Travel smarter'}</Text>
      </View>

      {/* Create Travel Request Card */}
      {!isModal && (
        <TouchableOpacity 
          style={styles.createRequestCard}
          onPress={() => navigation.navigate('PublicTravelRequest')}
          activeOpacity={0.85}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconCircle}>
              <Icon 
                type="font-awesome" 
                name="hotel" 
                size={responsive(18, 20, 20, 20, 20)} 
                color={theme.colors.textWhite}
              />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{t('SigninScreen', 'createTravelRequest')}</Text>
              <Text style={styles.cardSubtitle}> {t('SigninScreen', 'subTitle')} </Text>
            </View>
          </View>
          <Icon 
            type="font-awesome" 
            name="chevron-right" 
            size={responsive(16, 18, 18, 20, 20)} 
            color={theme.colors.textWhite} 
          />
        </TouchableOpacity>
      )}

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('SigninScreen', 'login') || 'Login'}</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <Input
          placeholder={t('SigninScreen', 'email')}
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
          inputContainerStyle={styles.inputContainer}
          inputStyle={styles.inputText}
          containerStyle={styles.inputWrapper}
        />
        
        <Input
          placeholder={t('SigninScreen', 'password')}
          onChangeText={setPassword}
          value={password}
          secureTextEntry={!showPassword}
          inputContainerStyle={styles.inputContainer}
          inputStyle={styles.inputText}
          containerStyle={styles.inputWrapper}
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
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>{t('SigninScreen', 'forgotPassword')}</Text>
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

      {/* Footer Actions (Signup & Contact) */}
      <View style={styles.footerContainer}>
        {!isModal && (
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>{t('SigninScreen', 'signup')}</Text>
          </TouchableOpacity>
        )}
        
        {!isModal && <Text style={styles.footerSeparator}>•</Text>}

        <TouchableOpacity onPress={() => navigation.navigate('ContactUs')}>
          <Text style={styles.footerLink}>{t('SigninScreen', 'contactUs')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: responsive(20, 24, 24, 24, 24),
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundWhite,
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: responsive(40, 50, 50, 50, 50),
    right: responsive(20, 24, 24, 24, 24),
    zIndex: 1,
  },
  headerContainer: {
    marginBottom: responsive(28, 32, 32, 32, 32),
    alignItems: 'center',
    marginTop: responsive(100, 0, 0, 0, 0),
  },
  title: {
    fontSize: responsive(28, 32, 32, 32, 32),
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  // Create Request Card - Styled with theme
  createRequestCard: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.lg,
    padding: responsive(18, 20, 20, 22, 22),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: responsive(24, 32, 32, 32, 32),
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Shadow for Android
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsive(12, 16, 16, 16, 16),
    flex: 1,
    justifyContent: 'center',
  },
  iconCircle: {
    width: responsive(36, 40, 40, 40, 40),
    height: responsive(36, 40, 40, 40, 40),
    backgroundColor: theme.colors.primary,
    borderRadius: responsive(18, 20, 20, 20, 20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsive(10, 12, 12, 12, 12),
  },
  cardTextContainer: {
    justifyContent: 'center',
      flex: 1, // Add this
  marginRight: responsive(8, 12, 12, 12, 12), // Add this

  },
  cardTitle: {
    fontSize: responsive(15, 16, 16, 16, 16),
    fontWeight: '600',
    color: theme.colors.textWhite,
    flexWrap:"wrap",
  },
  cardSubtitle: {
    fontSize: responsive(12, 13, 13, 13, 13),
    color: theme.colors.text,
  },
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive(20, 24, 24, 24, 24),
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
    marginBottom: responsive(12, 16, 16, 16, 16),
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
    marginRight: theme.spacing.sm,
  },
  forgotPasswordText: {
    color:theme.colors.text,
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
    marginTop: responsive(12, 16, 16, 16, 16),
  },
  footerLink: {
    fontSize: responsive(13, 14, 14, 14, 14),
    color: theme.colors.text,
    fontWeight: '600',
  },
  footerSeparator: {
    marginHorizontal: responsive(10, 12, 12, 12, 12),
    color: theme.colors.borderDark,
    fontSize: responsive(13, 14, 14, 14, 14),
  },
});