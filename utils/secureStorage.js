// utils/secureStorage.js
import * as SecureStore from 'expo-secure-store';

// Keys for storing different types of data
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_SESSION: 'user_session',
  USER_ID: 'user_id',
  REFRESH_TOKEN: 'refresh_token',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
};

/**
 * Save a value securely
 * @param {string} key - The key to store the value under
 * @param {string} value - The value to store (must be a string)
 * @returns {Promise<void>}
 */
export async function saveSecurely(key, value) {
  try {
    if (typeof value !== 'string') {
      // Convert non-string values to JSON strings
      value = JSON.stringify(value);
    }
    await SecureStore.setItemAsync(key, value);
    console.log(`Saved value securely for key: ${key}`);
  } catch (error) {
    console.error(`Error saving value securely for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get a value from secure storage
 * @param {string} key - The key to retrieve
 * @returns {Promise<string|null>} - The stored value or null if not found
 */
export async function getSecurely(key) {
  try {
    const result = await SecureStore.getItemAsync(key);
    return result;
  } catch (error) {
    console.error(`Error getting value for key ${key}:`, error);
    return null;
  }
}

/**
 * Get a JSON value from secure storage and parse it
 * @param {string} key - The key to retrieve
 * @returns {Promise<any|null>} - The parsed JSON value or null if not found/invalid
 */
export async function getSecureJSON(key) {
  try {
    const value = await getSecurely(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (error) {
    console.error(`Error parsing JSON for key ${key}:`, error);
    return null;
  }
}

/**
 * Delete a value from secure storage
 * @param {string} key - The key to delete
 * @returns {Promise<void>}
 */
export async function deleteSecurely(key) {
  try {
    await SecureStore.deleteItemAsync(key);
    console.log(`Deleted value for key: ${key}`);
  } catch (error) {
    console.error(`Error deleting value for key ${key}:`, error);
    throw error;
  }
}

/**
 * Clear all authentication related data
 * @returns {Promise<void>}
 */
export async function clearAuthData() {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await Promise.all(keys.map(key => deleteSecurely(key)));
    console.log('All auth data cleared from secure storage');
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
}
