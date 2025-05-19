import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
  Alert,
  Modal,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { analyzeCollectibleImage } from '../utils/geminiImageAnalysis';
import { useTheme } from '../context/ThemeContext';
import { Typography, Button } from '../theme/styled';
import CameraViewFix from './CameraViewFix';

const { width } = Dimensions.get('window');
const imageSize = (width - 80) / 3; // 3 images per row with padding

/**
 * A unified component for picking, analyzing, and managing images
 * Combines regular image upload and AI analysis into a single flow
 */
const UnifiedImagePicker = ({ 
  images = [], 
  onImagesChange, 
  onAnalysisComplete,
  maxImages = 5,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showAnalysisPrompt, setShowAnalysisPrompt] = useState(false);
  const [tempImageUri, setTempImageUri] = useState(null);
  const [showCameraView, setShowCameraView] = useState(false);
  
  // Request camera and media library permissions
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!cameraPermission.granted || !mediaLibraryPermission.granted) {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library access are needed for image upload.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Handle adding a photo - directly shows camera/gallery options
  const handleAddPhoto = () => {
    if (images.length >= maxImages) {
      Alert.alert(
        'Maximum Photos Reached',
        `You can only add up to ${maxImages} photos per item.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Skip the redundant alert and directly show the camera view
    setShowCameraView(true);
  };

  // Handle image captured from CameraViewFix component
  const handleImageCaptured = (imageUri) => {
    if (imageUri) {
      console.log('UnifiedImagePicker received image URI:', imageUri);
      
      // Store the properly formatted URI
      const formattedUri = ensureProperImageUri(imageUri);
      setTempImageUri(formattedUri);
      
      // Prompt for analysis with the formatted URI
      promptForAnalysis(formattedUri);
    }
  };
  
  // Helper function to ensure image URIs are properly formatted
  const ensureProperImageUri = (uri) => {
    if (!uri) return null;
    
    // Log the original URI for debugging
    console.log('Original URI:', uri);
    
    // Handle different URI formats consistently across platforms
    let formattedUri = uri;
    
    // First, normalize by removing any existing 'file://' prefix
    if (formattedUri.startsWith('file://')) {
      formattedUri = formattedUri.substring(7);
    }
    
    // For iOS: Always ensure the URI starts with 'file://'
    // For Android: Use the URI without 'file://' prefix
    if (Platform.OS === 'ios') {
      formattedUri = `file://${formattedUri}`;
    }
    
    console.log('Formatted URI:', formattedUri);
    return formattedUri;
  };

  // Prompt user if they want to analyze the image
  const promptForAnalysis = (imageUri) => {
    setShowAnalysisPrompt(true);
  };

  // Handle user's choice about AI analysis
  const handleAnalysisChoice = async (shouldAnalyze) => {
    setShowAnalysisPrompt(false);
    
    if (shouldAnalyze) {
      // User wants to analyze the image
      await analyzeImage(tempImageUri);
    } else {
      // User just wants to add the image without analysis
      addImageToCollection(tempImageUri);
    }
    
    setTempImageUri(null);
  };

  // Add image to collection without analysis
  const addImageToCollection = (imageUri) => {
    if (!imageUri) {
      console.error('Attempted to add null or undefined image URI');
      return;
    }
    
    // Ensure the URI is properly formatted
    const formattedUri = ensureProperImageUri(imageUri);
    console.log('Adding image to collection:', formattedUri);
    
    // Verify the image URI is valid
    if (!formattedUri || formattedUri.trim() === '') {
      console.error('Invalid image URI after formatting');
      Toast.show({
        type: 'error',
        text1: 'Image Error',
        text2: 'Could not process the selected image',
      });
      return;
    }
    
    // More robust check for duplicate images
    // We'll normalize all URIs for comparison to catch duplicates with different formatting
    const isDuplicate = images.some(existingUri => {
      // Normalize both URIs by removing file:// prefix for comparison
      const normalizedExisting = existingUri.replace('file://', '');
      const normalizedNew = formattedUri.replace('file://', '');
      
      // Compare the normalized paths
      return normalizedExisting === normalizedNew;
    });
    
    console.log('Duplicate image check result:', isDuplicate);
    
    if (!isDuplicate) {
      // Create a new array with the new image added
      const updatedImages = [...images, formattedUri];
      console.log('Updated images array:', updatedImages);
      
      // Important: Force a re-render by creating a new array
      // Only call onImagesChange if it exists
      if (onImagesChange) {
        onImagesChange([...updatedImages]);
      }
      
      // Log the current state of images for debugging
      console.log('Images after update:', updatedImages);
      
      Toast.show({
        type: 'success',
        text1: 'Image Added',
        text2: 'The image has been added to your item',
      });
    } else {
      console.log('Image already exists in collection, not adding duplicate');
      
      Toast.show({
        type: 'info',
        text1: 'Duplicate Image',
        text2: 'This image is already in your collection',
      });
    }
  };

  // Analyze the selected image using Google Gemini API
  const analyzeImage = async (imageUri) => {
    try {
      setAnalyzing(true);
      setError(null);
      
      // Ensure the URI is properly formatted
      const formattedUri = ensureProperImageUri(imageUri);
      setSelectedImage(formattedUri);
      
      // Store the formatted image URI in a variable to ensure we don't lose it
      // Important: Log the exact URI before analysis for debugging
      console.log('FORMATTED IMAGE URI BEFORE ANALYSIS:', formattedUri);
      
      // Show a user-friendly message
      Toast.show({
        type: 'info',
        text1: 'Analyzing Image',
        text2: 'The AI is analyzing your image. This may take a few seconds...',
        visibilityTime: 4000,
      });
      
      // Important: Store the image in images array BEFORE analysis
      // This ensures the properly formatted URI is used
      if (formattedUri) {
        // More robust check for duplicate images
        // We'll normalize all URIs for comparison to catch duplicates with different formatting
        const isDuplicate = images.some(existingUri => {
          // Normalize both URIs by removing file:// prefix for comparison
          const normalizedExisting = existingUri.replace('file://', '');
          const normalizedNew = formattedUri.replace('file://', '');
          
          // Compare the normalized paths
          return normalizedExisting === normalizedNew;
        });
        
        console.log('Duplicate image check result before analysis:', isDuplicate);
        let updatedImages = [...images];
        
        if (!isDuplicate) {
          // Add the image to the collection using the formatted URI
          console.log('Adding image to collection BEFORE analysis:', formattedUri);
          updatedImages = [...images, formattedUri];
          // Only call onImagesChange if it exists
          if (onImagesChange) {
            onImagesChange(updatedImages);
          }
          
          // Double check that the image was added
          console.log('Updated images array after adding:', updatedImages);
        } else {
          console.log('Image already exists in collection, not adding duplicate before analysis');
        }
        
        // Safe to check now since updatedImages is defined in both branches
        console.log('Image should now be in the collection:', updatedImages.includes(formattedUri));
      } else {
        console.error('No valid image URI to add to collection');
      }
      
      // Call the Gemini API to analyze the image
      const analysisResult = await analyzeCollectibleImage(formattedUri);
      
      // Pass the analysis results and the formatted image URI to the parent component
      if (onAnalysisComplete) {
        console.log('Passing analysis results and image URI to parent component:', formattedUri);
        onAnalysisComplete(analysisResult, formattedUri);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Analysis Complete',
        text2: 'Image analyzed and added to your item',
      });
    } catch (err) {
      // Set a user-friendly error message that explains what happened
      let userFriendlyError = 'Your image was successfully added, but we couldn\'t analyze it with AI.';
      
      // Add helpful suggestions based on the error type
      if (err.message) {
        if (err.message.includes('network')) {
          userFriendlyError += ' This might be due to a network issue. Please check your internet connection and try again.';
        } else if (err.message.includes('timeout')) {
          userFriendlyError += ' The analysis took too long to complete. You can try again later when the service is less busy.';
        } else if (err.message.includes('format') || err.message.includes('image')) {
          userFriendlyError += ' The image format may not be supported. Try using a different image.';
        }
      }
      
      // Set the error message to display in the UI
      setError(userFriendlyError);
      console.error('Error analyzing image:', err);
      
      // Only add the image if it wasn't already added before the analysis
      // Use the same robust duplicate check as elsewhere
      const formattedErrorUri = ensureProperImageUri(imageUri);
      
      if (formattedErrorUri) {
        // Check if this image already exists using normalized paths
        const isDuplicate = images.some(existingUri => {
          const normalizedExisting = existingUri.replace('file://', '');
          const normalizedNew = formattedErrorUri.replace('file://', '');
          return normalizedExisting === normalizedNew;
        });
        
        if (!isDuplicate) {
          console.log('Adding image after analysis failure:', formattedErrorUri);
          addImageToCollection(imageUri);
        } else {
          console.log('Image already exists in collection, not adding after analysis failure');
        }
      }
      
      // Create a more detailed error message for the user
      let errorMessage = 'The image was added to your collection, but the AI couldn\'t analyze it.';
      
      // Add more specific details if available
      if (err.message) {
        if (err.message.includes('network')) {
          errorMessage = 'The image was added, but we couldn\'t analyze it due to a network issue. Please check your connection.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'The image was added, but the analysis took too long. Please try again later.';
        }
      }
      
      // Show a more informative toast message
      Toast.show({
        type: 'warning', // Changed from 'error' to 'warning' to indicate partial success
        text1: 'Image Added, Analysis Failed',
        text2: errorMessage,
        visibilityTime: 5000, // Show for longer so user can read the message
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Remove an image from the collection
  const removeImage = (uriToRemove) => {
    const updatedImages = images.filter(uri => uri !== uriToRemove);
    // Only call onImagesChange if it exists
    if (onImagesChange) {
      onImagesChange(updatedImages);
    }
    
    Toast.show({
      type: 'info',
      text1: 'Image Removed',
      text2: 'The image has been removed',
    });
  };

  return (
    <View style={styles.container}>
      {/* Image Grid */}
      {images.length > 0 && (
        <View style={styles.imageGridContainer}>
          <View style={styles.imageGrid}>
            {images.map((item, index) => (
              <View key={`image-${index}`} style={styles.imageContainer}>
                <Image source={{ uri: item }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(item)}
                >
                  <Ionicons name="close-circle" size={24} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* Add Photo Button */}
      {images.length < maxImages && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleAddPhoto}
          disabled={analyzing}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Add Photo</Text>
        </TouchableOpacity>
      )}
      
      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="information-circle" size={20} color={theme.colors.warning} style={styles.errorIcon} />
          <Text style={[styles.errorText, { color: theme.colors.warning }]}>
            {error}
          </Text>
        </View>
      )}
      
      {/* Camera View Modal */}
      <Modal
        visible={showCameraView}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowCameraView(false)}
        statusBarTranslucent
      >
        <SafeAreaView style={[styles.cameraViewContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.cameraViewHeader}>
            <View style={styles.headerLine} />
            <Text style={[styles.cameraViewTitle, {fontSize: 20, fontWeight: 'bold', color: theme.colors.text}]}>Add Photo</Text>
            <TouchableOpacity
              onPress={() => setShowCameraView(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close-circle" size={32} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <CameraViewFix onImageCaptured={(imageUri) => {
            setShowCameraView(false);
            handleImageCaptured(imageUri);
          }} />
        </SafeAreaView>
      </Modal>
      
      {/* Analysis Prompt Modal */}
      <Modal
        visible={showAnalysisPrompt}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAnalysisPrompt(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAnalysisPrompt(false)}
            >
              <Ionicons name="close-circle" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            
            {/* AI Icon */}
            <View style={styles.aiIconContainer}>
              <Ionicons name="scan-outline" size={40} color={theme.colors.primary} />
            </View>
            
            <Text style={[styles.modalTitleText, {color: theme.colors.text}]}>Analyze with AI?</Text>
            
            {/* Image preview */}
            {tempImageUri && (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: tempImageUri }} style={styles.modalImage} />
              </View>
            )}
            
            <Text style={[styles.modalBodyText, {color: theme.colors.text}]}>
              Would you like to use AI to analyze this image and auto-fill item details?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButtonSecondary,
                  { borderColor: theme.colors.border }
                ]}
                onPress={() => handleAnalysisChoice(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Just Add Image</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButtonPrimary,
                  { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => handleAnalysisChoice(true)}
              >
                <Ionicons name="flash" size={18} color="white" style={{ marginRight: 6 }} />
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Analyze with AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Loading Indicator */}
      {analyzing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, {color: theme.colors.text}]}>
            Analyzing image with AI...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 15,
  },
  imageGridContainer: {
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  aiAnalyzedBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAnalyzedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 5,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.3)',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: {
    marginTop: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  aiIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalBodyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
  },
  modalButtonPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalButtonSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cameraViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cameraViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerLine: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  cameraViewTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
    position: 'absolute',
    right: 15,
    top: 12,
    zIndex: 10,
  },
});

export default UnifiedImagePicker;
