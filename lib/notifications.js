// lib/notifications.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import env from '../config/environment';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission for push notifications
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (!env.enableNotifications) {
    console.log('Notifications are disabled in this environment');
    return null;
  }
  
  // Check if device is physical (not simulator/emulator)
  if (__DEV__) {
    const deviceType = await Device.getDeviceTypeAsync();
    if (deviceType !== Device.DeviceType.PHYSICAL) { 
      console.log('Push notifications are only available on physical devices');
      return null;
    }
  }
  
  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  // If we don't have permission yet, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  // If permission not granted, exit
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }
  
  // Get push token
  try {
    // Get the project ID from Constants or environment
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.warn('No project ID found for push notifications');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    })).data;
    
    console.log('Push token:', token);
    
    // Configure notification behavior for Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save push token to Supabase
 * @param {string} userId - The user ID
 * @param {string} token - The push token
 * @returns {Promise<boolean>} Whether the token was saved successfully
 */
export async function savePushToken(userId, token) {
  if (!userId || !token) return false;
  if (!env.enableNotifications) return false;
  
  try {
    // Check if token already exists for this user
    const { data: existingToken } = await supabase
      .from('user_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('push_token', token)
      .maybeSingle();
    
    if (existingToken) {
      console.log('Token already exists for this user');
      return true;
    }
    
    // Insert new token
    const { error } = await supabase
      .from('user_tokens')
      .insert({
        user_id: userId,
        push_token: token,
      });
    
    if (error) throw error;
    console.log('Push token saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving push token:', error.message);
    return false;
  }
}

/**
 * Send a push notification to a user
 * @param {string} targetUserId - The user ID to send notification to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with notification
 * @returns {Promise<boolean>} Whether the notification was sent successfully
 */
export async function sendPushNotification(targetUserId, title, body, data = {}) {
  if (!env.enableNotifications) {
    if (env.loggingEnabled) {
      console.log('Would send notification:', { targetUserId, title, body, data });
    }
    return true;
  }
  
  try {
    // Get user's push tokens
    const { data: tokens, error } = await supabase
      .from('user_tokens')
      .select('push_token')
      .eq('user_id', targetUserId);
    
    if (error) throw error;
    
    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for user:', targetUserId);
      return false;
    }
    
    // In development, just log what would be sent
    if (__DEV__ && env.loggingEnabled) {
      console.log('Would send notification to:', tokens.map(t => t.push_token));
      console.log('Notification content:', { title, body, data });
      return true;
    }
    
    // In production, actually send the notification
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tokens.map(t => t.push_token),
        title,
        body,
        data,
      }),
    });
    
    const responseData = await response.json();
    if (responseData.errors && responseData.errors.length > 0) {
      console.error('Error sending push notification:', responseData.errors);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error.message);
    return false;
  }
}
