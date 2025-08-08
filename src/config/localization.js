import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language Context
const LanguageContext = createContext();

// Global language state that can be accessed outside React components
let globalLanguage = 'ar';

// Language Provider
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('ar');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage) {
        setLanguage(savedLanguage);
        globalLanguage = savedLanguage; // Update global state
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('selectedLanguage', newLanguage);
      setLanguage(newLanguage);
      globalLanguage = newLanguage; // Update global state
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Hook-safe translation function with interpolation support
export const useTranslation = () => {
  const { language } = useLanguage();
  
  const t = (screenName, key, params = {}) => {
    const { ScreenTranslations } = require('../translations/screens');
    const screenTranslations = ScreenTranslations[screenName];
    let text = screenTranslations?.[language]?.[key] || screenTranslations?.en?.[key] || key;
    
    // Add interpolation support using existing formatMixedContent
    if (params && Object.keys(params).length > 0) {
      text = formatMixedContent(text, params);
    }
    
    return text;
  };
  
  return { t, language };
};

// Alternative: Pure function that doesn't use hooks at all (for use outside components)
export const translate = (screenName, key, languageOverride = null) => {
  const currentLanguage = languageOverride || globalLanguage;
  const { ScreenTranslations } = require('../translations/screens');
  const screenTranslations = ScreenTranslations[screenName];
  return screenTranslations?.[currentLanguage]?.[key] || screenTranslations?.en?.[key] || key;
};

// Helper function for mixed language content (English names/emails with Arabic text)
export const formatMixedContent = (template, data) => {
  const currentLanguage = globalLanguage;
  
  // For Arabic, we need to handle RTL text with English content
  if (currentLanguage === 'ar') {
    // Replace placeholders with actual data while preserving English content
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] ?? match;
    });
  }
  
  // For English, just replace placeholders
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] ?? match;
  });
};

// Helper function to get dropdown options with translations
export const getDropdownOptions = (optionsKey) => {
  const currentLanguage = globalLanguage;
  const { ScreenTranslations } = require('../translations/screens');
  const dropdownOptions = ScreenTranslations.DropdownOptions;
  
  return dropdownOptions?.[currentLanguage]?.[optionsKey] || dropdownOptions?.en?.[optionsKey] || optionsKey;
};