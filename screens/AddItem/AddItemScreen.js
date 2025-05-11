import React, { useEffect, useRef } from 'react';
import {
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
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Card, Layout, Input } from '../../theme/styled';
import { useAuth } from '../../context/AuthContext';
import { handleError } from '../../utils/errorHandler';
import ErrorDisplay from '../../components/ErrorDisplay';
import UnifiedImagePicker from '../../components/UnifiedImagePicker';

// Import the context provider and actions
import { AddItemProvider, useAddItem } from './AddItemContext';
import { ACTIONS } from './itemReducer';

// Import utilities from our new structure
import { uploadImage } from './imageUtils';
import { validateForm, handleSaveError } from './formUtils';
import { fetchCollections, saveItem } from './apiUtils';
import { handleAnalysisComplete } from './aiUtils';
import { normalizeImageUri, areImageUrisEqual } from '../../utils/uriUtils';
import { CATEGORIES, CONDITIONS, MAX_PHOTOS } from './constants';
import { styles } from './styles';
import { clearImageCache } from '../../utils/imageProcessingCache';

// The main component wrapper that provides context
const AddItemScreenWrapper = ({ navigation, route }) => {
  return (
    <AddItemProvider>
      <AddItemScreenContent navigation={navigation} route={route} />
    </AddItemProvider>
  );
};

// The actual screen content that consumes the context
const AddItemScreenContent = ({ navigation, route }) => {
  // Use the context instead of local reducer
  const { state, dispatch } = useAddItem();
  const { theme, isDarkMode } = useTheme(); // Get current theme from context
  
  // We're now getting state and dispatch from context
  
  // Destructure state for easier access in the component
  const {
    itemName,
    brand,
    value,
    notes,
    selectedCategory,
    selectedCondition,
    selectedCollectionId,
    isShared,
    images,
    analyzedImageUri,
    categoryOpen,
    conditionOpen,
    collectionOpen,
    collections,
    collectionItems,
    loading,
    saving,
    hasError,
    errorMessage,
    aiAnalysisResult
  } = state;
  
  // Convert categories and conditions to the format needed by DropDownPicker
  const categoryItems = CATEGORIES.map(category => ({ label: category, value: category }));
  const conditionItems = CONDITIONS.map(condition => ({ label: condition, value: condition }));
  
  // Animation for save button
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Get the current user from auth context
  const { currentUser } = useAuth();
  
  // Load collections when the component mounts
  useEffect(() => {
    if (currentUser?.id) {
      loadCollections();
    }
  }, [currentUser]);
  
  // Keep analyzedImageUri in sync with the images array
  // This is now handled by the reducer, but we keep this effect for additional safety
  useEffect(() => {
    // If we have an analyzedImageUri but it's not in the images array, add it
    if (analyzedImageUri && images.length > 0) {
      const normalizedAnalyzedUri = normalizeImageUri(analyzedImageUri);
      const imageExists = images.some(uri => areImageUrisEqual(uri, normalizedAnalyzedUri));
      
      if (!imageExists) {
        console.log('Syncing analyzed image to images array via useEffect');
        dispatch({ type: ACTIONS.ADD_IMAGE, payload: normalizedAnalyzedUri });
      }
    }
    
    // If images array is empty, reset analyzedImageUri
    if (images.length === 0 && analyzedImageUri) {
      console.log('Images array is empty, resetting analyzedImageUri');
      dispatch({ type: ACTIONS.SET_ANALYZED_IMAGE_URI, payload: null });
    }
  }, [images, analyzedImageUri]);
  
  // Load collections from the database
  const loadCollections = async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const collectionsData = await fetchCollections(currentUser.id);
      dispatch({ type: ACTIONS.SET_COLLECTIONS, payload: collectionsData });
      
      // Convert collections to the format needed by DropDownPicker
      const items = collectionsData.map(collection => ({
        label: collection.name,
        value: collection.id,
      }));
      dispatch({ type: ACTIONS.SET_COLLECTION_ITEMS, payload: items });
      
      // If there's only one collection, select it automatically
      if (items.length === 1) {
        dispatch({ type: ACTIONS.SET_COLLECTION, payload: items[0].value });
      }
    } catch (error) {
      handleError(error, 'Error loading collections', {
        source: 'AddItemScreen.loadCollections',
        userId: currentUser?.id,
      });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };
  
  // Validate the form before saving
  const validateFormData = () => {
    return validateForm({
      itemName,
      selectedCategory,
      selectedCollection: selectedCollectionId
    });
  };
  
  // Handle the save button press
  const handleSave = async () => {
    try {
      // Reset error state
      dispatch({ type: ACTIONS.CLEAR_ERROR });
      
      // Validate the form
      if (!validateFormData()) {
        return;
      }
      
      // Show saving indicator
      dispatch({ type: ACTIONS.SET_SAVING, payload: true });
      
      // Animate the button press
      animateButtonPress();
      
      // Array to store uploaded photo URLs
      const photoUrls = [];
      
      // Upload images if there are any
      if (images.length > 0) {
        console.log(`=== UPLOADING ${images.length} IMAGES ===`);
        
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
        
        // Create a Set to track unique images and avoid duplicate processing
        const uniqueImages = new Set(validImages);
        
        // If we have the analyzed image, make sure it's included in unique images
        // The useEffect hook should have already synchronized it with the images array
        if (analyzedImageUri && typeof analyzedImageUri === 'string') {
          console.log('Adding analyzed image to unique images set:', analyzedImageUri);
          // Make sure the analyzed image URI is properly formatted
          const normalizedAnalyzedUri = normalizeImageUri(analyzedImageUri);
          console.log('Normalized analyzed image URI:', normalizedAnalyzedUri);
          uniqueImages.add(normalizedAnalyzedUri);
          
          // Log confirmation that we're processing the analyzed image
          console.log('Confirmed analyzed image will be processed during save');
        }
        
        console.log(`Processing ${uniqueImages.size} unique images`);
        
        // Process each unique image only once
        for (const imageUri of uniqueImages) {
          console.log('--- Processing unique image URI:', imageUri);
          
          try {
            // Try to upload the image with better error handling
            // The uploadImage function now uses our cached image processing
            const uploadedUrl = await uploadImage(imageUri, analyzedImageUri);
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
      
      // Save the item to the database
      await saveItem({
        itemName,
        notes,
        selectedCategory,
        selectedCondition,
        brand,
        value,
        selectedCollectionId,
        userId: currentUser.id,
        isShared
      }, photoUrls, collections);
      
      // Clear the image processing cache after successful save
      clearImageCache();
      
      // Navigate back to the previous screen
      navigation.goBack();
      
    } catch (error) {
      // Handle any errors that occur during the save process
      handleSaveError(error);
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: error.message || 'An unexpected error occurred' 
      });
    } finally {
      dispatch({ type: ACTIONS.SET_SAVING, payload: false });
    }
  };
  
  // Handle AI analysis completion - now we just pass the dispatch function
  const onAnalysisComplete = (analysisResult, imageUri) => {
    // Pass the dispatch function directly to handleAnalysisComplete
    handleAnalysisComplete(analysisResult, imageUri, dispatch, images, CATEGORIES);
  };
  
  // Animate the save button when pressed
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography.H2 style={styles.headerTitle}>Add New Item</Typography.H2>
          <View style={{ width: 40 }} />
        </View>
        
        {/* Main content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Error display */}
          {hasError && (
            <ErrorDisplay
              message={errorMessage}
              onDismiss={() => {
                dispatch({ type: ACTIONS.CLEAR_ERROR });
              }}
            />
          )}
          
          {/* Item details section */}
          <View style={styles.formSection}>
            <Typography.H3 style={styles.sectionTitle}>Item Details</Typography.H3>
            
            {/* Item name input */}
            <View style={styles.inputContainer}>
              <Typography.Body style={styles.inputLabel}>Item Name*</Typography.Body>
              <Input
                placeholder="Enter item name"
                value={itemName}
                onChangeText={(text) => dispatch({ type: ACTIONS.SET_ITEM_NAME, payload: text })}
                style={styles.input}
              />
            </View>
            
            {/* Category dropdown */}
            <View style={styles.dropdownContainer}>
              <Typography.Body style={styles.inputLabel}>Category*</Typography.Body>
              <DropDownPicker
                open={categoryOpen}
                value={selectedCategory}
                items={categoryItems}
                setOpen={(isOpen) => dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'categoryOpen', isOpen } })}
                setValue={(value) => dispatch({ type: ACTIONS.SET_CATEGORY, payload: value })}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownItemContainer}
                itemStyle={styles.dropdownItem}
                placeholder="Select a category"
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
            
            {/* Condition dropdown */}
            <View style={[styles.dropdownContainer, { zIndex: categoryOpen ? 1000 : 2000 }]}>
              <Typography.Body style={styles.inputLabel}>Condition</Typography.Body>
              <DropDownPicker
                open={conditionOpen}
                value={selectedCondition}
                items={conditionItems}
                setOpen={(isOpen) => dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'conditionOpen', isOpen } })}
                setValue={(value) => dispatch({ type: ACTIONS.SET_CONDITION, payload: value })}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownItemContainer}
                itemStyle={styles.dropdownItem}
                placeholder="Select condition"
                zIndex={2000}
                zIndexInverse={2000}
              />
            </View>
            
            {/* Brand input */}
            <View style={styles.inputContainer}>
              <Typography.Body style={styles.inputLabel}>Brand/Manufacturer</Typography.Body>
              <Input
                placeholder="Enter brand or manufacturer"
                value={brand}
                onChangeText={(text) => dispatch({ type: ACTIONS.SET_BRAND, payload: text })}
                style={styles.input}
              />
            </View>
            
            {/* Value input */}
            <View style={styles.inputContainer}>
              <Typography.Body style={styles.inputLabel}>Estimated Value</Typography.Body>
              <View style={styles.valueContainer}>
                <Typography.H3 style={styles.currencySymbol}>$</Typography.H3>
                <Input
                  placeholder="0.00"
                  value={value}
                  onChangeText={(text) => dispatch({ type: ACTIONS.SET_VALUE, payload: text })}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.valueInput]}
                />
              </View>
            </View>
            
            {/* Notes input */}
            <View style={styles.inputContainer}>
              <Typography.Body style={styles.inputLabel}>Notes</Typography.Body>
              <Input
                placeholder="Add any notes about this item"
                value={notes}
                onChangeText={(text) => dispatch({ type: ACTIONS.SET_NOTES, payload: text })}
                multiline
                numberOfLines={4}
                style={styles.notesInput}
              />
            </View>
          </View>
          
          {/* Collection section */}
          <View style={styles.formSection}>
            <Typography.H3 style={styles.sectionTitle}>Collection</Typography.H3>
            
            {/* Collection dropdown */}
            <View style={[styles.dropdownContainer, { zIndex: categoryOpen || conditionOpen ? 900 : 1000 }]}>
              <Typography.Body style={styles.inputLabel}>Collection*</Typography.Body>
              <DropDownPicker
                open={collectionOpen}
                value={selectedCollectionId}
                items={collectionItems}
                setOpen={(isOpen) => dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'collectionOpen', isOpen } })}
                setValue={(value) => dispatch({ type: ACTIONS.SET_COLLECTION, payload: value })}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownItemContainer}
                itemStyle={styles.dropdownItem}
                placeholder="Select a collection"
                zIndex={1000}
                zIndexInverse={3000}
                loading={loading}
                ListEmptyComponent={() => (
                  <View style={{ padding: 10, alignItems: 'center' }}>
                    <Typography.Body>No collections found</Typography.Body>
                    <Typography.Body>Create a collection first</Typography.Body>
                  </View>
                )}
              />
            </View>
            
            {/* Shared switch */}
            <View style={styles.switchContainer}>
              <View>
                <Typography.Body style={styles.switchLabel}>Share with Community</Typography.Body>
                <Typography.Caption style={styles.switchDescription}>
                  Make this item visible to other collectors
                </Typography.Caption>
              </View>
              <Switch
                value={isShared}
                onValueChange={(value) => dispatch({ type: ACTIONS.SET_IS_SHARED, payload: value })}
                trackColor={{ false: '#767577', true: theme.colors.primary + '80' }}
                thumbColor={isShared ? theme.colors.primary : '#f4f3f4'}
              />
            </View>
          </View>
          
          {/* Images section */}
          <View style={styles.formSection}>
            <Typography.H3 style={styles.sectionTitle}>Images</Typography.H3>
            
            {/* Images display */}
            <View style={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      dispatch({ type: ACTIONS.REMOVE_IMAGE, payload: index });
                    }}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* Add image button */}
              {images.length < MAX_PHOTOS && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={() => {
                    // Open the UnifiedImagePicker as a modal or navigate to it
                    navigation.navigate('ImagePicker', {
                      onImageSelected: (uri) => {
                        if (uri) {
                          dispatch({ type: ACTIONS.ADD_IMAGE, payload: uri });
                        }
                      },
                      onAnalysisComplete: onAnalysisComplete,
                      // Pass dispatch function to allow direct state updates
                      dispatch: dispatch
                    });
                  }}
                >
                  <Ionicons name="add" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* AI analysis result display */}
            {aiAnalysisResult && (
              <View style={styles.aiResultContainer}>
                <Typography.Body style={styles.aiResultTitle}>AI Analysis Result:</Typography.Body>
                <Typography.Caption style={styles.aiResultText}>
                  {aiAnalysisResult.description || 'No description available'}
                </Typography.Caption>
              </View>
            )}
          </View>
          
          {/* Save button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Button
              title="Save Item"
              onPress={handleSave}
              style={styles.saveButton}
              loading={saving}
              icon={<Ionicons name="save-outline" size={20} color="white" style={styles.buttonIcon} />}
            />
          </Animated.View>
        </ScrollView>
      </View>
      
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography.Body style={styles.loadingText}>Loading...</Typography.Body>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AddItemScreenWrapper;
