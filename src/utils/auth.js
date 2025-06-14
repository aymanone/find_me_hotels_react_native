import supabase from '../config/supabase';

/**
 * Checks if the current user has the required role
 * @param {string} requiredRole - The role that should be checked against
 * @param {function} navigation - React Navigation object for redirecting
 * @param {string} [redirectTo='Signin'] - Screen to redirect to if check fails
 * @returns {Promise<boolean>} - Returns true if user has the required role, false otherwise
 */
export const checkUserRole = async (requiredRole, navigation, redirectTo ="Signin") =>{
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (!user || user.app_metadata.role !== requiredRole) {
      const errorMessage = `This section is only for ${requiredRole}s.`;
      console.log(errorMessage);
       await supabase.auth.signOut();
      
      if (navigation) {

        navigation.navigate(redirectTo);
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
        console.error('Error checking user role:', error.message);
     await supabase.auth.signOut();
      
    if (navigation) {
      navigation.navigate(redirectTo);
    }
    
    return false;
  }
};

/**
 * Gets the current authenticated user
 * @returns {Promise<Object|null>} - Returns user object or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
     // First refresh the session to get the latest user data
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.warn('Session refresh failed:', refreshError.message);
      // Continue with getting user even if refresh fails
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    return user;
  } catch (error) {
     console.error('Error getting current user:', error.message);
    return null;
  }
};

/**
 * Signs out the current user
 * @param {function} navigation - React Navigation object for redirecting
 * @param {string} [redirectTo='Signin'] - Screen to redirect to after sign out
 * @returns {Promise<boolean>} - Returns true if sign out was successful
 */
export const signOut = async (navigation, redirectTo = 'Signin') => {
  try {
    supabase.removeAllChannels();
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    if (navigation) {
      navigation.navigate(redirectTo);
    }
    
    return true;
  } catch (error) {
    console.error('Error signing out:', error.message);
    return false;
  }
};

/**
 * Gets the user's role from app_metadata
 * @returns {Promise<string|null>} - Returns the user's role or null if not found
 */
export const getUserRole = async () => {
  try {
    const user = await getCurrentUser();
    return user?.app_metadata?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error.message);
    return null;
  }
};
export const notAllowedAuthenticatedUser = async()=>{
  const user= await getCurrentUser();
  if (user) {
    console.warn('Authenticated user attempted to access a restricted area');
    const redirect = await checkUserRole(user?.app_metadata?.role);
    return false; // User is authenticated, not allowed
  }
  return true;
}