// utils/errorHandler.js
import Toast from 'react-native-toast-message';

// Error categories
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  AUTH: 'auth',
  DATABASE: 'database',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

// User-friendly messages by category
const USER_MESSAGES = {
  [ERROR_CATEGORIES.NETWORK]: 'Network connection issue. Please check your internet and try again.',
  [ERROR_CATEGORIES.AUTH]: 'Authentication error. Please sign in again.',
  [ERROR_CATEGORIES.DATABASE]: 'Unable to access data. Please try again later.',
  [ERROR_CATEGORIES.VALIDATION]: 'Please check your information and try again.',
  [ERROR_CATEGORIES.PERMISSION]: 'You don\'t have permission to perform this action.',
  [ERROR_CATEGORIES.UNKNOWN]: 'Something went wrong. Please try again.'
};

/**
 * Handle errors throughout the app
 * 
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred (e.g., 'AddItemScreen.fetchCollections')
 * @param {string} category - Error category from ERROR_CATEGORIES
 * @param {string} customUserMessage - Optional custom message to show to the user
 * @param {boolean} showToast - Whether to show a toast message to the user
 * @returns {string} User-friendly error message
 */
export function handleError(error, context, category = ERROR_CATEGORIES.UNKNOWN, customUserMessage = null, showToast = true) {
  // 1. Log detailed error for developers
  console.error(`Error in ${context}:`, error);
  
  if (error?.stack) {
    console.error('Stack trace:', error.stack);
  }
  
  // 2. Get user-friendly message
  const userMessage = customUserMessage || USER_MESSAGES[category] || USER_MESSAGES[ERROR_CATEGORIES.UNKNOWN];
  
  // 3. Show toast if needed
  if (showToast) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: userMessage,
      position: 'bottom',
      visibilityTime: 4000,
    });
  }
  
  // 4. Return the user message for use in UI if needed
  return userMessage;
}

/**
 * Categorize common errors automatically
 * 
 * @param {Error} error - The error object to categorize
 * @returns {string} The error category
 */
export function categorizeError(error) {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';
  
  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('offline') ||
    errorCode === 'NETWORK_ERROR'
  ) {
    return ERROR_CATEGORIES.NETWORK;
  }
  
  // Auth errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('unauthenticated') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('forbidden') ||
    errorCode === 'UNAUTHORIZED' ||
    errorCode === '401' ||
    errorCode === '403'
  ) {
    return ERROR_CATEGORIES.AUTH;
  }
  
  // Database errors
  if (
    errorMessage.includes('database') ||
    errorMessage.includes('db error') ||
    errorMessage.includes('query failed') ||
    errorMessage.includes('supabase')
  ) {
    return ERROR_CATEGORIES.DATABASE;
  }
  
  // Validation errors
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('required field') ||
    errorCode === 'VALIDATION_ERROR'
  ) {
    return ERROR_CATEGORIES.VALIDATION;
  }
  
  // Permission errors
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('access denied') ||
    errorCode === 'PERMISSION_DENIED'
  ) {
    return ERROR_CATEGORIES.PERMISSION;
  }
  
  // Default to unknown
  return ERROR_CATEGORIES.UNKNOWN;
}

/**
 * Wrap async functions with error handling
 * 
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} context - Context for error logging
 * @param {Object} options - Options for error handling
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(asyncFn, context, options = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const category = options.category || categorizeError(error);
      handleError(
        error,
        context,
        category,
        options.customUserMessage,
        options.showToast !== false
      );
      
      // Rethrow if needed
      if (options.rethrow) {
        throw error;
      }
      
      // Return fallback value if provided
      return options.fallbackValue;
    }
  };
}
