// lib/analytics.js
import { handleError, ERROR_CATEGORIES } from '../utils/errorHandler';

// Analytics event types
export const ANALYTICS_EVENTS = {
  ITEM_ADDED: 'item_added',
  ITEM_VIEWED: 'item_viewed',
  ITEM_EDITED: 'item_edited',
  ITEM_DELETED: 'item_deleted',
  ITEM_LIKED: 'item_liked',
  COMMENT_ADDED: 'comment_added',
  DATA_EXPORTED: 'data_exported',
  ITEM_SHARED: 'item_shared',
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  PURCHASE_COMPLETED: 'purchase_completed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  APP_ERROR: 'app_error'
};

/**
 * Initialize Analytics
 * @returns {Promise<boolean>} Success status
 */
export const initAnalytics = async () => {
  try {
    console.log('Initializing analytics...');
    // In a real app, you would initialize your analytics SDK here
    // For example: await Analytics.initialize('your-api-key');
    
    return true;
  } catch (error) {
    handleError(
      error,
      'analytics.initAnalytics',
      ERROR_CATEGORIES.INITIALIZATION,
      'Analytics initialization failed.'
    );
    return false;
  }
};

/**
 * Log an event with error handling
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Data associated with the event
 * @returns {Promise<boolean>} Success status
 */
export const logEvent = async (eventName, eventData = {}) => {
  try {
    if (!eventName) {
      throw new Error('Event name is required');
    }
    
    console.log(`Analytics event: ${eventName}`, eventData);
    // In a real app, you would log to your analytics service
    // For example: await Analytics.logEvent(eventName, eventData);
    
    return true;
  } catch (error) {
    handleError(
      error,
      'analytics.logEvent',
      ERROR_CATEGORIES.ANALYTICS,
      'Failed to log analytics event.'
    );
    return false;
  }
};

/**
 * Log when a user adds a new item
 * @param {Object} itemData - Basic info about the item
 * @returns {Promise<boolean>} Success status
 */
export const logAddItem = async (itemData = {}) => {
  return await logEvent(ANALYTICS_EVENTS.ITEM_ADDED, itemData);
};

/**
 * Log when a user likes a post
 * @param {Object} likeData - Data about the like action
 * @returns {Promise<boolean>} Success status
 */
export const logLikeItem = async (likeData = {}) => {
  return await logEvent(ANALYTICS_EVENTS.ITEM_LIKED, likeData);
};

/**
 * Log when a user comments on a post
 * @param {Object} commentData - Data about the comment
 * @returns {Promise<boolean>} Success status
 */
export const logAddComment = async (commentData = {}) => {
  return await logEvent(ANALYTICS_EVENTS.COMMENT_ADDED, commentData);
};

/**
 * Log when a user exports data
 * @param {Object} exportData - Data about the export
 * @returns {Promise<boolean>} Success status
 */
export const logExportData = async (exportData = {}) => {
  return await logEvent(ANALYTICS_EVENTS.DATA_EXPORTED, exportData);
};

/**
 * Log when a user views an item's details
 * @param {Object} itemData - Basic info about the viewed item
 * @returns {Promise<boolean>} Success status
 */
export const logViewItem = async (itemData = {}) => {
  return await logEvent(ANALYTICS_EVENTS.ITEM_VIEWED, itemData);
};

/**
 * Log when a user shares an item
 * @param {Object} shareData - Data about the share action
 * @returns {Promise<boolean>} Success status
 */
export const logShareItem = async (shareData = {}) => {
  return await logEvent(ANALYTICS_EVENTS.ITEM_SHARED, shareData);
};

/**
 * Log application errors for analytics
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred
 * @returns {Promise<boolean>} Success status
 */
export const logErrorEvent = async (error, context = 'unknown') => {
  try {
    const errorData = {
      message: error.message || 'Unknown error',
      code: error.code,
      context: context,
      timestamp: new Date().toISOString()
    };
    
    return await logEvent(ANALYTICS_EVENTS.APP_ERROR, errorData);
  } catch (loggingError) {
    // Just console log if even our error logging fails
    console.error('Failed to log error event:', loggingError);
    return false;
  }
};

/**
 * Set user properties for analytics
 * @param {Object} properties - User properties to set
 * @returns {Promise<boolean>} Success status
 */
export const setUserProperties = async (properties = {}) => {
  try {
    if (!properties || Object.keys(properties).length === 0) {
      throw new Error('User properties are required');
    }
    
    console.log('Setting user properties:', properties);
    // In a real app, you would set user properties in your analytics service
    // For example: await Analytics.setUserProperties(properties);
    
    return true;
  } catch (error) {
    handleError(
      error,
      'analytics.setUserProperties',
      ERROR_CATEGORIES.ANALYTICS,
      'Failed to set user properties.'
    );
    return false;
  }
};
