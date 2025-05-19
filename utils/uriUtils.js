import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Normalizes image URIs consistently across the app
 * @param {string} uri - The URI to normalize
 * @returns {string} - The normalized URI
 */
export const normalizeImageUri = (uri) => {
  if (!uri) return null;
  
  // Log the original URI for debugging
  console.log('Original URI:', uri);
  
  // First, normalize by removing any existing 'file://' prefix
  let normalizedUri = uri;
  if (normalizedUri.startsWith('file://')) {
    normalizedUri = normalizedUri.substring(7);
  }
  
  // Remove any query parameters or fragments
  const queryParamIndex = normalizedUri.indexOf('?');
  if (queryParamIndex !== -1) {
    normalizedUri = normalizedUri.substring(0, queryParamIndex);
  }
  
  const fragmentIndex = normalizedUri.indexOf('#');
  if (fragmentIndex !== -1) {
    normalizedUri = normalizedUri.substring(0, fragmentIndex);
  }
  
  // Handle different URI formats based on platform
  // For iOS: Always ensure the URI starts with 'file://'
  // For Android: Use the URI without 'file://' prefix
  if (Platform.OS === 'ios' && !normalizedUri.startsWith('file://')) {
    normalizedUri = `file://${normalizedUri}`;
  }
  
  console.log('Normalized URI:', normalizedUri);
  return normalizedUri;
};

/**
 * Verifies that an image file exists at the given URI
 * @param {string} uri - The URI to verify
 * @returns {Promise<boolean>} - Whether the file exists
 */
export const verifyImageExists = async (uri) => {
  try {
    const normalizedUri = normalizeImageUri(uri);
    const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
    return fileInfo.exists;
  } catch (error) {
    console.error('Error verifying image file:', error);
    return false;
  }
};

/**
 * Compares two image URIs to determine if they refer to the same image
 * @param {string} uri1 - The first URI to compare
 * @param {string} uri2 - The second URI to compare
 * @returns {boolean} - Whether the URIs refer to the same image
 */
export const areImageUrisEqual = (uri1, uri2) => {
  if (!uri1 || !uri2) return false;
  
  // Normalize both URIs for comparison
  const normalizedUri1 = normalizeImageUri(uri1);
  const normalizedUri2 = normalizeImageUri(uri2);
  
  // Compare the normalized URIs
  return normalizedUri1 === normalizedUri2;
};
