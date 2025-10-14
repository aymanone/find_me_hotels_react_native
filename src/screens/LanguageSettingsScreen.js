import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LanguageSelector from '../components/LanguageSelector';
import { theme, commonStyles, responsive, screenSize } from '../styles/theme';
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
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.backgroundWhite,
  },
  
  title: {
    fontSize: theme.responsiveTypography.h2.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xxxl,
    textAlign: 'center',
  },
  
  selectorContainer: {
    width: '100%',
    maxWidth: 300,
  },
});

export default LanguageSettingsScreen; 
