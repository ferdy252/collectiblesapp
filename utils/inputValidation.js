// inputValidation.js - Sanitizes and validates user inputs to prevent injection attacks

/**
 * Sanitizes a string by removing potentially harmful characters
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string
 */
export const sanitizeString = (input) => {
  if (input === null || input === undefined) {
    return '';
  }
  
  if (typeof input !== 'string') {
    input = String(input);
  }
  
  // Replace HTML tags with their encoded versions
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Validates that a string meets length requirements
 * @param {string} input - The input string to validate
 * @param {number} minLength - Minimum allowed length
 * @param {number} maxLength - Maximum allowed length
 * @returns {object} - Validation result with success and message properties
 */
export const validateLength = (input, minLength = 1, maxLength = 255) => {
  if (!input) {
    return {
      success: false,
      message: 'This field is required',
    };
  }
  
  if (input.length < minLength) {
    return {
      success: false,
      message: `Must be at least ${minLength} characters`,
    };
  }
  
  if (input.length > maxLength) {
    return {
      success: false,
      message: `Cannot exceed ${maxLength} characters`,
    };
  }
  
  return { success: true };
};

/**
 * Validates an email address format
 * @param {string} email - The email address to validate
 * @returns {object} - Validation result with success and message properties
 */
export const validateEmail = (email) => {
  if (!email) {
    return {
      success: false,
      message: 'Email is required',
    };
  }
  
  // Simple regex for basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'Please enter a valid email address',
    };
  }
  
  return { success: true };
};

/**
 * Validates a password for strength requirements
 * @param {string} password - The password to validate
 * @returns {object} - Validation result with success and message properties
 */
export const validatePassword = (password) => {
  if (!password) {
    return {
      success: false,
      message: 'Password is required',
    };
  }
  
  if (password.length < 8) {
    return {
      success: false,
      message: 'Password must be at least 8 characters long',
    };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      success: false,
      message: 'Password must contain at least one number',
    };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      success: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }
  
  return { success: true };
};

/**
 * Validates a URL format
 * @param {string} url - The URL to validate
 * @returns {object} - Validation result with success and message properties
 */
export const validateUrl = (url) => {
  if (!url) {
    return { success: true }; // URLs might be optional
  }
  
  try {
    new URL(url);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: 'Please enter a valid URL',
    };
  }
};

/**
 * Validates a number is within a specified range
 * @param {number|string} value - The number to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {object} - Validation result with success and message properties
 */
export const validateNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (value === null || value === undefined || value === '') {
    return {
      success: false,
      message: 'This field is required',
    };
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    return {
      success: false,
      message: 'Please enter a valid number',
    };
  }
  
  if (num < min) {
    return {
      success: false,
      message: `Value must be at least ${min}`,
    };
  }
  
  if (num > max) {
    return {
      success: false,
      message: `Value cannot exceed ${max}`,
    };
  }
  
  return { success: true };
};

/**
 * Validates an input against a custom regex pattern
 * @param {string} input - The input to validate
 * @param {RegExp} pattern - The regex pattern to test against
 * @param {string} errorMessage - Custom error message if validation fails
 * @returns {object} - Validation result with success and message properties
 */
export const validatePattern = (input, pattern, errorMessage = 'Invalid format') => {
  if (!input) {
    return {
      success: false,
      message: 'This field is required',
    };
  }
  
  if (!pattern.test(input)) {
    return {
      success: false,
      message: errorMessage,
    };
  }
  
  return { success: true };
};

/**
 * Validates form data object with specified validation rules
 * @param {object} formData - Object containing form field values
 * @param {object} validationRules - Object mapping field names to validation functions
 * @returns {object} - Object with overall success status and field-specific error messages
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const validate = validationRules[field];
    
    // Apply validation function
    const result = validate(value);
    
    if (!result.success) {
      errors[field] = result.message;
      isValid = false;
    }
  });
  
  return {
    isValid,
    errors,
  };
};

/**
 * Sanitizes an object by applying sanitizeString to all string properties
 * @param {object} obj - The object to sanitize
 * @returns {object} - A new sanitized object
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        return typeof item === 'string' ? sanitizeString(item) : item;
      });
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

// Export a combined validation object for easy imports
export default {
  sanitizeString,
  validateLength,
  validateEmail,
  validatePassword,
  validateUrl,
  validateNumber,
  validatePattern,
  validateForm,
  sanitizeObject,
};
