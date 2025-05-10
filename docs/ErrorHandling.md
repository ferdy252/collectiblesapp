# Error Handling System

## Overview

This document explains the error handling system implemented in the CollectibleTrackerApp. The system follows best practices by displaying user-friendly error messages while logging detailed technical information for developers.

## Key Components

### 1. Error Handler Utility (`utils/errorHandler.js`)

The central utility for handling errors throughout the app. It:

- Logs detailed error information for developers (including stack traces)
- Displays user-friendly messages through Toast notifications
- Categorizes errors by type
- Provides helper functions for common error handling scenarios

### 2. Error Boundary Component (`components/ErrorBoundary.js`)

A React component that catches JavaScript errors in the component tree, preventing the entire app from crashing. It:

- Displays a user-friendly error screen when unhandled errors occur
- Logs detailed error information for debugging
- Provides a "Try Again" button to recover from errors

### 3. Error Display Component (`components/ErrorDisplay.js`)

A reusable component for displaying error states within screens. It:

- Shows an error icon and message
- Optionally provides a retry button
- Can be styled to match different contexts

## How to Use

### Basic Error Handling

```javascript
try {
  // Your code that might throw an error
} catch (error) {
  handleError(
    error,                       // The error object
    'ComponentName.functionName', // Where the error occurred
    ERROR_CATEGORIES.DATABASE,    // Category of error
    'User-friendly message'       // Message to show to the user
  );
}
```

### Error Categories

The system defines these error categories:

- `NETWORK`: Network connection issues
- `AUTH`: Authentication and authorization errors
- `DATABASE`: Data storage and retrieval errors
- `VALIDATION`: Input validation errors
- `PERMISSION`: Permission-related errors
- `UNKNOWN`: Fallback for uncategorized errors

### Displaying Errors in UI

For components that need to show error states in the UI:

1. Add error state variables:
```javascript
const [hasError, setHasError] = useState(false);
const [errorMessage, setErrorMessage] = useState('');
```

2. Update error state in catch blocks:
```javascript
catch (error) {
  handleError(error, 'context', category, 'message');
  setHasError(true);
  setErrorMessage('User-friendly message');
}
```

3. Display the error in your component:
```jsx
{hasError && (
  <ErrorDisplay 
    message={errorMessage}
    onRetry={() => {
      setHasError(false);
      // Retry logic here
    }}
  />
)}
```

## Best Practices

1. **Never expose technical details** to users - use the error handler to log these for developers only

2. **Be specific about error context** - always include the component and function name in the error context

3. **Categorize errors properly** - this helps with error tracking and analytics

4. **Provide recovery options** when possible - use the `onRetry` prop of ErrorDisplay

5. **Use clear, actionable messages** - tell users what went wrong and what they can do about it

6. **Handle offline scenarios** - check for network connectivity and provide appropriate feedback

## Example Implementation

See the following files for examples of the error handling system in use:

- `screens/AddItemScreen.js` - Uses error handling for form submission and data fetching
- `screens/AuthScreen.js` - Implements error handling for authentication flows
- `App.js` - Wraps the entire app in an ErrorBoundary for global error catching
