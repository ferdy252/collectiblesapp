// screens/Auth/AuthScreen.js
import React from 'react';
import { 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar, 
  Animated,
  Modal
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import TwoFactorVerify from '../../components/TwoFactorVerify';
import TwoFactorSetup from '../../components/TwoFactorSetup';
import useAuthScreen from './hooks/useAuthScreen';
import SignInForm from './components/SignInForm';
import SignUpForm from './components/SignUpForm';
import AppLogo from './components/AppLogo';
import ThemeToggle from './components/ThemeToggle';
import AuthMessages from './components/AuthMessages';
import authStyles from './styles/authStyles';

/**
 * Authentication screen component that handles both sign in and sign up
 */
const AuthScreen = () => {
  const { signIn, signUp, completeMfaVerification, cancelMfaVerification } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  const {
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
    setHasError,
    setErrorMessage,
    setConfirmationMessage,
    setLockoutMessage,
    setShowMfaVerify,
    setShowMfaSetup,
    setCurrentFactorId,
    
    // Methods
    handleModeSwitch,
    askAboutTwoFactor
  } = useAuthScreen();

  // Handle successful MFA verification
  const handleMfaSuccess = () => {
    setShowMfaVerify(false);
    completeMfaVerification();
  };

  // Handle MFA verification cancellation
  const handleMfaCancel = () => {
    setShowMfaVerify(false);
    cancelMfaVerification();
  };

  // Handle MFA setup completion
  const handleMfaSetupComplete = () => {
    setShowMfaSetup(false);
  };

  // Handle MFA setup cancellation
  const handleMfaSetupCancel = () => {
    setShowMfaSetup(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[authStyles.container, { backgroundColor: isDarkMode ? '#000' : '#f8f9fa' }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <Animated.View 
        style={[
          authStyles.mainContent,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Theme toggle button at the top right */}
        <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

        {/* App logo and title */}
        <AppLogo isDarkMode={isDarkMode} isSignUp={isSignUp} />

        {/* Form container with animation */}
        <Animated.View style={[
          authStyles.formContainer,
          {
            transform: [{ scale: formScaleAnim }],
            opacity: formOpacityAnim
          }
        ]}>
          {/* Display error and confirmation messages */}
          <AuthMessages 
            hasError={hasError}
            errorMessage={errorMessage}
            confirmationMessage={confirmationMessage}
            isDarkMode={isDarkMode}
          />

          {/* Conditionally render sign in or sign up form */}
          {isSignUp ? (
            <SignUpForm 
              onSignUp={signUp}
              onSwitchMode={handleModeSwitch}
              isDarkMode={isDarkMode}
              setHasError={setHasError}
              setErrorMessage={setErrorMessage}
              setConfirmationMessage={setConfirmationMessage}
            />
          ) : (
            <SignInForm 
              onSignIn={signIn}
              onSwitchMode={handleModeSwitch}
              isDarkMode={isDarkMode}
              setShowMfaVerify={setShowMfaVerify}
              setCurrentFactorId={setCurrentFactorId}
              setLockoutMessage={setLockoutMessage}
              setHasError={setHasError}
              setErrorMessage={setErrorMessage}
              setConfirmationMessage={setConfirmationMessage}
            />
          )}
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

export default AuthScreen;
