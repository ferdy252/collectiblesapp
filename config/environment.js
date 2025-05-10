// Environment configuration for different build types

const ENV = {
  development: {
    apiUrl: 'https://dev-api.example.com',
    enableAnalytics: false,
    enableNotifications: true,
    loggingEnabled: true
  },
  preview: {
    apiUrl: 'https://staging-api.example.com',
    enableAnalytics: true,
    enableNotifications: true,
    loggingEnabled: true
  },
  production: {
    apiUrl: 'https://api.example.com',
    enableAnalytics: true,
    enableNotifications: true,
    loggingEnabled: false
  }
};

// Get the environment from the app.config.js or default to development
import Constants from 'expo-constants';
const getEnvVars = () => {
  const appEnv = Constants.expoConfig?.extra?.APP_ENV || process.env.APP_ENV || 'development';
  return ENV[appEnv] || ENV.development;
};

export default getEnvVars();
