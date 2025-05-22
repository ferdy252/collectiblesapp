// screens/Auth/components/AppLogo.js
import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import authStyles from '../styles/authStyles';

/**
 * App logo component for the auth screen
 */
const AppLogo = ({ isDarkMode, isSignUp }) => {
  return (
    <View style={authStyles.logoContainer}>
      <View style={authStyles.logoBox}>
        <MaterialCommunityIcons name="cube-outline" size={60} color="#FF5D3A" />
      </View>
      <Text style={[authStyles.title, { color: isDarkMode ? '#fff' : '#333' }]}>
        Collectible Tracker
      </Text>
      <Text style={[authStyles.subtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
        {isSignUp ? 'Create a new account' : 'Sign in to your account'}
      </Text>
    </View>
  );
};

export default AppLogo;
