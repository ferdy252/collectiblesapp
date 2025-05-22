// screens/Auth/hooks/useAuthScreen.js
import { useState, useEffect } from 'react';
import { Animated } from 'react-native';
import { checkLoginRateLimit, formatRateLimitMessage } from '../../../utils/serverRateLimiter';

/**
 * Custom hook to manage authentication screen state and animations
 */
const useAuthScreen = () => {
  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [lockoutMessage, setLockoutMessage] = useState('');
  
  // MFA state
  const [showMfaVerify, setShowMfaVerify] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [currentFactorId, setCurrentFactorId] = useState(null);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const formScaleAnim = useState(new Animated.Value(1))[0];
  const formOpacityAnim = useState(new Animated.Value(1))[0];

  // Start entrance animations on component mount
  useEffect(() => {
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
  }, []);

  // Check for existing lockout when email changes
  const checkExistingLockout = async (email) => {
    if (email) {
      const rateLimitStatus = await checkLoginRateLimit(email || '');
      if (rateLimitStatus.isBlocked || rateLimitStatus.attemptsRemaining <= 2) {
        setLockoutMessage(formatRateLimitMessage(rateLimitStatus));
      }
    }
  };

  // Handle switching between sign in and sign up modes
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

  // Ask user if they want to set up 2FA
  const askAboutTwoFactor = () => {
    setShowMfaSetup(true);
  };

  return {
    // State
    isSignUp,
    hasError,
    errorMessage,
    confirmationMessage,
    lockoutMessage,
    showMfaVerify,
    showMfaSetup,
    currentFactorId,
    
    // Animation values
    fadeAnim,
    slideAnim,
    formScaleAnim,
    formOpacityAnim,
    
    // Setters
    setIsSignUp,
    setHasError,
    setErrorMessage,
    setConfirmationMessage,
    setLockoutMessage,
    setShowMfaVerify,
    setShowMfaSetup,
    setCurrentFactorId,
    
    // Methods
    handleModeSwitch,
    checkExistingLockout,
    askAboutTwoFactor
  };
};

export default useAuthScreen;
