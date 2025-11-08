import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button } from 'react-native-elements';
import { Icon } from 'react-native-elements';
import SigninScreen from '../screens/SigninScreen';
import SignupScreen from '../screens/SignupScreen';
import { useTranslation } from '../config/localization';
import { theme } from '../styles/theme';

export default function ClientAuthModal({ visible, onClose, navigation, onAuthSuccess }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('signin');

  const handleAuthSuccess = () => {
    onAuthSuccess();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        style={styles.container}
        
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text h4 style={styles.headerTitle}>
            {t('ClientAuthModal', 'title')}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" type="ionicon" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
            onPress={() => setActiveTab('signin')}
          >
            <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
              {t('ClientAuthModal', 'signIn')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
            onPress={() => setActiveTab('signup')}
          >
            <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
              {t('ClientAuthModal', 'signUp')}
            </Text>
          </TouchableOpacity>
        </View>

        <View 
          style={styles.contentContainer}
          
        >
          {/* Render the appropriate screen */}
          {activeTab === 'signin' ? (
            <SigninScreen
              navigation={navigation}
              isModal={true}
              onAuthSuccess={handleAuthSuccess}
            />
          ) : (
            <>
              <SignupScreen
                navigation={navigation}
                isModal={true}
                onAuthSuccess={handleAuthSuccess}
              />
              
              {/* Link to full signup for other roles */}
              <View style={styles.fullSignupLink}>
                <Text style={styles.linkText}>
                  {t('ClientAuthModal', 'needAgentOrCompany')}{' '}
                </Text>
                <Button
                  title={t('ClientAuthModal', 'fullSignup')}
                  type="clear"
                  onPress={() => {
                    onClose();
                    navigation.navigate('Signup');
                  }}
                  titleStyle={styles.linkButtonText}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 28, // Balance the close button
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.backgroundWhite,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.responsiveTypography.fontSize.md,
    color: theme.colors.textLight,
    fontWeight: theme.typography.fontWeight.medium,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  contentContainer: {
    flex: 1,
  },
  fullSignupLink: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginTop: theme.spacing.lg,
  },
  linkText: {
    fontSize: theme.responsiveTypography.fontSize.sm,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  linkButtonText: {
    fontSize: theme.responsiveTypography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
});