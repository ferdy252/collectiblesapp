import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
  Alert,
  Platform,
  Button,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { analyzeCollectibleImage } from '../utils/geminiImageAnalysis';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme/styled';
import { normalizeImageUri, verifyImageExists } from '../utils/uriUtils';

/**
 * A component that analyzes a provided image URI using Google Gemini API.
 */
const ImageAnalyzer = ({ imageUriToAnalyze, onAnalysisComplete }) => {
  const { theme } = useTheme();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [currentImageUri, setCurrentImageUri] = useState(null);

  useEffect(() => {
    // Update currentImageUri when the prop changes
    if (imageUriToAnalyze) {
      const normalized = normalizeImageUri(imageUriToAnalyze);
      setCurrentImageUri(normalized);
      setError(null); // Clear previous errors when a new image is provided
    } else {
      setCurrentImageUri(null);
    }
  }, [imageUriToAnalyze]);

  // Analyze the provided image using Google Gemini API
  const handleAnalyzeImage = async () => {
    if (!currentImageUri) {
      Toast.show({
        type: 'info',
        text1: 'No Image',
        text2: 'Please select an image first to analyze.',
      });
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      
      // Verify the file exists at this URI using the unified utility
      const fileExists = await verifyImageExists(currentImageUri);
      if (!fileExists) {
        console.error('Image file does not exist at URI:', currentImageUri);
        throw new Error('Image file not found for analysis.');
      }
      
      console.log('Verified image file exists for analysis at:', currentImageUri);
      
      const analysisResult = await analyzeCollectibleImage(currentImageUri);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult, currentImageUri);
      }
    } catch (err) {
      console.error('Error analyzing image in ImageAnalyzer:', err);
      
      let errorTitle = 'Analysis Failed';
      let errorMessageText = 'Could not analyze the image. Please try again.';
      
      if (err.message) {
        if (err.message.includes('network')) {
          errorTitle = 'Network Error';
          errorMessageText = 'Please check your internet connection and try again.';
        } else if (err.message.includes('timeout')) {
          errorTitle = 'Analysis Timeout';
          errorMessageText = 'The analysis is taking too long. Please try again with a clearer image.';
        } else if (err.message.includes('file not found')) {
          errorTitle = 'Image Not Found';
          errorMessageText = 'The selected image could not be accessed. Please ensure it is valid.';
        } else if (err.message.includes('API key')) {
          errorTitle = 'API Configuration Error';
          errorMessageText = 'There is an issue with the AI service configuration.';
        } else if (err.message.includes('quota')) {
          errorTitle = 'Service Limit Reached';
          errorMessageText = 'The AI analysis service is busy. Please try again later.';
        } else {
          errorMessageText = err.message; // Use the error message if it's specific enough
        }
      }
      
      setError(errorMessageText);
      
      Toast.show({
        type: 'error',
        text1: errorTitle,
        text2: errorMessageText,
        visibilityTime: 4000,
        position: 'bottom',
      });
      
      Alert.alert(errorTitle, errorMessageText, [{ text: 'OK' }]);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Typography.H3 style={[styles.title, { color: theme.colors.text }]}>AI Image Analysis</Typography.H3>
      
      {currentImageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: currentImageUri }} style={styles.imagePreview} />
        </View>
      ) : (
        <View style={[styles.placeholderContainer, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="image-outline" size={64} color={theme.colors.textSecondary} />
          <Typography.Body style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
            Select an image above to enable AI Analysis.
          </Typography.Body>
        </View>
      )}

      {analyzing && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background + 'E6' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography.H3 style={[styles.loadingTitle, { color: theme.colors.text }]}>AI Analysis in Progress</Typography.H3>
          <Typography.Body style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Analyzing your image...
          </Typography.Body>
        </View>
      )}
      
      {error && !analyzing && (
        <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.error}20` }]}>
          <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
          <View style={styles.errorTextContainer}>
            <Typography.Body style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Typography.Body>
            <TouchableOpacity 
              onPress={() => setError(null)} // Just clear error, user can retry with button
              style={styles.tryAgainButton}
            >
              <Text style={[styles.tryAgainText, { color: theme.colors.primary }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!analyzing && (
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            { backgroundColor: currentImageUri ? theme.colors.primary : theme.colors.disabled },
          ]}
          onPress={handleAnalyzeImage}
          disabled={!currentImageUri || analyzing}
        >
          <Ionicons name="sparkles-outline" size={20} color={theme.colors.buttonText} style={{ marginRight: 8 }} />
          <Text style={[styles.analyzeButtonText, { color: theme.colors.buttonText }]}>
            {currentImageUri ? 'Analyze This Image' : 'Select an Image to Analyze'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'transparent', // Let parent control background
    borderRadius: 8,
    // marginBottom: 20, // Removed to allow parent more control
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  description: { // No longer used directly, but keeping for reference if needed
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative', // For loading overlay
    minHeight: 150, // Ensure some space even if image is small
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0', // theme.colors.border could be used here
    borderRadius: 8,
    overflow: 'hidden', // Clip image to rounded corners
  },
  imagePreview: {
    width: '100%',
    height: 200, // Fixed height for preview
    resizeMode: 'contain',
    borderRadius: 8,
  },
  placeholderContainer: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0', // theme.colors.border
    paddingHorizontal: 10,
  },
  placeholderText: {
    marginTop: 8,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8, // Match image preview
  },
  loadingTitle: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Removed loadingSteps and loadingNote for simplicity
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff000030', // theme.colors.error + '30'
  },
  errorTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tryAgainButton: {
    marginTop: 6,
  },
  tryAgainText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImageAnalyzer;
