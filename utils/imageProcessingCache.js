import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { normalizeImageUri } from './uriUtils';

// Cache to store processed images in memory
const processedImageCache = new Map();

// Create a cache directory for persistent storage
const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}processed-images/`;

// Ensure the cache directory exists
const ensureCacheDirectory = async () => {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
  if (!dirInfo.exists) {
    console.log('Creating image cache directory');
    await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
  }
};

// Initialize the cache directory
ensureCacheDirectory().catch(error => {
  console.error('Failed to create cache directory:', error);
});

/**
 * Process an image once and cache the result
 * @param {string} uri - The URI of the image to process
 * @param {Object} options - Processing options
 * @param {Object} options.resize - Resize options { width, height }
 * @param {number} options.quality - Compression quality (0-1)
 * @param {string} options.format - Output format (JPEG, PNG)
 * @param {string} options.cacheKey - Optional custom cache key
 * @returns {Promise<Object>} - The processed image info { uri, width, height }
 */
export const processImage = async (uri, options = {}) => {
  try {
    // Default options
    const {
      resize = { width: 1200, height: 1200 },
      quality = 0.8,
      format = ImageManipulator.SaveFormat.JPEG,
      cacheKey = null
    } = options;
    
    // Normalize the URI
    const normalizedUri = normalizeImageUri(uri);
    
    // Generate a cache key based on the URI and options
    const key = cacheKey || `${normalizedUri}_${resize.width}x${resize.height}_${quality}`;
    
    // Create a hash of the key for the filename
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key
    );
    
    // Define the cache file path
    const cacheFilePath = `${CACHE_DIRECTORY}${keyHash}.jpg`;
    
    // Check if this image is already in memory cache
    if (processedImageCache.has(key)) {
      console.log('Using memory-cached processed image for:', normalizedUri);
      return processedImageCache.get(key);
    }
    
    // Check if the image is cached on disk
    const cacheFileInfo = await FileSystem.getInfoAsync(cacheFilePath);
    if (cacheFileInfo.exists) {
      console.log('Using disk-cached processed image for:', normalizedUri);
      const cachedImage = {
        uri: cacheFilePath,
        width: resize.width,
        height: resize.height
      };
      
      // Also cache in memory for faster access next time
      processedImageCache.set(key, cachedImage);
      
      return cachedImage;
    }
    
    console.log('Processing image:', normalizedUri);
    
    // Ensure the cache directory exists
    await ensureCacheDirectory();
    
    // Process the image
    const processedImage = await ImageManipulator.manipulateAsync(
      normalizedUri,
      [{ resize }],
      { compress: quality, format }
    );
    
    // Save to disk cache
    await FileSystem.copyAsync({
      from: processedImage.uri,
      to: cacheFilePath
    });
    
    // Update the URI to point to our cached file
    const cachedImage = {
      ...processedImage,
      uri: cacheFilePath
    };
    
    // Cache the processed image in memory
    processedImageCache.set(key, cachedImage);
    
    return cachedImage;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

/**
 * Convert an image to base64 with caching
 * @param {string} uri - The URI of the image to convert
 * @returns {Promise<string>} - The base64 string
 */
export const imageToBase64 = async (uri) => {
  try {
    const normalizedUri = normalizeImageUri(uri);
    const cacheKey = `base64_${normalizedUri}`;
    
    // Create a hash of the key for the filename
    const keyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      cacheKey
    );
    
    // Define the cache file path
    const cacheFilePath = `${CACHE_DIRECTORY}${keyHash}.txt`;
    
    // Check if we already have this base64 conversion cached in memory
    if (processedImageCache.has(cacheKey)) {
      console.log('Using memory-cached base64 image for:', normalizedUri);
      return processedImageCache.get(cacheKey);
    }
    
    // Check if the base64 is cached on disk
    const cacheFileInfo = await FileSystem.getInfoAsync(cacheFilePath);
    if (cacheFileInfo.exists) {
      console.log('Using disk-cached base64 image for:', normalizedUri);
      const base64 = await FileSystem.readAsStringAsync(cacheFilePath);
      
      // Also cache in memory for faster access next time
      processedImageCache.set(cacheKey, base64);
      
      return base64;
    }
    
    console.log('Converting image to base64:', normalizedUri);
    
    // First process the image to optimize it for base64 conversion
    // Use a smaller size for AI analysis to reduce processing time
    const processedImage = await processImage(normalizedUri, {
      resize: { width: 800, height: 800 },
      quality: 0.7,
      cacheKey: `processed_for_base64_${normalizedUri}`
    });
    
    // Fetch the processed image
    const response = await fetch(processedImage.uri);
    const blob = await response.blob();
    
    // Convert to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          if (!reader.result || typeof reader.result !== 'string') {
            reject(new Error('FileReader produced invalid result'));
            return;
          }
          
          // Remove the data URL prefix
          const parts = reader.result.split(',');
          if (parts.length < 2) {
            reject(new Error('FileReader result has unexpected format'));
            return;
          }
          
          resolve(parts[1]);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // Ensure the cache directory exists
    await ensureCacheDirectory();
    
    // Save to disk cache
    await FileSystem.writeAsStringAsync(cacheFilePath, base64);
    
    // Cache the base64 string in memory
    processedImageCache.set(cacheKey, base64);
    
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Clear the image processing cache
 * @param {boolean} clearDisk - Whether to also clear the disk cache
 */
export const clearImageCache = async (clearDisk = false) => {
  // Clear memory cache
  processedImageCache.clear();
  console.log('Memory image cache cleared');
  
  // Optionally clear disk cache
  if (clearDisk) {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true });
        await ensureCacheDirectory();
        console.log('Disk image cache cleared');
      }
    } catch (error) {
      console.error('Error clearing disk cache:', error);
    }
  }
};
