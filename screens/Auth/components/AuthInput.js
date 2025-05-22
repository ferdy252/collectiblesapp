// screens/Auth/components/AuthInput.js
import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authStyles from '../styles/authStyles';

/**
 * Reusable authentication input field component
 */
const AuthInput = ({ 
  icon, 
  placeholder, 
  value, 
  onChangeText, 
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword = () => {},
  isDarkMode = false
}) => {
  return (
    <View style={[authStyles.inputContainer, { 
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    }]}>
      <Ionicons 
        name={icon} 
        size={22} 
        color={isDarkMode ? '#aaa' : '#888'} 
        style={authStyles.inputIcon} 
      />
      <TextInput
        style={[authStyles.input, { color: isDarkMode ? '#fff' : '#333' }]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPassword}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
        autoCorrect={false}
      />
      {showPasswordToggle && (
        <TouchableOpacity 
          onPress={onTogglePassword}
          style={authStyles.passwordToggle}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          accessibilityHint="Toggle password visibility"
        >
          <Ionicons 
            name={showPassword ? "eye-off-outline" : "eye-outline"} 
            size={22} 
            color={isDarkMode ? '#aaa' : '#888'} 
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AuthInput;
