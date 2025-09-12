import React, { useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import { showAlert } from "../components/ShowAlert";
import { useTranslation } from '../config/localization';
import LanguageSelector from '../components/LanguageSelector';
import { validEmail } from '../utils/validation';

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
    <View style={styles.container}>
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      
      <Text h3 style={styles.title}>
        {t('ContactUsScreen', 'title') || 'Contact Us'}
      </Text>
      
      <Text style={styles.subtitle}>
        {t('ContactUsScreen', 'subtitle') || 'We\'d love to hear from you!'}
      </Text>

      <Input
        placeholder={t('ContactUsScreen', 'namePlaceholder') || 'Your Name'}
        onChangeText={setName}
        value={name}
        leftIcon={{ type: 'font-awesome', name: 'user' }}
        containerStyle={styles.inputContainer}
      />

      <Input
        placeholder={t('ContactUsScreen', 'emailPlaceholder') || 'Your Email'}
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        leftIcon={{ type: 'font-awesome', name: 'envelope' }}
        containerStyle={styles.inputContainer}
      />

      <Input
        placeholder={t('ContactUsScreen', 'messagePlaceholder') || 'Your Message'}
        onChangeText={setMessage}
        value={message}
        multiline
        numberOfLines={4}
        leftIcon={{ type: 'font-awesome', name: 'comment' }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 15,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007bff',
    marginTop: 20,
    borderRadius: 8,
  },
  blogLinkContainer: {
    marginTop: 30,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  blogText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  blogLinkText: {
    color: '#007bff',
    fontSize: 14,
  },
});
