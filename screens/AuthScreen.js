// screens/AuthScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Modal, 
  Switch,
  Dimensions,
  StatusBar,
  Image,
  Animated
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TwoFactorVerify from '../components/TwoFactorVerify';
import TwoFactorSetup from '../components/TwoFactorSetup';
import { checkLoginRateLimit, recordLoginAttempt, formatRateLimitMessage } from '../utils/serverRateLimiter';
import { validatePassword } from '../utils/passwordValidator';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
// Import error handling utilities
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMfaVerify, setShowMfaVerify] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [currentFactorId, setCurrentFactorId] = useState(null);
  const [lockoutMessage, setLockoutMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, completeMfaVerification, cancelMfaVerification } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const formScaleAnim = useState(new Animated.Value(1))[0];
  const formOpacityAnim = useState(new Animated.Value(1))[0];

  // Check for existing lockout on component mount and start animations
  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
    
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
  
  // Validate username format (alphanumeric, underscores, 3-20 chars)
  const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };
  
  // Validate name (letters, spaces, hyphens, apostrophes)
  const isValidName = (name) => {
    if (!name || name.trim() === '') return true; // Optional
    const nameRegex = /^[a-zA-Z\s'-]{2,30}$/;
    return nameRegex.test(name);
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
    
    // Validate additional fields for sign up
    if (isSignUp) {
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
      
      // Clear any previous confirmation message when attempting to sign in
      setConfirmationMessage('');
      
      // Choose between sign in and sign up based on mode
      if (isSignUp) {
        // Include metadata for the user profile
        const metadata = {
          username: username,
          first_name: firstName || null,
          last_name: lastName || null,
          display_name: firstName && lastName ? `${firstName} ${lastName}` : firstName || username
        };
        
        const { data, error } = await signUp(email, password, metadata);
        
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

  // Animate the form transition when switching between sign-in and sign-up
  const handleModeSwitch = () => {
    // First shrink and fade out the form
    Animated.parallel([
      Animated.timing(formScaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacityAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Toggle the mode
      setIsSignUp(!isSignUp);
      
      // Reset fields when switching modes
      if (isSignUp) {
        // Switching to sign in, clear sign up specific fields
        setFirstName('');
        setLastName('');
        setUsername('');
      }
      
      // Then expand and fade in the form
      Animated.parallel([
        Animated.timing(formScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f8f9fa' }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <Animated.View 
        style={[
          styles.mainContent,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Theme toggle button at the top right */}
        <View style={styles.themeToggleContainer}>
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
            style={styles.themeToggle}
            accessibilityLabel="Toggle dark mode"
            accessibilityHint={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
          />
        </View>

        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="cube-outline" size={60} color="#FF5D3A" />
          </View>
          <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#333' }]}>Collectible Tracker</Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? '#aaa' : '#666' }]}>
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </Text>
        </View>

        <Animated.View style={[
          styles.formContainer,
          {
            transform: [{ scale: formScaleAnim }],
            opacity: formOpacityAnim
          }
        ]}>
          {/* Username field - only shown during sign up */}
          {isSignUp && (
            <View style={[styles.inputContainer, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }]}>
              <Ionicons name="person-outline" size={22} color={isDarkMode ? '#aaa' : '#888'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#333' }]}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
                autoCorrect={false}
              />
            </View>
          )}
          
          {/* First Name field - only shown during sign up */}
          {isSignUp && (
            <View style={[styles.inputContainer, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }]}>
              <Ionicons name="text-outline" size={22} color={isDarkMode ? '#aaa' : '#888'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#333' }]}
                placeholder="First Name (optional)"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
                autoCorrect={false}
              />
            </View>
          )}
          
          {/* Last Name field - only shown during sign up */}
          {isSignUp && (
            <View style={[styles.inputContainer, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
            }]}>
              <Ionicons name="text-outline" size={22} color={isDarkMode ? '#aaa' : '#888'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#333' }]}
                placeholder="Last Name (optional)"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
                autoCorrect={false}
              />
            </View>
          )}
          
          <View style={[styles.inputContainer, { 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }]}>
            <Ionicons name="mail-outline" size={22} color={isDarkMode ? '#aaa' : '#888'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: isDarkMode ? '#fff' : '#333' }]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputContainer, { 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }]}>
            <Ionicons name="lock-closed-outline" size={22} color={isDarkMode ? '#aaa' : '#888'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: isDarkMode ? '#fff' : '#333' }]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
              autoCorrect={false}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              accessibilityHint="Toggle password visibility"
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={isDarkMode ? '#aaa' : '#888'} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Show password strength indicator only during sign up */}
          {isSignUp && password.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <Text style={[styles.passwordStrengthLabel, { color: isDarkMode ? '#aaa' : '#666' }]}>
                Password Strength:
              </Text>
              <PasswordStrengthIndicator 
                password={password} 
                showRequirements={true} 
              />
              <View style={styles.passwordTipsContainer}>
                <Text style={[styles.passwordTip, { color: isDarkMode ? '#aaa' : '#666' }]}>
                  • Use at least 8 characters
                </Text>
                <Text style={[styles.passwordTip, { color: isDarkMode ? '#aaa' : '#666' }]}>
                  • Include uppercase and lowercase letters
                </Text>
                <Text style={[styles.passwordTip, { color: isDarkMode ? '#aaa' : '#666' }]}>
                  • Add numbers and special characters
                </Text>
              </View>
            </View>
          )}

          {lockoutMessage ? (
            <View style={styles.lockoutContainer}>
              <Ionicons name="alert-circle-outline" size={18} color={isDarkMode ? '#ff6b6b' : '#d9534f'} />
              <Text style={[styles.lockoutText, { color: isDarkMode ? '#ff6b6b' : '#d9534f' }]}>{lockoutMessage}</Text>
            </View>
          ) : null}

          {hasError && (
            <View style={styles.errorMessage}>
              <Text style={[styles.errorText, { color: isDarkMode ? '#ff6b6b' : '#d9534f' }]}>{errorMessage}</Text>
            </View>
          )}

          {confirmationMessage && (
            <View style={styles.confirmationMessage}>
              <Text style={[styles.confirmationText, { color: isDarkMode ? '#aaa' : '#666' }]}>{confirmationMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: isSignUp ? '#4361EE' : '#FF5D3A' }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
            <Text style={[styles.dividerText, { color: isDarkMode ? '#aaa' : '#888' }]}>
              {isSignUp ? 'Already have an account?' : 'Need an account?'}
            </Text>
            <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
          </View>

          <TouchableOpacity
            style={[styles.signUpButton, { borderColor: isSignUp ? '#4361EE' : '#FF5D3A' }]}
            onPress={handleModeSwitch}
            disabled={loading}
          >
            <Text style={[styles.signUpButtonText, { color: isSignUp ? '#4361EE' : '#FF5D3A' }]}>
              {isSignUp ? 'Back to Sign In' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* MFA Verification Modal */}
      <Modal
        visible={showMfaVerify}
        animationType="slide"
        transparent={true}
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
        transparent={true}
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
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 93, 58, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF5D3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  formContainer: {
    width: '100%',
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 60,
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  lockoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  lockoutText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  button: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  signUpButton: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5D3A',
    backgroundColor: 'transparent',
  },
  signUpButtonText: {
    color: '#FF5D3A',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorMessage: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 10,
    zIndex: 10,
  },
  themeToggle: {
    marginLeft: 10,
  },
  passwordToggle: {
    padding: 16,
  },
  confirmationMessage: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  passwordStrengthContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  passwordStrengthLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordTipsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  passwordTip: {
    fontSize: 13,
    marginBottom: 4,
  },
});

export default AuthScreen;
