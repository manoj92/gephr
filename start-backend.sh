#!/bin/bash
set -e

echo "🚀 Starting Humanoid Training Platform Backend"

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
if [ ! -f "backend/app/main.py" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_step "Checking backend environment..."

# Go to backend directory
cd backend

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found, creating from .env.example"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env file. Please update with your configuration."
    else
        print_error ".env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_step "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_step "Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
print_step "Installing/updating Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Initialize database
print_step "Initializing database..."
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
        print('✅ Database tables created successfully!')
        
        # Create a test user if needed
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.core.security import get_password_hash
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as session:
            # Check if any users exist
            result = await session.execute(select(User))
            existing_user = result.scalar_one_or_none()
            
            if not existing_user:
                print('Creating default test user...')
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
                print('✅ Test user created: test@example.com / testpassword123')
            else:
                print('✅ Database already has users')
                
    except Exception as e:
        print(f'❌ Database initialization failed: {e}')
        return 1
    return 0

exit_code = asyncio.run(init_db())
exit(exit_code)
"

# Check if database initialization was successful
if [ $? -ne 0 ]; then
    print_error "Database initialization failed"
    exit 1
fi

print_step "Starting FastAPI development server..."
print_status "Backend will be available at: http://localhost:8000"
print_status "API documentation at: http://localhost:8000/docs"
print_status "Press Ctrl+C to stop the server"
echo ""

# Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000