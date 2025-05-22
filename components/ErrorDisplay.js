// components/ErrorDisplay.js
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from '../theme/styled';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * A reusable component to display errors in the UI
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - The error message to display
 * @param {Function} props.onRetry - Optional function to call when retry is pressed
 * @param {Object} props.style - Additional styles for the container
 */
function ErrorDisplay({ message, onRetry, style }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, style]}>
      <Ionicons 
        name="alert-circle-outline" 
        size={40} 
        color={theme.colors.error} 
      />
      
      <Typography.Body style={[styles.message, { color: theme.colors.text }]}>
        {message || 'Something went wrong'}
      </Typography.Body>
      
      {onRetry && (
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={onRetry}
          activeOpacity={0.7}
          accessibilityLabel="Retry"
          accessibilityRole="button"
        >
          <Typography.Body style={[styles.retryText, { color: theme.colors.onPrimary }]}>
            Try Again
          </Typography.Body>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ErrorDisplay;
