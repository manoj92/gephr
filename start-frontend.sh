#!/bin/bash
set -e

echo "📱 Starting Humanoid Training Platform Frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "HumanoidTrainingPlatform/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "Checking frontend environment..."

# Go to React Native app directory
cd HumanoidTrainingPlatform

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check if Expo CLI is available
if ! command -v npx &> /dev/null; then
    print_error "npm/npx not available. Please reinstall Node.js"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_step "Installing Node.js dependencies..."
    npm install
else
    print_step "Checking for dependency updates..."
    npm install
fi

# Check backend connectivity
print_step "Checking backend connectivity..."
BACKEND_URL="http://localhost:8000"

# Wait for backend to be available (max 30 seconds)
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200"; then
        print_status "✅ Backend is running and accessible"
        break
    elif [ $i -eq 30 ]; then
        print_warning "⚠️ Backend not accessible at $BACKEND_URL"
        print_warning "Make sure to start the backend first with ./start-backend.sh"
        print_warning "Frontend will still start but API calls may fail"
    else
        echo -n "."
        sleep 1
    fi
done

echo ""

print_step "Starting Expo development server..."
print_status "Frontend will be available via Expo Go app"
print_status "Scan the QR code with your mobile device"
print_status "Or press 'w' to open in web browser"
print_status "Press Ctrl+C to stop the server"
echo ""

# Start Expo development server
npx expo start --clear