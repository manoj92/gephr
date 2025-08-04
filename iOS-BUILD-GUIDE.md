# iOS Build Guide - Humanoid Training Platform

## Prerequisites

### 1. Development Environment
```bash
# Required tools
- Xcode 15+ (from Mac App Store)
- Node.js 18+ 
- npm or yarn
- EAS CLI

# Install EAS CLI
npm install -g eas-cli
```

### 2. Apple Developer Account
- **Individual**: $99/year - For personal development
- **Organization**: $99/year - For company development
- **Enterprise**: $299/year - For internal distribution only

### 3. Required Certificates & Provisioning
- **Development Certificate**: For testing on devices
- **Distribution Certificate**: For App Store submission
- **Provisioning Profiles**: Device-specific permissions

## Quick Start Build

### Option 1: Automated Build (Recommended)
```bash
# 1. Login to EAS
eas login

# 2. Run the build script
cd HumanoidTrainingPlatform
./scripts/build-ios.sh development

# 3. For production build
./scripts/build-ios.sh production
```

### Option 2: Manual Build Steps
```bash
# 1. Setup EAS project
eas login
eas build:configure

# 2. Build for iOS
eas build --platform ios --profile development

# 3. For production
eas build --platform ios --profile production
```

## Build Profiles Explained

### Development Build
```bash
eas build --platform ios --profile development
```
- **Purpose**: Testing on physical devices
- **Includes**: Development client for live reloading
- **Distribution**: Internal testing only
- **Certificate**: Development certificate required

### Preview Build  
```bash
eas build --platform ios --profile preview
```
- **Purpose**: QA testing and demos
- **Includes**: Production-like environment
- **Distribution**: TestFlight or internal
- **Certificate**: Ad Hoc distribution

### Production Build
```bash
eas build --platform ios --profile production
```
- **Purpose**: App Store submission
- **Includes**: Optimized production build
- **Distribution**: App Store Connect
- **Certificate**: Distribution certificate required

## iOS Simulator Build

```bash
# Build specifically for iOS Simulator
eas build --platform ios --profile preview --local

# Install on simulator
npx expo run:ios
```

## Local vs Cloud Builds

### Cloud Build (Default)
```bash
eas build --platform ios --profile production
```
- ✅ No local Xcode required
- ✅ Handles certificates automatically
- ✅ Consistent build environment
- ❌ Requires internet connection
- ❌ Build time ~10-15 minutes

### Local Build
```bash
eas build --platform ios --profile development --local
```
- ✅ Faster builds (~3-5 minutes)
- ✅ Works offline
- ❌ Requires Xcode installed
- ❌ Manual certificate management

## Certificate Management

### Automatic (Recommended)
EAS handles everything automatically:
```json
{
  "build": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.humanoidtraining.platform"
      }
    }
  }
}
```

### Manual Certificate Setup
```bash
# Generate certificates manually
eas credentials

# Configure specific certificates
eas build --platform ios --clear-cache
```

## Troubleshooting Common Issues

### Issue 1: "Bundle identifier already exists"
```bash
# Solution: Use unique bundle identifier
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.humanoidtraining"
  }
}
```

### Issue 2: "Provisioning profile doesn't match"
```bash
# Solution: Clear credentials and regenerate
eas credentials --platform ios --clear-all
eas build --platform ios --clear-cache
```

### Issue 3: "Native dependencies not found"
```bash
# Solution: Run prebuild first
npx expo prebuild --platform ios --clean
eas build --platform ios
```

### Issue 4: "Build failed with native modules"
```bash
# Solution: Check expo compatibility
npx expo doctor
npx expo install --fix
```

## App Store Submission

### 1. Build for Production
```bash
eas build --platform ios --profile production
```

### 2. Submit to App Store
```bash
eas submit --platform ios --profile production
```

### 3. Required App Store Information
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "TEAM123456"
      }
    }
  }
}
```

## TestFlight Distribution

### 1. Build and Submit
```bash
# Build and auto-submit to TestFlight
eas build --platform ios --profile production --auto-submit
```

### 2. Manual TestFlight Upload
```bash
# 1. Build first
eas build --platform ios --profile production

# 2. Submit to TestFlight
eas submit --platform ios --profile production
```

## Build Optimization

### 1. Bundle Size Optimization
```json
{
  "expo": {
    "assetBundlePatterns": [
      "assets/images/**",
      "assets/fonts/**"
    ],
    "ios": {
      "bitcode": false
    }
  }
}
```

### 2. Performance Optimization
```json
{
  "expo": {
    "newArchEnabled": true,
    "ios": {
      "jsEngine": "hermes"
    }
  }
}
```

## Security Considerations

### 1. Code Obfuscation
```bash
# Add to eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_OPTIMIZE": "true"
      }
    }
  }
}
```

### 2. Certificate Security
- Store certificates securely in EAS
- Never commit certificates to Git
- Use environment variables for sensitive data

## Monitoring Build Status

### 1. EAS Dashboard
Visit: https://expo.dev/accounts/[username]/projects/[project]/builds

### 2. CLI Monitoring
```bash
# Watch build progress
eas build:list

# View specific build
eas build:view [build-id]
```

## Development Workflow

### 1. Development Cycle
```bash
# Daily development
npx expo start --dev-client

# Weekly builds for testing
eas build --platform ios --profile development

# Monthly builds for QA
eas build --platform ios --profile preview
```

### 2. Release Cycle
```bash
# 1. Final testing
eas build --platform ios --profile preview

# 2. Production build
eas build --platform ios --profile production

# 3. Submit to App Store
eas submit --platform ios --profile production
```

## Environment-Specific Builds

### Development Environment
```json
{
  "build": {
    "development": {
      "ios": {
        "buildConfiguration": "Debug",
        "developmentClient": true
      },
      "env": {
        "API_URL": "http://localhost:8000",
        "DEBUG": "true"
      }
    }
  }
}
```

### Production Environment
```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      },
      "env": {
        "API_URL": "https://api.humanoidtraining.com",
        "DEBUG": "false"
      }
    }
  }
}
```

## Cost Estimation

### Build Costs (Free Tier)
- **Development builds**: Unlimited local builds
- **Cloud builds**: 30 builds/month free
- **Additional builds**: $1 per build

### App Store Costs
- **Apple Developer Program**: $99/year
- **App Store submission**: Free
- **TestFlight**: Free

## Next Steps After Build

1. **Install on Device**: Download .ipa and install via Xcode
2. **Test Thoroughly**: All features, permissions, edge cases
3. **Submit for Review**: App Store Connect submission
4. **Monitor Performance**: Crash reports, analytics
5. **Iterate**: Based on user feedback

## Support & Resources

- **EAS Documentation**: https://docs.expo.dev/build/introduction/
- **iOS Guidelines**: https://developer.apple.com/app-store/guidelines/
- **Expo Discord**: https://chat.expo.dev/
- **Stack Overflow**: Tag questions with 'expo' and 'react-native'

---

**Ready to build?** Run the build script:
```bash
cd HumanoidTrainingPlatform
./scripts/build-ios.sh development
```