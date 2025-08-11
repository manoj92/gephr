#!/bin/bash

# Humanoid Training Platform - iOS Build Script
# This script handles the complete iOS build process

set -e

echo "🤖 Starting iOS build for Humanoid Training Platform..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    echo "🔐 Please login to EAS first:"
    echo "Run: eas login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .expo
rm -rf node_modules/.cache

# Prebuild for iOS
echo "🔧 Running prebuild for iOS..."
npx expo prebuild --platform ios --clean

# Start the build process
echo "🚀 Starting iOS build..."

# Check build type
BUILD_TYPE=${1:-development}

case $BUILD_TYPE in
    "development")
        echo "Building development version..."
        eas build --platform ios --profile development --local
        ;;
    "preview")
        echo "Building preview version..."
        eas build --platform ios --profile preview --local
        ;;
    "production")
        echo "Building production version..."
        eas build --platform ios --profile production
        ;;
    "simulator")
        echo "Building iOS Simulator version..."
        eas build --platform ios --profile preview --local
        ;;
    *)
        echo "❌ Invalid build type. Use: development, preview, production, or simulator"
        exit 1
        ;;
esac

echo "✅ iOS build completed successfully!"
echo ""
echo "📱 Next steps:"
case $BUILD_TYPE in
    "development"|"preview"|"simulator")
        echo "  - Install the .app file on your device/simulator"
        echo "  - Run: npx expo start --dev-client"
        ;;
    "production")
        echo "  - Download the .ipa file from EAS dashboard"
        echo "  - Submit to App Store: eas submit --platform ios"
        ;;
esac