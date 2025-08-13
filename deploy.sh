#!/bin/bash

# Deployment script for AWS Lambda

echo "🚀 Deploying Humanoid Training Platform to AWS Lambda..."

# Check if serverless is installed
if ! command -v serverless &> /dev/null; then
    echo "📦 Installing Serverless Framework..."
    npm install -g serverless
fi

# Install serverless plugins
echo "🔧 Installing Serverless plugins..."
npm install serverless-python-requirements

# Deploy to AWS
echo "☁️ Deploying to AWS Lambda..."
serverless deploy

echo "✅ Deployment complete!"
echo ""
echo "📱 To update your mobile app:"
echo "1. Copy the API Gateway endpoint URL from the deployment output above"
echo "2. Update HumanoidTrainingPlatform/src/config/api.ts with the new URL"
echo "3. Rebuild your APK"