import supabase from '../config/supabase';
/**
 * Signs out the current user
 * @param {function} navigation - React Navigation object for redirecting
 * @param {string} [redirectTo='Signin'] - Screen to redirect to after sign out
 * @returns {Promise<boolean>} - Returns true if sign out was successful
 */
export const signOut = async (navigation, redirectTo = 'Signin') => {
  // Always remove channels
  supabase.removeAllChannels();
  
  // Try server sign out, but don't let it block local cleanup
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('Server sign out failed, doing local cleanup:', error.message);
    // Force local sign out
    await supabase.auth.signOut({ scope: 'local' });
  }
  
  // Always navigate (user expects to be signed out)
  if (navigation) {
    navigation.navigate(redirectTo);
  }
  
  return true;
};
/**
 * Checks if the current user has the required role
 * @param {string} requiredRole - The role that should be checked against
 * @param {function} navigation - React Navigation object for redirecting
 * @param {string} [redirectTo='Signin'] - Screen to redirect to if check fails
 * @returns {Promise<boolean>} - Returns true if user has the required role, false otherwise
 */
export const checkUserRole = async (requiredRole, navigation, redirectTo = "Signin") => {
  let user = null;
  
  // Try to get fresh user data first
  try {
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (freshUser) {
      user = freshUser;
    }
  } catch (error) {
    console.warn('getUser failed:', error.message);
  }
  
  // If no fresh user, always try session fallback
  if (!user) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user;
    } catch (sessionError) {
      console.warn('Session fallback failed:', sessionError.message);
    }
  }
  
  // No user found at all
  if (!user) {
    console.log('No user found');
    if (navigation) {
      navigation.navigate(redirectTo);
    }
    return false;
  }
  
  // Check role
  if (user.app_metadata?.role !== requiredRole) {
    const errorMessage = `This section is only for ${requiredRole}s.`;
    console.log(errorMessage);
        await signOut(navigation, redirectTo);
        
    
    if (navigation) {
      navigation.navigate(redirectTo);
    }
    return false;
  }
  
  return true;
};
/**
 * Gets the current authenticated user
 * @returns {Promise<Object|null>} - Returns user object or null if not authenticated
 */
export const getCurrentUser = async () => {
  // Try to refresh session first
  try {
    const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('Session refresh failed:', refreshError.message);
    }
  } catch (error) {
    console.warn('Session refresh threw error:', error.message);
  }
  
  // Try to get fresh user data
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
      return user; // Fresh user data
    }
  } catch (error) {
    console.warn('getUser failed:', error.message);
  }
  
  // Always fall back to session user regardless of error type
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (sessionError) {
    console.error('Session fallback failed:', sessionError.message);
    return null;
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
};
