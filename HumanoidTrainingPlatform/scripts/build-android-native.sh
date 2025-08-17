#!/bin/bash

# 🤖 Native Android Studio Build Script for Humanoid Training Platform
# Builds the app using React Native CLI and Android Studio/Gradle

set -e

echo "🤖 Starting Native Android Build for Humanoid Training Platform..."
echo "================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check for Java
if ! command -v java &> /dev/null; then
    print_error "Java not found. Install JDK 11 or 17"
    echo "Install with: brew install openjdk@11"
    exit 1
fi

print_success "Java detected ✓"

# Check for Android SDK
if [[ -z "$ANDROID_HOME" ]]; then
    print_warning "ANDROID_HOME not set. Checking common locations..."
    
    POSSIBLE_PATHS=(
        "$HOME/Library/Android/sdk"
        "$HOME/Android/Sdk"
        "/opt/android-sdk"
        "/usr/local/android-sdk"
    )
    
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [[ -d "$path" ]]; then
            export ANDROID_HOME="$path"
            export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools"
            print_success "Found Android SDK at: $path"
            break
        fi
    done
    
    if [[ -z "$ANDROID_HOME" ]]; then
        print_error "Android SDK not found. Please install Android Studio."
        echo "Download from: https://developer.android.com/studio"
        exit 1
    fi
else
    print_success "Android SDK detected ✓"
fi

# Parse arguments
BUILD_TYPE="debug"
OPEN_STUDIO=false
CLEAN_BUILD=false
DEVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --release) BUILD_TYPE="release"; shift ;;
        --open-studio) OPEN_STUDIO=true; shift ;;
        --clean) CLEAN_BUILD=true; shift ;;
        --device) DEVICE="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --release         Build release version"
            echo "  --open-studio     Open Android Studio after build"
            echo "  --clean           Clean build before starting"
            echo "  --device NAME     Target specific device"
            echo "Examples:"
            echo "  $0                        # Debug build"
            echo "  $0 --release             # Release build"
            echo "  $0 --clean --open-studio # Clean build and open Android Studio"
            exit 0
            ;;
        *) print_error "Unknown option: $1"; exit 1 ;;
    esac
done

print_status "Configuration:"
echo "  Build Type: $BUILD_TYPE"
echo "  Clean Build: $CLEAN_BUILD"
echo "  Open Studio: $OPEN_STUDIO"
echo "  Device: ${DEVICE:-Auto}"

# Install dependencies
print_status "Installing Node dependencies..."
npm install --silent
print_success "Dependencies installed ✓"

# Clean build if requested
if [[ "$CLEAN_BUILD" == true ]]; then
    print_status "Cleaning previous builds..."
    cd android && ./gradlew clean && cd ..
    print_success "Clean completed ✓"
fi

# Build with React Native CLI
print_status "Building with React Native CLI..."

if [[ -n "$DEVICE" ]]; then
    if [[ "$BUILD_TYPE" == "release" ]]; then
        npx react-native run-android --variant release --deviceId "$DEVICE"
    else
        npx react-native run-android --variant debug --deviceId "$DEVICE"
    fi
else
    if [[ "$BUILD_TYPE" == "release" ]]; then
        npx react-native run-android --variant release
    else
        npx react-native run-android --variant debug
    fi
fi

print_success "🎉 Native Android build completed!"

# Open Android Studio if requested
if [[ "$OPEN_STUDIO" == true ]]; then
    print_status "Opening Android Studio..."
    open -a "Android Studio" android
    print_success "Android Studio opened ✓"
fi

echo "================================================================="
echo "🚀 Your Humanoid Training Platform is ready!"
echo ""
print_status "Build artifacts:"
if [[ "$BUILD_TYPE" == "release" ]]; then
    echo "  - APK: android/app/build/outputs/apk/release/app-release.apk"
    echo "  - AAB: android/app/build/outputs/bundle/release/app-release.aab"
else
    echo "  - APK: android/app/build/outputs/apk/debug/app-debug.apk"
fi

print_status "Useful commands:"
echo "  adb devices                    # List connected devices"
echo "  adb logcat                     # View device logs"
echo "  npm run android-studio         # Open Android Studio"
echo "  npm run clean-android          # Clean Android build"
echo ""
print_success "🎯 Ready for native Android development!"