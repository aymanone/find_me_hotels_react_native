import React, { useState, useEffect, useRef } from 'react';
import { Badge } from 'react-native-elements';
import supabase from '../config/supabase';
import { getCurrentUser } from '../utils/auth';

const ClientNewOffersBadge = React.memo(() => {
  const [requestsCount, setRequestsCount] = useState(0);
  const intervalRef = useRef(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchCount = async () => {
      try {
        const user = await getCurrentUser();
        if (!user || user.app_metadata?.role !== 'client') return;
        const today= new Date();
        today.setHours(0,0,0,0);
        const { count, error } = await supabase.from('travel_requests_agent').select('*',{count:'exact',head:true}).eq('creator_id', user.id)
.eq('new_offers',true).gte('start_date',today.toISOString());
        
        if (error) throw error;
        if (isMounted) setRequestsCount(count || 0);
      } catch (error) {
        console.error('Error fetching updated requests count:', error);
      }
    };
    
    // Initial fetch
    fetchCount();
    const msPerHour=60 * 60 * 1000; // 1 hour in milliseconds
    // Set up interval to fetch every 4 hours (4 * 60 * 60 * 1000 = 14400000ms)
    intervalRef.current = setInterval(fetchCount, 4 * msPerHour);
    
    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  if (!requestsCount || requestsCount === 0) return null;
  
  return (
    <Badge
      value={requestsCount }
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
