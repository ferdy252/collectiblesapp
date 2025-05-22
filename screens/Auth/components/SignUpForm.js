// screens/Auth/components/SignUpForm.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthInput from './AuthInput';
import authStyles from '../styles/authStyles';
import { isValidEmail, isValidUsername, isValidName } from '../utils/validation';
import { validatePassword } from '../../../utils/passwordValidator';
import PasswordStrengthIndicator from '../../../components/PasswordStrengthIndicator';
import { handleError, ERROR_CATEGORIES } from '../../../utils/errorHandler';

/**
 * Sign Up form component
 */
const SignUpForm = ({ 
  onSignUp, 
  onSwitchMode, 
  isDarkMode,
  setHasError,
  setErrorMessage,
  setConfirmationMessage
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle sign up process
  const handleSignUp = async () => {
    // Input validation
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please enter both email and password.',
        position: 'bottom'
      });
      return;
    }
    
    if (!username) {
      Toast.show({
        type: 'error',
        text1: 'Username Required',
        text2: 'Please enter a username.',
        position: 'bottom'
      });
      return;
    }
    
    if (!isValidUsername(username)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Username',
        text2: 'Username must be 3-20 characters and can only contain letters, numbers, and underscores.',
        position: 'bottom'
      });
      return;
    }
    
    if (firstName && !isValidName(firstName)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid First Name',
        text2: 'First name can only contain letters, spaces, hyphens, and apostrophes.',
        position: 'bottom'
      });
      return;
    }
    
    if (lastName && !isValidName(lastName)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Last Name',
        text2: 'Last name can only contain letters, spaces, hyphens, and apostrophes.',
        position: 'bottom'
      });
      return;
    }

    if (!isValidEmail(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address.',
        position: 'bottom'
      });
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: validation.message,
        position: 'bottom'
      });
      return;
    }

    setLoading(true);
    
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
      
      // Clear any previous confirmation message
      setConfirmationMessage('');
      
      // Include metadata for the user profile
      const metadata = {
        username: username,
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: firstName && lastName ? `${firstName} ${lastName}` : firstName || username
      };
      
      const { data, error } = await onSignUp(email, password, metadata);
      
      if (error) {
        // Use error handling utility
        handleError(
          error,
          'SignUpForm.handleSignUp',
          ERROR_CATEGORIES.AUTH,
          'Sign up failed. Please check your information and try again.'
        );
        
        // Update error state for UI
        setHasError(true);
        setErrorMessage(error.message || 'Sign up failed. Please check your information and try again.');
      } else {
        // Mark this as a new user so they'll see the onboarding after login
        try {
          await AsyncStorage.setItem('isNewUser', 'true');
        } catch (error) {
          console.error('Error setting new user flag:', error);
        }
        
        Toast.show({
          type: 'success',
          text1: 'Sign Up Successful',
          text2: 'Please check your email to confirm your account',
          position: 'bottom',
          visibilityTime: 6000,
          autoHide: true
        });
        
        // Show a more detailed message about email confirmation
        setHasError(false);
        setErrorMessage('');
        setConfirmationMessage('We sent a confirmation link to ' + email + '. Please check your email and click the link to activate your account before signing in.');
        
        // Switch to sign in mode after successful registration
        onSwitchMode();
      }
    } catch (e) {
      console.error('Unexpected auth error:', e);
      
      Toast.show({
        type: 'error',
        text1: 'Registration Error',
        text2: 'An unexpected error occurred. Please try again.',
        position: 'bottom'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthInput
        icon="person-outline"
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        isDarkMode={isDarkMode}
      />
      
      <AuthInput
        icon="text-outline"
        placeholder="First Name (optional)"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        isDarkMode={isDarkMode}
      />
      
      <AuthInput
        icon="text-outline"
        placeholder="Last Name (optional)"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        isDarkMode={isDarkMode}
      />
      
      <AuthInput
        icon="mail-outline"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        isDarkMode={isDarkMode}
      />
      
      <AuthInput
        icon="lock-closed-outline"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
        showPasswordToggle={true}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
        isDarkMode={isDarkMode}
      />
      
      {password.length > 0 && (
        <View style={authStyles.passwordStrengthContainer}>
          <Text style={[authStyles.passwordStrengthLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
            Password Strength:
          </Text>
          <PasswordStrengthIndicator 
            password={password} 
            showRequirements={true} 
          />
          <View style={authStyles.passwordTipsContainer}>
            <Text style={[authStyles.passwordTip, { color: isDarkMode ? '#aaa' : '#666' }]}>
              • Use at least 8 characters
            </Text>
            <Text style={[authStyles.passwordTip, { color: isDarkMode ? '#aaa' : '#666' }]}>
              • Include uppercase and lowercase letters
            </Text>
            <Text style={[authStyles.passwordTip, { color: isDarkMode ? '#aaa' : '#666' }]}>
              • Add numbers and special characters
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[authStyles.button, { backgroundColor: '#4361EE' }]}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={authStyles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <View style={authStyles.dividerContainer}>
        <View style={[authStyles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
        <Text style={[authStyles.dividerText, { color: isDarkMode ? '#aaa' : '#888' }]}>
          Already have an account?
        </Text>
        <View style={[authStyles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
      </View>

      <TouchableOpacity
        style={[authStyles.signUpButton, { borderColor: '#4361EE' }]}
        onPress={onSwitchMode}
        disabled={loading}
      >
        <Text style={[authStyles.signUpButtonText, { color: '#4361EE' }]}>
          Back to Sign In
        </Text>
      </TouchableOpacity>
    </>
  );
};

export default SignUpForm;
