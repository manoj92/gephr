#!/bin/bash

# Humanoid Training Platform - iOS Build Script (Final)
# Navigate to the correct directory and build for iOS

set -e

echo "🤖 Humanoid Training Platform - iOS Build"
echo "========================================"

# Navigate to the correct directory
cd "$(dirname "$0")"

# Check if this is the correct project directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Check project configuration
echo "🔍 Checking project configuration..."
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found. Project not properly configured."
    exit 1
fi

# Check if logged in to EAS
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS. Please run:"
    echo "   eas login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Get build type from argument or default to development
BUILD_TYPE=${1:-development}

echo "🚀 Starting $BUILD_TYPE build for iOS..."
echo ""

case $BUILD_TYPE in
    "development")
        echo "📱 Building development version..."
        echo "   - Development client enabled"
        echo "   - Local build for faster iteration"
        echo ""
        eas build --platform ios --profile development --local --clear-cache
        ;;
    "preview")
        echo "📱 Building preview version..."
        echo "   - Production-like build"
        echo "   - Good for TestFlight distribution"
        echo ""
        eas build --platform ios --profile preview --clear-cache
        ;;
    "production")
        echo "📱 Building production version..."
        echo "   - Optimized for App Store"
        echo "   - Cloud build for consistency"
        echo ""
        eas build --platform ios --profile production --clear-cache
        ;;
    "simulator")
        echo "📱 Building iOS Simulator version..."
        echo "   - For testing in Xcode Simulator"
        echo ""
        eas build --platform ios --profile preview --local --clear-cache
        ;;
    *)
        echo "❌ Invalid build type: $BUILD_TYPE"
        echo ""
        echo "Usage: $0 [build-type]"
        echo ""
        echo "Available build types:"
        echo "  development  - Local build with development client"
        echo "  preview      - Cloud build for TestFlight"
        echo "  production   - Cloud build for App Store"
        echo "  simulator    - Local build for iOS Simulator"
        echo ""
        echo "Example: $0 development"
        exit 1
        ;;
esac

echo ""
echo "✅ iOS build completed successfully!"
echo ""
echo "📋 Next steps:"
case $BUILD_TYPE in
    "development"|"simulator")
        echo "   1. Install the build on your device/simulator"
        echo "   2. Start the development server: npx expo start --dev-client"
        echo "   3. Open the app and shake device to open developer menu"
        ;;
    "preview")
        echo "   1. Download the .ipa file from EAS dashboard"
        echo "   2. Upload to TestFlight for distribution"
        echo "   3. Or install directly on registered devices"
        ;;
    "production")
        echo "   1. Download the .ipa file from EAS dashboard"
        echo "   2. Submit to App Store: eas submit --platform ios"
        echo "   3. Fill out App Store Connect information"
        echo "   4. Submit for App Store review"
        ;;
esac

echo ""
echo "🔗 Useful links:"
echo "   EAS Dashboard: https://expo.dev/"
echo "   Build logs: eas build:list"
echo "   iOS Build Guide: ./iOS-BUILD-GUIDE.md"
echo ""
echo "🎉 Happy robot training!"