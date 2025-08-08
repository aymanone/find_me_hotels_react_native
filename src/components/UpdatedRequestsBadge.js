import React, { useState, useEffect, useRef } from 'react';
import { Badge } from 'react-native-elements';
import supabase from '../config/supabase';
import { getCurrentUser } from '../utils/auth';
import { sendLocalNotification } from '../utils/notificationUtils';
import {useTranslation} from "../config/localization";
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const UpdatedRequestsBadge = React.memo(() => {
  const {t,language} = useTranslation();
  const [count, setCount] = useState(0);
  const intervalRef = useRef(null);
  const previousCountRef = useRef(0);
  const navigation= useNavigation();
  useEffect(() => {
    let isMounted = true;
    
    const setupFetchInterval = async (user) => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // If no user or not an agent, reset count and don't set up interval
      if (!user || user.app_metadata?.role !== 'agent') {
        if (isMounted) setCount(0);
        return;
      }
      
      // User is an agent, set up fetching
     // User is an agent, set up fetching
const fetchCount = async () => {
  try {
    const { data, error } = await supabase.rpc('agent_updated_requests_count', {
      agent: user.id
    });
    
    if (error) throw error;
    
    if (isMounted) {
      if (data > 0) {
        try {
          if (Platform.OS === 'web') {
            // Web notifications using browser API  
            if ('Notification' in window) {
              const showWebNotification = () => {
                const notification = new Notification('New Requests Updated!', {
                  //body: `You have ${data} request${data > 1 ? 's' : ''} you made offers to them updated`,
                  body: t("UpdatedRequestsBadge","msg",{data:data}),
                  icon: '/favicon.ico',
                  tag: 'new-requests-updated',
                  // Add screen data directly to the notification content
                  screen: "AgentApp",
                  params: {
                    screen: "Home", 
                    params: { screen: 'AgentUpdatedRequests' }
                  }
                });
                
                // Handle notification click to navigate to screen
                notification.onclick = function(event) {
                  event.preventDefault();
                  window.focus();
                  // Access screen data from the notification itself
                  if (this.screen) {
                    navigation.navigate(this.screen, this.params);
                  }
                  this.close();
                };
              };

              if (Notification.permission === 'granted') {
                showWebNotification();
              } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                  showWebNotification();
                }
              }
            }
          } else {
            // Mobile notifications using Expo
            await sendLocalNotification(
              'New Requests Updated!',
                 t("UpdatedRequestsBadge","msg",{data:data}),
              {
                screen: "AgentApp",
                params: {
                  screen: "Home",
                  params: { screen: 'AgentUpdatedRequests' }
                }
              }
            );
          }
        } catch (notificationError) {
          console.log('Notification failed:', notificationError.message);
          // Don't let notification errors break the component
        }
      }
      
      // Update state and ref
      setCount(data || 0);
      previousCountRef.current = data || 0;
    } 
  } catch (error) {
    console.error('Error fetching updated requests count:', error);
  }
};
      
      // Initial fetch
      fetchCount();
      
      const msPerHour = 60 * 60 * 1000; // 1 hour in milliseconds
      // Set up interval to fetch every 4 hours
      intervalRef.current = setInterval(fetchCount, 4 * msPerHour);
    };
    
    // Get initial session and set up listener
    const initAuth = async () => {
      // Get current user on component mount
      const initialUser = await getCurrentUser();
      setupFetchInterval(initialUser);
      
      // Listen for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          const user = session?.user || null;
          setupFetchInterval(user);
        }
      });
      
      return authListener;
    };
    
    // Initialize auth and get the listener
    const authListenerPromise = initAuth();
    
    return () => {
      isMounted = false;
      
      // Clean up interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Clean up auth listener
      authListenerPromise.then(listener => {
        if (listener && listener.unsubscribe) {
          listener.unsubscribe();
        }
      });
    };
  }, []);
  
  if (!count || count === 0) return null;
  
  return (
    <Badge
      value={count}
      status="error"
      containerStyle={{
        position: 'absolute',
        top: -5,
        right: -10,
        zIndex: 1
      }}
      badgeStyle={{
        backgroundColor: '#FF3B30',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
      }}
      textStyle={{
        fontSize: 12,
        fontWeight: 'bold',
        color: 'white'
      }}
    />
  );
});

export default UpdatedRequestsBadge;
