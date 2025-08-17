# 🚀 Quick Start Guide - Humanoid Training Platform

Get up and running with the enhanced Humanoid Training Platform in minutes!

## 📱 **Instant Testing (React Native CLI)**

### Option 1: Native Development
```bash
# Start Metro bundler
npm start

# Run on Android (requires device/emulator)
npm run android

# Run on iOS (macOS only, requires simulator/device)
npm run ios
```

### Option 2: Direct IDE Access
```bash
# Open Android Studio
npm run android-studio

# Open Xcode (macOS only)
npm run xcode
```

## 🔨 **Local Builds (Production Ready)**

### iOS Build (macOS only)
```bash
# Quick development build
./scripts/build-ios-native.sh

# Production build
./scripts/build-ios-native.sh --release

# Open Xcode after build
./scripts/build-ios-native.sh --open-xcode

# Specific simulator
./scripts/build-ios-native.sh --simulator "iPhone 15 Pro"

# Help and options
./scripts/build-ios-native.sh --help
```

### Android Build (Any OS)
```bash
# Quick development build
./scripts/build-android-native.sh

# Production build
./scripts/build-android-native.sh --release

# Open Android Studio after build
./scripts/build-android-native.sh --open-studio

# Specific device
./scripts/build-android-native.sh --device "emulator-5554"

# Help and options
./scripts/build-android-native.sh --help
```

## ⚡ **One-Command Builds**

### iOS
```bash
# Development
npm run ios

# Production
npx react-native run-ios --configuration Release

# Specific device
npx react-native run-ios --device "Your iPhone"

# Open Xcode directly
npm run xcode
```

### Android
```bash
# Development
npm run android

# Production
npx react-native run-android --variant release

# Open Android Studio directly
npm run android-studio

# List devices
adb devices
```

## 🎯 **What You'll Experience**

### 🌟 **Enhanced Features**
- **Glassmorphism UI** with neon effects and glow
- **3D Mapping** with real-time point cloud visualization
- **Hand Tracking** with camera integration
- **Robot Control** with WebSocket connectivity
- **Achievement System** with XP and rewards
- **Audio Feedback** with procedural sound generation
- **Data Export** in LeRobot/JSON/CSV formats

### 📱 **Screens Available**
1. **Onboarding** - Interactive tutorial flow
2. **Enhanced Home** - Futuristic dashboard with stats
3. **Recording** - Real camera hand tracking
4. **Robot Control** - Multi-robot connectivity
5. **Marketplace** - Skills trading platform
6. **3D Mapping** - Environment visualization
7. **Settings** - Theme switching and preferences

## 🛠 **Prerequisites (For Local Builds)**

### iOS Requirements
- **macOS** (required)
- **Xcode 15+** (from App Store)
- **iOS Simulator** (included with Xcode)

### Android Requirements
- **Android Studio** (any OS)
- **Java JDK 11 or 17**
- **Android SDK** (via Android Studio)

### Quick Setup
```bash
# Install Android Studio
brew install --cask android-studio

# Set environment (add to ~/.zshrc)
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 🚨 **Troubleshooting**

### Common Issues

**Metro bundler issues:**
```bash
npx expo start --clear
```

**iOS build issues:**
```bash
# Clean and rebuild
rm -rf ios node_modules
npm install
npx expo run:ios
```

**Android build issues:**
```bash
# Clean Gradle
cd android && ./gradlew clean && cd ..
npx expo run:android
```

**Package conflicts:**
```bash
# Fix package versions
npx expo install --fix
```

## 🎮 **Testing Features**

### Hand Tracking
1. Go to **Record** tab
2. Grant camera permissions
3. Position hands in frame
4. Watch real-time detection

### Robot Control
1. Go to **Robot** tab
2. Tap "Scan for Robots"
3. Connect to simulated robots
4. Send commands and view status

### 3D Mapping
1. Go to **Map** tab
2. Tap "Start Scan"
3. Watch point cloud generation
4. Use gesture controls (pan/zoom)

### Achievements
1. Complete actions to unlock achievements
2. Watch animated notifications
3. Check progress in settings

## 📊 **Performance**

### Development Mode
- **Hot Reload**: Instant code updates
- **Debugging**: Chrome DevTools integration
- **Logging**: Real-time console output

### Production Mode
- **Optimized Bundle**: Faster loading
- **Native Performance**: Full speed
- **Crash Reporting**: Error tracking

## 🔗 **Useful Commands**

```bash
# View logs
npx expo logs --platform ios
npx expo logs --platform android

# Debug mode
npx expo start --dev-client

# Clear cache
npx expo start --clear

# Check dependencies
npx expo doctor

# Update packages
npx expo install --fix
```

## 📞 **Need Help?**

1. **Check BUILD_INSTRUCTIONS.md** for detailed setup
2. **Review error logs** in terminal/console
3. **Try cleaning cache** with --clear flag
4. **Check device connectivity** with adb devices (Android)

## 🎉 **Success Indicators**

✅ **App launches successfully**  
✅ **Onboarding flow works**  
✅ **Camera permissions granted**  
✅ **Animations smooth and responsive**  
✅ **Hand tracking detects movement**  
✅ **Robot scanning animation plays**  
✅ **3D map renders point clouds**  
✅ **Achievement notifications appear**  
✅ **Audio feedback plays**  
✅ **Theme switching works**  

## 🚀 **You're Ready!**

The Humanoid Training Platform is now running with all enhanced features! Explore the cyberpunk-themed interface, test the hand tracking, connect to robots, and experience the future of robotics training.

**Happy Building!** 🤖✨