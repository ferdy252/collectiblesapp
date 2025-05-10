// themedStyles.js - Utility for creating theme-aware styles
import { StyleSheet } from 'react-native';

/**
 * Creates styles that adapt to the current theme
 * @param {Function} styleCreator - Function that takes theme object and returns style object
 * @returns {Function} - Function that returns styles based on the provided theme
 */
export const createThemedStyles = (styleCreator) => {
  return (theme) => {
    return StyleSheet.create(styleCreator(theme));
  };
};
