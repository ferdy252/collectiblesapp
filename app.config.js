// app.config.js - Dynamic configuration for Expo
import { config } from "@expo/config";

export default ({ config: defaultConfig }) => {
  // Get the environment from the process
  const appEnv = process.env.APP_ENV || 'development';
  console.log(`Building app for environment: ${appEnv}`);
  
  // Base configuration from app.json
  const appConfig = defaultConfig;
  
  // Add environment-specific configuration
  return {
    ...appConfig,
    extra: {
      ...appConfig.extra,
      APP_ENV: appEnv,
      // Add Gemini API key from environment variables
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      // Add any other environment variables you need here
    },
    // You can override any app.json settings here based on environment
    // For example:
    updates: {
      ...appConfig.updates,
      enabled: appEnv === 'production', // Only enable OTA updates in production
      fallbackToCacheTimeout: 0
    },
    hooks: {
      postPublish: [
        {
          file: "sentry-expo/upload-sourcemaps",
          config: {
            organization: "your-organization",
            project: "collectible-tracker-app",
            authToken: process.env.SENTRY_AUTH_TOKEN,
          },
        },
      ],
    },
  };
};
