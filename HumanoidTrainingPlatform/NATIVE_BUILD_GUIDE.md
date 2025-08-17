# 📱 Native Build Guide - Android Studio & Xcode

This guide shows you how to build the Humanoid Training Platform using native Android Studio and Xcode tools instead of Expo.

## 🚀 Quick Start

### For Android Studio:
```bash
npm run build-android         # Build with script
npm run android-studio        # Open Android Studio
npm run android               # Direct React Native CLI build
```

### For Xcode:
```bash
npm run build-ios             # Build with script  
npm run xcode                 # Open Xcode workspace
npm run ios                   # Direct React Native CLI build
```

## 🛠 Prerequisites

### Android Development
- **Android Studio** (latest version)
- **Java JDK 11 or 17**
- **Android SDK 30+**
- **Android Build Tools**

### iOS Development  
- **macOS** (required)
- **Xcode 15+**
- **iOS 13.4+ SDK**
- **CocoaPods**

## 📋 Setup Instructions

### 1. Install Android Studio
```bash
# Download from: https://developer.android.com/studio
# Or using Homebrew:
brew install --cask android-studio

# Set environment variables (add to ~/.zshrc):
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### 2. Install Xcode (macOS only)
```bash
# Install from Mac App Store
# Or download from: https://developer.apple.com/xcode/

# Install Xcode Command Line Tools:
xcode-select --install

# Install CocoaPods:
sudo gem install cocoapods
# Or via Homebrew:
brew install cocoapods
```

### 3. Setup React Native CLI
```bash
# Install React Native CLI globally
npm install -g @react-native-community/cli

# Install dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..
```

## 🤖 Android Studio Builds

### Option 1: Using Build Script (Recommended)
```bash
# Debug build
./scripts/build-android-native.sh

# Release build  
./scripts/build-android-native.sh --release

# Clean build with Android Studio
./scripts/build-android-native.sh --clean --open-studio

# Build for specific device
./scripts/build-android-native.sh --device "emulator-5554"
```

### Option 2: Direct React Native CLI
```bash
# Debug build
npx react-native run-android

# Release build
npx react-native run-android --variant release

# Specific device
npx react-native run-android --deviceId "your-device-id"
```

### Option 3: Manual Android Studio
```bash
# Open Android Studio
npm run android-studio

# In Android Studio:
# 1. Open the 'android' folder
# 2. Wait for Gradle sync
# 3. Select device/emulator
# 4. Click Run button (green play)
```

### Android Build Outputs
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **Release AAB**: `android/app/build/outputs/bundle/release/app-release.aab`

## 🍎 Xcode Builds

### Option 1: Using Build Script (Recommended)
```bash
# Debug build
./scripts/build-ios-native.sh

# Release build
./scripts/build-ios-native.sh --release

# Clean build with Xcode
./scripts/build-ios-native.sh --clean --open-xcode

# Build for specific simulator
./scripts/build-ios-native.sh --simulator "iPhone 15 Pro"

# Build for device
./scripts/build-ios-native.sh --device "Your iPhone"
```

### Option 2: Direct React Native CLI
```bash
# Debug build
npx react-native run-ios

# Release build
npx react-native run-ios --configuration Release

# Specific simulator
npx react-native run-ios --simulator "iPhone 15 Pro"

# Physical device
npx react-native run-ios --device "Your iPhone"
```

### Option 3: Manual Xcode
```bash
# Open Xcode workspace
npm run xcode

# In Xcode:
# 1. Select target device/simulator
# 2. Choose scheme (Debug/Release)
# 3. Press Cmd+R to build and run
# 4. Or Product > Build (Cmd+B)
```

### iOS Build Outputs
- **App Bundle**: `ios/build/Build/Products/Debug-iphonesimulator/`
- **Archive**: Created via Xcode > Product > Archive

## 🔧 Native Configuration

### Android Configuration
- **Main Activity**: `android/app/src/main/java/.../MainActivity.kt`
- **Build Config**: `android/app/build.gradle`
- **Manifest**: `android/app/src/main/AndroidManifest.xml`
- **Gradle Props**: `android/gradle.properties`

### iOS Configuration  
- **App Delegate**: `ios/GephrLabsHumanoidTrainingPlatform/AppDelegate.mm`
- **Podfile**: `ios/Podfile`
- **Info.plist**: `ios/GephrLabsHumanoidTrainingPlatform/Info.plist`
- **Project Settings**: `ios/GephrLabsHumanoidTrainingPlatform.xcodeproj`

## 📱 Device Testing

### Android Device Setup
```bash
# Enable Developer Options and USB Debugging
# Connect device via USB

# Check connected devices
adb devices

# View device logs
adb logcat

# Install APK manually
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS Device Setup
```bash
# Connect device via USB
# Trust computer on device
# Register device in Apple Developer Portal

# List available simulators
xcrun simctl list

# Launch specific simulator
xcrun simctl boot "iPhone 15 Pro"
open -a Simulator
```

## 🚨 Troubleshooting

### Android Issues

**Gradle Build Failures:**
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
npm run clean-android
npx react-native run-android
```

**Missing Android SDK:**
```bash
# Check ANDROID_HOME
echo $ANDROID_HOME

# Install via Android Studio:
# Tools > SDK Manager > Install required SDK versions
```

**Emulator Not Starting:**
```bash
# List available emulators
emulator -list-avds

# Start emulator manually
emulator -avd Pixel_7_API_34
```

### iOS Issues

**CocoaPods Failures:**
```bash
# Reinstall CocoaPods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

**Xcode Build Errors:**
```bash
# Clean build folder
cd ios && xcodebuild clean && cd ..
npm run clean-ios

# Reset CocoaPods
cd ios
pod deintegrate
pod install
cd ..
```

**Simulator Issues:**
```bash
# Reset simulator
xcrun simctl erase all

# Restart Core Simulator service
sudo killall -9 com.apple.CoreSimulator.CoreSimulatorService
```

### General Issues

**Metro Bundler Problems:**
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear React Native cache
npx react-native clean
```

**Node Modules Issues:**
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

## ⚡ Performance Optimization

### Development Builds
- Enable **Flipper** for debugging
- Use **Fast Refresh** for rapid development
- Enable **Chrome DevTools** for debugging

### Release Builds
- **Hermes Engine** enabled for faster startup
- **ProGuard/R8** for Android code shrinking  
- **Bundle optimization** for smaller app size
- **Dead code elimination** for production

## 📦 Build Artifacts

### Android Production
- **APK**: Direct install on devices
- **AAB**: Google Play Store upload format
- **Mapping files**: For crash symbolication

### iOS Production  
- **IPA**: App Store or TestFlight upload
- **dSYM**: Crash symbolication files
- **Archive**: Xcode organizer format

## 🔗 Useful Commands

```bash
# Development
npm start                    # Start Metro bundler
npm run android             # Run on Android
npm run ios                 # Run on iOS

# Building
npm run build-android       # Build Android with script
npm run build-ios           # Build iOS with script

# IDE Access
npm run android-studio      # Open Android Studio
npm run xcode               # Open Xcode workspace

# Cleaning
npm run clean               # Clean React Native
npm run clean-android       # Clean Android build
npm run clean-ios           # Clean iOS build

# Device Management
adb devices                 # List Android devices
xcrun simctl list           # List iOS simulators
```

## 🎯 Ready for Production

Your native builds include all enhanced features:
- ✨ **Glassmorphism UI** with hardware acceleration
- 🎮 **3D Mapping** with native Three.js performance
- 🤖 **Robot Control** with WebSocket connectivity
- 🏆 **Achievement System** with native animations
- 🎵 **Audio Generation** with native audio APIs
- 📊 **Data Export** with file system access
- 📱 **Camera Integration** with native permissions

## 🎉 Success!

You now have a fully native React Native build pipeline using Android Studio and Xcode. The app will have:
- **Better Performance** than Expo managed workflow
- **Full Native Module Access** for advanced features
- **Custom Native Code** capabilities
- **Production-Ready Builds** for app stores
- **Advanced Debugging** with native tools

Happy native development! 🚀📱