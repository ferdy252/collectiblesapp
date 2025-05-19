// utils/mfaUtils.js
import { supabase } from '../lib/supabase';
import { saveSecurely, getSecurely, deleteSecurely, STORAGE_KEYS } from './secureStorage';

// Add a new storage key for MFA status
export const MFA_STORAGE_KEYS = {
  MFA_ENABLED: 'mfa_enabled',
  MFA_FACTOR_ID: 'mfa_factor_id',
};

/**
 * Start the MFA enrollment process
 * @returns {Promise<{qr_code: string, secret: string, factorId: string}>}
 */
export async function startMFAEnrollment() {
  try {
    // Call the Supabase MFA enrollment API
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      console.error('Error starting MFA enrollment:', error.message);
      throw error;
    }

    // Store the factor ID securely
    if (data?.id) {
      await saveSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID, data.id);
    }

    return {
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  } catch (error) {
    console.error('MFA enrollment error:', error);
    throw error;
  }
}

/**
 * Challenge the MFA factor to prepare for verification
 * @param {string} factorId - The ID of the factor to challenge
 * @returns {Promise<{challengeId: string}>}
 */
export async function challengeMFA(factorId) {
  try {
    // If no factorId provided, try to get from storage
    if (!factorId) {
      factorId = await getSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID);
      if (!factorId) {
        throw new Error('No MFA factor ID found');
      }
    }

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: factorId,
    });

    if (error) {
      console.error('Error challenging MFA factor:', error.message);
      throw error;
    }

    return {
      challengeId: data.id,
    };
  } catch (error) {
    console.error('MFA challenge error:', error);
    throw error;
  }
}

/**
 * Verify the MFA code to complete enrollment or authentication
 * @param {string} factorId - The ID of the factor to verify
 * @param {string} challengeId - The ID of the challenge to verify
 * @param {string} code - The verification code from the authenticator app
 * @returns {Promise<{verified: boolean}>}
 */
export async function verifyMFA(factorId, challengeId, code) {
  try {
    // If no factorId provided, try to get from storage
    if (!factorId) {
      factorId = await getSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID);
      if (!factorId) {
        throw new Error('No MFA factor ID found');
      }
    }

    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      console.error('Error verifying MFA code:', error.message);
      throw error;
    }

    // If verification is successful during enrollment, mark MFA as enabled
    await saveSecurely(MFA_STORAGE_KEYS.MFA_ENABLED, 'true');

    return {
      verified: data,
    };
  } catch (error) {
    console.error('MFA verification error:', error);
    throw error;
  }
}

/**
 * Unenroll from MFA
 * @param {string} factorId - The ID of the factor to unenroll
 * @returns {Promise<{success: boolean}>}
 */
export async function unenrollMFA(factorId) {
  try {
    // If no factorId provided, try to get from storage
    if (!factorId) {
      factorId = await getSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID);
      if (!factorId) {
        throw new Error('No MFA factor ID found');
      }
    }

    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      console.error('Error unenrolling from MFA:', error.message);
      throw error;
    }

    // Clear MFA data from secure storage
    await deleteSecurely(MFA_STORAGE_KEYS.MFA_ENABLED);
    await deleteSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID);

    return { success: true };
  } catch (error) {
    console.error('MFA unenrollment error:', error);
    throw error;
  }
}

/**
 * Get all MFA factors for the current user
 * @returns {Promise<Array>} - List of factors
 */
export async function getMFAFactors() {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error('Error getting MFA factors:', error.message);
      throw error;
    }

    // Update local storage based on factors
    const totpFactors = data.totp || [];
    const hasEnabledFactor = totpFactors.some(factor => factor.status === 'verified');
    
    if (hasEnabledFactor) {
      await saveSecurely(MFA_STORAGE_KEYS.MFA_ENABLED, 'true');
      
      // Save the first verified factor ID
      const verifiedFactor = totpFactors.find(factor => factor.status === 'verified');
      if (verifiedFactor) {
        await saveSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID, verifiedFactor.id);
      }
    } else {
      await deleteSecurely(MFA_STORAGE_KEYS.MFA_ENABLED);
      await deleteSecurely(MFA_STORAGE_KEYS.MFA_FACTOR_ID);
    }

    return data;
  } catch (error) {
    console.error('Error listing MFA factors:', error);
    throw error;
  }
}

/**
 * Check if MFA is enabled for the current user
 * @returns {Promise<boolean>}
 */
export async function isMFAEnabled() {
  try {
    // First check local storage for quick response
    const storedStatus = await getSecurely(MFA_STORAGE_KEYS.MFA_ENABLED);
    if (storedStatus === 'true') {
      return true;
    }
    
    // If not in storage, check with the server
    const factors = await getMFAFactors();
    const totpFactors = factors.totp || [];
    return totpFactors.some(factor => factor.status === 'verified');
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return false;
  }
}
