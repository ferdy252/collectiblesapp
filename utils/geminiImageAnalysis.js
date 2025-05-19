import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { imageToBase64 } from './imageProcessingCache';

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

// Note: We're now using the cached imageToBase64 function from imageProcessingCache.js

/**
 * Analyze an image using Google Gemini API to extract collectible information
 * @param {string} imageUri - The URI of the image to analyze
 * @returns {Promise<Object>} - A promise that resolves to the analysis results
 */
const analyzeCollectibleImage = async (imageUri) => {
  // Set a timeout for the analysis to prevent hanging
  const ANALYSIS_TIMEOUT = 30000; // 30 seconds
  let analysisTimer;
  
  try {
    // Create a promise that will reject after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      analysisTimer = setTimeout(() => {
        reject(new Error('analysis timeout - The AI analysis took too long to complete. Please try again with a clearer image.'));
      }, ANALYSIS_TIMEOUT);
    });
    
    // Log the start of analysis with timestamp
    console.log(`Starting AI analysis at ${new Date().toISOString()} for image: ${imageUri.substring(0, 50)}...`);
    
    // Initialize the Gemini client
    const genAI = initializeGeminiClient();
    if (!genAI) {
      throw new Error('API key configuration - Could not initialize the AI service. Please check your configuration.');
    }
    
    // Access the Gemini 1.5 Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Convert image to base64 using our cached utility
    let base64Image;
    try {
      base64Image = await imageToBase64(imageUri);
      console.log(`Successfully converted image to base64, length: ${base64Image.length} characters`);
      
      if (!base64Image || base64Image.length < 100) {
        throw new Error('invalid image data - The image could not be processed. Please try a different image.');
      }
    } catch (imageError) {
      console.error('Error processing image for analysis:', imageError);
      throw new Error(`image processing failed - ${imageError.message || 'Could not process the image for analysis'}`);
    }
    
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
    
    // Log the analysis request
    console.log('Sending analysis request to Gemini API...');
    
    // Create the analysis promise
    const analysisPromise = (async () => {
      // Generate content with the image
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      console.log('Received response from Gemini API');
      
      // Clean the response text to ensure it's valid JSON
      // Remove any markdown code block markers, extra spaces, or non-JSON text
      const cleanedText = text.replace(/```json\s*|```\s*|^\s*\{|\}\s*$/g, '').trim();
      const jsonText = cleanedText.startsWith('{') ? cleanedText : `{${cleanedText}`;
      const finalJsonText = jsonText.endsWith('}') ? jsonText : `${jsonText}}`;
      
      // Parse the JSON response
      try {
        const parsedResult = JSON.parse(finalJsonText);
        console.log('Successfully parsed JSON response from Gemini');
        return parsedResult;
      } catch (parseError) {
        console.error('Error parsing Gemini response as JSON:', parseError);
        console.log('Raw response:', text);
        // If parsing fails, return a user-friendly object
        return { 
          rawResponse: text,
          name: "Unknown Item",
          category: "Other",
          brand: "Unknown",
          description: "Could not analyze the image properly. Please try again with a clearer image."
        };
      }
    })();
    
    // Race the analysis promise against the timeout
    const result = await Promise.race([analysisPromise, timeoutPromise]);
    
    // Clear the timeout since we got a result
    clearTimeout(analysisTimer);
    
    // Log successful completion
    console.log(`AI analysis completed successfully at ${new Date().toISOString()}`);
    
    return result;
  } catch (error) {
    // Clear the timeout if there was an error
    if (analysisTimer) clearTimeout(analysisTimer);
    
    // Log the error with details
    console.error('Error analyzing image with Gemini:', error);
    
    // Categorize the error for better user feedback
    let errorMessage = 'Could not analyze the image. Please try again.';
    
    if (error.message) {
      if (error.message.includes('timeout')) {
        errorMessage = 'The analysis took too long to complete. Please try again with a clearer image.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('API key') || error.message.includes('configuration')) {
        errorMessage = 'There is an issue with the AI service configuration. Please contact support.';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = 'The AI analysis service is currently unavailable. Please try again later.';
      } else if (error.message.includes('image')) {
        errorMessage = 'There was a problem with the image. Please try a different image.';
      }
    }
    
    // Create a more descriptive error object
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.imageUri = imageUri ? `${imageUri.substring(0, 30)}...` : 'undefined';
    
    throw enhancedError;
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
