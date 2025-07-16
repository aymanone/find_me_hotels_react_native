import { Linking, Platform } from 'react-native';

/**
 * Opens a URL with proper error handling
 * @param {string} url - The URL to open
 * @returns {Promise<boolean>} - Whether the URL was successfully opened
 */
export const openUrl = async (url) => {
  if (!url) {
    console.log('No URL provided');
    return false;
  }
  
  try {
    // Ensure URL has proper protocol for web URLs
    let fullUrl = url;
    if (!url.includes('://')) {
      // This is likely a web URL without protocol
      fullUrl = `https://${url}`;
    }
    
    console.log('Attempting to open URL:', fullUrl);
    
    // On Android, we need to handle deep links differently
    if (Platform.OS === 'android' && fullUrl.startsWith('findmehotels://')) {
      // For Android deep links, we might need to use Intent
      await Linking.openURL(fullUrl);
      return true;
    } else {
      // For regular URLs and iOS deep links
      const supported = await Linking.canOpenURL(fullUrl);
      
      if (supported) {
        await Linking.openURL(fullUrl);
        return true;
      } else {
        console.log(`Cannot open URL: ${fullUrl}`);
        
        // Special handling for deep links that fail
        if (fullUrl.startsWith('findmehotels://')) {
          console.log('Deep link not supported, this is expected in development');
          // In development, deep links might not work, so we return true to allow fallback navigation
          return false;
        }
        
        return false;
      }
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    return false;
  }
};

/**
 * Opens a messaging app with the given phone number
 * @param {string} phoneNumber - The phone number to message
 * @param {string} app - The messaging app to use (whatsapp, telegram, etc.)
 * @returns {Promise<boolean>} - Whether the app was successfully opened
 */
export const openMessagingApp = async (phoneNumber, app) => {
  if (!phoneNumber) {
    console.log('No phone number provided');
    return false;
  }
  
  try {
    // Format phone number (remove spaces, ensure it starts with +)
    const formattedPhone = phoneNumber.replace(/\s+/g, '');
    
    let url;
    switch(app?.toLowerCase()) {
      case 'whatsapp':
        url = `whatsapp://send?phone=${formattedPhone}`;
        break;
      case 'telegram':
        url = `tg://resolve?domain=${formattedPhone}`;
        break;
      case 'signal':
        url = `signal://chat?phone=${formattedPhone}`;
        break;
      case 'wechat':
        url = `weixin://dl/chat?${formattedPhone}`;
        break;
      case 'imo':
        url = `imo://chat?phone=${formattedPhone}`;
        break;
      default:
        url = `tel:${formattedPhone}`;
    }
    
    console.log('Attempting to open messaging app:', url);
    
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      console.log(`Cannot open URL: ${url}`);
      
      // Fallback for WhatsApp
      if (app?.toLowerCase() === 'whatsapp') {
        const webUrl = `https://wa.me/${formattedPhone}`;
        await Linking.openURL(webUrl);
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error(`Error opening ${app}:`, error);
    return false;
  }
};
/**
 * Creates a deep link URL for the app
 * @param {string} path - The path without the scheme
 * @returns {string} - The complete deep link URL
 */
export const createDeepLink = (path) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `findmehotels://${cleanPath}`;
};

/**
 * Tests a deep link by opening it
 * @param {string} path - The path without the scheme
 * @returns {Promise<boolean>} - Whether the link was successfully opened
 */
export const testDeepLink = async (path) => {
  const url = createDeepLink(path);
  return await openUrl(url);
};