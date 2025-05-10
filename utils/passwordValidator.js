// utils/passwordValidator.js

/**
 * Password requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */

/**
 * Validates a password against security requirements
 * @param {string} password - The password to validate
 * @returns {Object} - Validation result with status and message
 */
export function validatePassword(password) {
  // Initialize validation result
  const result = {
    isValid: true,
    message: '',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    },
    strength: 0 // 0-100 score
  };
  
  // Check minimum length (8 characters)
  result.requirements.length = password.length >= 8;
  
  // Check for uppercase letters
  result.requirements.uppercase = /[A-Z]/.test(password);
  
  // Check for lowercase letters
  result.requirements.lowercase = /[a-z]/.test(password);
  
  // Check for numbers
  result.requirements.number = /[0-9]/.test(password);
  
  // Check for special characters
  result.requirements.special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  // Calculate overall validity
  result.isValid = (
    result.requirements.length &&
    result.requirements.uppercase &&
    result.requirements.lowercase &&
    result.requirements.number &&
    result.requirements.special
  );
  
  // Calculate password strength (0-100)
  let strength = 0;
  
  // Base points for length
  if (password.length >= 8) strength += 25;
  if (password.length >= 10) strength += 10;
  if (password.length >= 12) strength += 10;
  if (password.length >= 14) strength += 5;
  
  // Points for character types
  if (result.requirements.uppercase) strength += 10;
  if (result.requirements.lowercase) strength += 10;
  if (result.requirements.number) strength += 10;
  if (result.requirements.special) strength += 20;
  
  // Bonus for mixed character types
  const typesUsed = Object.values(result.requirements).filter(Boolean).length - 1; // Subtract length check
  if (typesUsed >= 3) strength += 10;
  
  result.strength = Math.min(100, strength);
  
  // Generate appropriate message
  if (!result.isValid) {
    const missing = [];
    
    if (!result.requirements.length) missing.push('at least 8 characters');
    if (!result.requirements.uppercase) missing.push('an uppercase letter');
    if (!result.requirements.lowercase) missing.push('a lowercase letter');
    if (!result.requirements.number) missing.push('a number');
    if (!result.requirements.special) missing.push('a special character');
    
    result.message = `Password must contain ${missing.join(', ')}.`;
  }
  
  return result;
}

/**
 * Get a color representing password strength
 * @param {number} strength - Password strength score (0-100)
 * @returns {string} - Color in hex format
 */
export function getPasswordStrengthColor(strength) {
  if (strength < 30) return '#FF3B30'; // Red (weak)
  if (strength < 60) return '#FF9500'; // Orange (moderate)
  if (strength < 80) return '#FFCC00'; // Yellow (good)
  return '#34C759'; // Green (strong)
}

/**
 * Get a text label for password strength
 * @param {number} strength - Password strength score (0-100)
 * @returns {string} - Strength label
 */
export function getPasswordStrengthLabel(strength) {
  if (strength < 30) return 'Weak';
  if (strength < 60) return 'Moderate';
  if (strength < 80) return 'Good';
  return 'Strong';
}
