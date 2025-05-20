import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Switch,
  StatusBar
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { sanitizeString, validateLength, validateNumber, sanitizeObject } from '../utils/inputValidation';
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';
import ErrorDisplay from '../components/ErrorDisplay';

const CATEGORIES = ['Diecast', 'Sports Cards', 'Memorabilia', 'Custom', 'Other'];
const CONDITIONS = ['Mint', 'Used', 'Damaged'];
const MAX_PHOTOS = 5;
const { width } = Dimensions.get('window');
const imageSize = (width - 40 - 20) / 3; // Adjust spacing as needed

function EditItemScreen({ route, navigation }) {
  // Get theme context
  const { theme, isDarkMode } = useTheme();
  
  // Get item details from route params
  const { itemId } = route.params;
  
  // State variables
  const [itemName, setItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedCondition, setSelectedCondition] = useState(CONDITIONS[0]); // Default to Mint
  const [brand, setBrand] = useState('');
  const [images, setImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(true);
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState(''); // Initialize as empty string instead of null
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [value, setValue] = useState('0.00'); // Add state for value
  const [notes, setNotes] = useState(''); // Add state for notes
  const [errors, setErrors] = useState({}); // Add state for errors
  const { user } = useAuth();

  // Add error state variables
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dropdown state variables
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);

  // Convert categories and conditions to the format needed by DropDownPicker
  const categoryItems = CATEGORIES.map(category => ({ label: category, value: category }));
  const conditionItems = CONDITIONS.map(condition => ({ label: condition, value: condition }));

  // Fetch item data and collections when component mounts
  useEffect(() => {
    requestImagePermissions();
    fetchItemDetails();
    fetchCollections();
  }, []);

  // Function to fetch photos for the item from the item_photos table
  const fetchItemPhotos = async (itemId) => {
    try {
      console.log(`Fetching photos for item ID: ${itemId}`);
      
      const { data, error } = await supabase
        .from('item_photos')
        .select('image_id, display_order, images(url)')
        .eq('item_id', itemId)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('Error fetching item photos:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`Fetched ${data.length} photos for item`);
        
        // Extract just the photo URLs
        const photoUrls = data.map(photo => photo.images?.url).filter(url => url);
        console.log('Photo URLs:', photoUrls);
        
        // Set both the current images and original images
        setImages(photoUrls);
        setOriginalImages(photoUrls);
      } else {
        console.log('No photos found for this item');
        setImages([]);
        setOriginalImages([]);
      }
    } catch (error) {
      console.error('Error in fetchItemPhotos:', error);
    } finally {
      setLoadingItem(false);
    }
  };

  // Function to fetch the item details from Supabase
  const fetchItemDetails = async () => {
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
      setLoadingItem(true);
      console.log(`Fetching item details for ID: ${itemId}`);
      
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        console.log('Item details fetched:', data);
        // Populate form with item data
        setItemName(data.name || '');
        setSelectedCategory(data.category || CATEGORIES[0]);
        setBrand(data.brand || '');
        setSelectedCollectionId(data.collection_id ? String(data.collection_id) : ''); // Convert to string
        setIsShared(data.is_shared || false);
        setSelectedCondition(data.condition || CONDITIONS[0]); // Set condition from data
        setValue(data.value ? data.value.toString() : '0.00'); // Set value from data
        setNotes(data.notes || ''); // Set notes from data
        
        // Fetch photos from item_photos table
        fetchItemPhotos(itemId);
      } else {
        // Use our error handling utility
        handleError(
          new Error('Item not found'),
          'EditItemScreen.fetchItemDetails',
          ERROR_CATEGORIES.DATABASE,
          'This item could not be found.'
        );
        
        // Update error state for UI
        setHasError(true);
        setErrorMessage('This item could not be found.');
      }
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'EditItemScreen.fetchItemDetails',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load item details. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to load item details. Please try again.');
    } finally {
      setLoadingItem(false);
    }
  };

  // Function to fetch collections from Supabase
  const fetchCollections = async () => {
    try {
      // Reset error state
      setHasError(false);
      setErrorMessage('');
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
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'EditItemScreen.fetchCollections',
        ERROR_CATEGORIES.DATABASE,
        'Unable to load collections. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to load collections. Please try again.');
      
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

  const pickImage = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert('Maximum Photos Reached', `You can only upload up to ${MAX_PHOTOS} photos.`);
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              console.log('Opening camera for photo...');
              setLoading(true);
              let result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              console.log('Camera result:', result);
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setImages([...images, result.assets[0].uri]);
                console.log('Photo added from camera');
              }
            } catch (error) {
              console.error('Camera Error:', error);
              Alert.alert('Error', 'Could not open camera.');
            } finally {
              setLoading(false);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              console.log('Opening gallery for photos...');
              setLoading(true);
              let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: MAX_PHOTOS - images.length,
                quality: 0.8,
              });

              console.log('Gallery result:', result);
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const newImageUris = result.assets.map(asset => asset.uri);
                setImages([...images, ...newImageUris]);
                console.log(`${newImageUris.length} photos added from gallery`);
              }
            } catch (error) {
              console.error('Gallery Error:', error);
              Alert.alert('Error', 'Could not open gallery.');
            } finally {
              setLoading(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeImage = (uriToRemove) => {
    console.log('Removing image:', uriToRemove);
    setImages(images.filter(uri => uri !== uriToRemove));
    Alert.alert('Photo Removed', 'The selected photo has been removed.');
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate name using our validation utility
    const nameValidation = validateLength(itemName, 2, 100);
    if (!nameValidation.success) {
      newErrors.name = nameValidation.message;
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

  const handleSaveChanges = async () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fix the errors before saving.',
      });
      return;
    }

    // Reset error state
    setHasError(false);
    setErrorMessage('');
    setLoading(true);

    try {
      // Process any new images (those that don't start with http)
      let processedImages = [];
      for (const imageUri of images) {
        if (imageUri.startsWith('http')) {
          // This is already a stored image, keep as is
          processedImages.push(imageUri);
        } else {
          // This is a new image, upload it
          const uploadedUrl = await uploadImage(imageUri);
          if (uploadedUrl) {
            processedImages.push(uploadedUrl);
          }
        }
      }
      
      // Sanitize all text inputs before saving to database
      const sanitizedData = {
        name: sanitizeString(itemName),
        category: sanitizeString(selectedCategory),
        condition: sanitizeString(selectedCondition),
        brand: sanitizeString(brand),
        collection_id: selectedCollectionId,
        is_shared: isShared,
        value: value ? parseFloat(value) : 0,
        notes: sanitizeString(notes)
        // Removed 'photos' field - it doesn't exist in the items table
      };
      
      console.log('Sanitized data ready for update:', sanitizedData);

      // Update the item in the database
      const { data, error } = await supabase
        .from('items')
        .update(sanitizedData)
        .eq('id', itemId)
        .select();

      if (error) {
        throw error;
      } else {
        console.log('Item updated successfully:', data);
        
        // Now handle the photos separately
        if (processedImages.length > 0) {
          await updateItemPhotos(itemId, processedImages, originalImages);
        }
        
        Toast.show({
          type: 'success',
          text1: 'Item Updated!',
          text2: `${itemName} has been updated successfully.`,
        });
        
        // Navigate back to the detail screen
        navigation.goBack();
      }
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'EditItemScreen.handleSaveChanges',
        ERROR_CATEGORIES.DATABASE,
        'Unable to update item. Please try again.'
      );
      
      // Update error state for UI
      setHasError(true);
      setErrorMessage('Unable to update item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  // Function to update item photos in the database
  const updateItemPhotos = async (itemId, newPhotoUrls, originalPhotoUrls) => {
    try {
      console.log(`Updating photos for item ${itemId}`);
      console.log(`New photos: ${newPhotoUrls.length}, Original photos: ${originalPhotoUrls.length}`);
      
      // Identify which photos are new (need to be added) and which are removed (need to be deleted)
      const addedPhotos = newPhotoUrls.filter(url => !url.startsWith('http') || !originalPhotoUrls.includes(url));
      const keptPhotos = newPhotoUrls.filter(url => url.startsWith('http') && originalPhotoUrls.includes(url));
      const removedPhotos = originalPhotoUrls.filter(url => !newPhotoUrls.includes(url));
      
      console.log(`Photos to add: ${addedPhotos.length}, Photos to keep: ${keptPhotos.length}, Photos to remove: ${removedPhotos.length}`);
      
      // Step 1: Handle removed photos - delete from item_photos table
      if (removedPhotos.length > 0) {
        // First, get the image_ids for the removed photos
        for (const photoUrl of removedPhotos) {
          // Extract filename from URL to help identify the image
          const fileName = photoUrl.split('/').pop().split('?')[0];
          
          // Find the image record
          const { data: imageData, error: imageError } = await supabase
            .from('images')
            .select('id')
            .eq('file_name', fileName)
            .limit(1);
          
          if (imageError) {
            console.error('Error finding image to remove:', imageError);
            continue;
          }
          
          if (imageData && imageData.length > 0) {
            const imageId = imageData[0].id;
            
            // Delete the relationship in item_photos
            const { error: deleteError } = await supabase
              .from('item_photos')
              .delete()
              .eq('item_id', itemId)
              .eq('image_id', imageId);
            
            if (deleteError) {
              console.error('Error removing photo relationship:', deleteError);
            } else {
              console.log(`Successfully removed photo relationship for image ${imageId}`);
            }
          }
        }
      }
      
      // Step 2: Handle added photos - add to images table and item_photos table
      if (addedPhotos.length > 0) {
        // First, create entries in the images table and get their IDs
        const imageInsertPromises = addedPhotos.map(async (url) => {
          // If it's a local URI, it needs to be uploaded first
          if (!url.startsWith('http')) {
            const uploadedUrl = await uploadImage(url);
            if (!uploadedUrl) return { url, image_id: null };
            url = uploadedUrl;
          }
          
          // Extract filename from URL
          const fileName = url.split('/').pop().split('?')[0];
          
          // Insert into images table
          const { data: imageData, error: imageError } = await supabase
            .from('images')
            .insert([
              {
                url: url,
                storage_path: `item-photos/${fileName}`,
                file_name: fileName,
                file_type: fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
                created_by: user.id
              }
            ])
            .select();
          
          if (imageError) {
            console.error('Error saving image:', imageError);
            return { url, image_id: null };
          }
          
          return { url, image_id: imageData[0].id };
        });
        
        const imageResults = await Promise.all(imageInsertPromises);
        
        // Get the current highest display_order for this item
        const { data: currentPhotos, error: orderError } = await supabase
          .from('item_photos')
          .select('display_order')
          .eq('item_id', itemId)
          .order('display_order', { ascending: false })
          .limit(1);
        
        let startOrder = 0;
        if (!orderError && currentPhotos && currentPhotos.length > 0) {
          startOrder = currentPhotos[0].display_order + 1;
        }
        
        // Prepare photo data for batch insert
        const photoData = imageResults.map((result, index) => ({
          item_id: itemId,
          image_id: result.image_id,
          display_order: startOrder + index
        }));
        
        // Filter out any failed image inserts
        const validPhotoData = photoData.filter(data => data.image_id !== null);
        
        if (validPhotoData.length > 0) {
          const { data: photoInsertData, error: photoError } = await supabase
            .from('item_photos')
            .insert(validPhotoData)
            .select();
          
          if (photoError) {
            console.error('Error saving photos:', photoError);
            // We don't throw here to avoid losing the item update if photos fail
            Toast.show({
              type: 'error',
              text1: 'Warning',
              text2: 'Some photos may not have been saved properly',
              position: 'bottom',
            });
          } else {
            console.log('Photos saved successfully:', photoInsertData);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating photos:', error);
      Toast.show({
        type: 'error',
        text1: 'Warning',
        text2: 'Some photos may not have been updated properly',
        position: 'bottom',
      });
      return false;
    }
  };

  // Function to upload avatar to storage
  const uploadImage = async (uri) => {
    try {
      if (!uri) return null;
      
      setLoading(true);
      console.log('Uploading image to item-photos bucket...');
      
      // Resize and compress the image before uploading
      console.log('Optimizing image before upload...');
      
      // Define optimal image dimensions and compression
      const MAX_WIDTH = 1200;  // Max width in pixels
      const MAX_HEIGHT = 1200; // Max height in pixels
      const COMPRESSION = 0.8; // 80% quality (good balance between quality and file size)
      
      // Process the image with ImageManipulator
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: MAX_WIDTH, height: MAX_HEIGHT } }], // Resize while maintaining aspect ratio
        {
          compress: COMPRESSION,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );
      
      console.log('Image optimized successfully');
      
      // Use the optimized image URI for upload
      const optimizedUri = processedImage.uri;
      
      // Convert optimized image to blob
      const response = await fetch(optimizedUri);
      const blob = await response.blob();
      
      // Generate a unique filename - always use jpg extension since we converted to JPEG
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('item-photos')
        .upload(filePath, blob, {
          contentType: 'image/jpeg', // Always JPEG since we converted the image
          upsert: true,
        });
      
      if (error) throw error;
      
      // Get a signed URL (secure, requires authentication)
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from('item-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // Valid for 1 year
      
      if (signedUrlError || !urlData || !urlData.signedUrl) {
        console.error('Failed to get signed URL:', signedUrlError);
        throw new Error('Failed to get secure URL for image');
      }
      
      console.log('Image uploaded successfully:', urlData.signedUrl);
      return urlData.signedUrl;
    } catch (error) {
      // Use our error handling utility
      handleError(
        error,
        'EditItemScreen.uploadImage',
        ERROR_CATEGORIES.STORAGE,
        'Unable to upload image. Please try again.'
      );
      
      // We don't set global error state here since this is part of a larger operation
      // Instead, we just return null to indicate the upload failed
      return null;
    } finally {
      setLoading(false);
    }
  };

  if (loadingItem) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading item details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasError && !loadingItem) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Item</Text>
            <View style={styles.headerRight} />
          </View>
          <ErrorDisplay 
            message={errorMessage}
            onRetry={() => {
              fetchItemDetails();
              fetchCollections();
            }}
            style={styles.errorContainer}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header with back button */}
        <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Item</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Item Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Item Name *</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.inputBackground, 
              color: theme.colors.inputText,
              borderColor: theme.colors.inputBorder
            }]}
            placeholder="e.g., Hot Wheels Red Baron"
            value={itemName}
            onChangeText={setItemName}
            placeholderTextColor={theme.colors.inputPlaceholder}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Collection Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Collection</Text>
          {loadingCollections ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading collections...</Text>
            </View>
          ) : collections.length === 0 ? (
            <View style={styles.noCollectionsContainer}>
              <Text style={[styles.noCollectionsText, { color: theme.colors.textSecondary }]}>
                No collections found. Please create a collection first.
              </Text>
            </View>
          ) : (
            <DropDownPicker
              open={collectionOpen}
              value={selectedCollectionId}
              items={collections.map(collection => ({ label: `${collection.icon} ${collection.name}`, value: String(collection.id) }))}
              setOpen={setCollectionOpen}
              setValue={setSelectedCollectionId}
              style={[styles.dropdownStyle, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
              dropDownContainerStyle={[styles.dropdownContainerStyle, { backgroundColor: theme.colors.inputBackground }]}
              textStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
              listItemLabelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
              arrowIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
              tickIconStyle={{ tintColor: theme.colors.primary }}
              closeIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
              placeholder="Select a collection"
              listMode="SCROLLVIEW"
              scrollViewProps={{
                nestedScrollEnabled: true,
              }}
              zIndex={3000}
              zIndexInverse={1000}
            />
          )}
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
          <DropDownPicker
            open={categoryOpen}
            value={selectedCategory}
            items={categoryItems}
            setOpen={setCategoryOpen}
            setValue={setSelectedCategory}
            style={[styles.dropdownStyle, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
            dropDownContainerStyle={[styles.dropdownContainerStyle, { backgroundColor: theme.colors.inputBackground }]}
            textStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            listItemLabelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            arrowIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            tickIconStyle={{ tintColor: theme.colors.primary }}
            closeIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            placeholder="Select a category"
            listMode="SCROLLVIEW"
            scrollViewProps={{
              nestedScrollEnabled: true,
            }}
            zIndex={2000}
            zIndexInverse={2000}
          />
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        {/* Condition */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Condition</Text>
          <DropDownPicker
            open={conditionOpen}
            value={selectedCondition}
            items={conditionItems}
            setOpen={setConditionOpen}
            setValue={setSelectedCondition}
            style={[styles.dropdownStyle, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
            dropDownContainerStyle={[styles.dropdownContainerStyle, { backgroundColor: theme.colors.inputBackground }]}
            textStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            listItemLabelStyle={{ color: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            arrowIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            tickIconStyle={{ tintColor: theme.colors.primary }}
            closeIconStyle={{ tintColor: isDarkMode ? '#FFFFFF' : theme.colors.text }}
            placeholder="Select a condition"
            listMode="SCROLLVIEW"
            scrollViewProps={{
              nestedScrollEnabled: true,
            }}
            zIndex={1000}
            zIndexInverse={3000}
          />
          {errors.condition && <Text style={styles.errorText}>{errors.condition}</Text>}
        </View>

        {/* Brand */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Brand</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.inputBackground, 
              color: theme.colors.inputText,
              borderColor: theme.colors.inputBorder
            }]}
            placeholder="e.g., Hot Wheels"
            value={brand}
            onChangeText={setBrand}
            placeholderTextColor={theme.colors.inputPlaceholder}
          />
        </View>

        {/* Value */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Value ($)</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.inputBackground, 
              color: theme.colors.inputText,
              borderColor: theme.colors.inputBorder
            }]}
            placeholder="e.g., 19.99"
            value={value}
            onChangeText={(text) => {
              // Allow only numeric input with decimal point
              if (text === '' || /^\d*\.?\d*$/.test(text)) {
                setValue(text);
              }
            }}
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.inputPlaceholder}
          />
          {errors.value && <Text style={styles.errorText}>{errors.value}</Text>}
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { 
              backgroundColor: theme.colors.inputBackground, 
              color: theme.colors.inputText,
              borderColor: theme.colors.inputBorder
            }]}
            placeholder="Add any additional details about this item"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholderTextColor={theme.colors.inputPlaceholder}
          />
          {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
        </View>

        {/* Share to Social Feed Toggle */}
        <View style={styles.inputGroup}>
          <View style={styles.toggleContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Share to Social Feed</Text>
            <Switch
              trackColor={{ false: theme.colors.inputBorder, true: theme.colors.primary }}
              thumbColor={isShared ? theme.colors.accent : theme.colors.surface}
              onValueChange={setIsShared}
              value={isShared}
            />
          </View>
          {isShared && (
            <Text style={[styles.shareHint, { color: theme.colors.textSecondary }]}>
              This item will be visible to all users in the social feed
            </Text>
          )}
        </View>

        {/* Add Photos Button */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Photos ({images.length}/{MAX_PHOTOS})</Text>
          <TouchableOpacity
            style={[styles.photoButton, { backgroundColor: theme.colors.primary }]}
            onPress={pickImage}
            disabled={loading || images.length >= MAX_PHOTOS}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={[styles.photoButtonText, { color: 'white' }]}>Add Photos</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Image Thumbnail Grid */}
        {images.length > 0 && (
          <View style={styles.imageGridContainer}>
            {images.map((uri, index) => (
              <View key={index} style={styles.thumbnailContainer}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeImage(uri)}
                >
                  <Ionicons name="close-circle" size={24} color="rgba(0,0,0,0.7)" />
                </TouchableOpacity>
              </View>
            ))}
            {/* Removed placeholder boxes for empty slots */}
          </View>
        )}

        {/* Save Changes Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSaveChanges}
          disabled={loading || (collections.length > 0 && !selectedCollectionId)}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={[styles.saveButtonText, { color: 'white' }]}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.inputBorder }]}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  headerButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  dropdownStyle: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownContainerStyle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E4E4',
    borderWidth: 1,
    borderRadius: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareHint: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  photoContainer: {
    width: imageSize,
    height: imageSize,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCollectionsContainer: {
    padding: 15,
    alignItems: 'center',
  },
  noCollectionsText: {
    textAlign: 'center',
    fontSize: 14,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  imageGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  thumbnailContainer: {
    width: imageSize,
    height: imageSize,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderThumbnail: {
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
});

export default EditItemScreen;
