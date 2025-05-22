import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

// Simple Shimmer placeholder component (no animation for now)
const Shimmer = ({ width, height, style }) => {
  const { theme } = useTheme();
  return (
    <View style={[{ width, height, overflow: 'hidden', backgroundColor: theme.colors.divider }, style]} />
  );
};

export default Shimmer;
