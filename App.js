// Only import react-native-gesture-handler on native platforms
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './src/utils/notificationUtils';
import { createNavigationContainerRef } from '@react-navigation/native';

export default function App() {
  // Create a navigation ref using the official API
  const navigationRef = createNavigationContainerRef();

  const navigate = (name, params) => {
    if (navigationRef.current && navigationRef.isReady()) {
      // For navigating to AgentUpdatedRequests in the AgentStack

        // For other navigation targets
        navigationRef.current.navigate(name, params);
      
    }
  };

  useEffect(() => {
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
    
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator navigationRef={navigationRef} />
    </SafeAreaProvider>
  );
}