import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { openUrl } from '../utils/linkingUtils'; // Import from linkingUtils

const DeepLinkText = ({ children, path, style, onPress, fallbackRoute }) => {
  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }
    
    try {
      // Construct the deep link URL
      const url = `findmehotels://${path}`;
      console.log('Attempting to open deep link:', url);
      
      // Use the openUrl function from linkingUtils
      const success = await openUrl(url);
      
      if (!success && fallbackRoute) {
        // If deep link fails and we have a fallback route, use it
        console.log(`Deep link failed, using fallback navigation to: ${fallbackRoute}`);
        // You would need to have navigation context here to use this
        // navigation.navigate(fallbackRoute);
      }
    } catch (error) {
      console.error('Error opening deep link:', error);
      Alert.alert('Error', 'Could not open the link');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text style={[styles.link, style]}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  link: {
    color: '#007bff',
    textDecorationLine: 'underline',
    marginVertical: 5,
  },
});

export default DeepLinkText;
