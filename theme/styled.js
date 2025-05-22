import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolateColor } from 'react-native-reanimated';
import theme from './theme';

// Animated TouchableOpacity component with press animation
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Text components with predefined styles
export const Typography = {
  // Headings
  H1: ({ style, ...props }) => (
    <Text 
      style={[{
        fontSize: theme.typography.fontSize.display,
        lineHeight: theme.typography.lineHeight.display,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text,
      }, style]} 
      {...props} 
    />
  ),
  H2: ({ style, ...props }) => (
    <Text 
      style={[{
        fontSize: theme.typography.fontSize.xxxl,
        lineHeight: theme.typography.lineHeight.xxxl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text,
      }, style]} 
      {...props} 
    />
  ),
  H3: ({ style, ...props }) => (
    <Text 
      style={[{
        fontSize: theme.typography.fontSize.xxl,
        lineHeight: theme.typography.lineHeight.xxl,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.text,
      }, style]} 
      {...props} 
    />
  ),
  // Body text
  Body: ({ style, ...props }) => (
    <Text 
      style={[{
        fontSize: theme.typography.fontSize.md,
        lineHeight: theme.typography.lineHeight.md,
        color: theme.colors.text,
      }, style]} 
      {...props} 
    />
  ),
  BodySmall: ({ style, ...props }) => (
    <Text 
      style={[{
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.lineHeight.sm,
        color: theme.colors.textSecondary,
      }, style]} 
      {...props} 
    />
  ),
  // Labels
  Label: ({ style, ...props }) => (
    <Text 
      style={[{
        fontSize: theme.typography.fontSize.md,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.text,
      }, style]} 
      {...props} 
    />
  ),
  Caption: ({ style, ...props }) => (
    <Text 
      style={[{
        fontSize: theme.typography.fontSize.xs,
        lineHeight: theme.typography.lineHeight.xs,
        color: theme.colors.textSecondary,
      }, style]} 
      {...props} 
    />
  ),
};

// Enhanced Button components with animations
export const Button = {
  Primary: ({ style, textStyle, title, disabled, onPress, accessibilityLabel, accessibilityHint, ...props }) => {
    // Animation value for press effect
    const scale = useSharedValue(1);
    
    // Create animated style
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }]
      };
    });
    
    // Handle press animations
    const handlePressIn = () => {
      scale.value = withTiming(
        theme.animations.buttonPress.scale,
        { duration: theme.animations.buttonPress.duration }
      );
    };
    
    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: theme.animations.buttonPress.duration });
    };
    
    return (
      <AnimatedTouchable 
        style={[theme.buttons.primary, disabled && theme.buttons.disabled, animatedStyle, style]} 
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...props}
      >
        <Text style={[{
          color: theme.colors.textLight,
          fontWeight: theme.typography.fontWeight.medium,
          fontSize: theme.typography.fontSize.md,
          textAlign: 'center',
        }, textStyle]}>
          {title}
        </Text>
      </AnimatedTouchable>
    );
  },
  
  Secondary: ({ style, textStyle, title, disabled, onPress, accessibilityLabel, accessibilityHint, ...props }) => {
    // Animation value for press effect
    const scale = useSharedValue(1);
    
    // Create animated style
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }]
      };
    });
    
    // Handle press animations
    const handlePressIn = () => {
      scale.value = withTiming(
        theme.animations.buttonPress.scale,
        { duration: theme.animations.buttonPress.duration }
      );
    };
    
    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: theme.animations.buttonPress.duration });
    };
    
    return (
      <AnimatedTouchable 
        style={[theme.buttons.secondary, disabled && theme.buttons.disabled, animatedStyle, style]} 
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...props}
      >
        <Text style={[{
          color: theme.colors.primary,
          fontWeight: theme.typography.fontWeight.medium,
          fontSize: theme.typography.fontSize.md,
          textAlign: 'center',
        }, textStyle]}>
          {title}
        </Text>
      </AnimatedTouchable>
    );
  },
  
  Tertiary: ({ style, textStyle, title, disabled, onPress, accessibilityLabel, accessibilityHint, ...props }) => {
    // Animation value for press effect
    const scale = useSharedValue(1);
    
    // Create animated style
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }]
      };
    });
    
    // Handle press animations
    const handlePressIn = () => {
      scale.value = withTiming(
        theme.animations.buttonPress.scale,
        { duration: theme.animations.buttonPress.duration }
      );
    };
    
    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: theme.animations.buttonPress.duration });
    };
    
    return (
      <AnimatedTouchable 
        style={[theme.buttons.tertiary, disabled && theme.buttons.disabled, animatedStyle, style]} 
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...props}
      >
        <Text style={[{
          color: theme.colors.primary,
          fontWeight: theme.typography.fontWeight.medium,
          fontSize: theme.typography.fontSize.md,
          textAlign: 'center',
        }, textStyle]}>
          {title}
        </Text>
      </AnimatedTouchable>
    );
  },
  
  Icon: ({ style, icon, disabled, onPress, accessibilityLabel, accessibilityHint, ...props }) => {
    // Animation value for press effect
    const scale = useSharedValue(1);
    
    // Create animated style
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }]
      };
    });
    
    // Handle press animations
    const handlePressIn = () => {
      scale.value = withTiming(
        theme.animations.buttonPress.scale,
        { duration: theme.animations.buttonPress.duration }
      );
    };
    
    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: theme.animations.buttonPress.duration });
    };
    
    return (
      <AnimatedTouchable 
        style={[theme.buttons.icon, disabled && theme.buttons.disabled, animatedStyle, style]} 
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...props}
      >
        {icon}
      </AnimatedTouchable>
    );
  },
  
  Danger: ({ style, textStyle, title, disabled, onPress, accessibilityLabel, accessibilityHint, ...props }) => {
    // Animation value for press effect
    const scale = useSharedValue(1);
    
    // Create animated style
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }]
      };
    });
    
    // Handle press animations
    const handlePressIn = () => {
      scale.value = withTiming(
        theme.animations.buttonPress.scale,
        { duration: theme.animations.buttonPress.duration }
      );
    };
    
    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: theme.animations.buttonPress.duration });
    };
    
    return (
      <AnimatedTouchable 
        style={[theme.buttons.danger, disabled && theme.buttons.disabled, animatedStyle, style]} 
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...props}
      >
        <Text style={[{
          color: theme.colors.textLight,
          fontWeight: theme.typography.fontWeight.medium,
          fontSize: theme.typography.fontSize.md,
          textAlign: 'center',
        }, textStyle]}>
          {title}
        </Text>
      </AnimatedTouchable>
    );
  },
};

// Card components
export const Card = {
  Primary: ({ style, children, ...props }) => (
    <View style={[theme.cards.primary, style]} {...props}>
      {children}
    </View>
  ),
  Secondary: ({ style, children, ...props }) => (
    <View style={[theme.cards.secondary, style]} {...props}>
      {children}
    </View>
  ),
  Interactive: ({ style, onPress, children, ...props }) => {
    // Animation value for press effect
    const scale = useSharedValue(1);
    
    // Create animated style
    const animatedStyle = useAnimatedStyle(() => {
      // Add safety check for scale.value
      return {
        transform: scale && scale.value !== undefined ? [{ scale: scale.value }] : [{ scale: 1 }]
      };
    });
    
    // Handle press animations
    const handlePressIn = () => {
      // Add safety check before animating
      if (scale && typeof scale.value !== 'undefined') {
        scale.value = withTiming(
          theme.animations.buttonPress.scale,
          { duration: theme.animations.buttonPress.duration }
        );
      }
    };
    
    const handlePressOut = () => {
      // Add safety check before animating
      if (scale && typeof scale.value !== 'undefined') {
        scale.value = withTiming(1, { duration: theme.animations.buttonPress.duration });
      }
    };
    
    // Use Pressable instead of TouchableOpacity to have more control over gestures
    return (
      <Animated.View 
        style={[theme.cards.interactive, animatedStyle, style]}
        {...props}
      >
        <Pressable 
          style={{ flex: 1 }}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          // Completely disable long press by not providing a handler
          android_disableSound={true}
          android_ripple={null}
          accessibilityRole="button"
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  },
};

// Enhanced Input components with animations
export const Input = {
  Primary: ({ style, label, error, helperText, accessibilityLabel, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderColor = useSharedValue(theme.colors.inputBorder);
    
    // Create animated style for focus effect
    const animatedStyle = useAnimatedStyle(() => {
      return {
        borderColor: borderColor.value,
      };
    });
    
    // Update border color based on focus state and error
    useEffect(() => {
      if (error) {
        borderColor.value = withTiming(theme.colors.error, { duration: theme.animations.inputFocus.duration });
      } else if (isFocused) {
        borderColor.value = withTiming(theme.colors.inputBorderFocused, { duration: theme.animations.inputFocus.duration });
      } else {
        borderColor.value = withTiming(theme.colors.inputBorder, { duration: theme.animations.inputFocus.duration });
      }
    }, [isFocused, error]);
    
    const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
    
    return (
      <View style={{ marginBottom: theme.spacing.xl }}>
        {label && (
          <Text 
            style={theme.inputs.label}
            accessibilityRole="text"
          >
            {label}
          </Text>
        )}
        <AnimatedTextInput
          style={[theme.inputs.primary, animatedStyle, style]}
          placeholderTextColor={theme.colors.inputPlaceholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{ disabled: props.editable === false }}
          {...props}
        />
        {error && (
          <Text style={theme.inputs.errorText} accessibilityRole="text">
            {error}
          </Text>
        )}
        {helperText && !error && (
          <Text style={theme.inputs.helperText} accessibilityRole="text">
            {helperText}
          </Text>
        )}
      </View>
    );
  },
  
  TextArea: ({ style, label, error, helperText, accessibilityLabel, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderColor = useSharedValue(theme.colors.inputBorder);
    
    // Create animated style for focus effect
    const animatedStyle = useAnimatedStyle(() => {
      return {
        borderColor: borderColor.value,
      };
    });
    
    // Update border color based on focus state and error
    useEffect(() => {
      if (error) {
        borderColor.value = withTiming(theme.colors.error, { duration: theme.animations.inputFocus.duration });
      } else if (isFocused) {
        borderColor.value = withTiming(theme.colors.inputBorderFocused, { duration: theme.animations.inputFocus.duration });
      } else {
        borderColor.value = withTiming(theme.colors.inputBorder, { duration: theme.animations.inputFocus.duration });
      }
    }, [isFocused, error]);
    
    const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
    
    return (
      <View style={{ marginBottom: theme.spacing.xl }}>
        {label && (
          <Text 
            style={theme.inputs.label}
            accessibilityRole="text"
          >
            {label}
          </Text>
        )}
        <AnimatedTextInput
          style={[theme.inputs.textArea, animatedStyle, style]}
          placeholderTextColor={theme.colors.inputPlaceholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={true}
          textAlignVertical="top"
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{ disabled: props.editable === false }}
          {...props}
        />
        {error && (
          <Text style={theme.inputs.errorText} accessibilityRole="text">
            {error}
          </Text>
        )}
        {helperText && !error && (
          <Text style={theme.inputs.helperText} accessibilityRole="text">
            {helperText}
          </Text>
        )}
      </View>
    );
  },
  
  Search: ({ style, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderColor = useSharedValue(theme.colors.inputBorder);
    
    // Create animated style for focus effect
    const animatedStyle = useAnimatedStyle(() => {
      return {
        borderColor: borderColor.value,
      };
    });
    
    // Update border color based on focus state
    useEffect(() => {
      if (isFocused) {
        borderColor.value = withTiming(theme.colors.inputBorderFocused, { duration: theme.animations.inputFocus.duration });
      } else {
        borderColor.value = withTiming(theme.colors.inputBorder, { duration: theme.animations.inputFocus.duration });
      }
    }, [isFocused]);
    
    const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
    
    return (
      <AnimatedTextInput 
        style={[theme.inputs.search, animatedStyle, style]}
        placeholderTextColor={theme.colors.inputPlaceholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityRole="search"
        {...props}
      />
    );
  },
  
  // Checkbox component with animation
  Checkbox: ({ label, value, onValueChange, disabled, accessibilityLabel, style, ...props }) => {
    const scale = useSharedValue(1);
    
    // Create animated style for checkbox press effect
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });
    
    // Handle press animations
    const handlePressIn = () => {
      scale.value = withTiming(
        theme.animations.checkbox.scale,
        { duration: theme.animations.checkbox.duration }
      );
    };
    
    const handlePressOut = () => {
      scale.value = withTiming(1, { duration: theme.animations.checkbox.duration });
    };
    
    const AnimatedView = Animated.createAnimatedComponent(View);
    
    return (
      <TouchableOpacity 
        style={[theme.inputs.checkboxContainer, style]}
        onPress={() => !disabled && onValueChange(!value)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value, disabled }}
        {...props}
      >
        <AnimatedView 
          style={[
            theme.inputs.checkbox,
            value && theme.inputs.checkboxChecked,
            disabled && theme.inputs.disabled,
            animatedStyle
          ]}
        >
          {value && (
            <Text style={{ color: theme.colors.textLight }}>✓</Text>
          )}
        </AnimatedView>
        {label && (
          <Text style={[theme.inputs.label, disabled && { color: theme.colors.textTertiary }]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  },
};

// Layout components
export const Layout = {
  Screen: ({ style, children, ...props }) => (
    <View 
      style={[{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
      }, style]} 
      {...props}
    >
      {children}
    </View>
  ),
  Row: ({ style, children, ...props }) => (
    <View 
      style={[{
        flexDirection: 'row',
        alignItems: 'center',
      }, style]} 
      {...props}
    >
      {children}
    </View>
  ),
  Column: ({ style, children, ...props }) => (
    <View 
      style={[{
        flexDirection: 'column',
      }, style]} 
      {...props}
    >
      {children}
    </View>
  ),
  Spacer: ({ size = 'md' }) => (
    <View style={{ height: theme.spacing[size] }} />
  ),
  Divider: ({ style, ...props }) => (
    <View 
      style={[{
        height: 1,
        backgroundColor: theme.colors.divider,
        marginVertical: theme.spacing.md,
      }, style]} 
      {...props}
    />
  ),
};

// Create a function to generate styles using the theme
export const createThemedStyles = (styleFunction) => {
  try {
    // Get the styles from the style function
    const styles = styleFunction(theme);
    
    // Process the styles to handle any Platform.select calls
    const processStyles = (styleObj) => {
      if (!styleObj) return styleObj;
      
      return Object.entries(styleObj).reduce((result, [key, value]) => {
        if (value && typeof value === 'object' && value.select) {
          // This value has a 'select' method. Attempt to call it.
          // This is where the error might originate if value.select uses a non-existent Platform.
          try {
            // The original call was value.select({ ios: true, android: true });
            // This argument pattern is unusual for a typical Platform.select replacement.
            // We'll keep it if it's an intentional custom API for this app.
            result[key] = value.select({ ios: true, android: true });
          } catch (e) {
            console.warn(
              `Error executing 'select' method for style key "${key}":`,
              e.message,
              "Falling back to the original value or a sensible default."
            );
            // Fallback: use the value object itself, or try to find a 'default' property if it exists
            result[key] = value.default !== undefined ? value.default : value;
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Recursively process nested objects
          result[key] = processStyles(value);
        } else {
          // Keep the value as is
          result[key] = value;
        }
        return result;
      }, {});
    };
    
    // Process the styles and create the StyleSheet
    const processedStyles = processStyles(styles);
    return StyleSheet.create(processedStyles);
  } catch (error) {
    console.error('Error creating themed styles:', error.message, error.stack); // Log more details
    return StyleSheet.create({});
  }
};

// Export a helper to access theme directly
export { theme };
