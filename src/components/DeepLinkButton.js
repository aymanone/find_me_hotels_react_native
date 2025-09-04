import React from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button } from 'react-native-elements';
import { openUrl } from '../utils/linkingUtils'; // Import from linkingUtils

const DeepLinkButton = ({ 
  title, 
  path, 
  buttonStyle, 
  titleStyle, 
  type = 'solid',
  onPress,
  fallbackRoute,
  ...props 
}) => {
  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }
    
    try {
      // Construct the deep link URL
      const url = `alghorfa://${path}`;
      console.log('Attempting to open deep link from button:', url);
      
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
    <Button
      title={title}
      onPress={handlePress}
      buttonStyle={[styles.button, buttonStyle]}
      titleStyle={titleStyle}
      type={type}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 5,
    marginVertical: 10,
  },
});

export default DeepLinkButton;
