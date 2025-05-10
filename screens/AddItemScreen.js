import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  StatusBar,
  Alert,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
// Removed barcode scanner import - using ImagePicker instead
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { Typography, Button, Card, Layout, Input, createThemedStyles } from '../theme/styled';
import { logAddItem } from '../lib/analytics';
import { useAuth } from '../context/AuthContext';
import { sanitizeString, validateLength, validateNumber, sanitizeObject } from '../utils/inputValidation';
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';
import UnifiedImagePicker from '../components/UnifiedImagePicker';

// Constants
const CATEGORIES = ['Action Figures', 'Cards', 'Comics', 'Coins', 'Stamps', 'Vinyl Records', 'Vintage Toys', 'Other'];
const CONDITIONS = ['Mint', 'Near Mint', 'Very Good', 'Good', 'Fair', 'Poor'];
const MAX_PHOTOS = 5;
const { width } = Dimensions.get('window');
const imageSize = (width - 80) / 3; // 3 images per row with padding

function AddItemScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme(); // Get current theme from context
  const [itemName, setItemName] = useState('');
  
  // State for dropdown pickers
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  
  // Convert categories and conditions to the format needed by DropDownPicker
  const categoryItems = CATEGORIES.map(category => ({ label: category, value: category }));
  const conditionItems = CONDITIONS.map(condition => ({ label: condition, value: condition }));
  
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedCondition, setSelectedCondition] = useState(CONDITIONS[0]); // Default to Mint
  const [brand, setBrand] = useState('');
  const [images, setImages] = useState([]); // Store image URIs
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('0.00'); // New state for item value
  
  // New state for collections
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [loadingCollections, setLoadingCollections] = useState(true);
  
  // New state for sharing toggle
  const [isShared, setIsShared] = useState(false);
  
  // New state for notes
  const [notes, setNotes] = useState('');
  
  // Form validation state
  const [errors, setErrors] = useState({});
  
  // New state for error handling
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(20)).current;
  
  // New state for AI features
  const [aiEnabled, setAiEnabled] = useState(true); // Default to enabled since we now have a built-in API key
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [analyzedImageUri, setAnalyzedImageUri] = useState(null);

  useEffect(() => {
    // Run entrance animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
    
    // Staggered animation for form elements
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(formSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
    ]).start();
  }, []);

  // Check if we have barcode data from the scanner
  useEffect(() => {
    if (route.params?.barcodeData) {
      // Handle the barcode data that was scanned
      const { barcodeData, productInfo } = route.params;
      console.log('Received barcode data:', barcodeData);
      
      // If product info is available, populate the form
      if (productInfo) {
        setItemName(productInfo.name || '');
        setBrand(productInfo.brand || '');
        if (productInfo.category && CATEGORIES.includes(productInfo.category)) {
          setSelectedCategory(productInfo.category);
        }
        if (productInfo.condition && CONDITIONS.includes(productInfo.condition)) {
          setSelectedCondition(productInfo.condition);
        }
      } else {
        // Just set a placeholder if no product info
        setItemName('Scanned Item');
        setBrand('Scanned Brand');
      }
      
      Toast.show({
        type: 'success',
        text1: 'Barcode Scanned',
        text2: `Barcode: ${barcodeData}`,
      });
    }
    
    // Check for pre-selected collection from navigation params
    if (route.params?.preSelectedCollectionId) {
      console.log('Pre-selected collection:', route.params.preSelectedCollectionId);
      setSelectedCollectionId(route.params.preSelectedCollectionId);
      
      if (route.params.preSelectedCollectionName) {
        Toast.show({
          type: 'info',
          text1: 'Collection Selected',
          text2: `Adding to: ${route.params.preSelectedCollectionName}`,
        });
      }
    }
  }, [route.params]);

  // Request permissions on component mount
  useEffect(() => {
    console.log('AddItemScreen mounted - requesting permissions');
    requestImagePermissions();
    fetchCollections(); // Fetch collections when component mounts
  }, []);

  // Function to fetch collections from Supabase
  const fetchCollections = async () => {
    try {
      setLoadingCollections(true);
      console.log('Fetching collections for dropdown...');
      
      const { data, error } = await supabase
        .from('collections')
        .select('id, name, icon')
        .order('name');

      if (error) {
        throw error;
      }

      console.log(`Fetched ${data.length} collections for dropdown`);
      setCollections(data);
      
      // Set the first collection as default if available
      if (data.length > 0) {
        setSelectedCollectionId(data[0].id);
      }
    } catch (error) {
      // Use our new error handling utility
      handleError(
        error,
        'AddItemScreen.fetchCollections',
        ERROR_CATEGORIES.DATABASE,
        'Failed to load collections. Please try again.'
      );
      
      // Set empty collections array to avoid undefined errors
      setCollections([]);
    } finally {
      setLoadingCollections(false);
    }
  };

  const requestImagePermissions = async () => {
    console.log('Requesting image picker permissions...');
    if (Platform.OS !== 'web') {
      try {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('Image picker permissions:', { cameraStatus, libraryStatus });
        
        if (cameraStatus.status !== 'granted' || libraryStatus.status !== 'granted') {
          Alert.alert('Permissions Required', 'Sorry, we need camera and camera roll permissions to make this work!');
        }
      } catch (error) {
        console.error('Error requesting image permissions:', error);
      }
    }
  };

  const startBarcodeScanner = async () => {
    console.log('Starting barcode scanner...');
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        // Navigate to barcode scanner screen within the Add stack
        navigation.navigate('BarcodeScanner');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Camera Permission',
          text2: 'We need camera permission to scan barcodes',
        });
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      // Show error message
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not access camera. Please try again.',
      });
    }
  };

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};
    
    // Validate name using our validation utility
    const nameValidation = validateLength(itemName, 2, 100);
    if (!nameValidation.success) {
      newErrors.itemName = nameValidation.message;
    }
    
    // Validate description
    if (notes) {
      const descValidation = validateLength(notes, 0, 500);
      if (!descValidation.success) {
        newErrors.notes = descValidation.message;
      }
    }
    
    // Validate category
    if (!selectedCategory || selectedCategory === 'Select a category') {
      newErrors.category = 'Please select a category';
    }
    
    // Validate condition
    if (!selectedCondition || selectedCondition === 'Select condition') {
      newErrors.condition = 'Please select a condition';
    }
    
    // Validate collection
    if (!selectedCollectionId || selectedCollectionId === 'Select a collection') {
      newErrors.collection = 'Please select a collection';
    }
    
    // Validate value if provided
    if (value) {
      const valueValidation = validateNumber(value, 0, 1000000);
      if (!valueValidation.success) {
        newErrors.value = valueValidation.message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  const handleSave = async () => {
    console.log('Attempting to save item...');
    
    try {
      // Always get the current user directly from Supabase for reliability
      console.log('Getting current user from Supabase...');
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }
      
      if (!authData || !authData.user) {
        console.error('No authenticated user found');
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'You must be logged in to add items.',
        });
        return;
      }
      
      const currentUser = authData.user;
      console.log('Current user from Supabase:', currentUser.id);
      
      // Validate form
      if (!validateForm()) {
        console.log('Form validation failed');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please fill in all required fields.',
        });
        return;
      }
      
      setLoading(true);
      console.log('Saving item to Supabase with user_id:', currentUser.id);
      
      // Upload images to storage first
      let photoUrls = [];
      if (images.length > 0) {
        console.log(`=== STARTING IMAGE UPLOAD PROCESS ===`);
        console.log(`Found ${images.length} images to upload`);
        console.log('All image URIs:', JSON.stringify(images));
        
        // Debug: Check if images array contains valid URIs
        images.forEach((uri, index) => {
          console.log(`Image ${index + 1} URI:`, uri);
          console.log(`Image ${index + 1} type:`, typeof uri);
          console.log(`Image ${index + 1} valid:`, Boolean(uri && typeof uri === 'string' && uri.startsWith('file://')));
        });
        
        // Show progress indicator for image uploads
        Toast.show({
          type: 'info',
          text1: 'Uploading Images',
          text2: `Uploading ${images.length} image(s)...`,
          visibilityTime: 4000,
        });
        
        // First, validate all images and filter out invalid ones
        const validImages = images.filter(imageUri => {
          if (!imageUri || typeof imageUri !== 'string') {
            console.error('Skipping invalid image URI:', imageUri);
            return false;
          }
          return true;
        });
        
        console.log(`Found ${validImages.length} valid images to upload`);
        
        // If we have the analyzed image, make sure it's included in valid images
        if (analyzedImageUri && !validImages.includes(analyzedImageUri)) {
          console.log('Adding analyzed image to valid images list:', analyzedImageUri);
          validImages.push(analyzedImageUri);
        }
        
        // Process each valid image
        for (const imageUri of validImages) {
          console.log('--- Processing image URI:', imageUri);
          
          try {
            // Try to upload the image with better error handling
            const uploadedUrl = await uploadImage(imageUri);
            if (uploadedUrl) {
              console.log('Image uploaded successfully:', uploadedUrl);
              photoUrls.push(uploadedUrl);
            } else {
              console.error('Failed to upload image (null URL returned):', imageUri);
              // Show a toast for failed uploads
              Toast.show({
                type: 'error',
                text1: 'Upload Failed',
                text2: 'One or more images failed to upload',
                position: 'bottom',
              });
            }
          } catch (uploadError) {
            console.error('Error uploading image:', imageUri, uploadError);
          }
        }
        
        console.log(`=== UPLOAD COMPLETE: ${photoUrls.length}/${validImages.length} images uploaded successfully ===`);
      }
      
      // Sanitize all text inputs before saving to database
      const sanitizedData = {
        name: sanitizeString(itemName),
        notes: sanitizeString(notes),
        category: sanitizeString(selectedCategory),
        condition: sanitizeString(selectedCondition),
        brand: sanitizeString(brand),
        value: value ? parseFloat(value) : null,
        collection_id: selectedCollectionId,
        user_id: currentUser.id,
        photos: photoUrls,
        is_shared: isShared,
      };
      
      console.log('Sanitized data ready for insert:', sanitizedData);
      
      // Save the item with image URLs
      const { data, error } = await supabase
        .from('items')
        .insert([sanitizedData])
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Item saved successfully:', data);
      
      // Log analytics event
      logAddItem({
        itemName: sanitizedData.name,
        category: sanitizedData.category,
        collection: collections.find(c => c.id === sanitizedData.collection_id)?.name,
      });
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Item added to your collection!',
      });
      
      // Reset form
      setItemName('');
      setBrand('');
      setSelectedCategory(CATEGORIES[0]);
      setSelectedCondition(CONDITIONS[0]);
      setImages([]);
      setIsShared(false);
      setValue('0.00'); // Reset value
      setNotes(''); // Reset notes
    } catch (error) {
      // Use our new error handling utility
      handleError(
        error,
        'AddItemScreen.handleSave',
        ERROR_CATEGORIES.UNKNOWN,
        'Could not save item. Please try again.'
      );
    } finally {
      setLoading(false);
      
      // Debug info about the state after save attempt
      console.log('=== SAVE OPERATION COMPLETED ===');
      console.log('Final images state:', images);
      console.log('Final photoUrls state:', photoUrls);
    }
  };

  // Function to upload image to storage
  const uploadImage = async (uri) => {
    try {
      // Simple validation check
      if (!uri) {
        console.error('No image URI provided for upload');
        return null;
      }
      
      console.log('ATTEMPTING TO UPLOAD IMAGE:', uri);
      
      // Import FileSystem module
      const FileSystem = require('expo-file-system');
      
      // Generate a unique filename
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const fileName = `item-${timestamp}-${random}.jpg`;
      
      // Step 1: Read the image as base64 (works on both iOS and Android)
      console.log('Reading image as base64...');
      let base64Data;
      
      try {
        // For iOS, we need to handle file:// URIs
        if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
          uri = `file://${uri}`;
        }
        
        // Read the file as base64
        base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        // Verify we have data
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Failed to read image data - empty result');
        }
        
        console.log(`Successfully read image as base64, length: ${base64Data.length} characters`);
      } catch (readError) {
        console.error('Error reading image file:', readError);
        
        // Try an alternative approach for problematic URIs
        console.log('Trying alternative method to read image...');
        
        try {
          // If the direct read failed, try to copy to a temp location first
          const tempFile = `${FileSystem.cacheDirectory}temp-${timestamp}.jpg`;
          
          await FileSystem.copyAsync({
            from: uri,
            to: tempFile
          });
          
          console.log('Copied to temp file:', tempFile);
          
          // Now read from the temp location
          base64Data = await FileSystem.readAsStringAsync(tempFile, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          // Verify we have data
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Failed to read image data from temp file');
          }
          
          console.log(`Successfully read temp image, length: ${base64Data.length} characters`);
          
          // Clean up temp file
          await FileSystem.deleteAsync(tempFile, { idempotent: true });
        } catch (tempError) {
          console.error('Error with temp file approach:', tempError);
          throw new Error(`Could not read image file: ${tempError.message}`);
        }
      }
      
      // Step 2: Upload the base64 data directly to Supabase
      console.log('Uploading to Supabase storage...');
      
      const { data, error } = await supabase.storage
        .from('item-photos')
        .upload(fileName, base64Data, {
          contentType: 'image/jpeg',
          upsert: true,
          encoding: 'base64'
        });
      
      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }
      
      // Step 3: Get the public URL
      console.log('Getting public URL...');
      const { data: urlData } = await supabase.storage
        .from('item-photos')
        .getPublicUrl(fileName);
      
      if (!urlData || !urlData.publicUrl) {
        console.error('Failed to get public URL for uploaded image');
        throw new Error('Failed to get public URL');
      }
      
      console.log('Image uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
      
    } catch (error) {
      console.error('Upload image error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: 'Could not upload image. Please try again.',
      });
      return null;
    }
  };
  
  // Alternative method to upload images that fail with the standard method
  const alternativeImageUpload = async (uri) => {
    try {
      console.log('Using alternative upload method for:', uri);
      
      // For file URIs on iOS, we might need to remove the file:// prefix
      const cleanUri = uri.replace('file://', '');
      console.log('Cleaned URI:', cleanUri);
      
      // Generate a unique filename
      const fileName = `item-alt-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
      console.log('Alternative upload filename:', fileName);
      
      // Try direct upload without blob conversion
      const { data, error } = await supabase.storage
        .from('item-photos')
        .upload(fileName, {
          uri: uri,
          type: 'image/jpeg',
          name: fileName,
        }, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      
      if (error) {
        console.error('Alternative upload error:', error);
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = await supabase.storage
        .from('item-photos')
        .getPublicUrl(fileName);
      
      console.log('Alternative upload successful:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Alternative upload failed:', error);
      throw error;
    }
  };
  
  // Handle errors during save
  const handleSaveError = (error) => {
    // Use our new error handling utility
    handleError(
      error,
      'AddItemScreen.uploadImage',
      ERROR_CATEGORIES.UNKNOWN,
      'Could not upload image. Please try again.'
    );
    return null;
  };

  // Handle AI image analysis results
  const handleAnalysisComplete = (analysisResult, imageUri) => {
    console.log('Analysis complete with image URI:', imageUri);
    setAiAnalysisResult(analysisResult);
    setAnalyzedImageUri(imageUri);
    
    // Double-check that the image is in our images array
    if (imageUri && !images.includes(imageUri)) {
      console.log('Adding analyzed image to images array from handleAnalysisComplete');
      setImages(prevImages => [...prevImages, imageUri]);
    }
    
    // Note: The UnifiedImagePicker now handles adding the image to the images array
    // But we double-check here as a safety measure
    
    // Auto-fill form fields with AI analysis results
    if (analysisResult) {
      // Fill item name if provided and not already set
      if (analysisResult.name && !itemName) {
        setItemName(analysisResult.name);
      }
      
      // Fill category if provided and valid
      if (analysisResult.category && CATEGORIES.includes(analysisResult.category)) {
        setSelectedCategory(analysisResult.category);
      }
      
      // Fill brand if provided and not already set
      if (analysisResult.brand && !brand) {
        setBrand(analysisResult.brand);
      }
      
      // Add description to notes if provided
      if (analysisResult.description) {
        setNotes(prev => {
          const prefix = 'AI-Generated Description:\n';
          // Only add if not already present
          if (prev.includes(prefix)) {
            return prev;
          }
          return `${prefix}${analysisResult.description}\n\n${prev}`;
        });
      }
    }
    
    Toast.show({
      type: 'success',
      text1: 'AI Analysis Complete',
      text2: 'Item details have been filled automatically',
    });
  };

  // AI analyzer is now integrated into the UnifiedImagePicker component

  // Animation for button press
  const animateButtonPress = () => {
    const scaleAnim = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    return scaleAnim;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      <Animated.View 
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          flex: 1,
        }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: theme.colors.background }]}
          style={{ backgroundColor: theme.colors.background }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <Animated.View 
            style={{
              opacity: formOpacity,
              transform: [{ translateY: formSlide }],
            }}
          >
            <Card.Primary style={[styles.formCard, { backgroundColor: theme.colors.cardBackground }]}>
              <Typography.H2 style={[styles.title, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}>Add New Item</Typography.H2>
              
              {/* Error Display */}
              {hasError && (
                <ErrorDisplay 
                  message={errorMessage}
                  onRetry={() => setHasError(false)}
                  style={styles.errorContainer}
                />
              )}
              
              {/* Item Name Input */}
              <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
                <Input.Primary
                  label="Item Name"
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="Enter item name"
                  error={errors.itemName}
                  accessibilityLabel="Item name input field"
                  accessibilityHint="Enter the name of your collectible item"
                  style={styles.input}
                  placeholderTextColor={isDarkMode ? '#A0A0A0' : undefined}
                  labelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                />
              </Animated.View>
              
              {/* Brand Input */}
              <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
                <Input.Primary
                  label="Brand"
                  value={brand}
                  onChangeText={setBrand}
                  placeholder="Enter brand name"
                  error={errors.brand}
                  accessibilityLabel="Brand input field"
                  accessibilityHint="Enter the brand or manufacturer of your collectible"
                  style={styles.input}
                  placeholderTextColor={isDarkMode ? '#A0A0A0' : undefined}
                  labelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                />
              </Animated.View>
              
              {/* Value Input */}
              <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
                <Input.Primary
                  label="Value ($)"
                  value={value}
                  onChangeText={(text) => {
                    // Only allow numbers and decimal point
                    const filtered = text.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = filtered.split('.');
                    if (parts.length > 2) {
                      setValue(parts[0] + '.' + parts.slice(1).join(''));
                    } else {
                      setValue(filtered);
                    }
                  }}
                  placeholder="Enter item value"
                  error={errors.value}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Value input field"
                  accessibilityHint="Enter the monetary value of your collectible"
                  style={styles.input}
                  placeholderTextColor={isDarkMode ? '#A0A0A0' : undefined}
                  labelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                />
              </Animated.View>
              
              {/* Notes Input */}
              <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
                <Input.Primary
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any additional details about this item"
                  error={errors.notes}
                  accessibilityLabel="Notes input field"
                  accessibilityHint="Enter any additional details about your collectible"
                  style={[styles.input, styles.textArea]}
                  placeholderTextColor={isDarkMode ? '#A0A0A0' : undefined}
                  labelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                  multiline={true}
                  numberOfLines={4}
                />
              </Animated.View>
              
              {/* Category Picker - Improved */}
              <Animated.View style={[styles.formGroup, { opacity: formOpacity, transform: [{ translateY: formSlide }], zIndex: 3000 }]}>
                <Typography.Label style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginBottom: 8 }}>Category</Typography.Label>
                <DropDownPicker
                  open={categoryOpen}
                  value={selectedCategory}
                  items={categoryItems}
                  setOpen={setCategoryOpen}
                  setValue={setSelectedCategory}
                  style={[styles.dropdownStyle, { backgroundColor: theme.colors.inputBackground }]}
                  dropDownContainerStyle={[styles.dropdownContainerStyle, { backgroundColor: theme.colors.inputBackground }]}
                  textStyle={[styles.dropdownTextStyle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}
                  placeholderStyle={styles.dropdownPlaceholderStyle}
                  listItemLabelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                  arrowIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                  tickIconStyle={{ tintColor: theme.colors.primary }}
                  closeIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                  listMode="SCROLLVIEW"
                  scrollViewProps={{
                    nestedScrollEnabled: true,
                  }}
                  maxHeight={200}
                  placeholder="Select a category"
                  showTickIcon={true}
                  closeAfterSelecting={true}
                  zIndex={3000}
                  zIndexInverse={1000}
                />
              </Animated.View>
              
              {/* Condition Picker - Improved */}
              <Animated.View style={[styles.formGroup, { opacity: formOpacity, transform: [{ translateY: formSlide }], zIndex: 2000 }]}>
                <Typography.Label style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginBottom: 8 }}>Condition</Typography.Label>
                <DropDownPicker
                  open={conditionOpen}
                  value={selectedCondition}
                  items={conditionItems}
                  setOpen={setConditionOpen}
                  setValue={setSelectedCondition}
                  style={[styles.dropdownStyle, { backgroundColor: theme.colors.inputBackground }]}
                  dropDownContainerStyle={[styles.dropdownContainerStyle, { backgroundColor: theme.colors.inputBackground }]}
                  textStyle={[styles.dropdownTextStyle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}
                  placeholderStyle={styles.dropdownPlaceholderStyle}
                  listItemLabelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                  arrowIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                  tickIconStyle={{ tintColor: theme.colors.primary }}
                  closeIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                  listMode="SCROLLVIEW"
                  scrollViewProps={{
                    nestedScrollEnabled: true,
                  }}
                  maxHeight={200}
                  placeholder="Select condition"
                  showTickIcon={true}
                  closeAfterSelecting={true}
                  zIndex={2000}
                  zIndexInverse={2000}
                />
              </Animated.View>
              
              {/* Collection Picker - Improved */}
              <Animated.View style={[styles.formGroup, { opacity: formOpacity, transform: [{ translateY: formSlide }], zIndex: 1000 }]}>
                <Typography.Label style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text, marginBottom: 8 }}>Collection</Typography.Label>
                {loadingCollections ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : collections.length > 0 ? (
                  <DropDownPicker
                    open={collectionOpen}
                    value={selectedCollectionId}
                    items={collections.map(collection => ({ label: collection.name, value: collection.id }))}
                    setOpen={setCollectionOpen}
                    setValue={setSelectedCollectionId}
                    style={[styles.dropdownStyle, { backgroundColor: theme.colors.inputBackground }]}
                    dropDownContainerStyle={[styles.dropdownContainerStyle, { backgroundColor: theme.colors.inputBackground }]}
                    textStyle={[styles.dropdownTextStyle, { color: isDarkMode ? '#FFFFFF' : theme.colors.text }]}
                    placeholderStyle={styles.dropdownPlaceholderStyle}
                    listItemLabelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                    arrowIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                    tickIconStyle={{ tintColor: theme.colors.primary }}
                    closeIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
                    listMode="SCROLLVIEW"
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                    maxHeight={200}
                    placeholder="Select a collection"
                    showTickIcon={true}
                    closeAfterSelecting={true}
                    zIndex={1000}
                    zIndexInverse={3000}
                  />
                ) : (
                  <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>No collections found. Please create a collection first.</Typography.BodySmall>
                )}
                {errors.collection && <Text style={[theme.inputs.errorText, { color: theme.colors.error }]}>{errors.collection}</Text>}
              </Animated.View>
              
              {/* Sharing Toggle */}
              <Animated.View style={[styles.formGroup, { opacity: formOpacity, transform: [{ translateY: formSlide }] }]}>
                <Layout.Row style={styles.toggleRow}>
                  <Typography.Label style={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}>Share with Community</Typography.Label>
                  <Switch
                    value={isShared}
                    onValueChange={setIsShared}
                    trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                    thumbColor={isShared ? theme.colors.accent : theme.colors.background}
                    ios_backgroundColor={theme.colors.divider}
                    accessibilityLabel="Share with community toggle"
                    accessibilityHint="Toggle to share this item with the community feed"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isShared }}
                  />
                </Layout.Row>
                <Typography.BodySmall style={{ color: isDarkMode ? '#E0E0E0' : theme.colors.textSecondary }}>
                  {isShared ? 'This item will be visible to other users in the community feed.' : 'This item will only be visible to you.'}
                </Typography.BodySmall>
              </Animated.View>
              
              {/* Unified Image Picker with AI Analysis */}
              <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
                <View style={styles.sectionTitle}>
                  <Ionicons name="image-outline" size={20} color={theme.colors.text} style={styles.sectionIcon} />
                  <Text style={[styles.sectionTitleText, { color: theme.colors.text }]}>Photos</Text>
                </View>
                
                <UnifiedImagePicker
                  images={images}
                  onImagesChange={setImages}
                  onAnalysisComplete={handleAnalysisComplete}
                  maxImages={MAX_PHOTOS}
                />
              </Animated.View>
              
              {/* Barcode Scanner Button */}
              <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: theme.colors.secondary }]}
                  onPress={startBarcodeScanner}
                  activeOpacity={0.8}
                  accessibilityLabel="Scan barcode"
                  accessibilityHint="Opens the camera to scan a barcode and auto-fill item details"
                >
                  <Ionicons name="barcode-outline" size={24} color="white" style={styles.buttonIcon} />
                  <Text style={styles.scanButtonText}>Scan Barcode</Text>
                </TouchableOpacity>
              </Animated.View>
              
              {/* Save Button */}
              <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }] }}>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: loading ? theme.colors.primaryDisabled : theme.colors.primary }]}
                  onPress={handleSave}
                  disabled={loading || loadingCollections}
                  activeOpacity={0.8}
                  accessibilityLabel="Save item"
                  accessibilityHint="Saves the item to your collection"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={24} color="white" style={styles.buttonIcon} />
                      <Text style={styles.saveButtonText}>Save Item</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Card.Primary>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((theme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  formCard: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.cardBackground || theme.colors.background,
    borderRadius: 24,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  formGroup: {
    marginBottom: theme.spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.inputBackground || theme.colors.background,
    borderRadius: 16,
    marginBottom: theme.spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  dropdownStyle: {
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.divider,
    borderWidth: 1,
    borderRadius: 16,
    padding: theme.spacing.md,
    height: 56,
    minHeight: 56,
  },
  dropdownContainerStyle: {
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.divider,
    borderWidth: 1,
    borderRadius: 16,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownTextStyle: {
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownPlaceholderStyle: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  toggleRow: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.cardBackground || theme.colors.background,
    borderRadius: 20,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrapper: {
    position: 'relative',
    margin: theme.spacing.sm,
  },
  image: {
    width: imageSize,
    height: imageSize,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
  },
  addImageButton: {
    width: imageSize,
    height: imageSize,
    borderWidth: 2,
    borderColor: theme.colors.divider,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.cardBackground || theme.colors.background,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
    borderRadius: 20,
    padding: theme.spacing.md,
    paddingVertical: 18,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: theme.spacing.md,
    paddingVertical: 18,
    marginTop: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 10,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  errorContainer: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.errorBackground || 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
  },
  aiAnalyzer: {
    marginBottom: theme.spacing.md,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  aiButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}));

export default AddItemScreen;
