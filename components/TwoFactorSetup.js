// components/TwoFactorSetup.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { startMFAEnrollment, challengeMFA, verifyMFA } from '../utils/mfaUtils';
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from './ErrorDisplay';

/**
 * Component for setting up two-factor authentication
 * @param {Object} props
 * @param {Function} props.onComplete - Callback when setup is complete
 * @param {Function} props.onCancel - Callback when setup is cancelled
 */
const TwoFactorSetup = ({ onComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('start'); // start, qrcode, verify
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [hasError, setHasError] = useState(false);

  // Start the enrollment process
  const startEnrollment = async () => {
    try {
      setLoading(true);
      setError('');
      setHasError(false);
      
      const result = await startMFAEnrollment();
      
      setQrCode(result.qr_code);
      setSecret(result.secret);
      setFactorId(result.factorId);
      setStep('qrcode');
    } catch (err) {
      // Use our error handling utility
      handleError(
        err,
        'TwoFactorSetup.startEnrollment',
        ERROR_CATEGORIES.AUTH,
        'Could not start 2FA setup. Please try again.'
      );
      
      setError('Could not start 2FA setup. Please try again.');
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  // Start the challenge process
  const startChallenge = async () => {
    try {
      setLoading(true);
      setError('');
      setHasError(false);
      
      // Validate factorId
      if (!factorId) {
        const customError = new Error('Missing factor ID');
        handleError(
          customError,
          'TwoFactorSetup.startChallenge',
          ERROR_CATEGORIES.VALIDATION,
          'Setup information is missing. Please restart the setup process.'
        );
        
        setError('Setup information is missing. Please restart the setup process.');
        setHasError(true);
        return;
      }
      
      const result = await challengeMFA(factorId);
      setChallengeId(result.challengeId);
      setStep('verify');
    } catch (err) {
      // Use our error handling utility
      handleError(
        err,
        'TwoFactorSetup.startChallenge',
        ERROR_CATEGORIES.AUTH,
        'Could not verify your setup. Please try again.'
      );
      
      setError('Could not verify your setup. Please try again.');
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
          'TwoFactorSetup.verifyCode',
          ERROR_CATEGORIES.VALIDATION,
          'Setup information is missing. Please restart the setup process.'
        );
        
        setError('Setup information is missing. Please restart the setup process.');
        setHasError(true);
        return;
      }
      
      const result = await verifyMFA(factorId, challengeId, verificationCode);
      
      if (result.verified) {
        Alert.alert(
          'Success!', 
          'Two-factor authentication has been set up successfully.',
          [{ text: 'OK', onPress: () => onComplete && onComplete() }]
        );
      } else {
        // Use our error handling utility for verification failure
        const verificationError = new Error('Verification failed');
        handleError(
          verificationError,
          'TwoFactorSetup.verifyCode',
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
        'TwoFactorSetup.verifyCode',
        ERROR_CATEGORIES.AUTH,
        'Verification failed. Please try again.'
      );
      
      setError('Verification failed. Please try again.');
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  // Render different steps of the setup process
  const renderContent = () => {
    if (loading && step === 'start') {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Preparing two-factor authentication...</Text>
        </View>
      );
    }

    switch (step) {
      case 'start':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Set Up Two-Factor Authentication</Text>
            <Text style={styles.description}>
              Two-factor authentication adds an extra layer of security to your account. 
              Once set up, you'll need your phone to generate a code each time you sign in.
            </Text>
            <Text style={styles.steps}>
              1. We'll show you a QR code to scan with an authenticator app
              2. Scan the code with an app like Google Authenticator, Authy, or Microsoft Authenticator
              3. Enter the 6-digit code from the app to verify setup
            </Text>
            
            {hasError && (
              <ErrorDisplay
                message={error}
                onRetry={() => {
                  setHasError(false);
                  setError('');
                }}
                style={styles.errorDisplay}
              />
            )}
            
            <TouchableOpacity style={styles.button} onPress={startEnrollment}>
              <Text style={styles.buttonText}>Begin Setup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      case 'qrcode':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Scan QR Code</Text>
            <Text style={styles.description}>
              Scan this QR code with your authenticator app. If you can't scan the code, 
              you can manually enter the secret key below.
            </Text>
            
            {hasError && (
              <ErrorDisplay
                message={error}
                onRetry={startEnrollment}
                style={styles.errorDisplay}
              />
            )}
            
            {qrCode ? (
              <View style={styles.qrContainer}>
                <Image 
                  source={{ uri: qrCode }} 
                  style={styles.qrCode} 
                  resizeMode="contain" 
                />
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text>QR Code not available</Text>
              </View>
            )}
            
            <View style={styles.secretContainer}>
              <Text style={styles.secretLabel}>Secret Key:</Text>
              <Text style={styles.secretValue} selectable>{secret}</Text>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={startChallenge}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );

      case 'verify':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Verify Setup</Text>
            <Text style={styles.description}>
              Enter the 6-digit code from your authenticator app to complete the setup.
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
            />
            
            {error && !hasError && <Text style={styles.errorText}>{error}</Text>}
            
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
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.mainContainer}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
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
  steps: {
    fontSize: 14,
    textAlign: 'left',
    marginBottom: 30,
    lineHeight: 20,
    alignSelf: 'stretch',
  },
  qrContainer: {
    width: 200,
    height: 200,
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCode: {
    width: 180,
    height: 180,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secretContainer: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    width: '90%',
  },
  secretLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  secretValue: {
    fontSize: 16,
    fontFamily: 'monospace',
    letterSpacing: 1,
    padding: 5,
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
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
  },
  errorDisplay: {
    width: '90%',
    marginVertical: 15,
  },
});

export default TwoFactorSetup;
