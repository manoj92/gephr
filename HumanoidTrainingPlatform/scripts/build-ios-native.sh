#!/bin/bash

# 🍎 Native iOS Xcode Build Script for Humanoid Training Platform
# Builds the app using React Native CLI and Xcode

set -e

echo "🍎 Starting Native iOS Build for Humanoid Training Platform..."
echo "=============================================================="

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

# Check for CocoaPods
if ! command -v pod &> /dev/null; then
    print_warning "CocoaPods not found. Installing..."
    if command -v gem &> /dev/null; then
        sudo gem install cocoapods
    elif command -v brew &> /dev/null; then
        brew install cocoapods
    else
        print_error "Cannot install CocoaPods. Install manually."
        exit 1
    fi
fi

print_success "CocoaPods detected ✓"

# Parse arguments
BUILD_TYPE="Debug"
OPEN_XCODE=false
CLEAN_BUILD=false
DEVICE=""
SIMULATOR=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --release) BUILD_TYPE="Release"; shift ;;
        --open-xcode) OPEN_XCODE=true; shift ;;
        --clean) CLEAN_BUILD=true; shift ;;
        --device) DEVICE="$2"; shift 2 ;;
        --simulator) SIMULATOR="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --release         Build release version"
            echo "  --open-xcode      Open Xcode after build"
            echo "  --clean           Clean build before starting"
            echo "  --device NAME     Target specific device"
            echo "  --simulator NAME  Target specific simulator"
            echo "Examples:"
            echo "  $0                               # Debug build"
            echo "  $0 --release                    # Release build"
            echo "  $0 --simulator \"iPhone 15 Pro\"  # Simulator build"
            echo "  $0 --clean --open-xcode         # Clean build and open Xcode"
            exit 0
            ;;
        *) print_error "Unknown option: $1"; exit 1 ;;
    esac
done

print_status "Configuration:"
echo "  Build Type: $BUILD_TYPE"
echo "  Clean Build: $CLEAN_BUILD"
echo "  Open Xcode: $OPEN_XCODE"
echo "  Device: ${DEVICE:-Auto}"
echo "  Simulator: ${SIMULATOR:-Auto}"

# Install dependencies
print_status "Installing Node dependencies..."
npm install --silent
print_success "Dependencies installed ✓"

# Install CocoaPods dependencies
print_status "Installing CocoaPods dependencies..."
cd ios && pod install && cd ..
print_success "CocoaPods dependencies installed ✓"

# Clean build if requested
if [[ "$CLEAN_BUILD" == true ]]; then
    print_status "Cleaning previous builds..."
    cd ios && xcodebuild clean && cd ..
    print_success "Clean completed ✓"
fi

# Build with React Native CLI
print_status "Building with React Native CLI..."

if [[ -n "$DEVICE" ]]; then
    if [[ "$BUILD_TYPE" == "Release" ]]; then
        npx react-native run-ios --device "$DEVICE" --configuration Release
    else
        npx react-native run-ios --device "$DEVICE"
    fi
elif [[ -n "$SIMULATOR" ]]; then
    if [[ "$BUILD_TYPE" == "Release" ]]; then
        npx react-native run-ios --simulator "$SIMULATOR" --configuration Release
    else
        npx react-native run-ios --simulator "$SIMULATOR"
    fi
else
    if [[ "$BUILD_TYPE" == "Release" ]]; then
        npx react-native run-ios --configuration Release
    else
        npx react-native run-ios
    fi
fi

print_success "🎉 Native iOS build completed!"

# Open Xcode if requested
if [[ "$OPEN_XCODE" == true ]]; then
    print_status "Opening Xcode..."
    open ios/GephrLabsHumanoidTrainingPlatform.xcworkspace
    print_success "Xcode opened ✓"
fi

echo "=============================================================="
echo "🚀 Your Humanoid Training Platform is ready!"
echo ""
print_status "Build artifacts:"
echo "  - App: ios/build/Build/Products/$BUILD_TYPE-iphonesimulator/"
echo "  - Workspace: ios/GephrLabsHumanoidTrainingPlatform.xcworkspace"

print_status "Useful commands:"
echo "  xcrun simctl list              # List available simulators"
echo "  npm run xcode                  # Open Xcode workspace"
echo "  npm run clean-ios              # Clean iOS build"
echo ""
print_success "🎯 Ready for native iOS development!"