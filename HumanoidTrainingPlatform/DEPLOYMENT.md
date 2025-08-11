# 🚀 Gephr Labs Humanoid Training Platform - Deployment Guide

This guide covers the complete deployment process for the Gephr Labs Humanoid Training Platform, from development to production.

## 📋 Prerequisites

### Development Environment
- Node.js 18.x or later
- npm or yarn
- Expo CLI (`npm install -g @expo/eas-cli`)
- Git

### Accounts & Services
- [Expo Account](https://expo.dev) - For building and deployment
- [Apple Developer Account](https://developer.apple.com) - For iOS deployment
- [Google Play Console Account](https://play.google.com/console) - For Android deployment
- [GitHub Account](https://github.com) - For CI/CD (optional)

### Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in all required environment variables
3. Ensure all API endpoints and keys are configured

## 🏗️ Build Environments

### Development
```bash
# Start development server
npm start

# Run on specific platform
npm run android  # or ios, web
```

### Staging
```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Or manually
eas build --platform all --profile staging
```

### Production
```bash
# Full production build and deployment
./scripts/build-production.sh

# Or manually
eas build --platform all --profile production
```

## 📱 Platform-Specific Deployment

### iOS Deployment

#### App Store Connect Setup
1. Create app in App Store Connect
2. Configure app metadata, screenshots, and descriptions
3. Set up app privacy details
4. Configure In-App Purchases (if applicable)

#### Building for iOS
```bash
# Build for iOS App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### Required iOS Assets
- App Icon (1024x1024)
- Screenshots for all supported devices
- App Store description and keywords
- Privacy policy URL

### Android Deployment

#### Google Play Console Setup
1. Create app in Google Play Console
2. Upload app signing key
3. Configure store listing
4. Set up app privacy and data safety

#### Building for Android
```bash
# Build for Google Play Store
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

#### Required Android Assets
- Feature graphic (1024x500)
- Screenshots for phone and tablet
- App description and short description
- Privacy policy URL

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. Add secrets to GitHub repository:
   ```
   EXPO_TOKEN=your_expo_token
   SLACK_WEBHOOK_URL=your_slack_webhook (optional)
   SNYK_TOKEN=your_snyk_token (optional)
   ```

2. The pipeline automatically:
   - Runs tests and linting on PRs
   - Builds preview builds for PRs
   - Builds staging on develop branch
   - Builds production on main branch

### Manual Deployment
```bash
# Trigger production build
git push origin main

# Or use GitHub Actions manually
# Go to Actions tab -> Select workflow -> Run workflow
```

## 🛡️ Security & Compliance

### Pre-Deployment Security Checklist
- [ ] All environment variables are properly set
- [ ] API keys are stored in Expo/EAS secrets
- [ ] SSL certificates are valid
- [ ] Security audit passes (`npm audit`)
- [ ] All dependencies are up to date
- [ ] Privacy policy is accessible
- [ ] Terms of service are accessible

### Data Privacy Compliance
- GDPR compliance for EU users
- CCPA compliance for California users
- Proper consent flows for data collection
- Clear privacy policy and data usage descriptions

## 📊 Monitoring & Analytics

### Post-Deployment Monitoring
1. **Crash Reporting**: Configure Sentry or similar
2. **Analytics**: Set up user behavior tracking
3. **Performance**: Monitor app performance metrics
4. **User Feedback**: Set up crash reporting and feedback systems

### Key Metrics to Monitor
- App crashes and errors
- User engagement and retention
- Feature usage statistics
- Performance metrics (load times, memory usage)
- Robot connection success rates
- Hand tracking accuracy

## 🔧 Troubleshooting

### Common Build Issues

#### iOS Build Failures
```bash
# Clear cache and rebuild
expo r -c
eas build --platform ios --profile production --clear-cache
```

#### Android Build Failures
```bash
# Check permissions in app.json
# Verify package name matches Google Play Console
# Check Android SDK versions
```

#### EAS Build Issues
```bash
# Check build status
eas build:list

# View specific build logs  
eas build:view [BUILD_ID]

# Cancel stuck builds
eas build:cancel [BUILD_ID]
```

### Environment Issues
- Ensure all required environment variables are set
- Check API endpoints are accessible
- Verify authentication tokens are valid
- Test on physical devices before release

## 📱 Testing Strategy

### Pre-Release Testing
1. **Unit Tests**: `npm run test`
2. **Integration Tests**: Test robot connectivity
3. **E2E Tests**: Test complete user flows
4. **Device Testing**: Test on multiple iOS/Android devices
5. **Performance Testing**: Test with large datasets
6. **Security Testing**: Penetration testing and security audit

### Beta Testing
1. Use TestFlight (iOS) and Internal Testing (Android)
2. Recruit beta testers from target audience
3. Collect and analyze feedback
4. Fix critical issues before public release

## 🚀 Release Process

### Release Checklist
- [ ] All tests pass
- [ ] Security audit complete
- [ ] Privacy policy updated
- [ ] App store assets prepared
- [ ] Marketing materials ready
- [ ] Support documentation updated
- [ ] Team trained on new features

### Release Steps
1. **Code Freeze**: Stop new feature development
2. **Testing**: Complete all testing phases
3. **Build**: Create production builds
4. **Review**: Internal app review and approval
5. **Submit**: Submit to app stores
6. **Review**: Wait for store review (1-7 days)
7. **Release**: Release to public or staged rollout

### Post-Release
1. Monitor crash reports and user feedback
2. Respond to app store reviews
3. Prepare hotfix builds if needed
4. Plan next release cycle

## 📞 Support & Maintenance

### Ongoing Maintenance
- Regular dependency updates
- Security patches
- Bug fixes based on user feedback
- Performance optimizations
- New feature development

### Support Channels
- In-app support system
- Email support: support@gephrlabs.com
- Documentation and FAQ
- Community forums or Discord

## 🔗 Useful Commands

```bash
# Development
npm start                    # Start Expo dev server
npm run test:watch          # Run tests in watch mode
npm run lint:fix           # Auto-fix linting issues

# Building
eas build --platform ios --profile production
eas build --platform android --profile production
eas build --platform all --profile staging

# Deployment
eas submit --platform ios
eas submit --platform android
eas submit --platform all

# Monitoring
eas build:list              # List all builds
eas build:view [BUILD_ID]   # View build details
eas update                  # Push OTA update

# Maintenance
npm audit fix               # Fix security vulnerabilities
npm update                  # Update dependencies
```

## 🎯 Success Metrics

### Launch Success Indicators
- App store approval without rejections
- Crash rate < 1%
- 4+ star average rating
- Successful robot connections > 90%
- Hand tracking accuracy > 85%
- User retention > 60% after 7 days

---

For technical support or questions about deployment, contact the development team or refer to the [Expo documentation](https://docs.expo.dev/).

**Happy Deploying! 🚀**