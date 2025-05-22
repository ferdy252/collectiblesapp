// screens/Auth/components/SignInForm.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import AuthInput from './AuthInput';
import authStyles from '../styles/authStyles';
import { isValidEmail } from '../utils/validation';
import { checkLoginRateLimit, recordLoginAttempt, formatRateLimitMessage } from '../../../utils/serverRateLimiter';
import { handleError, ERROR_CATEGORIES } from '../../../utils/errorHandler';

/**
 * Sign In form component
 */
const SignInForm = ({ 
  onSignIn, 
  onSwitchMode, 
  isDarkMode, 
  setShowMfaVerify,
  setCurrentFactorId,
  setLockoutMessage,
  setHasError,
  setErrorMessage,
  setConfirmationMessage
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutMessage, setLocalLockoutMessage] = useState('');

  // Handle sign in process
  const handleSignIn = async () => {
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

    if (!isValidEmail(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address.',
        position: 'bottom'
      });
      return;
    }

    // Check if account is locked out
    const rateLimitStatus = await checkLoginRateLimit(email);
    if (rateLimitStatus.isBlocked) {
      const message = formatRateLimitMessage(rateLimitStatus);
      setLocalLockoutMessage(message);
      setLockoutMessage(message);
      Toast.show({
        type: 'error',
        text1: 'Account Locked',
        text2: message,
        position: 'bottom',
        visibilityTime: 4000,
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
      
      // Call the sign in function from props
      const result = await onSignIn(email, password);
      
      if (result.error) {
        // Record failed login attempt and check lockout status
        await recordLoginAttempt(email, false);
        const rateLimitStatus = await checkLoginRateLimit(email);
        const message = formatRateLimitMessage(rateLimitStatus);
        setLocalLockoutMessage(message);
        setLockoutMessage(message);
        
        // Use error handling utility
        handleError(
          result.error,
          'SignInForm.handleSignIn',
          ERROR_CATEGORIES.AUTH,
          'Sign in failed. Please check your credentials.'
        );
        
        // Update error state for UI
        setHasError(true);
        setErrorMessage(result.error.message || 'Sign in failed. Please check your credentials.');
      } else if (result.mfaRequired) {
        // MFA is required, show the verification screen
        setCurrentFactorId(result.factorId);
        setShowMfaVerify(true);
      } else {
        // Normal sign in successful - reset any failed attempts
        await recordLoginAttempt(email, true);
        setLocalLockoutMessage('');
        setLockoutMessage('');
        
        Toast.show({
          type: 'success',
          text1: 'Sign In Successful',
          text2: 'Welcome back!',
          position: 'bottom'
        });
      }
    } catch (e) {
      console.error('Unexpected auth error:', e);
      
      // Record the failure
      await recordLoginAttempt(email, false);
      const rateLimitStatus = await checkLoginRateLimit(email);
      const message = formatRateLimitMessage(rateLimitStatus);
      setLocalLockoutMessage(message);
      setLockoutMessage(message);
      
      Toast.show({
        type: 'error',
        text1: 'Authentication Error',
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

      {lockoutMessage ? (
        <View style={authStyles.lockoutContainer}>
          <Text style={[authStyles.lockoutText, { color: isDarkMode ? '#ff6b6b' : '#d9534f' }]}>
            {lockoutMessage}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[authStyles.button, { backgroundColor: '#FF5D3A' }]}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={authStyles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={authStyles.dividerContainer}>
        <View style={[authStyles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
        <Text style={[authStyles.dividerText, { color: isDarkMode ? '#aaa' : '#888' }]}>
          Need an account?
        </Text>
        <View style={[authStyles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
      </View>

      <TouchableOpacity
        style={[authStyles.signUpButton, { borderColor: '#FF5D3A' }]}
        onPress={onSwitchMode}
        disabled={loading}
      >
        <Text style={[authStyles.signUpButtonText, { color: '#FF5D3A' }]}>
          Sign Up
        </Text>
      </TouchableOpacity>
    </>
  );
};

export default SignInForm;
