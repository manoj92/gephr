#!/bin/bash
set -e

echo "🚀 Starting Humanoid Training Platform Development Environment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_backend() {
    echo -e "${PURPLE}[BACKEND]${NC} $1"
}

print_frontend() {
    echo -e "${BLUE}[FRONTEND]${NC} $1"
}

# Cleanup function
cleanup() {
    print_status "Shutting down development servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -f "backend/app/main.py" ] || [ ! -f "HumanoidTrainingPlatform/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed. Please install Python 3.8+ from https://python.org"
    exit 1
fi

print_status "✅ System requirements met"

# Start backend in the background
print_step "Starting backend server..."
cd backend

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    print_warning "Creating .env file from .env.example"
    cp .env.example .env
fi

# Set up Python virtual environment
if [ ! -d "venv" ]; then
    print_backend "Creating Python virtual environment..."
    python3 -m venv venv
fi

print_backend "Activating virtual environment and installing dependencies..."
source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# Initialize database
print_backend "Initializing database..."
python -c "
import asyncio
import sys
import os
sys.path.append('.')

from app.core.database import engine
from app.models import Base

async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Create a test user if needed
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.core.security import get_password_hash
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User))
            existing_user = result.scalar_one_or_none()
            
            if not existing_user:
                test_user = User(
                    email='test@example.com',
                    username='testuser',
                    hashed_password=get_password_hash('testpassword123'),
                    full_name='Test User',
                    is_active=True,
                    is_verified=True
                )
                session.add(test_user)
                await session.commit()
                print('Test user created: test@example.com / testpassword123')
    except Exception as e:
        print(f'Database initialization failed: {e}')
        return 1
    return 0

exit(asyncio.run(init_db()))
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_backend "✅ Database initialized successfully"
else
    print_error "❌ Database initialization failed"
    exit 1
fi

# Start backend server
print_backend "Starting FastAPI server on http://localhost:8000"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/health" | grep -q "200"; then
    print_error "❌ Backend failed to start. Check backend.log for details."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_backend "✅ Backend server running successfully"

# Go back to root and start frontend
cd ..

print_step "Starting frontend server..."
cd HumanoidTrainingPlatform

print_frontend "Installing Node.js dependencies..."
npm install > /dev/null 2>&1

print_frontend "Starting Expo development server..."
npx expo start --clear > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 2

print_status "🎉 Development environment started successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 DEVELOPMENT URLS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_backend "Backend API: http://localhost:8000"
print_backend "API Docs: http://localhost:8000/docs"
print_backend "API Health: http://localhost:8000/health"
echo ""
print_frontend "Frontend: Check Expo CLI output for QR code and local URLs"
print_frontend "Mobile: Use Expo Go app to scan QR code"
print_frontend "Web: Press 'w' in Expo CLI or visit the web URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TEST CREDENTIALS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Email: test@example.com"
echo "Password: testpassword123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 LOGS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend logs: tail -f backend.log"
echo "Frontend logs: tail -f HumanoidTrainingPlatform/frontend.log"
echo ""
echo "💡 Press Ctrl+C to stop all servers"
echo ""

# Wait for user to stop
wait