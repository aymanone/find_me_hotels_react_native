import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation} from '../config/localization';

const LanguageSettingsScreen = () => {
   const { t,language } = useTranslation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('LanguageSettingsScreen', 'title')}</Text>
      <Text style={styles.subtitle}>{t('LanguageSettingsScreen', 'subtitle')}</Text>
      <View style={styles.selectorContainer}>
        <LanguageSelector />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  selectorContainer: {
    width: '100%',
    maxWidth: 300,
  },
});

export default LanguageSettingsScreen; 
