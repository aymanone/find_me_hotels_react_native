import { createNavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';

export const navigationRef = createNavigationContainerRef();

// Keep your existing navigate function
export function navigate(name, params) {
  if (navigationRef.current && navigationRef.current.isReady()) {
    navigationRef.current.navigate(name, params);
  } else {
    // Save the navigation action for when the navigator is ready
    navigationRef.pendingNavigation = { name, params };
  }
}

/**
 * Opens a deep link within the app
 * @param {string} path - The path to navigate to (without the scheme)
 * @returns {Promise&lt;boolean&gt;} - Whether the link was successfully opened
 */
export const openAppLink = async (path) => {
  try {
    const url = `alghorfa://${path}`;
    console.log('Opening deep link:', url);
    
    // Check if the URL can be opened
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      console.log(`Cannot open URL: ${url}`);
      return false;
    }
  } catch (error) {
    console.error('Error opening deep link:', error);
    return false;
  }
};

/**
 * Creates a URL for external sharing
 * @param {string} path - The path to share
 * @param {boolean} useWebFallback - Whether to use web URL instead of deep link
 * @returns {string} - The complete URL
 */
export const createShareableLink = (path, useWebFallback = false) => {
  if (useWebFallback) {
    // For sharing with users who might not have the app installed
    return `https://www.alghorfa.net/${path}`;
  }
  return `alghorfa://${path}`;
};