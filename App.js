// Only import react-native-gesture-handler on native platforms
import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native'; // Changed from expo-linking to react-native
import { registerForPushNotificationsAsync } from './src/utils/notificationUtils';
import { createNavigationContainerRef } from '@react-navigation/native';

export default function App() {
  // Create a navigation ref using the official API
  const navigationRef = createNavigationContainerRef();
  const [initialUrl, setInitialUrl] = useState(null);

  const navigate = (name, params) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
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
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    
    // Handle notification response (when user taps the notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { data } = response.notification.request.content;
      
      // Navigate based on the notification data
      if (data.screen) {
        navigate(data.screen, data.params);
      }
    });
    
    // Set up deep link handler
    const handleDeepLink = ({ url }) => {
      console.log('Deep link received while app is running:', url);
      // The NavigationContainer will automatically handle this URL
      // if it matches your linking configuration
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
      <AppNavigator 
        navigationRef={navigationRef} 
        initialUrl={initialUrl}
      />
    </SafeAreaProvider>
  );
}