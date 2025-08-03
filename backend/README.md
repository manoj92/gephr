# Humanoid Training Platform Backend

FastAPI backend for the Humanoid Training Platform - a comprehensive system for collecting, processing, and managing robot training data from hand gesture recordings.

## Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based auth system with user registration and login
- **Hand Tracking Data Processing** - APIs for uploading and processing hand pose data  
- **Robot Connectivity** - WebSocket-based robot command and control system
- **Training Session Management** - Create, manage, and export training sessions
- **LeRobot Dataset Generation** - Export data in LeRobot-compatible format
- **Skills Marketplace** - Buy/sell robot skills with ratings and reviews
- **File Storage** - Secure upload and storage of videos, images, and datasets
- **Real-time Communication** - WebSocket support for live robot status and training progress

### Architecture
- **FastAPI** framework with async/await support
- **PostgreSQL** database with SQLAlchemy ORM
- **Redis** for caching and real-time data
- **Docker** containerization for easy deployment
- **Comprehensive testing** with pytest and asyncio

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 13+
- Redis 6+
- Docker (optional)

### Installation

1. **Clone and setup environment:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database and secret key settings
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Setup database:**
   ```bash
   # Create PostgreSQL database
   createdb humanoid_training
   
   # Run migrations (when implemented)
   alembic upgrade head
   ```

4. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

### Docker Deployment

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

This starts PostgreSQL, Redis, and the FastAPI backend with Nginx reverse proxy.

## API Documentation

Once running, visit:
- **Interactive API docs:** `http://localhost:8000/docs`
- **ReDoc documentation:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/api/v1/openapi.json`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/refresh` - Refresh access token

### Training Sessions
- `POST /api/v1/training/sessions` - Create training session
- `GET /api/v1/training/sessions` - List user's sessions
- `GET /api/v1/training/sessions/{id}` - Get session details
- `POST /api/v1/training/sessions/{id}/gestures` - Add gesture data
- `GET /api/v1/training/sessions/{id}/export/lerobot` - Export LeRobot dataset

### Robot Management
- `GET /api/v1/robots/` - List available robots
- `POST /api/v1/robots/connect` - Connect to robot
- `POST /api/v1/robots/commands` - Send robot command
- `GET /api/v1/robots/connections/{id}/state` - Get robot state

### Marketplace
- `GET /api/v1/marketplace/skills` - Search skills
- `POST /api/v1/marketplace/skills` - Create skill
- `POST /api/v1/marketplace/skills/{id}/purchase` - Purchase skill
- `POST /api/v1/marketplace/skills/{id}/rate` - Rate skill

### WebSocket
- `WS /api/v1/ws/connect` - WebSocket connection for real-time updates

## Database Models

### Core Models:
- **User** - User accounts with authentication and profile data
- **Robot** - Robot definitions and capabilities
- **RobotConnection** - Active robot connections and state
- **TrainingSession** - Training session metadata and progress
- **GestureData** - Individual gesture recordings with confidence scores
- **HandPose** - Detailed hand landmark data (21 points per hand)
- **Skill** - Marketplace skills with pricing and metadata
- **SkillPurchase** - Purchase records and licenses
- **SkillRating** - User reviews and ratings

## Testing

Run the test suite:
```bash
# Run all tests
python run_tests.py

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage
pytest --cov=app tests/
```

## Configuration

Key environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/humanoid_training

# Security  
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload
MAX_FILE_SIZE=104857600  # 100MB

# Robot Settings
ROBOT_COMMAND_TIMEOUT=30
MAX_ROBOT_CONNECTIONS=10

# Marketplace
MIN_SKILL_PRICE=0.01
MAX_SKILL_PRICE=1000.0
MARKETPLACE_FEE_PERCENTAGE=0.05
```

## Deployment

### Production Docker Setup

1. **Update environment:**
   ```bash
   cp .env.example .env
   # Set ENVIRONMENT=production
   # Configure production database URL
   # Set strong SECRET_KEY
   ```

2. **Deploy with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Setup SSL (recommended):**
   - Configure SSL certificates in `ssl/` directory
   - Update nginx configuration for HTTPS

### Health Checks

- **Application health:** `GET /health`
- **Database connectivity:** Verified on startup
- **Redis connectivity:** Verified on startup

## Security Features

- **JWT Authentication** with configurable expiration
- **Password hashing** with bcrypt
- **Input validation** with Pydantic models
- **SQL injection protection** with SQLAlchemy ORM
- **File upload validation** with type and size limits
- **CORS configuration** for frontend integration

## File Storage

The system supports local file storage with organized directory structure:
- `uploads/videos/` - Training videos
- `uploads/images/` - Thumbnails and images  
- `uploads/datasets/` - LeRobot dataset exports
- `uploads/models/` - Skill model files

For production, configure AWS S3 or similar cloud storage.

## WebSocket Events

Real-time events pushed to connected clients:
- `robot_connected` - Robot connection established
- `robot_status_update` - Robot state changes
- `command_completed` - Robot command finished
- `training_progress` - Training session progress updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.