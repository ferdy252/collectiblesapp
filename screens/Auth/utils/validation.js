// screens/Auth/utils/validation.js

/**
 * Validates an email address format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if the email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates a username format (alphanumeric, underscores, 3-20 chars)
 * @param {string} username - The username to validate
 * @returns {boolean} - True if the username is valid
 */
export const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Validates a name (letters, spaces, hyphens, apostrophes)
 * @param {string} name - The name to validate
 * @returns {boolean} - True if the name is valid or empty
 */
export const isValidName = (name) => {
  if (!name || name.trim() === '') return true; // Optional
  const nameRegex = /^[a-zA-Z\s'-]{2,30}$/;
  return nameRegex.test(name);
};
