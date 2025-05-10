import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

// Get the Gemini API key from environment variables
const getGeminiApiKey = () => {
  // Try to get from Expo Constants first (which can access .env through app.config.js)
  const expoApiKey = Constants.expoConfig?.extra?.GEMINI_API_KEY;
  
  // Fallback to process.env (for development)
  const processApiKey = process.env.GEMINI_API_KEY;
  
  const apiKey = expoApiKey || processApiKey;
  
  if (!apiKey) {
    console.error('No Gemini API key found. Please set GEMINI_API_KEY in your .env file');
    throw new Error('Missing Gemini API key');
  }
  
  return apiKey;
};

/**
 * Initialize the Google Generative AI client
 * @returns {GoogleGenerativeAI} - The initialized Gemini client
 */
const initializeGeminiClient = () => {
  const apiKey = getGeminiApiKey();
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Convert an image URI to a base64 string
 * @param {string} uri - The image URI
 * @returns {Promise<string>} - A promise that resolves to the base64 string
 */
const imageUriToBase64 = async (uri) => {
  try {
    // Log the URI being processed for debugging
    console.log('CONVERTING IMAGE TO BASE64. Original URI:', uri);
    
    // Make sure we have a valid URI
    if (!uri || typeof uri !== 'string') {
      console.error('Invalid image URI provided to imageUriToBase64');
      throw new Error('Invalid image URI provided');
    }

    // Try to fetch the image
    console.log('Fetching image for base64 conversion...');
    const response = await fetch(uri);
    
    if (!response.ok) {
      console.error(`Failed to fetch image for base64 conversion: HTTP ${response.status}`);
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }
    
    // Convert to blob
    const blob = await response.blob();
    console.log('Image blob size for conversion:', blob.size, 'bytes');
    
    if (blob.size === 0) {
      console.error('Image blob is empty (0 bytes)');
      throw new Error('Image data is empty');
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          // Check if result exists and has expected format
          if (!reader.result || typeof reader.result !== 'string') {
            console.error('FileReader result is invalid:', reader.result);
            reject(new Error('FileReader produced invalid result'));
            return;
          }
          
          // Remove the data URL prefix (e.g., 'data:image/jpeg;base64,')
          const parts = reader.result.split(',');
          if (parts.length < 2) {
            console.error('FileReader result has unexpected format:', reader.result.substring(0, 50) + '...');
            reject(new Error('FileReader result has unexpected format'));
            return;
          }
          
          const base64String = parts[1];
          console.log('Base64 conversion successful. String length:', base64String.length);
          resolve(base64String);
        } catch (error) {
          console.error('Error extracting base64 data:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      
      // Start reading the blob as a data URL
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Analyze an image using Google Gemini API to extract collectible information
 * @param {string} imageUri - The URI of the image to analyze
 * @returns {Promise<Object>} - A promise that resolves to the analysis results
 */
const analyzeCollectibleImage = async (imageUri) => {
  try {
    // Initialize the Gemini client
    const genAI = initializeGeminiClient();
    
    // Access the Gemini 1.5 Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Convert image to base64
    const base64Image = await imageUriToBase64(imageUri);
    
    // Prepare the prompt for collectible analysis
    const prompt = `You are a collectible item analyzer. Your task is to analyze the provided image of a collectible item.

Analyze this image and provide information in a valid JSON format with the following structure:
{
  "name": "Item name",
  "category": "Most appropriate category from this list: Action Figures, Cards, Comics, Coins, Stamps, Vinyl Records, Vintage Toys, Other",
  "brand": "Brand or manufacturer name if visible",
  "description": "Detailed description of the item"
}

Your response must be ONLY the JSON object with no additional text, markdown formatting, or code blocks. The JSON must be properly formatted and valid.`;
    
    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    };
    
    // Generate content with the image
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text to ensure it's valid JSON
    // Remove any markdown code block markers, extra spaces, or non-JSON text
    const cleanedText = text.replace(/```json\s*|```\s*|^\s*\{|\}\s*$/g, '').trim();
    const jsonText = cleanedText.startsWith('{') ? cleanedText : `{${cleanedText}`;
    const finalJsonText = jsonText.endsWith('}') ? jsonText : `${jsonText}}`;
    
    // Parse the JSON response
    try {
      return JSON.parse(finalJsonText);
    } catch (parseError) {
      console.error('Error parsing Gemini response as JSON:', parseError);
      // If parsing fails, return the raw text
      return { 
        rawResponse: text,
        name: "Unknown Item",
        category: "Other",
        brand: "Unknown",
        description: "Could not analyze the image properly. Please try again with a clearer image."
      };
    }
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    throw error;
  }
};

/**
 * Analyze the condition of a collectible item from its image
 * @param {string} imageUri - The URI of the image to analyze
 * @param {string} itemName - The name of the item (for context)
 * @param {string} category - The category of the item (for context)
 * @returns {Promise<Object>} - A promise that resolves to the condition analysis
 */
const analyzeItemCondition = async (imageUri, itemName, category) => {
  try {
    // Initialize the Gemini client
    const genAI = initializeGeminiClient();
    
    // Access the Gemini 1.5 Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Convert image to base64
    const base64Image = await imageUriToBase64(imageUri);
    
    // Prepare the prompt for condition analysis
    const prompt = `You are a collectible condition analyzer. Your task is to analyze the provided image of a collectible item.

The item is a ${itemName} in the ${category} category.

Analyze this image and provide information in a valid JSON format with the following structure:
{
  "conditionRating": "One of: Mint, Near Mint, Very Good, Good, Fair, Poor",
  "conditionDetails": "Detailed explanation of the condition assessment",
  "visibleDefects": "List any visible defects, damage, or wear",
  "preservationTips": "Brief suggestions for preserving this item"
}

Your response must be ONLY the JSON object with no additional text, markdown formatting, or code blocks. The JSON must be properly formatted and valid.`;
    
    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    };
    
    // Generate content with the image
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text to ensure it's valid JSON
    // Remove any markdown code block markers, extra spaces, or non-JSON text
    const cleanedText = text.replace(/```json\s*|```\s*|^\s*\{|\}\s*$/g, '').trim();
    const jsonText = cleanedText.startsWith('{') ? cleanedText : `{${cleanedText}`;
    const finalJsonText = jsonText.endsWith('}') ? jsonText : `${jsonText}}`;
    
    // Parse the JSON response
    try {
      return JSON.parse(finalJsonText);
    } catch (parseError) {
      console.error('Error parsing Gemini condition response as JSON:', parseError);
      // If parsing fails, return the raw text and a default object
      return { 
        rawResponse: text,
        conditionRating: "Unknown",
        conditionDetails: "Could not analyze the condition properly.",
        visibleDefects: "Unknown",
        preservationTips: "Handle with care and store in a protective case."
      };
    }
  } catch (error) {
    console.error('Error analyzing item condition with Gemini:', error);
    throw error;
  }
};

export {
  analyzeCollectibleImage,
  analyzeItemCondition,
  initializeGeminiClient,
};
