#!/bin/bash

# 🍎 iOS Build Script for Humanoid Training Platform
# Enhanced build script with multiple options

set -e

echo "🍎 Starting iOS Build for Humanoid Training Platform..."
echo "======================================================="

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

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "iOS builds require macOS"
    exit 1
fi

# Check Xcode installation
if ! command -v xcodebuild &> /dev/null; then
    print_error "Xcode not found. Install from App Store."
    exit 1
fi

print_success "Xcode detected ✓"

# Parse arguments
BUILD_TYPE="development"
LOCAL_BUILD=true
DEVICE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --production) BUILD_TYPE="production"; shift ;;
        --cloud) LOCAL_BUILD=false; shift ;;
        --device) DEVICE="$2"; shift 2 ;;
        --simulator) DEVICE="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --production       Build production version"
            echo "  --cloud           Use cloud build (EAS)"
            echo "  --device NAME     Target specific device"
            echo "  --simulator NAME  Target simulator"
            echo "Examples:"
            echo "  $0                                # Local dev build"
            echo "  $0 --production --cloud          # Cloud production build"
            echo "  $0 --simulator \"iPhone 15 Pro\"  # Simulator build"
            exit 0
            ;;
        *) print_error "Unknown option: $1"; exit 1 ;;
    esac
done

print_status "Configuration:"
echo "  Build Type: $BUILD_TYPE"
echo "  Local Build: $LOCAL_BUILD"
echo "  Device: ${DEVICE:-Auto}"

# Install dependencies
print_status "Installing dependencies..."
npm install --silent
print_success "Dependencies installed ✓"

# Choose build method
if [[ "$LOCAL_BUILD" == true ]]; then
    print_status "Starting local build with Expo CLI..."
    
    if [[ -n "$DEVICE" ]]; then
        if [[ "$BUILD_TYPE" == "production" ]]; then
            npx expo run:ios --device "$DEVICE" --configuration Release
        else
            npx expo run:ios --device "$DEVICE"
        fi
    else
        if [[ "$BUILD_TYPE" == "production" ]]; then
            npx expo run:ios --configuration Release
        else
            npx expo run:ios
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
            eas build --platform ios --profile production
            ;;
        *)
            eas build --platform ios --profile development
            ;;
    esac
fi

print_success "🎉 iOS build completed!"
echo "======================================================="
echo "🚀 Your Humanoid Training Platform is ready!"
echo ""

if [[ "$LOCAL_BUILD" == true ]]; then
    print_status "The app is now running on your device/simulator"
    echo "To debug: npx expo start --dev-client"
else
    print_status "Download your build from: https://expo.dev/accounts/[username]/projects/humanoid-training-platform/builds"
fi