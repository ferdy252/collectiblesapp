import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Animated,
  Easing,
  Platform,
  Switch, // Added Switch here
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../context/ThemeContext';
import { Typography, Button, Input } from '../../theme/styled';
import { useAuth } from '../../context/AuthContext';
import { handleError } from '../../utils/errorHandler';
import ErrorDisplay from '../../components/ErrorDisplay';
import UnifiedImagePicker from '../../components/UnifiedImagePicker';

import { identifyItemWithGemini } from '../../utils/aiHelper';
import { AddItemProvider, useAddItem } from './AddItemContext';
import { ACTIONS } from './itemReducer';
import { uploadImage } from './imageUtils';
import { validateForm, handleSaveError } from './formUtils';
import { fetchCollections, saveItem } from './apiUtils';
import { handleAnalysisComplete } from './aiUtils';
import { normalizeImageUri } from '../../utils/uriUtils';
import { CATEGORIES, CONDITIONS, MAX_PHOTOS } from './constants';
import { styles } from './styles'; // Assuming styles.js has been updated with options screen styles
import BarcodeScannerScreen from './BarcodeScannerScreen'; // Added import

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
  const { state, dispatch } = useAddItem();
  const { theme, isDarkMode } = useTheme();
  const { currentUser } = useAuth();

  const [showOptionsScreen, setShowOptionsScreen] = useState(true);

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
    categoryOpen,
    conditionOpen,
    collectionOpen,
    collections,
    collectionItems,
    loading,
    saving,
    hasError,
    errorMessage,
  } = state;

  const categoryPickerItems = CATEGORIES.map(category => ({ label: category, value: category }));
  const conditionPickerItems = CONDITIONS.map(condition => ({ label: condition, value: condition }));
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentUser?.id) {
      loadCollections();
    }
  }, [currentUser]);

  // Handle barcode data when received from scanner
  useEffect(() => {
    if (route.params?.barcodeData) {
      // If we're on the options screen, switch to the form
      setShowOptionsScreen(false);
      
      // If we have product info from lookup, pre-fill the form
      if (route.params.productInfo) {
        const { name, brand, category } = route.params.productInfo;
        dispatch({ type: ACTIONS.SET_ITEM_NAME, payload: name || '' });
        dispatch({ type: ACTIONS.SET_BRAND, payload: brand || '' });
        if (category && CATEGORIES.includes(category)) {
          dispatch({ type: ACTIONS.SET_CATEGORY, payload: category });
        }
      }
      
      // Store the barcode in notes
      const existingNotes = state.notes || '';
      const barcodeNote = `Barcode: ${route.params.barcodeData}`;
      dispatch({ 
        type: ACTIONS.SET_NOTES, 
        payload: existingNotes ? `${existingNotes}\n${barcodeNote}` : barcodeNote 
      });
    }
  }, [route.params?.barcodeData]);

  const loadCollections = async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const collectionsData = await fetchCollections(currentUser.id);
      dispatch({ type: ACTIONS.SET_COLLECTIONS, payload: collectionsData });
      const items = collectionsData.map(c => ({ label: c.name, value: c.id }));
      dispatch({ type: ACTIONS.SET_COLLECTION_ITEMS, payload: items });
    } catch (error) {
      handleError(error, 'Error loading collections');
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]).start();
  };

  const handleAIAnalysisOption = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Photo library access is required!' });
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const pickedImageUri = normalizeImageUri(pickerResult.assets[0].uri);
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      Toast.show({ type: 'info', text1: 'AI Analysis Started', text2: 'Identifying item details...', visibilityTime: 3000 });

      const aiResult = await identifyItemWithGemini(pickedImageUri);

      if (aiResult) {
        dispatch({ type: ACTIONS.ADD_IMAGE, payload: pickedImageUri }); // Add image to state
        handleAnalysisComplete(aiResult, pickedImageUri, dispatch, [pickedImageUri], CATEGORIES);
        Toast.show({ type: 'success', text1: 'AI Analysis Complete', text2: 'Details pre-filled.' });
        setShowOptionsScreen(false);
      } else {
        Toast.show({ type: 'error', text1: 'AI Analysis Failed', text2: 'Could not identify details.' });
      }
    } catch (error) {
      const userFriendlyMessage = handleError(error, 'AddItemScreen.handleAIAnalysisOption - AI Identification');
      dispatch({ type: ACTIONS.SET_ERROR, payload: userFriendlyMessage });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  };

  const handleSave = async () => {
    animateButtonPress();
    if (!validateForm(state, dispatch)) return;

    dispatch({ type: ACTIONS.SET_SAVING, payload: true });
    try {
      let uploadedImageUrls = [];
      if (images.length > 0) {
        const uploadPromises = images.map(uri => uploadImage(uri, currentUser.id));
        uploadedImageUrls = await Promise.all(uploadPromises);
      }

      const itemData = {
        user_id: currentUser.id,
        name: itemName,
        category: selectedCategory,
        condition: selectedCondition,
        brand: brand,
        estimated_value: parseFloat(value) || 0,
        notes: notes,
        images: uploadedImageUrls,
        collection_id: selectedCollectionId,
        is_shared: isShared,
      };

      await saveItem(itemData);
      Toast.show({ type: 'success', text1: 'Item Saved!', text2: `${itemName} has been added to your collection.` });
      dispatch({ type: ACTIONS.RESET_FORM });
      navigation.navigate('MyItems');
    } catch (error) {
      handleSaveError(error, dispatch);
    } finally {
      dispatch({ type: ACTIONS.SET_SAVING, payload: false });
    }
  };
  
  const renderOptionsScreen = () => (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography.H2 style={[styles.headerTitle, { color: theme.colors.text }]}>Add New Item</Typography.H2>
          <View style={{ width: 40 }} /> {/* Spacer */}
        </View>

        <View style={styles.optionsContainer}>
          <Typography.H3 style={[styles.optionsTitle, {color: theme.colors.text}]}>Choose how to add your item</Typography.H3>

          <TouchableOpacity style={[styles.optionButton, {backgroundColor: theme.colors.card}]} onPress={() => navigation.navigate('BarcodeScannerScreen')}>
            <Ionicons name="barcode-outline" size={36} color={theme.colors.primary} style={styles.optionIcon} />
            <View style={styles.optionTextContainer}>
              <Typography.H3 style={[styles.optionTitle, {color: theme.colors.text}]}>Scan Barcode</Typography.H3>
              <Typography.Body style={[styles.optionDescription, {color: theme.colors.textSecondary}]}>Quickly add items by scanning product barcodes</Typography.Body>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionButton, {backgroundColor: theme.colors.card}]} onPress={handleAIAnalysisOption}>
            <Ionicons name="sparkles-outline" size={36} color={theme.colors.primary} style={styles.optionIcon} />
            <View style={styles.optionTextContainer}>
              <Typography.H3 style={[styles.optionTitle, {color: theme.colors.text}]}>Analyze with AI</Typography.H3>
              <Typography.Body style={[styles.optionDescription, {color: theme.colors.textSecondary}]}>Take or select a photo and let AI identify your item</Typography.Body>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionButton, {backgroundColor: theme.colors.card}]} onPress={() => { dispatch({ type: ACTIONS.RESET_FORM }); setShowOptionsScreen(false); }}>
            <Ionicons name="create-outline" size={36} color={theme.colors.primary} style={styles.optionIcon} />
            <View style={styles.optionTextContainer}>
              <Typography.H3 style={[styles.optionTitle, {color: theme.colors.text}]}>Manual Entry</Typography.H3>
              <Typography.Body style={[styles.optionDescription, {color: theme.colors.textSecondary}]}>Enter all item details yourself</Typography.Body>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography.Label style={[styles.loadingText, {color: theme.colors.text}]}>Loading...</Typography.Label>
        </View>
      )}
    </SafeAreaView>
  );

  const renderFormScreen = () => (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowOptionsScreen(true)} accessibilityLabel="Back to options" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography.H2 style={[styles.headerTitle, { color: theme.colors.text }]}>Add New Item Details</Typography.H2>
          <View style={{ width: 40 }} /> {/* Spacer */}
        </View>

        {hasError && <ErrorDisplay message={errorMessage} onDismiss={() => dispatch({ type: ACTIONS.CLEAR_ERROR })} />}

        <FlatList
          data={[{ key: 'form' }]} // Dummy data for FlatList structure
          renderItem={() => (
            <View style={styles.scrollContent}>
              <Typography.H3 style={[styles.sectionTitle, {color: theme.colors.text}]}>{`Photos (Max ${MAX_PHOTOS})`}</Typography.H3>
              <UnifiedImagePicker
                images={images}
                onImagesChange={(newImages) => dispatch({ type: ACTIONS.SET_IMAGES, payload: newImages })}
                maxPhotos={MAX_PHOTOS}
              />

              <View style={styles.formSection}>
                <Typography.H3 style={[styles.sectionTitle, {color: theme.colors.text}]}>Item Details</Typography.H3>
                
                <View style={styles.inputContainer}>
                  <Typography.Label style={[styles.inputLabel, {color: theme.colors.text}]}>Item Name*</Typography.Label>
                  <Input.Primary placeholder="Enter item name" value={itemName} onChangeText={text => dispatch({ type: ACTIONS.SET_ITEM_NAME, payload: text })} style={styles.input} />
                </View>

                <View style={[styles.dropdownContainer, { zIndex: 3000 }]}>
                  <Typography.Label style={[styles.inputLabel, {color: theme.colors.text}]}>Category*</Typography.Label>
                  <DropDownPicker open={categoryOpen} value={selectedCategory} items={categoryPickerItems} setOpen={open => dispatch({ type: ACTIONS.SET_CATEGORY_OPEN, payload: open })} setValue={val => dispatch({ type: ACTIONS.SET_SELECTED_CATEGORY, payload: val() })} listMode="SCROLLVIEW" style={styles.dropdown} containerStyle={styles.dropdownContainerStyle} dropDownContainerStyle={styles.dropdownListStyle} placeholder="Select a category" />
                </View>

                <View style={[styles.dropdownContainer, { zIndex: 2000 }]}>
                  <Typography.Label style={[styles.inputLabel, {color: theme.colors.text}]}>Condition</Typography.Label>
                  <DropDownPicker open={conditionOpen} value={selectedCondition} items={conditionPickerItems} setOpen={open => dispatch({ type: ACTIONS.SET_CONDITION_OPEN, payload: open })} setValue={val => dispatch({ type: ACTIONS.SET_SELECTED_CONDITION, payload: val() })} listMode="SCROLLVIEW" style={styles.dropdown} containerStyle={styles.dropdownContainerStyle} dropDownContainerStyle={styles.dropdownListStyle} placeholder="Select condition" />
                </View>

                <View style={styles.inputContainer}>
                  <Typography.Label style={[styles.inputLabel, {color: theme.colors.text}]}>Brand/Manufacturer</Typography.Label>
                  <Input.Primary placeholder="Enter brand or manufacturer" value={brand} onChangeText={text => dispatch({ type: ACTIONS.SET_BRAND, payload: text })} style={styles.input} />
                </View>

                <View style={styles.inputContainer}>
                  <Typography.Label style={[styles.inputLabel, {color: theme.colors.text}]}>Estimated Value</Typography.Label>
                  <Input.Primary placeholder="0.00" value={value} onChangeText={text => dispatch({ type: ACTIONS.SET_VALUE, payload: text })} keyboardType="numeric" style={styles.input} />
                </View>

                <View style={styles.inputContainer}>
                  <Typography.Label style={[styles.inputLabel, {color: theme.colors.text}]}>Notes</Typography.Label>
                  <Input.TextArea placeholder="Add any notes about this item" value={notes} onChangeText={text => dispatch({ type: ACTIONS.SET_NOTES, payload: text })} style={[styles.input, styles.textArea]} multiline />
                </View>

                <View style={[styles.dropdownContainer, { zIndex: 1000 }]}>
                  <Typography.Label style={[styles.inputLabel, {color: theme.colors.text}]}>Collection (Optional)</Typography.Label>
                  <DropDownPicker open={collectionOpen} value={selectedCollectionId} items={collectionItems} setOpen={open => dispatch({ type: ACTIONS.SET_COLLECTION_OPEN, payload: open })} setValue={val => dispatch({ type: ACTIONS.SET_SELECTED_COLLECTION_ID, payload: val() })} listMode="SCROLLVIEW" style={styles.dropdown} containerStyle={styles.dropdownContainerStyle} dropDownContainerStyle={styles.dropdownListStyle} placeholder="Select a collection" />
                </View>
                
                 <View style={styles.switchContainer}>
                  <Typography.Label style={[styles.switchLabel, {color: theme.colors.text}]}>Share with Community</Typography.Label>
                  <Switch trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }} thumbColor={isDarkMode ? theme.colors.surface : theme.colors.surface } ios_backgroundColor={theme.colors.disabled} onValueChange={() => dispatch({ type: ACTIONS.TOGGLE_IS_SHARED })} value={isShared} />
                </View>
              </View>

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Button.Primary title={saving ? 'Saving...' : 'Save Item'} onPress={handleSave} style={styles.saveButton} disabled={saving} />
              </Animated.View>
            </View>
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography.Label style={[styles.loadingText, {color: theme.colors.text}]}>Loading...</Typography.Label>
        </View>
      )}
    </SafeAreaView>
  );

  return showOptionsScreen ? renderOptionsScreen() : renderFormScreen();
};

export default AddItemScreenWrapper;
