import { Dimensions } from 'react-native';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');

// Color palette definitions
const palette = {
  // Primary brand colors
  primary: '#405DE6', // Instagram blue
  primaryDark: '#5B6EEA', // Slightly lighter for dark mode
  secondary: '#5851DB', // Instagram purple
  tertiary: '#833AB4', // Instagram gradient purple
  accent: '#C13584', // Instagram magenta
  accentDark: '#E13E93', // Brighter accent for dark mode
  
  // Neutral colors - light mode
  white: '#FFFFFF',
  lightGray1: '#F8F9FA',
  lightGray2: '#EFEFEF',
  lightGray3: '#DBDBDB',
  gray1: '#8E8E8E',
  gray2: '#C7C7C7',
  darkGray: '#262626',
  black: '#121212',
  
  // Neutral colors - dark mode
  darkBlack: '#000000',
  darkGray1: '#121212',
  darkGray2: '#1A1A1A', 
  darkGray3: '#222222', 
  darkGray4: '#2A2A2A', 
  darkGray5: '#666666',
  darkGray6: '#8E8E8E',
  darkWhite: '#F9F9F9',
  
  // Status colors
  success: '#2ECC71',
  successDark: '#30D975', // Brighter for dark mode
  warning: '#F1C40F',
  warningDark: '#FFD426', // Brighter for dark mode
  error: '#E74C3C',
  errorDark: '#FF5A4D', // Brighter for dark mode
  info: '#3498DB',
  infoDark: '#47A3E9', // Brighter for dark mode
  
  // Social colors
  like: '#ED4956', // Instagram heart red
  likeDark: '#FF5D69', // Brighter for dark mode
};

// Light theme colors
const lightColors = {
  // Primary colors
  primary: palette.primary,
  secondary: palette.secondary,
  tertiary: palette.tertiary,
  accent: palette.accent,
  
  // UI colors
  background: palette.white,
  card: palette.white,
  surface: palette.lightGray1,
  divider: palette.lightGray2,
  
  // Text colors
  text: palette.darkGray,
  textSecondary: palette.gray1,
  textTertiary: palette.gray2,
  textLight: palette.white,
  
  // Status colors
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
  
  // Social colors
  like: palette.like,
  
  // Gradients (for reference)
  gradientStart: palette.primary,
  gradientMid: palette.secondary,
  gradientEnd: palette.tertiary,

  // Form states
  inputBorder: palette.lightGray3,
  inputBorderFocused: palette.primary,
  inputBackground: palette.lightGray1,
  inputPlaceholder: palette.gray1,
  inputText: palette.darkGray,
  inputDisabled: palette.lightGray2,
  
  // Button states
  buttonDisabled: 'rgba(64, 93, 230, 0.5)', // Semi-transparent primary
};

// Dark theme colors
const darkColors = {
  // Primary colors
  primary: palette.primaryDark, // Using brighter primary for better visibility
  secondary: palette.secondary,
  tertiary: palette.tertiary,
  accent: palette.accentDark, // Using brighter accent for better visibility
  
  // UI colors
  background: palette.darkBlack, // Pure black background for OLED screens
  card: palette.darkBlack, // Pure black
  surface: palette.darkBlack, // Pure black
  divider: palette.darkGray3, // Dark divider
  
  // Text colors
  text: '#FFFFFF', // Pure white text for high contrast
  textSecondary: '#BBBBBB', // Lighter secondary text for better readability
  textTertiary: '#999999', // Tertiary text with sufficient contrast
  textLight: '#FFFFFF', // Pure white for high contrast elements
  
  // Status colors
  success: palette.successDark,
  warning: palette.warningDark,
  error: palette.errorDark,
  info: palette.infoDark,
  
  // Social colors
  like: palette.likeDark,
  
  // Gradients (for reference)
  gradientStart: '#000000', // Pure black
  gradientMid: '#000000',   // Pure black
  gradientEnd: '#000000',   // Pure black

  // Form states
  inputBorder: '#222222', // Dark border
  inputBorderFocused: palette.primaryDark,
  inputBackground: '#000000', // Pure black
  inputPlaceholder: '#888888', // More visible placeholder
  inputText: '#FFFFFF', // Pure white input text
  inputDisabled: '#121212', // Slightly lighter than background
  
  // Button states
  buttonDisabled: 'rgba(91, 110, 234, 0.5)', // Semi-transparent primaryDark
};

// Typography
const typography = {
  fontFamily: {
    // Default to system fonts since we're not importing custom fonts
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 32,
  },
  lineHeight: {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
    xxxl: 36,
    display: 40,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Spacing
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};

// Border radius
const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

// Shadows
const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Create theme object generator based on mode
const createTheme = (isDark = false) => {
  const colors = isDark ? darkColors : lightColors;
  
  // Button styles - Enhanced for accessibility and animations
  const buttons = {
    // Primary button - Used for main actions like 'Save', 'Post'
    primary: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.md,
      minHeight: 48, // Minimum touch target size for accessibility
      minWidth: 48, // Minimum touch target size for accessibility
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.sm,
    },
    // Secondary button - Used for secondary actions like 'Cancel', 'Back'
    secondary: {
      backgroundColor: colors.background,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      minHeight: 48, // Minimum touch target size for accessibility
      minWidth: 48, // Minimum touch target size for accessibility
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.xs,
    },
    // Tertiary button - Used for less prominent actions
    tertiary: {
      backgroundColor: 'transparent',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      minHeight: 48, // Minimum touch target size for accessibility
      minWidth: 48, // Minimum touch target size for accessibility
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Icon button - Used for icon-only buttons
    icon: {
      padding: spacing.sm,
      borderRadius: borderRadius.round,
      minHeight: 48, // Minimum touch target size for accessibility
      minWidth: 48, // Minimum touch target size for accessibility
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Disabled state - Applied to any button type when disabled
    disabled: {
      opacity: 0.5,
    },
    // Danger button - Used for destructive actions like 'Delete'
    danger: {
      backgroundColor: colors.error,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.md,
      minHeight: 48, // Minimum touch target size for accessibility
      minWidth: 48, // Minimum touch target size for accessibility
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.sm,
    },
  };

  // Form input styles
  const inputs = {
    // Standard text input
    primary: {
      backgroundColor: colors.inputBackground,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: typography.fontSize.md,
      color: colors.inputText,
      minHeight: 48, // Minimum touch target size for accessibility
    },
    // Focused state for text input
    focused: {
      borderColor: colors.inputBorderFocused,
      borderWidth: 1.5,
    },
    // Disabled state for text input
    disabled: {
      backgroundColor: colors.inputDisabled,
      borderColor: colors.inputBorder,
      color: colors.textSecondary,
    },
    // Error state for text input
    error: {
      borderColor: colors.error,
      borderWidth: 1.5,
    },
    // Label text for inputs
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      marginBottom: spacing.xs,
      color: colors.text,
    },
    // Helper text for inputs (hints, error messages)
    helper: {
      fontSize: typography.fontSize.xs,
      marginTop: spacing.xs,
      color: colors.textSecondary,
    },
    // Error message for inputs
    errorText: {
      fontSize: typography.fontSize.xs,
      marginTop: spacing.xs,
      color: colors.error,
    },
    // Placeholder text color
    placeholder: colors.inputPlaceholder,
  };

  // Card styles
  const cards = {
    // Primary card - Used for most content cards
    primary: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      ...shadows.sm,
    },
    // Secondary card - Used for less prominent cards
    secondary: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      ...shadows.xs,
    },
    // Compact card - Used for smaller content cards
    compact: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      ...shadows.xs,
    },
    // Flat card - No shadow, just a border
    flat: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.divider,
    },
  };

  return {
    colors,
    typography,
    spacing,
    borderRadius,
    shadows,
    buttons,
    inputs,
    cards,
    dimensions: {
      width,
      height,
    },
    animations: {
      inputFocus: {
        duration: 200, // 200ms for input focus animations
      },
      buttonPress: {
        duration: 150, // 150ms for button press animations
        scale: 0.95, // Scale factor for button press effect (slightly smaller)
      },
      transition: {
        duration: 300, // 300ms for general transitions
      },
    },
  };
};

// Export both light and dark themes
export const lightTheme = createTheme(false);
export const darkTheme = createTheme(true);

// Export a default theme (light)
export default lightTheme;
