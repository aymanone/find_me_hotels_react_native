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

  const navigate = (name, params) => {
    if (navigationRef.isReady()) {
      
      navigationRef.navigate(name, params);
    }else{
            try{
        setTimeout(()=>{
        navigationRef.navigate(name, params);
},200);
}catch(error){
     setTimeout(()=>{
        navigationRef.navigate(name, params);
},200);}finally{};
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
    const hasSupabaseParams = (url)=>{
       
return  url.includes('access_token=') && 
                           url.includes('refresh_token=');
}
    // Set up deep link handler
   const handleDeepLink = ({ url }) => {
  console.log('Deep link received:', url);
  
  // Add small delay to ensure navigation is ready
  setTimeout(() => {
    try {
      if (hasSupabaseParams(url)) {
        console.log('Processing Supabase deep link');
        
        // Extract the fragment (part after #)
        const [urlPart, fragmentPart] = url.split('#');
        console.log('URL part:', urlPart);
        console.log('Fragment part:', fragmentPart);
        
        if (!fragmentPart) {
          console.log('No fragment found in URL');
          return;
        }
        
        const params = new URLSearchParams(fragmentPart);
        
        // Extract Supabase parameters
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const expiresAt = params.get('expires_at');
        
        console.log('Extracted params:', { type, accessToken: !!accessToken, refreshToken: !!refreshToken });
        
        // Skip if it's already a reset-password URL to avoid infinite loops
        if (url.includes("//reset-password") || url.includes("--/reset-password?")) {
          console.log('Already a reset-password URL, skipping');
          return;
        }
        
        // Handle password recovery links
        if ((type === 'recovery/reset-password' || type=="recovery" || url.includes(`recovery`)) && accessToken && refreshToken) {
          console.log('Processing password reset link');
          
        
          
          // Use navigate to open the URL
          navigate('ResetPassword', { access_token:accessToken,refresh_token: refreshToken, expires_at:expiresAt });
          
          
          return; // Exit early after handling
        }
        
        // Handle other Supabase auth types (signup confirmation, etc.)
        if (type === 'signup' && accessToken && refreshToken) {
          console.log('Processing signup confirmation');
          // Navigate to your signup confirmation screen
          navigate('SignupConfirmation', { access_token:accessToken,refresh_token: refreshToken, expires_at:expiresAt });
          return;
        }
        
        // Handle email confirmation
        if (type === 'email_change' && accessToken && refreshToken) {
          console.log('Processing email change confirmation');
          // Navigate to your email change confirmation screen
          navigate('EmailChangeConfirmation', { access_token:accessToken,refresh_token: refreshToken, expires_at:expiresAt });
          return;
        }
        
        console.log('Unhandled Supabase auth type:', type);
      } else {
        // Handle non-Supabase deep links here
        console.log('Processing regular deep link');
        
       return;
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      console.error('URL that caused error:', url);
    }
  }, 100); // Small delay to ensure navigation is ready
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
