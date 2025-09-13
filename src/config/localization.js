import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language Context
const LanguageContext = createContext();

// REMOVED: Global language state that was causing the issues
// let globalLanguage = 'ar'; // This line has been deleted

// Language Provider
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage) {
        setLanguage(savedLanguage);
        // REMOVED: globalLanguage = savedLanguage;
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      await AsyncStorage.setItem('selectedLanguage', newLanguage);
      setLanguage(newLanguage);
      // REMOVED: globalLanguage = newLanguage;
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  // NEW: Translation function that uses React state instead of global variable
  const t = (screenName, key, params = {}) => {
    const { ScreenTranslations } = require('../translations/screens');
    const screenTranslations = ScreenTranslations[screenName];
    let text = screenTranslations?.[language]?.[key] || screenTranslations?.en?.[key] || key;
    
    // Add interpolation support using updated formatMixedContent
    if (params && Object.keys(params).length > 0) {
      text = formatMixedContent(text, params, language);
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
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

// UPDATED: Hook-safe translation function that now uses context t
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return { t: context.t, language: context.language };
};

// KEPT: Pure function for backward compatibility (use sparingly)
export const translate = (screenName, key, languageOverride = null) => {
  // This should only be used outside React components
  console.warn('Using translate() outside React component. Consider using useTranslation() instead.');
  
  const currentLanguage = languageOverride || 'en'; // Use your app's default language
  const { ScreenTranslations } = require('../translations/screens');
  const screenTranslations = ScreenTranslations[screenName];
  return screenTranslations?.[currentLanguage]?.[key] || screenTranslations?.en?.[key] || key;
};

// UPDATED: Helper function now accepts language parameter
export const formatMixedContent = (template, data, currentLanguage) => {
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

// UPDATED: Helper function for dropdown options now uses passed language
export const getDropdownOptions = (optionsKey, currentLanguage = 'en') => {
  const { ScreenTranslations } = require('../translations/screens');
  const dropdownOptions = ScreenTranslations.DropdownOptions;
  
  return dropdownOptions?.[currentLanguage]?.[optionsKey] || dropdownOptions?.en?.[optionsKey] || optionsKey;
};