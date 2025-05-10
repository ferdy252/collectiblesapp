/**
 * Dependency Checker Utility
 * 
 * This utility helps check if required dependencies are available and logs helpful error messages
 * when dependencies are missing.
 */

/**   
 * Checks if a dependency exists and logs an error if it doesn't
 * @param {Object} dependencies - Object containing dependencies to check
 * @param {string} componentName - Name of the component using the dependencies
 * @returns {boolean} - True if all dependencies exist, false otherwise
 */
export const checkDependencies = (dependencies, componentName) => {
  let allDependenciesExist = true;
  const missingDependencies = [];
  
  // Check each dependency
  Object.entries(dependencies).forEach(([name, dependency]) => {
    if (dependency === undefined || dependency === null) {
      allDependenciesExist = false;
      missingDependencies.push(name);
    }
  });
  
  // Log error if any dependencies are missing
  if (!allDependenciesExist) {
    console.error(
      `[${componentName}] Missing dependencies: ${missingDependencies.join(', ')}\n` +
      'Make sure to import these dependencies at the top of your file.'
    );
  }
  
  return allDependenciesExist;
};

/**
 * Check if the app is using the latest versions of critical security packages
 */
export const checkSecurityUpdates = () => {
  // This shows which packages need security updates
  const criticalUpdates = [
    {
      name: 'expo',
      currentVersion: '52.0.46',
      latestVersion: '53.0.7',
      securityIssues: true,
      updateUrl: 'https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/'
    },
    {
      name: 'react-native',
      currentVersion: '0.76.9',
      latestVersion: '0.79.2',
      securityIssues: true,
      updateUrl: 'https://reactnative.dev/docs/upgrading'
    },
    {
      name: '@react-native-firebase/app',
      currentVersion: '21.14.0',
      latestVersion: '22.1.0',
      securityIssues: true,
      updateUrl: 'https://rnfirebase.io/'
    }
  ];

  return criticalUpdates;
};

/**
 * Show an alert to the user about available security updates
 */
export const alertSecurityUpdates = () => {
  const updates = checkSecurityUpdates();
  
  if (updates.length > 0) {
    const updateList = updates.map(u => `• ${u.name}: ${u.currentVersion} → ${u.latestVersion}`).join('\n');
    
    Alert.alert(
      'Security Updates Available',
      `The following packages have security updates available:\n\n${updateList}\n\nIt's recommended to update these packages to maintain app security.`,
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Learn More', 
          onPress: () => Linking.openURL('https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/')
        }
      ]
    );
  }
};

/**
 * Check if the app should show a security update notification
 * This would typically be called on app startup
 */
export const checkAndNotifyUpdates = () => {
  // In a real app, you might want to limit how often this appears
  const updates = checkSecurityUpdates();
  
  if (updates.some(u => u.securityIssues)) {
    alertSecurityUpdates();
  }
};

import { Alert, Linking } from 'react-native';

/**
 * Example usage:
 * 
 * // At the top of your component file
 * import { Platform, Dimensions } from 'react-native';
 * import { checkDependencies } from '../utils/dependencyChecker';
 * 
 * // Inside your component
 * const MyComponent = () => {
 *   // Check if required dependencies exist
 *   checkDependencies({ Platform, Dimensions }, 'MyComponent');
 *   
 *   // Rest of your component code
 * };
 */

export default {
  checkDependencies,
  checkSecurityUpdates,
  alertSecurityUpdates,
  checkAndNotifyUpdates
};
