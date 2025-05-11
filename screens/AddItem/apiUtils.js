import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import { sanitizeString, sanitizeObject } from '../../utils/inputValidation';
import { logAddItem } from '../../lib/analytics';

/**
 * Fetches photos for a specific item from the item_photos table
 * @param {number} itemId - The ID of the item to fetch photos for
 * @returns {Promise<Array>} - A promise that resolves to an array of photo URLs
 */
export const fetchItemPhotos = async (itemId) => {
  try {
    const { data, error } = await supabase
      .from('item_photos')
      .select('photo_url, display_order')
      .eq('item_id', itemId)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching photos for item:', error);
      return [];
    }
    
    // Return just the array of photo URLs
    return data.map(photo => photo.photo_url);
  } catch (error) {
    console.error('Exception fetching photos:', error);
    return [];
  }
};

/**
 * Fetches photos for multiple items at once
 * @param {Array<number>} itemIds - Array of item IDs to fetch photos for
 * @returns {Promise<Object>} - A promise that resolves to an object mapping item IDs to arrays of photo URLs
 */
export const fetchPhotosForItems = async (itemIds) => {
  if (!itemIds || itemIds.length === 0) return {};
  
  try {
    const { data, error } = await supabase
      .from('item_photos')
      .select('item_id, photo_url, display_order')
      .in('item_id', itemIds)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching photos for items:', error);
      return {};
    }
    
    // Group photos by item_id
    const photosByItem = {};
    
    // Initialize with empty arrays for all itemIds
    itemIds.forEach(id => {
      photosByItem[id] = [];
    });
    
    // Fill in the photos
    data.forEach(photo => {
      if (!photosByItem[photo.item_id]) {
        photosByItem[photo.item_id] = [];
      }
      photosByItem[photo.item_id].push(photo.photo_url);
    });
    
    return photosByItem;
  } catch (error) {
    console.error('Exception fetching photos for items:', error);
    return {};
  }
};

/**
 * Fetches all collections for the current user
 * @param {string} userId - The ID of the current user
 * @returns {Promise<Array>} - A promise that resolves to an array of collections
 */
export const fetchCollections = async (userId) => {
  try {
    // Fetch collections for the current user
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching collections:', error);
    Toast.show({
      type: 'error',
      text1: 'Error Loading Collections',
      text2: 'Could not load your collections. Please try again.',
      position: 'bottom',
    });
    return [];
  }
};

/**
 * Saves a new item to the database
 * @param {Object} itemData - The item data to save
 * @param {Array} photoUrls - The URLs of the uploaded photos
 * @param {Array} collections - The user's collections (for analytics)
 * @returns {Promise<Object>} - A promise that resolves to the saved item data
 */
export const saveItem = async (itemData, photoUrls, collections) => {
  try {
    const {
      itemName,
      notes,
      selectedCategory,
      selectedCondition,
      brand,
      value,
      selectedCollectionId,
      userId,
      isShared
    } = itemData;
    
    // Sanitize all text inputs before saving to database
    const sanitizedData = {
      name: sanitizeString(itemName),
      notes: sanitizeString(notes),
      category: sanitizeString(selectedCategory),
      condition: sanitizeString(selectedCondition),
      brand: sanitizeString(brand),
      value: value ? parseFloat(value) : null,
      collection_id: selectedCollectionId,
      user_id: userId,
      // Remove photos from the items table
      is_shared: isShared,
    };
    
    console.log('Sanitized data ready for insert:', sanitizedData);
    
    // Save the item first
    const { data, error } = await supabase
      .from('items')
      .insert([sanitizedData])
      .select();

    if (error) {
      console.error('Supabase error details:', error);
      throw new Error(`Error saving item: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('Item was not saved properly');
    }
    
    const savedItem = data[0];
    console.log('Item saved successfully:', savedItem);
    
    // Now save the photos to the item_photos table
    if (photoUrls && photoUrls.length > 0) {
      console.log(`Saving ${photoUrls.length} photos to item_photos table`);
      
      // Prepare photo data for batch insert
      const photoData = photoUrls.map((url, index) => ({
        item_id: savedItem.id,
        photo_url: url,
        display_order: index
      }));
      
      const { data: photoInsertData, error: photoError } = await supabase
        .from('item_photos')
        .insert(photoData)
        .select();
      
      if (photoError) {
        console.error('Error saving photos:', photoError);
        // We don't throw here to avoid losing the item if photos fail
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
    
    // Log the add item event for analytics
    const collectionName = collections.find(c => c.id === selectedCollectionId)?.name || 'Uncategorized';
    logAddItem(itemName, selectedCategory, collectionName, photoUrls ? photoUrls.length : 0);
    
    // Show success message
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Item added to your collection!',
      position: 'bottom',
    });
    
    return savedItem;
  } catch (error) {
    console.error('Error saving item:', error);
    throw error;
  }
};
