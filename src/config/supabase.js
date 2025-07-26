import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
//import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Changed from false to true
  }
});

export default supabase;
