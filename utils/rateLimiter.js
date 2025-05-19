// utils/rateLimiter.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Constants for rate limiting
const MAX_ATTEMPTS = 5; // Maximum number of login attempts allowed
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Storage keys
const STORAGE_KEYS = {
  LOGIN_ATTEMPTS: 'login_attempts',
  LOCKOUT_TIME: 'lockout_time',
};

/**
 * Record a failed login attempt
 * @returns {Promise<{locked: boolean, attemptsLeft: number, lockoutTime: number}>}
 */
export async function recordFailedAttempt() {
  try {
    // Get current attempts data
    const attemptsData = await getAttemptsData();
    const currentTime = Date.now();
    
    // Check if we're in a lockout period
    if (attemptsData.lockoutTime > currentTime) {
      // Still locked out
      return {
        locked: true,
        attemptsLeft: 0,
        lockoutTime: attemptsData.lockoutTime,
      };
    }
    
    // Reset attempts if lockout period has passed
    if (attemptsData.lockoutTime > 0 && attemptsData.lockoutTime <= currentTime) {
      attemptsData.attempts = 0;
      attemptsData.lockoutTime = 0;
    }
    
    // Increment attempts
    attemptsData.attempts += 1;
    
    // Check if we've reached the maximum attempts
    if (attemptsData.attempts >= MAX_ATTEMPTS) {
      attemptsData.lockoutTime = currentTime + LOCKOUT_DURATION;
    }
    
    // Save updated data
    await saveAttemptsData(attemptsData);
    
    // Return status
    return {
      locked: attemptsData.lockoutTime > currentTime,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - attemptsData.attempts),
      lockoutTime: attemptsData.lockoutTime,
    };
  } catch (error) {
    console.error('Error recording failed attempt:', error);
    // In case of error, don't lock the user out
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - 1, lockoutTime: 0 };
  }
}

/**
 * Reset login attempts after successful login
 * @returns {Promise<void>}
 */
export async function resetAttempts() {
  try {
    await saveAttemptsData({ attempts: 0, lockoutTime: 0 });
  } catch (error) {
    console.error('Error resetting attempts:', error);
  }
}

/**
 * Check if login is currently locked out
 * @returns {Promise<{locked: boolean, attemptsLeft: number, lockoutTime: number}>}
 */
export async function checkLockout() {
  try {
    const attemptsData = await getAttemptsData();
    const currentTime = Date.now();
    
    // If lockout time has passed, reset attempts
    if (attemptsData.lockoutTime > 0 && attemptsData.lockoutTime <= currentTime) {
      await saveAttemptsData({ attempts: 0, lockoutTime: 0 });
      return { locked: false, attemptsLeft: MAX_ATTEMPTS, lockoutTime: 0 };
    }
    
    return {
      locked: attemptsData.lockoutTime > currentTime,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - attemptsData.attempts),
      lockoutTime: attemptsData.lockoutTime,
    };
  } catch (error) {
    console.error('Error checking lockout:', error);
    // In case of error, don't lock the user out
    return { locked: false, attemptsLeft: MAX_ATTEMPTS, lockoutTime: 0 };
  }
}

/**
 * Get the remaining lockout time in minutes
 * @param {number} lockoutTime - The lockout timestamp
 * @returns {number} - Minutes remaining in lockout
 */
export function getRemainingLockoutTime(lockoutTime) {
  const currentTime = Date.now();
  const remainingMs = Math.max(0, lockoutTime - currentTime);
  return Math.ceil(remainingMs / (60 * 1000)); // Convert to minutes and round up
}

/**
 * Get attempts data from storage
 * @returns {Promise<{attempts: number, lockoutTime: number}>}
 */
async function getAttemptsData() {
  try {
    const attemptsJson = await AsyncStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
    const lockoutTimeJson = await AsyncStorage.getItem(STORAGE_KEYS.LOCKOUT_TIME);
    
    return {
      attempts: attemptsJson ? parseInt(attemptsJson, 10) : 0,
      lockoutTime: lockoutTimeJson ? parseInt(lockoutTimeJson, 10) : 0,
    };
  } catch (error) {
    console.error('Error getting attempts data:', error);
    return { attempts: 0, lockoutTime: 0 };
  }
}

/**
 * Save attempts data to storage
 * @param {Object} data - The data to save
 * @param {number} data.attempts - Number of failed attempts
 * @param {number} data.lockoutTime - Timestamp when lockout ends
 * @returns {Promise<void>}
 */
async function saveAttemptsData(data) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, data.attempts.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.LOCKOUT_TIME, data.lockoutTime.toString());
  } catch (error) {
    console.error('Error saving attempts data:', error);
  }
}

/**
 * Format a user-friendly message about remaining attempts or lockout time
 * @param {Object} status - The lockout status
 * @param {boolean} status.locked - Whether the account is locked
 * @param {number} status.attemptsLeft - Number of attempts remaining
 * @param {number} status.lockoutTime - Timestamp when lockout ends
 * @returns {string} - Formatted message
 */
export function formatLockoutMessage(status) {
  if (status.locked) {
    const minutesLeft = getRemainingLockoutTime(status.lockoutTime);
    return `Too many failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`;
  } else if (status.attemptsLeft <= 2) { // Show warning when 2 or fewer attempts left
    return `Warning: ${status.attemptsLeft} login attempt${status.attemptsLeft !== 1 ? 's' : ''} remaining before temporary lockout.`;
  }
  return '';
}
