// screens/Auth/components/AuthMessages.js
import React from 'react';
import { View, Text } from 'react-native';
import authStyles from '../styles/authStyles';

/**
 * Component for displaying error and confirmation messages in the auth screens
 */
const AuthMessages = ({ 
  hasError, 
  errorMessage, 
  confirmationMessage, 
  isDarkMode 
}) => {
  return (
    <>
      {hasError && errorMessage && (
        <View style={authStyles.errorMessage}>
          <Text style={[authStyles.errorText, { color: isDarkMode ? '#ff6b6b' : '#d9534f' }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {confirmationMessage && (
        <View style={authStyles.confirmationMessage}>
          <Text style={[authStyles.confirmationText, { color: isDarkMode ? '#aaa' : '#666' }]}>
            {confirmationMessage}
          </Text>
        </View>
      )}
    </>
  );
};

export default AuthMessages;
