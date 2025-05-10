// utils/serverRateLimiter.js
import { supabase } from '../lib/supabase';

/**
 * Check if login attempts for an email are rate limited
 * @param {string} email - The email to check
 * @returns {Promise<{isBlocked: boolean, attemptsRemaining: number, blockExpiresAt: Date|null}>}
 */
export async function checkLoginRateLimit(email) {
  try {
    // Call the Edge Function to check rate limit
    const { data, error } = await supabase.functions.invoke('check-rate-limit', {
      body: { email },
    });

    if (error) {
      console.error('Error checking rate limit:', error);
      // Default to not blocked in case of error
      return { isBlocked: false, attemptsRemaining: 5, blockExpiresAt: null };
    }

    return {
      isBlocked: data.is_blocked,
      attemptsRemaining: data.attempts_remaining,
      blockExpiresAt: data.block_expires_at ? new Date(data.block_expires_at) : null,
    };
  } catch (error) {
    console.error('Error in checkLoginRateLimit:', error);
    // Default to not blocked in case of error
    return { isBlocked: false, attemptsRemaining: 5, blockExpiresAt: null };
  }
}

/**
 * Record a login attempt
 * @param {string} email - The email that attempted to log in
 * @param {boolean} successful - Whether the login was successful
 * @returns {Promise<void>}
 */
export async function recordLoginAttempt(email, successful = false) {
  try {
    // Get client info for security tracking
    const userAgent = navigator.userAgent || 'unknown';
    
    // Call the Edge Function to record the attempt
    await supabase.functions.invoke('record-login-attempt', {
      body: {
        email,
        user_agent: userAgent,
        successful,
      },
    });
  } catch (error) {
    console.error('Error recording login attempt:', error);
  }
}

/**
 * Get a user-friendly message about the rate limit status
 * @param {Object} status - The rate limit status
 * @param {boolean} status.isBlocked - Whether the account is blocked
 * @param {number} status.attemptsRemaining - Number of attempts remaining
 * @param {Date|null} status.blockExpiresAt - When the block expires
 * @returns {string} - Formatted message
 */
export function formatRateLimitMessage(status) {
  if (status.isBlocked && status.blockExpiresAt) {
    const now = new Date();
    const diffMs = status.blockExpiresAt - now;
    const minutesLeft = Math.ceil(diffMs / (60 * 1000));
    
    return `Too many failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`;
  } else if (status.attemptsRemaining <= 2) {
    return `Warning: ${status.attemptsRemaining} login attempt${status.attemptsRemaining !== 1 ? 's' : ''} remaining before temporary lockout.`;
  }
  
  return '';
}
