import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LanguageSelector from './LanguageSelector';

const LanguageScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Language</Text>
      <LanguageSelector />
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
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default LanguageScreen; 