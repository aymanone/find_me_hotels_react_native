import supabase from '../config/supabase';

/**
 * Checks if the current user has the required role
 * @param {string} requiredRole - The role that should be checked against
 * @param {function} navigation - React Navigation object for redirecting
 * @param {string} [redirectTo='Signin'] - Screen to redirect to if check fails
 * @returns {Promise&lt;boolean&gt;} - Returns true if user has the required role, false otherwise
 */
export const checkUserRole = async (requiredRole, navigation, redirectTo ="Signin") =>{
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (!user || user.app_metadata.role !== requiredRole) {
      const errorMessage = `This section is only for ${requiredRole}s.`;
      console.log(errorMessage);
      
      if (navigation) {
        await supabase.auth.signOut();
        navigation.navigate(redirectTo);
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
        console.error('Error checking user role:', error.message);
    
    if (navigation) {
      navigation.navigate(redirectTo);
    }
    
    return false;
  }
};

/**
 * Gets the current authenticated user
 * @returns {Promise&lt;Object|null&gt;} - Returns user object or null if not authenticated
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    return user;
  } catch (error) {
     console.error('Error getting current user:', error.message);
    return null;
  }
};