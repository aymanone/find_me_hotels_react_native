import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getCurrentUser, getUserRole } from '../utils/auth';

export default function TravelRequestRedirect({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const { id } = route.params;

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const user = await getCurrentUser();
        
        // If not authenticated, redirect to signup
        if (!user) {
          navigation.navigate('Signup');
          return;
        }

        // Get user role
        const userRole = await getUserRole();

        // Redirect based on user role
        switch (userRole?.toLowerCase()) {
          case 'client':
            navigation.navigate('ClientApp', {
              screen: 'Home',
              params: {
                screen: 'ClientTravelRequestDetails',
                params: { id }
              }
            });
            break;
            
          case 'agent':
            navigation.navigate('AgentApp', {
              screen: 'Home',
              params: {
                screen: 'AgentTravelRequestDetails',
                params: { requestId: id }
              }
            });
            break;
            
          case 'company':
            // Redirect to company home screen
            navigation.navigate('CompanyApp', {
              screen: 'Home'
            });
            break;
            
          case 'admin':
            // Redirect to admin home screen
            navigation.navigate('AdminApp', {
              screen: 'Home'
            });
            break;
            
          default:
            // Fallback - redirect to signin if user role is unknown
            console.warn('Unknown user role:', userRole);
            navigation.navigate('Signin');
        }
      } catch (error) {
        console.error('Error in TravelRequestRedirect:', error);
        // On error, redirect to signin
        navigation.navigate('Signin');
      } finally {
        setLoading(false);
      }
    };

    // Execute redirect logic
    handleRedirect();
  }, [navigation, id]);

  // Show loading indicator while processing redirect
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  // This should never be reached as we always navigate away
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});