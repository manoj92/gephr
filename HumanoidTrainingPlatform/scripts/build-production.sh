#!/bin/bash

# Gephr Labs Humanoid Training Platform - Production Build Script
# This script prepares and builds the app for production deployment

set -e  # Exit on any error

echo "🚀 Starting production build for Gephr Labs Humanoid Training Platform..."

# Check if running in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ Error: EAS CLI is not installed. Please install it with: npm install -g @expo/eas-cli"
    exit 1
fi

# Environment setup
echo "📋 Setting up production environment..."
export NODE_ENV=production
export EXPO_DEBUG=false

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf node_modules/.cache
rm -rf .expo
npx expo install --fix

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --production=false  # Install all deps including dev deps for build

# Run tests
echo "🧪 Running tests..."
npm run test:ci

# Run linting
echo "🔍 Running linter..."
npm run lint

# Run type checking
echo "🔧 Running type check..."
npm run typecheck

# Security audit
echo "🔒 Running security audit..."
npm audit --audit-level high

# Build optimization
echo "⚡ Optimizing build..."
npx expo export --platform all --dev false --minify --clear

# Pre-build validation
echo "✅ Validating app configuration..."
npx expo doctor

# Login to EAS (if not already logged in)
echo "🔑 Checking EAS authentication..."
if ! eas whoami > /dev/null 2>&1; then
    echo "Please log in to EAS:"
    eas login
fi

# Build for iOS
echo "📱 Building iOS app..."
eas build --platform ios --profile production --non-interactive

# Build for Android
echo "🤖 Building Android app..."
eas build --platform android --profile production --non-interactive

echo "✅ Production builds completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the builds on physical devices"
echo "2. Submit to app stores when ready: eas submit --platform all"
echo "3. Monitor crash reports and user feedback"
echo ""
echo "🔗 Useful commands:"
echo "   - Check build status: eas build:list"
echo "   - Download builds: eas build:view [BUILD_ID]"
echo "   - Submit to stores: eas submit --platform all"