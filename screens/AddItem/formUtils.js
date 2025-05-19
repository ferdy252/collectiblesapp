import Toast from 'react-native-toast-message';
import { validateLength, validateNumber } from '../../utils/inputValidation';

/**
 * Validates the form fields for adding a new item
 * @param {Object} formData - The form data to validate
 * @returns {boolean} - Whether the form is valid
 */
export const validateForm = (formData) => {
  const { itemName, selectedCategory, selectedCollection } = formData;
  
  // Check if item name is provided
  if (!validateLength(itemName, 1, 100)) {
    Toast.show({
      type: 'error',
      text1: 'Item Name Required',
      text2: 'Please enter a name for your item',
      position: 'bottom',
    });
    return false;
  }
  
  // Check if category is selected
  if (!selectedCategory) {
    Toast.show({
      type: 'error',
      text1: 'Category Required',
      text2: 'Please select a category for your item',
      position: 'bottom',
    });
    return false;
  }
  
  // Collection is now optional, so we don't check for it here
  
  return true;
};

/**
 * Handles errors that occur during the save process
 * @param {Error} error - The error that occurred
 */
export const handleSaveError = (error) => {
  console.error('Error saving item:', error);
  
  // Determine what type of error occurred and show appropriate message
  const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
  
  Toast.show({
    type: 'error',
    text1: 'Save Failed',
    text2: errorMessage,
    position: 'bottom',
    visibilityTime: 4000,
  });
};
