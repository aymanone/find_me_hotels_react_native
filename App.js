// Only import react-native-gesture-handler on native platforms
import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native'; // Changed from expo-linking to react-native
import { registerForPushNotificationsAsync } from './src/utils/notificationUtils';
import { createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
export default function App() {
  // Create a navigation ref using the official API
  const navigationRef = createNavigationContainerRef();
  const [initialUrl, setInitialUrl] = useState(null);

 const navigate = async (name, params, maxAttempts = 3) => {
  let navigationSuccessful = false;
  let lastError = null;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (navigationRef.isReady()) {
          navigationRef.navigate(name, params);
          navigationSuccessful = true;
          return true;
        } else {
          console.log(`Navigation not ready, attempt ${attempt}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        }
      } catch (error) {
        lastError = error;
        console.log(`Navigation attempt ${attempt}/${maxAttempts} failed:`, error);
        
        if (attempt === maxAttempts) {
          break; // Exit loop to go to finally
        }
        
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
      }
    }
    
    return false; // All attempts failed
  } finally {
    console.log(`Navigation to ${name} completed. Success: ${navigationSuccessful}`);
    
    if (!navigationSuccessful && lastError) {
      console.error('Final navigation failure:', lastError);
    }
    
    // Any cleanup you need here
  }
};

  useEffect(() => {
    // Get the initial URL that opened the app
    const getInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('App opened with initial URL:', url);
        setInitialUrl(url);
      }
    };
    
    getInitialURL();
    
    registerForPushNotificationsAsync();
    
    // Set up notification handler
    const  notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification received:', notification);
    });
    
    // Handle notification response (when user taps the notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { data } = response.notification.request.content;
      
      // Navigate based on the notification data
      if (data.screen) {
     await navigate(data.screen, data.params);
      }
    });
 
    // Set up deep link handler
   const handleDeepLink = async ({ url }) => {
  console.log('Deep link received:', url);
  return;

};
    
    
    // Add event listener for deep links while the app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
   <AuthProvider>
      <AppNavigator 
        navigationRef={navigationRef} 
        initialUrl={initialUrl}
      />
    </AuthProvider>
    </SafeAreaProvider>
  );
}
