// lib/supabase.js
import 'react-native-url-polyfill/auto'; // Needs to be imported before Supabase
import { createClient } from '@supabase/supabase-js';
import { saveSecurely, getSecurely, deleteSecurely } from '../utils/secureStorage';
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('Supabase URL available:', !!supabaseUrl);
console.log('Supabase Anon Key available:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Supabase configuration missing');
  handleError(
    error,
    'supabase.init',
    ERROR_CATEGORIES.CONFIGURATION,
    'App configuration error. Please contact support.'
  );
  // You might want to throw an error or handle this case more gracefully
}

// Create a custom storage implementation using SecureStore
const secureStorage = {
  getItem: async (key) => {
    try {
      return await getSecurely(key);
    } catch (error) {
      handleError(
        error,
        'supabase.secureStorage.getItem',
        ERROR_CATEGORIES.STORAGE,
        'Unable to access secure storage.'
      );
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await saveSecurely(key, value);
    } catch (error) {
      handleError(
        error,
        'supabase.secureStorage.setItem',
        ERROR_CATEGORIES.STORAGE,
        'Unable to save to secure storage.'
      );
    }
  },
  removeItem: async (key) => {
    try {
      await deleteSecurely(key);
    } catch (error) {
      handleError(
        error,
        'supabase.secureStorage.removeItem',
        ERROR_CATEGORIES.STORAGE,
        'Unable to remove from secure storage.'
      );
    }
  },
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage, // Use SecureStore for session persistence
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});

// Add debug listener for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Supabase auth event: ${event}`, session ? 'User session available' : 'No user session');
});

// Helper function to handle database operations with error handling
export const executeSupabaseQuery = async (queryFunction, location, userFriendlyMessage) => {
  try {
    return await queryFunction();
  } catch (error) {
    handleError(
      error,
      location,
      ERROR_CATEGORIES.DATABASE,
      userFriendlyMessage || 'Database operation failed. Please try again.'
    );
    throw error; // Re-throw to allow calling code to handle it
  }
};

// Connection status check
export const checkConnection = async () => {
  try {
    // Simple query to check if we can connect to Supabase
    const { data, error } = await supabase.from('health_check').select('*').limit(1);
    
    if (error) {
      throw error;
    }
    
    return { connected: true };
  } catch (error) {
    handleError(
      error,
      'supabase.checkConnection',
      ERROR_CATEGORIES.NETWORK,
      'Unable to connect to the server. Please check your internet connection.'
    );
    
    return { connected: false, error: error.message };
  }
};
