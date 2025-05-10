// components/TwoFactorVerify.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { challengeMFA, verifyMFA } from '../utils/mfaUtils';
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from './ErrorDisplay';

/**
 * Component for verifying two-factor authentication during login
 * @param {Object} props
 * @param {string} props.factorId - The factor ID to verify
 * @param {Function} props.onSuccess - Callback when verification is successful
 * @param {Function} props.onCancel - Callback when verification is cancelled
 */
const TwoFactorVerify = ({ factorId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [hasError, setHasError] = useState(false);

  // Start the challenge when the component mounts
  useEffect(() => {
    startChallenge();
  }, []);

  // Start the challenge process
  const startChallenge = async () => {
    try {
      setLoading(true);
      setError('');
      setHasError(false);
      
      if (!factorId) {
        const customError = new Error('Missing factor ID');
        handleError(
          customError,
          'TwoFactorVerify.startChallenge',
          ERROR_CATEGORIES.VALIDATION,
          'Unable to start verification. Please try again.'
        );
        setError('Unable to start verification. Please try again.');
        setHasError(true);
        return;
      }
      
      const result = await challengeMFA(factorId);
      setChallengeId(result.challengeId);
    } catch (err) {
      // Use our error handling utility
      handleError(
        err,
        'TwoFactorVerify.startChallenge',
        ERROR_CATEGORIES.AUTH,
        'Could not start verification. Please try again.'
      );
      
      setError('Could not start verification. Please try again.');
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  // Verify the code from the authenticator app
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setHasError(false);
      
      // Validate inputs
      if (!factorId || !challengeId) {
        const customError = new Error('Missing verification data');
        handleError(
          customError,
          'TwoFactorVerify.verifyCode',
          ERROR_CATEGORIES.VALIDATION,
          'Verification data is missing. Please try again.'
        );
        setError('Verification data is missing. Please try again.');
        setHasError(true);
        return;
      }
      
      const result = await verifyMFA(factorId, challengeId, verificationCode);
      
      if (result.verified) {
        onSuccess && onSuccess();
      } else {
        // Use our error handling utility for verification failure
        const verificationError = new Error('Verification failed');
        handleError(
          verificationError,
          'TwoFactorVerify.verifyCode',
          ERROR_CATEGORIES.AUTH,
          'Verification failed. Please check your code and try again.'
        );
        
        setError('Verification failed. Please check your code and try again.');
        setHasError(true);
      }
    } catch (err) {
      // Use our error handling utility
      handleError(
        err,
        'TwoFactorVerify.verifyCode',
        ERROR_CATEGORIES.AUTH,
        'Verification failed. Please try again.'
      );
      
      setError('Verification failed. Please try again.');
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.description}>
        Enter the 6-digit code from your authenticator app to complete sign in.
      </Text>
      
      {hasError && (
        <ErrorDisplay
          message={error}
          onRetry={startChallenge}
          style={styles.errorDisplay}
        />
      )}
      
      <TextInput
        style={styles.codeInput}
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={verificationCode}
        onChangeText={setVerificationCode}
        autoFocus
      />
      
      <TouchableOpacity 
        style={[styles.button, !verificationCode || verificationCode.length !== 6 ? styles.buttonDisabled : null]}
        onPress={verifyCode}
        disabled={!verificationCode || verificationCode.length !== 6 || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      {error && !hasError ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.resendButton} onPress={startChallenge}>
        <Text style={styles.resendButtonText}>Resend Code</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  codeInput: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginVertical: 20,
    paddingHorizontal: 15,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 5,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A9A9A9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  resendButton: {
    marginTop: 20,
    padding: 10,
  },
  resendButtonText: {
    color: '#4285F4',
    fontSize: 16,
  },
  errorDisplay: {
    width: '90%',
    marginVertical: 10,
  },
});

export default TwoFactorVerify;
