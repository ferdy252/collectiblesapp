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
} from 'react-native';
import { normalizeImageUri } from '../utils/uriUtils';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
// Removed Typography import to avoid layout conflicts

/**
 * An improved camera component that ensures image URIs are properly formatted and preserved
 * throughout the image capture and processing flow.
 */
const CameraViewFix = ({ onImageCaptured }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Request camera and media library permissions
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!cameraPermission.granted || !mediaLibraryPermission.granted) {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library access are needed for image capture.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take a photo with the camera
  const takePhoto = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Ensure the URI is properly formatted using the centralized utility
        const formattedUri = normalizeImageUri(imageUri);
        
        // Log the URI for debugging
        console.log('CameraViewFix - Captured image URI:', formattedUri);
        
        // Pass the formatted URI to the parent component
        if (onImageCaptured) {
          onImageCaptured(formattedUri);
        }
      }
    } catch (err) {
      setError('Could not take photo. Please try again.');
      console.error('Error taking photo:', err);
    } finally {
      setLoading(false);
    }
  };

  // Select an image from the library
  const selectImage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Ensure the URI is properly formatted using the centralized utility
        const formattedUri = normalizeImageUri(imageUri);
        
        // Log the URI for debugging
        console.log('CameraViewFix - Selected image URI:', formattedUri);
        
        // Pass the formatted URI to the parent component
        if (onImageCaptured) {
          onImageCaptured(formattedUri);
        }
      }
    } catch (err) {
      setError('Could not select image. Please try again.');
      console.error('Error selecting image:', err);
    } finally {
      setLoading(false);
    }
  };

  // We now use the centralized normalizeImageUri function from uriUtils.js

  return (
    <View style={styles.container}>
      {/* Illustration area */}
      <View style={styles.illustrationContainer}>
        <Ionicons 
          name="image-outline" 
          size={80} 
          color={theme.colors.primary} 
          style={styles.illustrationIcon} 
        />
        <Text style={styles.illustrationText}>
          Capture or select an image of your collectible
        </Text>
      </View>
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </View>
      )}
      
      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          onPress={takePhoto} 
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: loading ? 0.5 : 1 }]}
          disabled={loading}
        >
          <Ionicons name="camera" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={selectImage} 
          style={[styles.button, { backgroundColor: theme.colors.secondary, opacity: loading ? 0.5 : 1 }]}
          disabled={loading}
        >
          <Ionicons name="images" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Select Image</Text>
        </TouchableOpacity>
      </View>
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Processing image...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 20,
  },
  illustrationIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  illustrationText: {
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 250,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    width: '100%',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CameraViewFix;
