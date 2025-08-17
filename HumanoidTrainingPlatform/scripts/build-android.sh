#!/bin/bash

# 🤖 Android Build Script for Humanoid Training Platform
# Enhanced build script with multiple options

set -e

echo "🤖 Starting Android Build for Humanoid Training Platform..."
echo "=========================================================="

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
    
    # Check common Android SDK locations
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
BUILD_TYPE="development"
LOCAL_BUILD=true
DEVICE=""
VARIANT="debug"

while [[ $# -gt 0 ]]; do
    case $1 in
        --production) BUILD_TYPE="production"; VARIANT="release"; shift ;;
        --cloud) LOCAL_BUILD=false; shift ;;
        --device) DEVICE="$2"; shift 2 ;;
        --emulator) DEVICE="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --production       Build production version"
            echo "  --cloud           Use cloud build (EAS)"
            echo "  --device NAME     Target specific device"
            echo "  --emulator NAME   Target emulator"
            echo "Examples:"
            echo "  $0                                # Local dev build"
            echo "  $0 --production --cloud          # Cloud production build"
            echo "  $0 --emulator Pixel_7_API_34     # Emulator build"
            exit 0
            ;;
        *) print_error "Unknown option: $1"; exit 1 ;;
    esac
done

print_status "Configuration:"
echo "  Build Type: $BUILD_TYPE"
echo "  Local Build: $LOCAL_BUILD"
echo "  Variant: $VARIANT"
echo "  Device: ${DEVICE:-Auto}"

# Install dependencies
print_status "Installing dependencies..."
npm install --silent
print_success "Dependencies installed ✓"

# Choose build method
if [[ "$LOCAL_BUILD" == true ]]; then
    print_status "Starting local build with Expo CLI..."
    
    # Check if device/emulator is available
    if [[ -n "$DEVICE" ]]; then
        print_status "Checking for device/emulator: $DEVICE"
        if command -v adb &> /dev/null; then
            # Check connected devices
            if adb devices | grep -q "device\|emulator"; then
                print_success "Device/emulator found ✓"
            else
                print_warning "No devices/emulators found running"
                print_status "Starting emulator..."
                if command -v emulator &> /dev/null; then
                    emulator -avd "$DEVICE" &
                    sleep 10
                fi
            fi
        fi
        
        if [[ "$BUILD_TYPE" == "production" ]]; then
            npx expo run:android --device "$DEVICE" --variant release
        else
            npx expo run:android --device "$DEVICE" --variant debug
        fi
    else
        if [[ "$BUILD_TYPE" == "production" ]]; then
            npx expo run:android --variant release
        else
            npx expo run:android --variant debug
        fi
    fi
else
    # Cloud build with EAS
    print_status "Starting cloud build with EAS..."
    
    if ! command -v eas &> /dev/null; then
        print_status "Installing EAS CLI..."
        npm install -g eas-cli
    fi
    
    case $BUILD_TYPE in
        "production")
            eas build --platform android --profile production
            ;;
        *)
            eas build --platform android --profile development
            ;;
    esac
fi

print_success "🎉 Android build completed!"
echo "=========================================================="
echo "🚀 Your Humanoid Training Platform is ready!"
echo ""

if [[ "$LOCAL_BUILD" == true ]]; then
    print_status "The app is now running on your device/emulator"
    echo "APK location: android/app/build/outputs/apk/$VARIANT/"
    echo "To debug: npx expo start --dev-client"
    echo ""
    print_status "Useful commands:"
    echo "  adb devices                    # List connected devices"
    echo "  adb logcat                     # View device logs"
    echo "  emulator -list-avds            # List available emulators"
else
    print_status "Download your build from: https://expo.dev/accounts/[username]/projects/humanoid-training-platform/builds"
fi

print_status "Build artifacts:"
if [[ "$BUILD_TYPE" == "production" ]]; then
    echo "  - APK: android/app/build/outputs/apk/release/app-release.apk"
    echo "  - AAB: android/app/build/outputs/bundle/release/app-release.aab"
else
    echo "  - APK: android/app/build/outputs/apk/debug/app-debug.apk"
fi