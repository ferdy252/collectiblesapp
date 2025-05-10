// biometricAuth.js - Implements biometric authentication for secure actions like purchases

import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';

// Check if device supports biometric authentication
export const checkBiometricSupport = async () => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) {
    console.log('This device does not support biometric authentication');
    return false;
  }

  // Check if the device has biometrics enrolled
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    console.log('This device does not have biometric authentication enabled');
    return false;
  }

  return true;
};

// Get available biometric authentication types
export const getBiometricTypes = async () => {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  
  // Convert the numeric types to readable strings
  const readableTypes = types.map(type => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'facial recognition';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'iris';
      default:
        return 'unknown';
    }
  });
  
  return readableTypes;
};

// Authenticate user with biometrics
export const authenticateWithBiometrics = async (action = 'continue') => {
  try {
    // Check if biometrics are available
    const isBiometricAvailable = await checkBiometricSupport();
    
    if (!isBiometricAvailable) {
      // Fall back to a secure alternative if biometrics aren't available
      return { success: false, error: 'Biometric authentication not available' };
    }
    
    // Get biometric types for better user prompting
    const biometricTypes = await getBiometricTypes();
    const biometricType = biometricTypes.length > 0 ? biometricTypes[0] : 'biometric';
    
    // Authenticate with biometrics
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Authenticate to ${action}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });
    
    if (result.success) {
      console.log('Biometric authentication successful');
      return { success: true };
    } else {
      console.log('Biometric authentication failed:', result);
      return { 
        success: false, 
        error: result.error || 'Authentication failed',
        cancelled: result.cancelled || false
      };
    }
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    return { success: false, error: error.message };
  }
};

// Higher-order function to secure any function with biometric authentication
export const withBiometricAuth = (func, actionName = 'continue') => {
  return async (...args) => {
    const authResult = await authenticateWithBiometrics(actionName);
    
    if (authResult.success) {
      // Authentication successful, execute the function
      return await func(...args);
    } else if (authResult.cancelled) {
      // User cancelled authentication
      return { success: false, cancelled: true };
    } else {
      // Authentication failed
      Alert.alert(
        'Authentication Failed',
        'Please try again to continue.',
        [{ text: 'OK' }]
      );
      return { success: false, error: authResult.error };
    }
  };
};

// Example usage:
// const securePurchase = withBiometricAuth(makePurchase, 'make a purchase');
// const result = await securePurchase(productId, price);
