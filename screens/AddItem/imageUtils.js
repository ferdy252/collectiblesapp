import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { normalizeImageUri, verifyImageExists } from '../../utils/uriUtils';
import { processImage } from '../../utils/imageProcessingCache';

/**
 * Uploads an image to Supabase Storage
 * @param {string} uri - The URI of the image to upload
 * @param {string} analyzedImageUri - The URI of the analyzed image (if any)
 * @returns {Promise<string>} - A promise that resolves to the uploaded image URL
 */
export const uploadImage = async (uri, analyzedImageUri) => {
  try {
    // Simple validation check
    if (!uri) {
      console.error('No image URI provided for upload');
      return null;
    }
    
    console.log('ATTEMPTING TO UPLOAD IMAGE:', uri);
    
    // Normalize the URI using the unified utility
    const normalizedUri = normalizeImageUri(uri);
    
    // Check if this is the analyzed image URI
    const isAnalyzedImage = normalizedUri === analyzedImageUri;
    if (isAnalyzedImage) {
      console.log('This is the analyzed image from the AI analyzer');
    }
    
    // Verify file exists using the unified utility
    const fileExists = await verifyImageExists(normalizedUri);
    if (!fileExists) {
      console.error('Image file does not exist at path:', normalizedUri);
      Toast.show({
        type: 'error',
        text1: 'Image Not Found',
        text2: 'The image could not be found. Please try again.',
        visibilityTime: 3000,
      });
      return null;
    }

    // Process the image before upload using our cached utility
    const processedImage = await processImage(normalizedUri, {
      resize: { width: 1200, height: 1200 },
      quality: 0.8
    });

    // Continue with image upload process after validation
    const timestamp = Date.now();
    const fileExtension = uri.split('.').pop();
    const fileName = `${timestamp}.${fileExtension}`;
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('item-photos')
      .upload(fileName, {
        uri: processedImage.uri,
        type: 'image/jpeg',
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: 'Could not upload image. Please try again.',
        visibilityTime: 3000,
      });
      return null;
    }
    
    // Get a signed URL that works with private buckets
    const { data: signedUrl } = await supabase.storage
      .from('item-photos')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry
    
    // If we couldn't get a signed URL, fall back to public URL (won't work unless bucket is public)
    if (!signedUrl || !signedUrl.signedUrl) {
      const { data: publicUrl } = supabase.storage
        .from('item-photos')
        .getPublicUrl(fileName);
      return publicUrl.publicUrl;
    }
    
    return signedUrl.signedUrl;
    
  } catch (error) {
    // This is the outer catch block that handles errors from the entire function
    console.error('Upload image error:', error);
    
    Toast.show({
      type: 'error',
      text1: 'Image Processing Failed',
      text2: 'There was a problem with your image. Please try a different one.',
      visibilityTime: 4000,
    });
    
    return null;
  }
};
