// components/ErrorBoundary.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { handleError } from '../utils/errorHandler';
import { useTheme } from '../context/ThemeContext';

/**
 * Error screen shown to users when an unhandled error occurs
 */
function ErrorScreen({ resetError, errorInfo }) {
  const { theme, isDarkMode } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={80} color={theme.colors.error} />
        </View>
        
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Something went wrong
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          We're sorry, but the app has encountered an unexpected error.
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={resetError}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Error boundary component that catches JavaScript errors in its child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console for developers
    handleError(
      error,
      'ErrorBoundary.componentDidCatch',
      undefined,
      'Something went wrong. The app will try to recover.',
      false // Don't show toast since we're showing the error screen
    );
    
    this.setState({ errorInfo });
    
    // You could also log to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <ErrorScreen 
          resetError={this.resetError} 
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
