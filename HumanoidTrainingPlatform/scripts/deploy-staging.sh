#!/bin/bash

# Gephr Labs Humanoid Training Platform - Staging Deployment Script
# This script deploys the app to staging environment for testing

set -e

echo "🔄 Deploying Gephr Labs Humanoid Training Platform to Staging..."

# Environment setup
export NODE_ENV=staging
export EXPO_DEBUG=true

# Quick validation
echo "🔍 Running quick validation..."
npm run lint
npm run typecheck

# Build for staging
echo "🏗️ Building staging version..."

# iOS Staging Build
echo "📱 Building iOS staging app..."
eas build --platform ios --profile staging --non-interactive

# Android Staging Build  
echo "🤖 Building Android staging app..."
eas build --platform android --profile staging --non-interactive

echo "✅ Staging deployment completed!"
echo "📱 Staging builds are ready for internal testing"
echo "🔗 Share builds with: eas build:list --status=finished"