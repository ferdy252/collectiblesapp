// screens/Auth/components/ThemeToggle.js
import React from 'react';
import { View, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authStyles from '../styles/authStyles';

/**
 * Theme toggle component for switching between light and dark mode
 */
const ThemeToggle = ({ isDarkMode, toggleTheme }) => {
  return (
    <View style={authStyles.themeToggleContainer}>
      <Ionicons 
        name={isDarkMode ? "moon" : "sunny"} 
        size={22} 
        color={isDarkMode ? "#BBBBBB" : "#888888"} 
      />
      <Switch
        trackColor={{ false: "#767577", true: isDarkMode ? "#555555" : "#81b0ff" }}
        thumbColor={isDarkMode ? "#f4f3f4" : "#f4f3f4"}
        ios_backgroundColor="#767577"
        onValueChange={toggleTheme}
        value={isDarkMode}
        style={authStyles.themeToggle}
        accessibilityLabel="Toggle dark mode"
        accessibilityHint={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
      />
    </View>
  );
};

export default ThemeToggle;
