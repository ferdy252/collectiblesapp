import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';
import { normalizeImageUri, verifyImageExists, areImageUrisEqual } from '../../utils/uriUtils';
import { ACTIONS } from './itemReducer';

/**
 * Handles the completion of AI image analysis
 * @param {Object} analysisResult - The result from the AI analysis
 * @param {string} imageUri - The URI of the analyzed image
 * @param {Function} dispatch - The dispatch function from useReducer
 * @param {Array} images - Current array of image URIs
 * @param {Array} CATEGORIES - Valid categories for the app
 */
export const handleAnalysisComplete = async (analysisResult, imageUri, dispatch, images, CATEGORIES) => {
  
  console.log('Analysis complete with image URI:', imageUri);
  
  // Store the analysis result
  dispatch({ type: ACTIONS.SET_AI_ANALYSIS_RESULT, payload: analysisResult });
  
  // Ensure we have a valid URI before proceeding
  if (!imageUri) {
    console.error('Received empty imageUri from ImageAnalyzer');
    return;
  }
  
  // Normalize the URI format to ensure consistency using the unified utility
  const normalizedUri = normalizeImageUri(imageUri);
  
  // Verify the file exists using the unified utility
  const fileExists = await verifyImageExists(normalizedUri);
  if (!fileExists) {
    console.error('Analyzed image file not found:', normalizedUri);
    Toast.show({
      type: 'error',
      text1: 'Analysis Failed',
      text2: 'Could not save the analyzed image. Please try again.',
      visibilityTime: 3000,
    });
    return;
  }
  
  console.log('Normalized image URI:', normalizedUri);
  
  // Update the analyzedImageUri state with the normalized URI
  // The useEffect in AddItemScreen will handle adding it to the images array if needed
  console.log('Setting analyzedImageUri state with normalized URI');
  
  // Check if this is a new analyzed image or replacing an existing one
  dispatch({ type: ACTIONS.SET_ANALYZED_IMAGE_URI, payload: normalizedUri });
  console.log('Analyzed image URI updated via dispatch');
  
  // For immediate UI feedback, also check if we need to add to images array
  // This provides a smoother experience without waiting for the useEffect
  const imageExists = images.some(uri => areImageUrisEqual(uri, normalizedUri));
  
  if (!imageExists) {
    console.log('Adding analyzed image to images array from handleAnalysisComplete');
    // Add image via dispatch
    dispatch({ type: ACTIONS.ADD_IMAGE, payload: normalizedUri });
    console.log('Analyzed image added to images array via dispatch');
  } else {
    console.log('Analyzed image already exists in images array');
  }
  
  // Auto-fill form fields with AI analysis results
  if (analysisResult) {
    // Fill item name if provided and not empty
    if (analysisResult.name && analysisResult.name.trim() !== '') {
      dispatch({ type: ACTIONS.SET_ITEM_NAME, payload: analysisResult.name });
    }
    
    // Fill category if provided and valid
    if (analysisResult.category && 
        analysisResult.category.trim() !== '' && 
        CATEGORIES.includes(analysisResult.category)) {
      dispatch({ type: ACTIONS.SET_CATEGORY, payload: analysisResult.category });
    }
    
    // Fill brand if provided and not empty
    if (analysisResult.brand && analysisResult.brand.trim() !== '') {
      dispatch({ type: ACTIONS.SET_BRAND, payload: analysisResult.brand });
    }
    
    // Fill notes with the AI description if available
    if (analysisResult.description && analysisResult.description.trim() !== '') {
      dispatch({ type: ACTIONS.SET_NOTES, payload: analysisResult.description });
    }
  }
};
