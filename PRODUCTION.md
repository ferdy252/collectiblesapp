# CollectibleTrackerApp Production Guide

This guide explains how to prepare and build your CollectibleTrackerApp for production deployment to app stores.

## Prerequisites

- Expo account (sign up at https://expo.dev)
- Apple Developer account (for iOS builds)
- Google Play Developer account (for Android builds)
- Firebase project (for analytics)

## Setup Process

### 1. Environment Configuration

The app is configured to work with three environments:

- **Development**: For local testing with debugging enabled
- **Preview**: For internal testing with analytics enabled
- **Production**: For App Store/Google Play with full features

Environment settings are managed in `config/environment.js`.

### 2. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Add iOS and Android apps to your Firebase project
3. Download configuration files:
   - `google-services.json` (for Android)
   - `GoogleService-Info.plist` (for iOS)
4. Place these files in your project root

### 3. Push Notifications

For iOS push notifications:

1. Generate an APNs key in your Apple Developer account
2. Upload it to your Expo project in the Expo dashboard

Notifications are already configured in the code to work with EAS builds.

## Building for Production

### Using the Build Script

We've created a convenient build script to streamline the process:

```bash
./scripts/build.sh
```

This interactive script lets you choose which platform to build for and which environment to use.

### Manual Build Commands

Alternatively, you can run the EAS build commands directly:

```bash
# For iOS production build
eas build --platform ios --profile production

# For Android production build
eas build --platform android --profile production

# For development client
eas build --profile development
```

## Submitting to App Stores

After building your app, you can submit it to the app stores:

```bash
# For iOS App Store
eas submit -p ios

# For Google Play Store
eas submit -p android
```

## Troubleshooting

### Common Issues

1. **Push Notification Errors**: Make sure you've uploaded your APNs key to Expo and configured your `app.json` correctly.

2. **Analytics Not Working**: Verify your Firebase configuration files are correctly placed and that the app is built with EAS (not Expo Go).

3. **Build Failures**: Check the EAS build logs for specific errors. Common issues include:
   - Missing credentials
   - Invalid configuration
   - Dependency conflicts

## Additional Resources

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)

## Maintenance

After deploying to production, remember to:

1. Monitor Firebase Analytics for user behavior
2. Set up Firebase Crashlytics to track app crashes
3. Plan for regular updates using EAS Update or new builds
