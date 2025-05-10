#!/bin/bash

# Build script for CollectibleTrackerApp

# Colors for better output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# Function to print colored output
echo_color() {
  echo -e "${1}${2}${NC}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if EAS CLI is installed
if ! command_exists eas; then
  echo_color "$YELLOW" "EAS CLI not found. Installing..."
  npm install -g eas-cli
fi

# Check if user is logged in to EAS
eas whoami &>/dev/null
if [ $? -ne 0 ]; then
  echo_color "$YELLOW" "You need to log in to EAS first."
  eas login
fi

# Function to build for a specific platform
build_platform() {
  local platform=$1
  local profile=$2
  
  echo_color "$BLUE" "\n📱 Building for $platform ($profile)..."
  
  # Set environment variables
  export APP_ENV="$profile"
  
  # Run the build
  eas build --platform $platform --profile $profile
  
  if [ $? -eq 0 ]; then
    echo_color "$GREEN" "✅ $platform build ($profile) completed successfully!"
  else
    echo_color "$RED" "❌ $platform build ($profile) failed!"
    exit 1
  fi
}

# Main menu
echo_color "$BLUE" "\n🚀 CollectibleTrackerApp Build Tool 🚀\n"

PS3="Select an option: "
options=("Build for iOS (Production)" "Build for Android (Production)" "Build for both platforms (Production)" "Build Development Client" "Preview Build" "Exit")

select opt in "${options[@]}"; do
  case $opt in
    "Build for iOS (Production)")
      build_platform "ios" "production"
      break
      ;;
    "Build for Android (Production)")
      build_platform "android" "production"
      break
      ;;
    "Build for both platforms (Production)")
      build_platform "all" "production"
      break
      ;;
    "Build Development Client")
      echo_color "$BLUE" "\n📱 Building development client..."
      export APP_ENV="development"
      eas build --profile development
      break
      ;;
    "Preview Build")
      echo_color "$BLUE" "\n📱 Building preview..."
      export APP_ENV="preview"
      eas build --profile preview
      break
      ;;
    "Exit")
      echo_color "$BLUE" "Goodbye! 👋"
      exit 0
      ;;
    *) 
      echo_color "$RED" "Invalid option $REPLY"
      ;;
  esac
done

echo_color "$GREEN" "\n✨ Build process completed! ✨\n"
echo_color "$BLUE" "You can view your builds at: https://expo.dev/accounts/[your-account]/projects/CollectibleTrackerApp/builds"
