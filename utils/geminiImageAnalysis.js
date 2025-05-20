import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { imageToBase64 } from './imageProcessingCache';

// Default values for fallback when AI services are unavailable
const DEFAULT_ANALYSIS_RESULT = {
  name: "Unknown Item",
  category: "Other",
  brand: "Unknown",
  description: "AI analysis unavailable. This is a placeholder description."
};

// Default values for condition analysis
const DEFAULT_CONDITION_RESULT = {
  conditionRating: "Unknown",
  conditionDetails: "AI condition analysis unavailable.",
  visibleDefects: "Unknown",
  preservationTips: "Handle with care and store in a protective case."
};

// Maximum number of retries for transient errors
const MAX_RETRIES = 3;
// Delay between retries (in milliseconds) - starts at 1s and increases
const BASE_RETRY_DELAY = 1000;

// Get the Gemini API key from environment variables
const getGeminiApiKey = () => {
  // Try to get from Expo Constants first (if configured via app.config.js extras)
  const expoConstantsApiKey = Constants.expoConfig?.extra?.GEMINI_API_KEY;
  
  // Fallback to process.env using the EXPO_PUBLIC_ prefix
  const processEnvApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 
  
  const apiKey = expoConstantsApiKey || processEnvApiKey;
  
  if (!apiKey) {
    console.error('Gemini API key not found. Ensure EXPO_PUBLIC_GEMINI_API_KEY is in .env or GEMINI_API_KEY is in app.config.js extras.');
    // In a real app, you might want to throw an error or return a specific status
    // For now, we'll log and throw to make it clear during development.
    throw new Error('Missing Gemini API key. Check environment variables.');
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
  
  // Function to perform the actual analysis with retry logic
  const performAnalysisWithRetry = async (retryCount = 0) => {
    try {
      // Create a promise that will reject after the timeout
      const timeoutPromise = new Promise((_, reject) => {
        analysisTimer = setTimeout(() => {
          reject(new Error('analysis timeout - The AI analysis took too long to complete. Please try again with a clearer image.'));
        }, ANALYSIS_TIMEOUT);
      });
      
      // Log the start of analysis with timestamp and retry count if applicable
      console.log(`Starting AI analysis at ${new Date().toISOString()} for image: ${imageUri.substring(0, 50)}... ${retryCount > 0 ? `(Retry attempt ${retryCount}/${MAX_RETRIES})` : ''}`);
      
      // Initialize the Gemini client
      const genAI = initializeGeminiClient();
      if (!genAI) {
        throw new Error('api_key_configuration - Could not initialize the AI service. Please check your configuration.');
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
      
      // Check if this is a retryable error and we haven't exceeded max retries
      const isRetryable = isRetryableError(error);
      
      if (isRetryable && retryCount < MAX_RETRIES) {
        // Calculate exponential backoff delay
        const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Retryable error encountered. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the analysis
        return performAnalysisWithRetry(retryCount + 1);
      }
      
      // If not retryable or max retries exceeded, rethrow the error
      throw error;
    }
  };
  
  try {
    // Start the analysis process with retry logic
    return await performAnalysisWithRetry();
  } catch (error) {
    // Log the error with details
    console.error('Error analyzing image with Gemini:', error);
    
    // Categorize the error for better user feedback with more granular categories
    let errorMessage = 'Could not analyze the image. Please try again.';
    let errorCode = 'unknown_error';
    let isCritical = false;
    
    if (error.message) {
      // Timeout errors
      if (error.message.includes('timeout')) {
        errorCode = 'timeout_error';
        errorMessage = 'The analysis took too long to complete. Please try again with a clearer image.';
      } 
      // Network errors - more granular categories
      else if (error.message.includes('network') || error.message.includes('connection')) {
        errorCode = 'network_error';
        if (error.message.includes('offline')) {
          errorMessage = 'You appear to be offline. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Network request timed out. Please check your connection speed and try again.';
        } else {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      } 
      // API and configuration errors
      else if (error.message.includes('api_key') || error.message.includes('configuration')) {
        errorCode = 'configuration_error';
        errorMessage = 'There is an issue with the AI service configuration. Please contact support.';
        isCritical = true;
      } 
      // Service availability errors
      else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorCode = 'service_limit_error';
        errorMessage = 'The AI analysis service is currently unavailable due to usage limits. Please try again later.';
      } 
      // Authentication errors
      else if (error.message.includes('auth') || error.message.includes('permission')) {
        errorCode = 'authentication_error';
        errorMessage = 'Authentication error with the AI service. Please contact support.';
        isCritical = true;
      }
      // Image processing errors - more granular categories
      else if (error.message.includes('image')) {
        errorCode = 'image_error';
        if (error.message.includes('format')) {
          errorMessage = 'Unsupported image format. Please try a different image format (JPG or PNG recommended).';
        } else if (error.message.includes('size')) {
          errorMessage = 'The image size is too large. Please use a smaller image (under 10MB).';
        } else if (error.message.includes('corrupt')) {
          errorMessage = 'The image appears to be corrupted. Please try a different image.';
        } else {
          errorMessage = 'There was a problem with the image. Please try a different image.';
        }
      }
      // AI model errors
      else if (error.message.includes('model') || error.message.includes('inference')) {
        errorCode = 'model_error';
        errorMessage = 'The AI model encountered an error processing your image. Please try again later.';
      }
      // Content policy errors
      else if (error.message.includes('content') || error.message.includes('policy')) {
        errorCode = 'content_policy_error';
        errorMessage = 'The image may contain content that cannot be analyzed. Please try a different image.';
      }
    }
    
    // Create a more descriptive error object
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.errorCode = errorCode;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.imageUri = imageUri ? `${imageUri.substring(0, 30)}...` : 'undefined';
    enhancedError.isCritical = isCritical;
    
    // Implement graceful degradation - continue with limited functionality
    console.log('Implementing graceful degradation with limited functionality');
    
    // Return a default analysis result with error information
    return {
      ...DEFAULT_ANALYSIS_RESULT,
      error: {
        message: errorMessage,
        code: errorCode,
        timestamp: enhancedError.timestamp
      },
      isAIGenerated: false,
      isLimitedFunctionality: true
    };
  }
};

/**
 * Analyze the condition of a collectible item from its image
 * @param {string} imageUri - The URI of the image to analyze
 * @param {string} itemName - The name of the item (for context)
 * @param {string} category - The category of the item (for context)
 * @returns {Promise<Object>} - A promise that resolves to the condition analysis
 */
// Helper function to determine if an error is retryable
const isRetryableError = (error) => {
  if (!error || !error.message) return false;
  
  // These types of errors are typically transient and can be retried
  return (
    error.message.includes('network') ||
    error.message.includes('connection') ||
    error.message.includes('timeout') ||
    error.message.includes('rate limit') ||
    error.message.includes('server') ||
    error.message.includes('503') ||
    error.message.includes('504') ||
    error.message.includes('429')
  );
};

const analyzeItemCondition = async (imageUris, itemName, category) => {
  // Handle both single image (string) and multiple images (array)
  const imageArray = Array.isArray(imageUris) ? imageUris : [imageUris];
  // Function to perform the condition analysis with retry logic
  const performConditionAnalysisWithRetry = async (retryCount = 0) => {
    try {
      // Initialize the Gemini client
      const genAI = initializeGeminiClient();
      
      // Access the Gemini 1.5 Pro model
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      // Convert all images to base64
      const base64Images = await Promise.all(imageArray.map(uri => imageToBase64(uri)));
      
      // Log how many images we're analyzing
      console.log(`Analyzing ${base64Images.length} images for condition assessment`);
    
    // Prepare the prompt for condition analysis
    const prompt = `You are a collectible condition analyzer. Your task is to analyze the provided images of a collectible item.

The item is a ${itemName} in the ${category} category.

I'm providing ${imageArray.length} different images of the same item to help you make a more accurate assessment.

Analyze these images and provide information in a valid JSON format with the following structure:
{
  "conditionRating": "One of: Mint, Near Mint, Very Good, Good, Fair, Poor",
  "conditionDetails": "Detailed explanation of the condition assessment",
  "visibleDefects": "List any visible defects, damage, or wear",
  "preservationTips": "Brief suggestions for preserving this item"
}

Your response must be ONLY the JSON object with no additional text, markdown formatting, or code blocks. The JSON must be properly formatted and valid.`;
    
    // Create image parts for all images
    const imageParts = base64Images.map(base64Image => ({
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    }));
    
    // Combine prompt with all image parts
    const contentParts = [prompt, ...imageParts];
    
    // Generate content with all images
    const result = await model.generateContent(contentParts);
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
      // Check if this is a retryable error and we haven't exceeded max retries
      const isRetryable = isRetryableError(error);
      
      if (isRetryable && retryCount < MAX_RETRIES) {
        // Calculate exponential backoff delay
        const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Retryable error encountered in condition analysis. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the analysis
        return performConditionAnalysisWithRetry(retryCount + 1);
      }
      
      // If not retryable or max retries exceeded, throw a categorized error
      throw error;
    }
  };
  
  try {
    // Start the condition analysis with retry logic
    return await performConditionAnalysisWithRetry();
  } catch (error) {
    console.error('Error analyzing item condition with Gemini:', error);
    
    // Categorize the error
    let errorMessage = 'Could not analyze the item condition. Please try again.';
    let errorCode = 'unknown_error';
    
    if (error.message) {
      if (error.message.includes('timeout')) {
        errorCode = 'timeout_error';
        errorMessage = 'The condition analysis took too long to complete. Please try again with a clearer image.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorCode = 'network_error';
        errorMessage = 'Network error during condition analysis. Please check your internet connection.';
      } else if (error.message.includes('api_key') || error.message.includes('configuration')) {
        errorCode = 'configuration_error';
        errorMessage = 'There is an issue with the AI service configuration for condition analysis.';
      } else if (error.message.includes('image')) {
        errorCode = 'image_error';
        errorMessage = 'There was a problem with the image for condition analysis. Please try a different image.';
      }
    }
    
    // Implement graceful degradation - continue with limited functionality
    console.log('Implementing graceful degradation for condition analysis with limited functionality');
    
    // Return default condition results with error information
    return {
      ...DEFAULT_CONDITION_RESULT,
      itemName: itemName || 'Unknown Item',
      category: category || 'Unknown Category',
      error: {
        message: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString()
      },
      isAIGenerated: false,
      isLimitedFunctionality: true
    };
  }
};

export {
  analyzeCollectibleImage,
  analyzeItemCondition,
  initializeGeminiClient,
};
