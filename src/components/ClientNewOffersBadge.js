import React, { useState, useEffect, useRef } from 'react';
import { Badge } from 'react-native-elements';
import supabase from '../config/supabase';
import { getCurrentUser } from '../utils/auth';
import { sendLocalNotification } from '../utils/notificationUtils';

const ClientNewOffersBadge = React.memo(() => {
  const [requestsCount, setRequestsCount] = useState(0);
  const intervalRef = useRef(null);
  const previousCountRef = useRef(0);
  
  useEffect(() => {
    let isMounted = true;
    
    const setupFetchInterval = async (user) => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // If no user or not a client, reset count and don't set up interval
      if (!user || user.app_metadata?.role !== 'client') {
        if (isMounted) setRequestsCount(0);
        return;
      }
      
      // User is a client, set up fetching
      const fetchCount = async () => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { count, error } = await supabase
            .from('travel_requests_agent')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id)
            .eq('new_offers', true)
            .gte('start_date', today.toISOString());
          
          if (error) throw error;
          
          if (isMounted) {
            // Check if count has increased
          
              // Send notification only if count increased
              if (count > 0){
              sendLocalNotification(
                'New Offers Available!',
                `You have New Offers for ${count} request${count>1?'s':''}.`,
                { screen:"Home",
                params:{ screen: 'ClientUpdatedRequests' }
                }
              );
            
            }
            // Update state and ref
            setRequestsCount(count || 0);
            previousCountRef.current = count || 0;
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
  
  if (!requestsCount || requestsCount === 0) return null;
  
  return (
    <Badge
      value={requestsCount}
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

export default ClientNewOffersBadge;
