import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
  Alert,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { analyzeCollectibleImage } from '../utils/geminiImageAnalysis';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme/styled';
import { normalizeImageUri, verifyImageExists } from '../utils/uriUtils';

import CameraViewFix from './CameraViewFix';

/**
 * A component that allows users to take or select an image and analyze it using Google Gemini API
 * Updated to fix image URI handling issues
 */
const ImageAnalyzer = ({ onAnalysisComplete }) => {
  const { theme } = useTheme();
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [originalImageUri, setOriginalImageUri] = useState(null);

  // Handle image captured from CameraViewFix component
  const handleImageCaptured = (imageUri) => {
    if (imageUri) {
      console.log('ImageAnalyzer received image URI:', imageUri);
      
      // Immediately format the URI for consistency using the unified utility
      const formattedUri = normalizeImageUri(imageUri);
      console.log('ImageAnalyzer formatted captured image URI:', formattedUri);
      
      // Update UI with the formatted URI
      setSelectedImage(formattedUri);
      
      // Store the formatted URI
      setOriginalImageUri(formattedUri);
      
      // Begin analysis with the properly formatted URI
      analyzeImage(formattedUri);
    } else {
      console.error('Received empty image URI from camera');
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Failed to capture image. Please try again.',
        visibilityTime: 3000,
      });
    }
  };

  // Analyze the selected image using Google Gemini API
  const analyzeImage = async (imageUri) => {
    try {
      setAnalyzing(true);
      setError(null);
      
      // Validate the input URI
      if (!imageUri) {
        throw new Error('No image URI provided for analysis');
      }
      
      // Ensure the URI is properly formatted using the unified utility
      const formattedUri = normalizeImageUri(imageUri);
      console.log('ImageAnalyzer - Formatted URI for analysis:', formattedUri);
      
      // Verify the file exists at this URI using the unified utility
      const fileExists = await verifyImageExists(formattedUri);
      if (!fileExists) {
        console.error('Image file does not exist at formatted URI:', formattedUri);
        throw new Error('Image file not found');
      }
      
      console.log('Verified image file exists at:', formattedUri);
      
      // Store the formatted URI to ensure we don't lose it
      setOriginalImageUri(formattedUri);
      setSelectedImage(formattedUri); // Update the UI preview as well
      
      // No need for an alert - we'll show progress in the UI instead
      // The analyzing state will trigger the loading overlay with progress indicators
      
      // Call the Gemini API to analyze the image
      const analysisResult = await analyzeCollectibleImage(formattedUri);
      
      // Pass the analysis results and the properly formatted image URI to the parent component
      if (onAnalysisComplete) {
        console.log('ImageAnalyzer - Passing URI to parent:', formattedUri);
        // Make sure we're explicitly passing the properly formatted image URI to be saved
        onAnalysisComplete(analysisResult, formattedUri);
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      
      // Determine the type of error for a more user-friendly message
      let errorTitle = 'Analysis Failed';
      let errorMessage = 'Could not analyze the image. Please try again or select a different image.';
      
      // Check for specific error types
      if (err.message && err.message.includes('network')) {
        errorTitle = 'Network Error';
        errorMessage = 'Please check your internet connection and try again.';
      } else if (err.message && err.message.includes('timeout')) {
        errorTitle = 'Analysis Timeout';
        errorMessage = 'The analysis is taking too long. Please try again with a clearer image.';
      } else if (err.message && err.message.includes('file not found')) {
        errorTitle = 'Image Not Found';
        errorMessage = 'The selected image could not be accessed. Please try taking a new photo.';
      } else if (err.message && err.message.includes('API key')) {
        errorTitle = 'API Configuration Error';
        errorMessage = 'There is an issue with the AI service configuration. Please contact support.';
      } else if (err.message && err.message.includes('quota')) {
        errorTitle = 'Service Limit Reached';
        errorMessage = 'The AI analysis service is currently unavailable. Please try again later.';
      }
      
      // Set the error state for UI display
      setError(errorMessage);
      
      // Show a toast notification
      Toast.show({
        type: 'error',
        text1: errorTitle,
        text2: errorMessage,
        visibilityTime: 4000,
        position: 'bottom',
      });
      
      // Also show an alert for more visibility
      Alert.alert(
        errorTitle,
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Typography.H3 style={styles.title}>Image Analysis</Typography.H3>
      <Typography.Body style={styles.description}>
        Take a photo or select an image of your collectible for AI analysis
      </Typography.Body>
      
      {selectedImage ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          {analyzing ? (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background + 'CC' }]}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Typography.H3 style={styles.loadingTitle}>AI Analysis in Progress</Typography.H3>
              <Typography.Body style={styles.loadingText}>
                Analyzing your image with AI...
              </Typography.Body>
              <View style={styles.loadingSteps}>
                <Typography.Body style={styles.loadingStep}>✓ Image captured</Typography.Body>
                <Typography.Body style={styles.loadingStep}>✓ Processing image</Typography.Body>
                <Typography.Body style={styles.loadingStep}>
                  <ActivityIndicator size="small" color={theme.colors.primary} /> AI analyzing details
                </Typography.Body>
              </View>
              <Typography.Body style={styles.loadingNote}>
                This may take up to 15-20 seconds depending on your internet connection
              </Typography.Body>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.placeholderContainer, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="image-outline" size={64} color={theme.colors.text} />
          <Typography.Body style={styles.placeholderText}>No image selected</Typography.Body>
        </View>
      )}
      
      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.error}20` }]}>
          <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
          <View style={styles.errorTextContainer}>
            <Typography.Body style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Typography.Body>
            <TouchableOpacity 
              onPress={() => setError(null)}
              style={styles.tryAgainButton}
            >
              <Text style={[styles.tryAgainText, { color: theme.colors.primary }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      
      {/* Use the improved CameraViewFix component instead of direct buttons */}
      {!selectedImage && (
        <CameraViewFix onImageCaptured={handleImageCaptured} />
      )}
      
      {selectedImage && !analyzing && (
        <TouchableOpacity 
          onPress={() => {
            setSelectedImage(null);
            setOriginalImageUri(null);
            setError(null);
          }}
          style={[styles.resetButton, { backgroundColor: theme.colors.secondary }]}
        >
          <Ionicons name="refresh" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Take Another Photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingTitle: {
    marginBottom: 8,
    color: 'white',
    textAlign: 'center',
  },
  loadingText: {
    marginBottom: 15,
    textAlign: 'center',
    color: 'white',
  },
  loadingSteps: {
    alignItems: 'flex-start',
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 8,
    width: '80%',
  },
  loadingStep: {
    marginVertical: 4,
    color: 'white',
    fontSize: 14,
  },
  loadingNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  errorText: {
    fontSize: 14,
  },
  tryAgainButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  tryAgainText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginTop: 15,
  },
  container: {
    width: '100%',
    marginVertical: 15,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    marginTop: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: 'white',
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
});

export default ImageAnalyzer;
