// AI Helper functions for image analysis and barcode detection

import { analyzeCollectibleImage } from './geminiImageAnalysis';

/**
 * Identifies a collectible item from an image using the Gemini API.
 * This function is intended for items without a scannable barcode.
 * @param {string} imageUri - The URI of the image to analyze.
 * @returns {Promise<Object|null>} - A promise that resolves to the analysis results (name, category, brand, description)
 *                                  or null if analysis fails or returns no data.
 */
export const identifyItemWithGemini = async (imageUri) => {
  if (!imageUri) {
    console.warn('identifyItemWithGemini called with no imageUri');
    return null;
  }

  console.log(`[aiHelper] Starting Gemini analysis for image: ${imageUri.substring(0, 60)}...`);
  try {
    const analysisResult = await analyzeCollectibleImage(imageUri);
    
    if (analysisResult && Object.keys(analysisResult).length > 0) {
      console.log('[aiHelper] Gemini analysis successful:', analysisResult);
      return analysisResult;
    } else {
      console.warn('[aiHelper] Gemini analysis did not return sufficient data.');
      return null;
    }
  } catch (error) {
    console.error('[aiHelper] Error during Gemini image identification:', error.message || error);
    // Optionally, re-throw or return a more user-friendly error structure
    // For now, returning null to indicate failure to the caller
    // throw new Error(`AI identification failed: ${error.message}`);
    return null;
  }
};

/**
 * Extracts text from an image using OCR
 * @param {string} imageUri - The URI of the image to analyze
 * @returns {Promise<string>} - The extracted text
 */
export const extractTextFromImage = async (imageUri) => {
  try {
    // Similar implementation to analyzeImageWithAI but for text extraction
    // This is a placeholder for future implementation
    
    // For development/testing, return mock data
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'Sample extracted text from image';
    }
    
    // Actual implementation would call the Google AI Vision API for OCR
    return '';
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
};
