// screens/AuthScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import TwoFactorVerify from '../components/TwoFactorVerify';
import TwoFactorSetup from '../components/TwoFactorSetup';
import { checkLoginRateLimit, recordLoginAttempt, formatRateLimitMessage } from '../utils/serverRateLimiter';
import { validatePassword } from '../utils/passwordValidator';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
// Import error handling utilities
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMfaVerify, setShowMfaVerify] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [currentFactorId, setCurrentFactorId] = useState(null);
  const [lockoutMessage, setLockoutMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn, signUp, completeMfaVerification, cancelMfaVerification } = useAuth();

  // Check for existing lockout on component mount
  useEffect(() => {
    const checkExistingLockout = async () => {
      const rateLimitStatus = await checkLoginRateLimit(email || '');
      if (rateLimitStatus.isBlocked || rateLimitStatus.attemptsRemaining <= 2) {
        setLockoutMessage(formatRateLimitMessage(rateLimitStatus));
      }
    };
    
    if (email) {
      checkExistingLockout();
    }
  }, [email]);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate password strength
  const isValidPassword = (password) => {
    const validation = validatePassword(password);
    return validation.isValid;
  };

  const handleAuth = async () => {
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

    if (isSignUp && !isValidPassword(password)) {
      const validation = validatePassword(password);
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: validation.message,
        position: 'bottom'
      });
      return;
    }

    // For sign in, check if account is locked out
    if (!isSignUp) {
      const rateLimitStatus = await checkLoginRateLimit(email);
      if (rateLimitStatus.isBlocked) {
        setLockoutMessage(formatRateLimitMessage(rateLimitStatus));
        Toast.show({
          type: 'error',
          text1: 'Account Locked',
          text2: formatRateLimitMessage(rateLimitStatus),
          position: 'bottom',
          visibilityTime: 4000,
        });
        return;
      }
    }

    setLoading(true);
    
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
      
      // Choose between sign in and sign up based on mode
      if (isSignUp) {
        const { data, error } = await signUp(email, password);
        
        if (error) {
          // Use our new error handling utility
          handleError(
            error,
            'AuthScreen.signUp',
            ERROR_CATEGORIES.AUTH,
            'Sign up failed. Please check your information and try again.'
          );
          
          // Update error state for UI
          setHasError(true);
          setErrorMessage(error.message || 'Sign up failed. Please check your information and try again.');
        } else {
          Toast.show({
            type: 'success',
            text1: 'Sign Up Successful',
            text2: 'Would you like to set up two-factor authentication?',
            position: 'bottom',
            visibilityTime: 6000,
            autoHide: true,
            onPress: () => {
              // Ask if they want to set up 2FA
              setTimeout(() => {
                askAboutTwoFactor();
              }, 500);
            }
          });
          // Switch to sign in mode after successful registration
          setIsSignUp(false);
        }
      } else {
        // Handle sign in with potential MFA
        const result = await signIn(email, password);
        
        if (result.error) {
          // Record failed login attempt and check lockout status
          await recordLoginAttempt(email, false);
          const rateLimitStatus = await checkLoginRateLimit(email);
          setLockoutMessage(formatRateLimitMessage(rateLimitStatus));
          
          // Use our new error handling utility
          handleError(
            result.error,
            'AuthScreen.signIn',
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
          setLockoutMessage('');
          
          Toast.show({
            type: 'success',
            text1: 'Sign In Successful',
            text2: 'Welcome back!',
            position: 'bottom'
          });
        }
      }
    } catch (e) {
      console.error('Unexpected auth error:', e);
      
      // If this was a sign in attempt, record the failure
      if (!isSignUp) {
        await recordLoginAttempt(email, false);
        const rateLimitStatus = await checkLoginRateLimit(email);
        setLockoutMessage(formatRateLimitMessage(rateLimitStatus));
      }
      
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

  // Ask user if they want to set up 2FA
  const askAboutTwoFactor = () => {
    // Show a confirmation dialog
    Toast.show({
      type: 'info',
      text1: 'Set Up Two-Factor Authentication?',
      text2: 'This adds an extra layer of security to your account.',
      position: 'bottom',
      visibilityTime: 6000,
      autoHide: true,
      onPress: () => {
        // If they tap on the toast, show the setup screen
        setShowMfaSetup(true);
      }
    });
  };

  // Handle successful MFA verification
  const handleMfaSuccess = async () => {
    setShowMfaVerify(false);
    completeMfaVerification();
    
    // Reset failed attempts on successful MFA verification
    await recordLoginAttempt(email, true);
    setLockoutMessage('');
    
    Toast.show({
      type: 'success',
      text1: 'Sign In Successful',
      text2: 'Two-factor authentication verified!',
      position: 'bottom'
    });
  };

  // Handle MFA verification cancellation
  const handleMfaCancel = () => {
    setShowMfaVerify(false);
    cancelMfaVerification();
  };

  // Handle MFA setup completion
  const handleMfaSetupComplete = () => {
    setShowMfaSetup(false);
    Toast.show({
      type: 'success',
      text1: 'Two-Factor Authentication Enabled',
      text2: 'Your account is now more secure!',
      position: 'bottom'
    });
  };

  // Handle MFA setup cancellation
  const handleMfaSetupCancel = () => {
    setShowMfaSetup(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Ionicons name="cube-outline" size={80} color="tomato" />
          <Text style={styles.title}>Collectible Tracker</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#888"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#888"
              autoCorrect={false}
            />
          </View>
          
          {/* Show password strength indicator only during sign up */}
          {isSignUp && password.length > 0 && (
            <PasswordStrengthIndicator 
              password={password} 
              showRequirements={true} 
            />
          )}

          {lockoutMessage ? (
            <View style={styles.lockoutContainer}>
              <Ionicons name="alert-circle-outline" size={18} color="#e74c3c" />
              <Text style={styles.lockoutText}>{lockoutMessage}</Text>
            </View>
          ) : null}

          {hasError && (
            <View style={styles.errorMessage}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isSignUp ? '#4CAF50' : 'tomato' }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            <Text style={styles.switchModeText}>
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : 'Need an account? Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MFA Verification Modal */}
      <Modal
        visible={showMfaVerify}
        animationType="slide"
        transparent={false}
        onRequestClose={handleMfaCancel}
      >
        <TwoFactorVerify 
          factorId={currentFactorId}
          onSuccess={handleMfaSuccess}
          onCancel={handleMfaCancel}
        />
      </Modal>

      {/* MFA Setup Modal */}
      <Modal
        visible={showMfaSetup}
        animationType="slide"
        transparent={false}
        onRequestClose={handleMfaSetupCancel}
      >
        <TwoFactorSetup 
          onComplete={handleMfaSetupComplete}
          onCancel={handleMfaSetupCancel}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputIcon: {
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
  },
  lockoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  lockoutText: {
    color: '#e74c3c',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#666',
    fontSize: 14,
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
});

export default AuthScreen;
