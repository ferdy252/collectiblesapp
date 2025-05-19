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
      .select('image_id, display_order, images(url)')
      .eq('item_id', itemId)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching photos for item:', error);
      return [];
    }
    
    // Return just the array of photo URLs
    return data.map(photo => photo.images?.url);
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
      .select('item_id, image_id, display_order, images(url)')
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
      photosByItem[photo.item_id].push(photo.images?.url);
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
  console.log('📞 fetchCollections called with userId:', userId);
  
  if (!userId) {
    console.error('❌ No userId provided to fetchCollections');
    return [];
  }
  
  try {
    console.log('🔍 Querying collections table for user_id:', userId);
    // Fetch collections for the current user
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Supabase error fetching collections:', error);
      throw error;
    }

    console.log(`✅ Collections fetched successfully. Found ${data?.length || 0} collections:`, JSON.stringify(data));
    return data || [];
  } catch (error) {
    console.error('❌ Error fetching collections:', error);
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
      collection_id: selectedCollectionId || null, // Handle null collection_id explicitly
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
      
      // First, create entries in the images table and get their IDs
      const imageInsertPromises = photoUrls.map(async (url) => {
        // Extract filename from URL
        const fileName = url.split('/').pop();
        
        // Insert into images table
        const { data: imageData, error: imageError } = await supabase
          .from('images')
          .insert([
            {
              url: url,
              storage_path: `item-photos/${fileName}`,
              file_name: fileName,
              file_type: fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
              created_by: userId
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
      
      // Prepare photo data for batch insert
      const photoData = imageResults.map((result, index) => ({
        item_id: savedItem.id,
        image_id: result.image_id,
        display_order: index
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
