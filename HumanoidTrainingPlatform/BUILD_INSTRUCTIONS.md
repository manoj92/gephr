# 📱 Local Build Instructions - Humanoid Training Platform

This guide will help you build the Humanoid Training Platform locally for both iOS and Android.

## 🛠 Prerequisites

### For iOS Development
- **macOS** (required for iOS builds)
- **Xcode 15+** (latest stable version)
- **iOS Simulator** or physical iOS device
- **CocoaPods** (will be installed automatically)

### For Android Development
- **Android Studio** with Android SDK
- **Java Development Kit (JDK) 11 or 17**
- **Android Emulator** or physical Android device
- **Android SDK Build Tools**

## 🚀 Quick Start

### 1. Install Development Tools

#### Install Android Studio (for Android builds)
```bash
# Download Android Studio from: https://developer.android.com/studio
# Or using Homebrew:
brew install --cask android-studio

# Set up environment variables (add to ~/.zshrc or ~/.bash_profile):
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### Install Xcode (for iOS builds)
```bash
# Install from Mac App Store or:
# Download from: https://developer.apple.com/xcode/

# Install Xcode Command Line Tools:
xcode-select --install
```

### 2. Setup Development Environment

```bash
# Clone and setup project (if not already done)
cd HumanoidTrainingPlatform
npm install

# Install EAS CLI for easier builds
npm install -g @expo/cli eas-cli

# Login to Expo (optional, for cloud builds)
npx expo login
```

## 📱 Building for iOS

### Option 1: Using Expo Development Build (Recommended)

```bash
# Create development build for iOS
npx expo run:ios

# Or for specific device/simulator
npx expo run:ios --device "iPhone 15 Pro"
npx expo run:ios --simulator "iPhone 15 Pro"
```

### Option 2: Using EAS Build (Cloud)

```bash
# Build iOS app in the cloud
eas build --platform ios --profile development

# For production build
eas build --platform ios --profile production
```

### Option 3: Manual Xcode Build

```bash
# Generate iOS project
npx expo prebuild --platform ios --clean

# Open in Xcode
open ios/HumanoidTrainingPlatform.xcworkspace

# Build from Xcode:
# 1. Select your device/simulator
# 2. Press Cmd+R to build and run
```

## 🤖 Building for Android

### Option 1: Using Expo Development Build (Recommended)

```bash
# Create development build for Android
npx expo run:android

# Or for specific device/emulator
npx expo run:android --device
npx expo run:android --variant debug
```

### Option 2: Using EAS Build (Cloud)

```bash
# Build Android app in the cloud
eas build --platform android --profile development

# For production build
eas build --platform android --profile production
```

### Option 3: Manual Android Studio Build

```bash
# Generate Android project
npx expo prebuild --platform android --clean

# Open in Android Studio
open -a "Android Studio" android

# Build from Android Studio:
# 1. Select your device/emulator
# 2. Click Run button or Shift+F10
```

## 🔧 Build Configuration

### EAS Build Configuration (`eas.json`)

Our project is already configured with optimal build settings:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "gradleCommand": ":app:assembleDebug",
        "resourceClass": "medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "gradleCommand": ":app:assembleRelease",
        "resourceClass": "medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "resourceClass": "medium"
      }
    }
  }
}
```

### App Configuration (`app.json`)

Key features enabled:
- Camera permissions for hand tracking
- Location services for environment mapping
- Background processing for robot communication
- File system access for data export
- Haptic feedback support

## 🚨 Troubleshooting

### iOS Issues

**CocoaPods Installation Issues:**
```bash
# Clean and reinstall CocoaPods
sudo gem uninstall cocoapods
sudo gem install cocoapods
cd ios && pod install
```

**Xcode Build Errors:**
```bash
# Clean build folder
rm -rf ios/build
cd ios && xcodebuild clean
```

**Simulator Issues:**
```bash
# Reset iOS Simulator
npx expo install --fix
npx expo run:ios --simulator "iPhone 15 Pro"
```

### Android Issues

**Gradle Build Issues:**
```bash
# Clean Gradle cache
cd android
./gradlew clean
cd .. && npx expo run:android
```

**SDK Issues:**
```bash
# Check SDK installation
android list targets
# Or in Android Studio: Tools > SDK Manager
```

**Emulator Issues:**
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_7_API_34
```

### General Issues

**Metro Bundle Issues:**
```bash
# Clear Metro cache
npx expo start --clear
# Or
npx react-native start --reset-cache
```

**Node Module Issues:**
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📋 Build Commands Summary

### iOS Development
```bash
# Quick development build
npx expo run:ios

# Production build (cloud)
eas build --platform ios --profile production

# Local Xcode build
npx expo prebuild --platform ios && open ios/HumanoidTrainingPlatform.xcworkspace
```

### Android Development
```bash
# Quick development build
npx expo run:android

# Production build (cloud)
eas build --platform android --profile production

# Local Android Studio build
npx expo prebuild --platform android && open -a "Android Studio" android
```

## 🎯 Testing Your Build

### iOS Testing
1. **Simulator Testing**: Use iOS Simulator for quick testing
2. **Device Testing**: Connect iPhone via USB, enable Developer Mode
3. **TestFlight**: Upload to App Store Connect for beta testing

### Android Testing
1. **Emulator Testing**: Use Android Virtual Device (AVD)
2. **Device Testing**: Enable USB Debugging and install APK
3. **Internal Testing**: Upload to Google Play Console for internal testing

## 🔑 Performance Optimization

### For Development Builds
- Use `--variant debug` for faster builds
- Enable Flipper for debugging
- Use development bundle for hot reloading

### For Production Builds
- Enable Hermes engine for better performance
- Use release bundle with optimizations
- Enable ProGuard/R8 for Android code shrinking

## 🎉 Success!

After successful build, you'll have:
- **iOS**: `.ipa` file or installed app on device/simulator
- **Android**: `.apk` or `.aab` file or installed app on device/emulator

The app includes all our enhanced features:
- ✨ Glassmorphism UI with neon effects
- 🎮 3D mapping and visualization  
- 🤖 Robot connectivity and control
- 🏆 Achievement system with rewards
- 🎵 Audio feedback and haptic responses
- 📊 Data export in multiple formats
- 📱 Onboarding flow and tutorials

## 📞 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review Expo documentation: https://docs.expo.dev/
3. Check React Native docs: https://reactnative.dev/docs/
4. Open an issue in the project repository

Happy building! 🚀