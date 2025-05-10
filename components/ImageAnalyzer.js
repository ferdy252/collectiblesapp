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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { analyzeCollectibleImage } from '../utils/geminiImageAnalysis';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../theme/styled';

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
      setSelectedImage(imageUri);
      setOriginalImageUri(imageUri); // Store the original URI
      analyzeImage(imageUri);
    }
  };
  
  // Helper function to ensure image URIs are properly formatted
  const ensureProperImageUri = (uri) => {
    if (!uri) return null;
    
    // Make sure the URI starts with 'file://' on iOS
    if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
      return `file://${uri}`;
    }
    
    return uri;
  };

  // Analyze the selected image using Google Gemini API
  const analyzeImage = async (imageUri) => {
    try {
      setAnalyzing(true);
      setError(null);
      
      // Ensure the URI is properly formatted
      const formattedUri = ensureProperImageUri(imageUri);
      console.log('ImageAnalyzer - Formatted URI for analysis:', formattedUri);
      
      // Store the original URI to ensure we don't lose it
      setOriginalImageUri(formattedUri);
      
      // Show a user-friendly message
      Alert.alert(
        'Analyzing Image',
        'The AI is analyzing your image. This may take a few seconds...'
      );
      
      // Call the Gemini API to analyze the image
      const analysisResult = await analyzeCollectibleImage(formattedUri);
      
      // Pass the analysis results and the ORIGINAL image URI to the parent component
      if (onAnalysisComplete) {
        console.log('ImageAnalyzer - Passing URI to parent:', formattedUri);
        // Make sure we're explicitly passing the properly formatted image URI to be saved
        onAnalysisComplete(analysisResult, formattedUri);
      }
    } catch (err) {
      setError('Could not analyze image. Please try again.');
      console.error('Error analyzing image:', err);
      Alert.alert(
        'Analysis Failed',
        'Could not analyze the image. Please try again or select a different image.',
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
              <Typography.Body style={styles.loadingText}>Analyzing image...</Typography.Body>
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
        <Typography.Body style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Typography.Body>
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
