import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { createThemedStyles } from '../theme/styled';
import { analyzeImageWithAI } from '../utils/aiHelper'; // Assuming this function exists

const BarcodeScannerScreen = ({ navigation, route }) => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Take a photo of the barcode
  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Camera Permission',
          text2: 'We need camera permission to take photos of barcodes',
        });
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        // Automatically process the image once it's taken
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Could not access camera. Please try again.',
      });
    }
  };

  // Process the image with AI to extract barcode
  const processImage = async (imageUri) => {
    setLoading(true);
    try {
      // Call the AI service to analyze the image and extract the barcode
      const barcodeData = await analyzeImageWithAI(imageUri);
      
      if (barcodeData && barcodeData.upc) {
        console.log(`Barcode detected: ${barcodeData.upc}`);
        
        // Look up the barcode in a product database
        const productInfo = await lookupBarcode(barcodeData.upc);
        
        // Navigate to AddItemScreen with the data
        navigation.replace('Add', {
          barcodeData: barcodeData.upc,
          productInfo: productInfo || null
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Barcode Not Found',
          text2: 'Could not detect a barcode in the image. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Toast.show({
        type: 'error',
        text1: 'Processing Error',
        text2: 'Could not analyze the image. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Placeholder function for barcode lookup
  const lookupBarcode = async (barcode) => {
    // Simulate API call with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, return mock data for certain barcodes
    if (barcode === '9780201896831') {
      return {
        name: 'The Art of Computer Programming',
        brand: 'Addison-Wesley',
        category: 'Books',
        condition: 'Mint'
      };
    } else if (barcode === '5449000131805') {
      return {
        name: 'Coca-Cola Classic',
        brand: 'Coca-Cola',
        category: 'Memorabilia',
        condition: 'Mint'
      };
    }
    
    // Return null if no match found
    return null;
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.text, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Analyzing image...</Text>
          </View>
        ) : image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            <Text style={[styles.text, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Processing barcode...</Text>
          </View>
        ) : (
          <View style={styles.instructionsContainer}>
            <Ionicons name="barcode-outline" size={80} color={isDarkMode ? '#FFFFFF' : theme.colors.text} />
            <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Barcode Scanner</Text>
            <Text style={[styles.text, { color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }]}>
              Take a clear photo of the barcode to automatically identify your item.
            </Text>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={takePhoto}
            >
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary, marginTop: 10 }]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, { color: theme.colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = createThemedStyles((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
}));

export default BarcodeScannerScreen;
