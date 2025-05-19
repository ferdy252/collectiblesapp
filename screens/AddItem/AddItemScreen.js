import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  StatusBar,
  Alert,
  SafeAreaView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
import ImageAnalyzer from '../../components/ImageAnalyzer';

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
      console.log('👤 Current user detected in AddItemScreen:', currentUser.id);
      loadCollections();
    } else {
      console.log('⚠️ No current user in AddItemScreen useEffect');
    }
  }, [currentUser]);
  
  // Force reload collections when the screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔍 AddItemScreen focused - checking for collections');
      if (currentUser?.id && (!collections || collections.length === 0)) {
        console.log('🔄 Reloading collections on screen focus');
        loadCollections();
      }
    });
    
    return unsubscribe;
  }, [navigation, currentUser]);
  
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
  
  useEffect(() => {
    console.log('[AddItemScreen] Theme Check: isDarkMode =', isDarkMode, '| backgroundColor =', theme.colors.background);
  }, [isDarkMode, theme.colors.background]);

  // Callback for when AI analysis is complete
  const handleAiAnalysisCompletion = (analysisResult, imageUri) => {
    // Use the existing utility function to handle the results
    handleAnalysisComplete(analysisResult, imageUri, dispatch, images, CATEGORIES);
  };

  // Load collections from the database
  const loadCollections = async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    console.log('🔍 Starting to load collections for user:', currentUser?.id);
    try {
      const collectionsData = await fetchCollections(currentUser.id);
      console.log('📚 Collections data received:', JSON.stringify(collectionsData));
      dispatch({ type: ACTIONS.SET_COLLECTIONS, payload: collectionsData });
      
      // Convert collections to the format needed by DropDownPicker
      const items = collectionsData.map(collection => ({
        label: collection.name,
        value: collection.id,
      }));
      console.log('🔄 Collection items set in dropdown:', JSON.stringify(items));
      dispatch({ type: ACTIONS.SET_COLLECTION_ITEMS, payload: items });
      
      // We no longer auto-select the only collection since it's optional
      console.log('ℹ️ Collections loaded but not auto-selected (optional field)');
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
        
        // Process all unique images in parallel
        console.log('Starting parallel image uploads');
        
        // Create an array of upload promises
        const uploadPromises = Array.from(uniqueImages).map(async (imageUri) => {
          console.log('--- Processing image URI:', imageUri);
          
          try {
            // Try to upload the image with better error handling
            // The uploadImage function now uses our cached image processing
            const uploadedUrl = await uploadImage(imageUri, analyzedImageUri);
            if (uploadedUrl) {
              console.log('Image uploaded successfully:', uploadedUrl);
              return uploadedUrl; // Return the URL for successful uploads
            } else {
              console.error('Failed to upload image (null URL returned):', imageUri);
              return null; // Return null for failed uploads
            }
          } catch (uploadError) {
            console.error('Error uploading image:', imageUri, uploadError);
            return null; // Return null for errors
          }
        });
        
        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);
        
        // Filter out null results (failed uploads)
        photoUrls.push(...results.filter(url => url !== null));
        
        // Show a toast if some uploads failed
        if (results.some(url => url === null)) {
          Toast.show({
            type: 'error',
            text1: 'Upload Warning',
            text2: 'One or more images failed to upload',
            position: 'bottom',
          });
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
      
      // Reset the form instead of navigating back
      dispatch({ type: ACTIONS.RESET_FORM });
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Item Added Successfully',
        text2: 'Form has been reset for your next item',
        position: 'bottom',
        visibilityTime: 2000,
      });
      
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
  
  // Handle AI analysis completion - create a callback that doesn't need dispatch
  const onAnalysisComplete = (analysisResult, imageUri) => {
    // When the callback is called, we'll handle the analysis here using our utility function
    if (analysisResult && imageUri) {
      // Store the analysis result
      dispatch({ type: ACTIONS.SET_AI_ANALYSIS_RESULT, payload: analysisResult });
      
      // Update the analyzedImageUri state with the normalized URI
      dispatch({ type: ACTIONS.SET_ANALYZED_IMAGE_URI, payload: imageUri });
      
      // Use the utility function to handle the rest of the processing
      handleAnalysisComplete(analysisResult, imageUri, dispatch, images, CATEGORIES);
    }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography.H2 style={[styles.headerTitle, { color: '#FFFFFF', fontWeight: '700' }]}>Add New Item</Typography.H2>
          <View style={{ width: 40 }} />
        </View>
        
        {/* Main content - Using FlatList instead of ScrollView to avoid VirtualizedList nesting error */}
        <FlatList
          data={[{key: 'content'}]} 
          renderItem={() => (
            <View style={styles.scrollContent}>
          {/* Error display */}
          {hasError && (
            <ErrorDisplay
              message={errorMessage}
              onDismiss={() => {
                dispatch({ type: ACTIONS.CLEAR_ERROR });
              }}
            />
          )}
          
          {/* Unified Image Picker with AI Analysis */}
          <Typography.Label style={{ marginBottom: 8, color: theme.colors.text }}>Photos (Max {MAX_PHOTOS})</Typography.Label>
          <UnifiedImagePicker
            images={images} // This is state.images
            onImagesChange={(newImages) => dispatch({ type: ACTIONS.SET_IMAGES, payload: newImages })}
            onAnalysisComplete={handleAiAnalysisCompletion}
            maxPhotos={MAX_PHOTOS}
          />

          {/* Item details section */}
          <View style={styles.formSection}>
            <Typography.H3 style={styles.sectionTitle}>Item Details</Typography.H3>
            
            {/* Item name input */}
            <View style={styles.inputContainer}>
              <Typography.Body style={styles.inputLabel}>Item Name*</Typography.Body>
              <Input.Primary
                placeholder="Enter item name"
                value={itemName}
                onChangeText={(text) => dispatch({ type: ACTIONS.SET_ITEM_NAME, payload: text })}
                style={styles.input}
              />
            </View>
            
            {/* Category dropdown */}
            <View style={[styles.dropdownContainer, { zIndex: 3000 }]}>
              <Typography.Body style={styles.inputLabel}>Category*</Typography.Body>
              <DropDownPicker
                open={categoryOpen}
                value={selectedCategory}
                items={categoryItems}
                setOpen={(isOpen) => {
                  // Close other dropdowns when opening this one
                  if (isOpen) {
                    dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'conditionOpen', isOpen: false } });
                    dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'collectionOpen', isOpen: false } });
                  }
                  dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'categoryOpen', isOpen } });
                }}
                setValue={(callback) => {
                  dispatch({ type: ACTIONS.SET_CATEGORY, payload: callback(selectedCategory) });
                }}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownItemContainer}
                itemStyle={styles.dropdownItem}
                placeholder="Select a category"
                placeholderStyle={{ color: '#AAAAAA' }}
                textStyle={{ color: theme.colors.text }}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
                maxHeight={300}
                arrowIconStyle={{ tintColor: theme.colors.text }}
                tickIconStyle={{ tintColor: theme.colors.primary }}
                listItemLabelStyle={{ color: theme.colors.text }}
                selectedItemLabelStyle={{ color: theme.colors.primary }}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
            
            {/* Condition dropdown */}
            <View style={[styles.dropdownContainer, { zIndex: 2000 }]}>
              <Typography.Body style={styles.inputLabel}>Condition</Typography.Body>
              <DropDownPicker
                open={conditionOpen}
                value={selectedCondition}
                items={conditionItems}
                setOpen={(isOpen) => {
                  // Close other dropdowns when opening this one
                  if (isOpen) {
                    dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'categoryOpen', isOpen: false } });
                    dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'collectionOpen', isOpen: false } });
                  }
                  dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'conditionOpen', isOpen } });
                }}
                setValue={(callback) => {
                  dispatch({ type: ACTIONS.SET_CONDITION, payload: callback(selectedCondition) });
                }}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownItemContainer}
                itemStyle={styles.dropdownItem}
                placeholder="Select condition"
                placeholderStyle={{ color: '#AAAAAA' }}
                textStyle={{ color: theme.colors.text }}
                arrowIconStyle={{ tintColor: theme.colors.text }}
                tickIconStyle={{ tintColor: theme.colors.primary }}
                listItemLabelStyle={{ color: theme.colors.text }}
                selectedItemLabelStyle={{ color: theme.colors.primary }}
                zIndex={2000}
                zIndexInverse={2000}
              />
            </View>
            
            {/* Brand input */}
            <View style={styles.inputContainer}>
              <Typography.Body style={styles.inputLabel}>Brand/Manufacturer</Typography.Body>
              <Input.Primary
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
                <Input.Primary
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
              <Input.TextArea
                placeholder="Add any notes about this item"
                value={notes}
                onChangeText={(text) => dispatch({ type: ACTIONS.SET_NOTES, payload: text })}
                numberOfLines={4}
                style={styles.notesInput}
              />
            </View>
          </View>
          
          {/* Collection section */}
          <View style={styles.formSection}>
            <Typography.H3 style={styles.sectionTitle}>Collection</Typography.H3>
            
            {/* Collection dropdown */}
            <View style={[styles.dropdownContainer, { zIndex: 1000 }]}>
              <Typography.Body style={styles.inputLabel}>Collection (Optional)</Typography.Body>
              
              {/* Debug info - remove this in production */}
              {__DEV__ && (
                <View style={{ marginBottom: 5 }}>
                  <Typography.Caption style={{ color: '#888' }}>
                    Collections: {collections?.length || 0} | Items: {collectionItems?.length || 0}
                  </Typography.Caption>
                </View>
              )}
              
              <DropDownPicker
                open={collectionOpen}
                value={selectedCollectionId}
                items={[
                  { label: 'None', value: null },
                  ...collectionItems
                ]}
                setOpen={(isOpen) => {
                  // Close other dropdowns when opening this one
                  if (isOpen) {
                    dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'categoryOpen', isOpen: false } });
                    dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'conditionOpen', isOpen: false } });
                    
                    // If we're opening the dropdown and there are no collections, try loading them again
                    if ((!collections || collections.length === 0) && currentUser?.id) {
                      console.log('🔄 Reloading collections on dropdown open');
                      loadCollections();
                    }
                  }
                  dispatch({ type: ACTIONS.SET_DROPDOWN_OPEN, payload: { dropdown: 'collectionOpen', isOpen } });
                }}
                setValue={(callback) => {
                  dispatch({ type: ACTIONS.SET_COLLECTION, payload: callback(selectedCollectionId) });
                }}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownItemContainer}
                itemStyle={styles.dropdownItem}
                placeholder="Select a collection"
                placeholderStyle={{ color: '#AAAAAA' }}
                textStyle={{ color: theme.colors.text }}
                arrowIconStyle={{ tintColor: theme.colors.text }}
                schema={{
                  label: 'label',
                  value: 'value'
                }}
                listMode="SCROLLVIEW"
                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
                closeAfterSelecting={true}
                tickIconStyle={{ tintColor: theme.colors.primary }}
                listItemLabelStyle={{ color: theme.colors.text }}
                selectedItemLabelStyle={{ color: theme.colors.primary }}
                zIndex={1000}
                zIndexInverse={3000}
                loading={loading}
                ListEmptyComponent={() => (
                  <View style={{ padding: 10, alignItems: 'center' }}>
                    <Typography.Body>No collections found</Typography.Body>
                    <TouchableOpacity
                      onPress={() => {
                        // Try reloading collections
                        if (currentUser?.id) {
                          console.log('🔄 Manual reload of collections');
                          loadCollections();
                        }
                      }}
                      style={{ marginTop: 5, padding: 5 }}
                    >
                      <Typography.Body style={{ color: theme.colors.primary }}>
                        Tap to refresh
                      </Typography.Body>
                    </TouchableOpacity>
                    <Typography.Body style={{ marginTop: 5 }}>
                      Or create a collection first
                    </Typography.Body>
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
                trackColor={{ false: theme.colors.divider, true: theme.colors.primary + '80' }}
                thumbColor={isShared ? theme.colors.primary : theme.colors.surface}
              />
            </View>
          </View>
          
          {/* Save button - Made more prominent */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Button.Primary
              title={saving ? "Saving..." : "SAVE ITEM"}
              onPress={handleSave}
              style={[styles.saveButton, { marginTop: 30, marginBottom: 80, height: 50 }]}
              disabled={saving}
              // The 'icon' prop below is passed but won't be rendered by the current Button.Primary component.
              // This can be addressed by modifying Button.Primary in styled.js later.
              icon={<Ionicons name="save-outline" size={20} color={theme.colors.textLight} style={styles.buttonIcon} />}
            />
          </Animated.View>
            </View>
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
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
