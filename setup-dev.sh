#!/bin/bash
set -e

echo "🚀 Setting up Humanoid Training Platform for Development"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Checking system requirements..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed. Please install Python 3.8+ from https://python.org"
    exit 1
fi

print_status "Installing backend dependencies..."

# Setup backend
cd backend

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file from .env.example"
    cp .env.example .env
    print_warning "Please update .env file with your configuration"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating Python virtual environment..."
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Go back to root
cd ..

print_status "Installing frontend dependencies..."

# Install Node.js dependencies for React Native app
cd HumanoidTrainingPlatform
npm install

# Go back to root
cd ..

print_status "Setting up database..."

# Initialize database (SQLite for development)
cd backend
source venv/bin/activate

# Run database migrations (if any)
python -c "
import asyncio
from app.core.database import engine
from app.models import Base

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Database tables created successfully!')

asyncio.run(create_tables())
"

cd ..

print_status "✅ Setup complete!"
echo ""
echo "🎯 To start the development servers:"
echo ""
echo "1. Backend API (Terminal 1):"
echo "   cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "2. React Native App (Terminal 2):"
echo "   cd HumanoidTrainingPlatform && npx expo start"
echo ""
echo "3. Access the API docs at: http://localhost:8000/docs"
echo "4. The mobile app will be available via Expo Go"
echo ""
echo "📝 Configuration:"
echo "   - Backend: backend/.env"
echo "   - Frontend: HumanoidTrainingPlatform/src/config/api.ts"
echo ""
print_warning "Don't forget to update the API base URL in the frontend config if needed!"