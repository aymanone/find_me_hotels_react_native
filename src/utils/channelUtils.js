/**
 * Simple utility for managing Supabase channels in components
 */

/**
 * Unsubscribe from all channels in an array and clear the array
 * @param {Array} channelsArray - Array of Supabase channel objects
 */
import supabase from '../config/supabase';
import { Alert } from 'react-native';

// Setup channels for client users
export const setupClientChannels = (userId, signOutCallback) => {
  console.log('Setting up client channels for user:', userId);
  
  // Monitor client permissions
  const clientPermissionsChannel = supabase.channel('client_permissions')
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'clients',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Client permission change:', payload);
        if (payload.new && payload.new.permitted_to_work === false) {
          Alert.alert(
            'Permission Changed',
            'Your permission has been suspended. Please contact support.',
            [{ text: 'OK', onPress: signOutCallback }]
          );
        }
      }
    )
    .subscribe();
    
  return [clientPermissionsChannel];
};

// Setup channels for agent users
export const setupAgentChannels = (userId, signOutCallback) => {
  console.log('Setting up agent channels for user:', userId);
  
  // Monitor agent permissions
  const agentPermissionsChannel = supabase.channel('agent_permissions')
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'agents',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Agent permission change:', payload);
        if (payload.new && payload.new.permitted_to_work === false) {
          Alert.alert(
            'Permission Changed',
            'Your agent account permission has been changed. Please contact your company administrator.',
            [{ text: 'OK', onPress: signOutCallback }]
          );
        }
      }
    )
    .subscribe();
    
  return [agentPermissionsChannel];
};

// Setup channels for company users
export const setupCompanyChannels = (userId, signOutCallback) => {
  console.log('Setting up company channels for user:', userId);
  
  // Monitor company permissions
  const companyPermissionsChannel = supabase.channel('company_permissions')
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'companies',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Company permission change:', payload);
        if (payload.new && payload.new.permitted_to_work === false) {
          Alert.alert(
            'Permission Changed',
            'Your company account permission has been changed. Please contact system administrator.',
            [{ text: 'OK', onPress: signOutCallback }]
          );
        }
      }
    )
    .subscribe();
    
  return [companyPermissionsChannel];
};

// Setup channels for admin users
export const setupAdminChannels = (userId, signOutCallback) => {
  console.log('Setting up admin channels for user:', userId);
  
  // Monitor admin permissions
  const adminPermissionsChannel = supabase.channel('admin_permissions')
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'admins',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Admin permission change:', payload);
        if (payload.new && payload.new.permitted_to_work === false) {
          Alert.alert(
            'Permission Changed',
            'Your admin account permission has been changed.',
            [{ text: 'OK', onPress: signOutCallback }]
          );
        }
      }
    )
    .subscribe();
    
  return [adminPermissionsChannel];
};
export const unsubscribeChannels = (channelsArray) => {
  if (Array.isArray(channelsArray)) {
    channelsArray.forEach(channel => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    });
    // Clear the array
    channelsArray.length = 0;
  }
};

