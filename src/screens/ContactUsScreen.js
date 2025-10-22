import React, { useState } from 'react';
import { View, StyleSheet, Linking,ScrollView} from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import { showAlert } from "../components/ShowAlert";
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
import { validEmail } from '../utils/validation';
import supabase from '../config/supabase';
export default function ContactUsScreen({ navigation }) {
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      showAlert(t('ContactUsScreen', 'nameRequired') || 'Name is required');
      return;
    }
    
    if (!email.trim()) {
      showAlert(t('ContactUsScreen', 'emailRequired') || 'Email is required');
      return;
    }
    
    if (!validEmail(email)) {
      showAlert(t('ContactUsScreen', 'invalidEmail') || 'Please enter a valid email address');
      return;
    }
    
    if (!message.trim()) {
      showAlert(t('ContactUsScreen', 'messageRequired') || 'Message is required');
      return;
    }

    try {
      setLoading(true);
      
      // Create mailto URL with form data
      const subject = `Contact Form Message from ${name}`;
      const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
      const mailtoUrl = `mailto:feedback@alghorfa.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Open email client
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
       // showAlert(t('ContactUsScreen', 'messageSent') || 'Thank you! Your message has been prepared. Please send it from your email client.');
        
        // Clear form after successful submission
        setName('');
        setEmail('');
        setMessage('');
      } else {
        showAlert(t('ContactUsScreen', 'emailClientError') || 'Could not open email client. Please contact us directly at ayman@mail.com');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showAlert(t('ContactUsScreen', 'submitError') || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlogLink = () => {
    const blogUrl = 'https://www.google.com/search?q=error+suggestions+feedback';
    Linking.openURL(blogUrl).catch(() => {
      showAlert(t('ContactUsScreen', 'linkError') || 'Could not open link');
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      
      <Text  style={styles.title}>
        {t('ContactUsScreen', 'title') || 'Contact Us'}
      </Text>
      
      <Text style={styles.subtitle}>
        {t('ContactUsScreen', 'subtitle') || 'We\'d love to hear from you!'}
      </Text>

      <Input
        placeholder={t('ContactUsScreen', 'namePlaceholder') || 'Your Name'}
        onChangeText={setName}
        value={name}
        leftIcon={{ 
          type: 'font-awesome', 
          name: 'user',
          size: theme.responsiveComponents.icon.medium,
          color: theme.colors.textSecondary
}}
        containerStyle={styles.inputContainer}
      />

      <Input
        placeholder={t('ContactUsScreen', 'emailPlaceholder') || 'Your Email'}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        leftIcon={{ 
           type: 'font-awesome', 
           name: 'envelope',
           size: theme.responsiveComponents.icon.medium,
           color: theme.colors.textSecondary
}}
        containerStyle={styles.inputContainer}
      />

      <Input
        placeholder={t('ContactUsScreen', 'messagePlaceholder') || 'Your Message'}
        onChangeText={setMessage}
        value={message}
        multiline
        numberOfLines={4}
        leftIcon={{ 
             type: 'font-awesome', 
             name: 'comment',
             size: theme.responsiveComponents.icon.medium,
             color: theme.colors.textSecondary
}}
        containerStyle={styles.inputContainer}
        inputStyle={styles.messageInput}
      />

      <Button
        title={t('ContactUsScreen', 'sendMessage') || 'Send Message'}
        onPress={handleSubmit}
        loading={loading}
        buttonStyle={styles.submitButton}
      />

      <View style={styles.blogLinkContainer}>
        <Text style={styles.blogText}>
          {t('ContactUsScreen', 'blogText') || 'Need help with errors or have suggestions?'}
        </Text>
      {/* <Button
          title={t('ContactUsScreen', 'visitBlog') || 'Visit Our Help Center'}
          type="clear"
          onPress={handleBlogLink}
          titleStyle={styles.blogLinkText}
        /> */}
      </View>
      <View style={styles.navigationContainer}>
  <Button
    title={t('ContactUsScreen', 'backToApp') || 'Back to App'}
    type="outline"
    onPress={() => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('SignIn');
  }
}}
    buttonStyle={styles.navigationButton}
    titleStyle={styles.navigationButtonText}
  />
</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxxl * 2, 
    backgroundColor: theme.colors.background,
  },
  
  languageSelectorContainer: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: -theme.spacing.xxl,
    zIndex: 1,
  },
  
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    top:-theme.spacing.lg,
    fontSize: theme.responsiveTypography.h3.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  
  subtitle: {
    textAlign: 'center',
     top: theme.spacing.xxxl,
    marginBottom: theme.spacing.xxxl,
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  submitButton: {
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
  },
  
  blogLinkContainer: {
    marginTop: theme.spacing.xxxl,
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  
  blogText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  
  blogLinkText: {
    color: theme.colors.primary,
    fontSize: theme.responsiveTypography.fontSize.sm,
  },
  navigationContainer: {
  marginTop: theme.spacing.xl,
  alignItems: 'center',
},

navigationButton: {
  borderColor: theme.colors.primary,
  borderWidth: 2,
  borderRadius: theme.borderRadius.md,
  paddingHorizontal: theme.spacing.xxl,
  paddingVertical: theme.spacing.md,
},

navigationButtonText: {
  color: theme.colors.primary,
  fontSize: theme.responsiveTypography.fontSize.md,
  fontWeight: theme.typography.fontWeight.bold,
},
});