// context/ThemeContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { lightTheme, darkTheme } from '../theme/theme';
import { useAuth } from './AuthContext';

// Create the theme context
const ThemeContext = createContext({
  theme: lightTheme,
  isDarkMode: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

// Theme storage keys
const THEME_STORAGE_KEY = '@theme_preference';

// Create the provider component
export const ThemeProvider = ({ children }) => {
  // Get device color scheme
  const deviceColorScheme = useColorScheme();
  const { user } = useAuth();
  
  // State for dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState(lightTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, [user]);

  // Load theme preference from storage or Supabase
  const loadThemePreference = async () => {
    try {
      setIsLoading(true);
      let themePreference = null;

      // If user is logged in, try to get preference from Supabase
      if (user) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('theme_preference')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          themePreference = data.theme_preference;
          console.log('Loaded theme from Supabase:', themePreference);
        } else {
          console.log('No theme preference found in Supabase or error occurred');
        }
      }

      // If no preference in Supabase or user not logged in, try AsyncStorage
      if (!themePreference) {
        themePreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        console.log('Loaded theme from AsyncStorage:', themePreference);
      }

      // Set theme based on preference, or device preference, or default to light
      if (themePreference === 'dark') {
        setIsDarkMode(true);
        setTheme(darkTheme);
      } else if (themePreference === 'light') {
        setIsDarkMode(false);
        setTheme(lightTheme);
      } else {
        // If no saved preference, use device preference
        const shouldUseDarkMode = deviceColorScheme === 'dark';
        setIsDarkMode(shouldUseDarkMode);
        setTheme(shouldUseDarkMode ? darkTheme : lightTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Default to light theme on error
      setIsDarkMode(false);
      setTheme(lightTheme);
    } finally {
      setIsLoading(false);
    }
  };

  // Save theme preference to storage and Supabase if logged in
  const saveThemePreference = async (isDark) => {
    try {
      const themeValue = isDark ? 'dark' : 'light';
      
      // Always save to AsyncStorage for quick local access
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeValue);
      
      // If user is logged in, save to Supabase
      if (user) {
        // Check if user already has a settings record
        const { data, error } = await supabase
          .from('user_settings')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          // Update existing record
          await supabase
            .from('user_settings')
            .update({ 
              theme_preference: themeValue,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        } else {
          // Create new record
          await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              theme_preference: themeValue,
              updated_at: new Date().toISOString()
            });
        }
        
        console.log(`Theme preference saved to Supabase: ${themeValue}`);
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Toggle between light and dark mode
  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    setTheme(newIsDarkMode ? darkTheme : lightTheme);
    saveThemePreference(newIsDarkMode);
  };

  // Set theme mode explicitly (light or dark)
  const setThemeMode = (mode) => {
    const newIsDarkMode = mode === 'dark';
    setIsDarkMode(newIsDarkMode);
    setTheme(newIsDarkMode ? darkTheme : lightTheme);
    saveThemePreference(newIsDarkMode);
  };

  // Provide theme context to children
  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode,
        toggleTheme,
        setThemeMode,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
