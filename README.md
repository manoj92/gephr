# Humanoid Training Platform

Transform smartphone footage into robot training data using advanced hand tracking and computer vision.

## Overview

The Humanoid Training Platform enables developers to create high-quality training datasets for humanoid robots by capturing and processing hand movements from smartphone cameras. Built with React Native and FastAPI, it provides real-time hand tracking, LeRobot-compatible data export, and a marketplace for sharing robot behaviors.

## Key Features

- **Real-time Hand Tracking**: Process camera feeds to detect hand poses and gestures with <50ms latency
- **LeRobot Integration**: Generate training datasets compatible with LeRobot format
- **Multi-Robot Support**: Connect to Unitree G1 and custom humanoid robots
- **Skills Marketplace**: Share and monetize robot behaviors and training datasets
- **3D Visualization**: Map environments and visualize robot movements in real-time
- **Cross-Platform**: iOS, Android, and web support

## Tech Stack

### Frontend
- React Native 0.79.5 with Expo SDK 53
- TypeScript 5.8
- React Navigation 7.x
- React Native Reanimated 4.0
- Three.js for 3D rendering

### Backend
- FastAPI with async support
- PostgreSQL database
- WebSocket real-time communication
- Redis for caching
- AWS S3 for storage

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 6+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gephrplatform/humanoid-training-platform.git
cd humanoid-training-platform
```

2. Install frontend dependencies:
```bash
cd HumanoidTrainingPlatform
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
# Frontend (.env)
API_BASE_URL=http://localhost:8000

# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost/humanoid_training
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key
```

5. Start development servers:
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd HumanoidTrainingPlatform
npx expo start
```

## Project Structure

```
├── HumanoidTrainingPlatform/   # React Native app
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── screens/            # App screens
│   │   ├── services/           # API and business logic
│   │   ├── navigation/         # Navigation configuration
│   │   └── types/              # TypeScript definitions
│   └── assets/                 # Images and static files
│
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── core/               # Core functionality
│   │   ├── models/             # Database models
│   │   ├── schemas/            # Pydantic schemas
│   │   └── services/           # Business logic
│   └── tests/                  # Backend tests
│
└── docs/                       # Documentation
```

## API Documentation

The backend provides a RESTful API with WebSocket support. Once running, view the interactive API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Main Endpoints

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/robots` - List available robots
- `POST /api/v1/training/sessions` - Create training session
- `POST /api/v1/tracking/hand-pose` - Process hand tracking data
- `GET /api/v1/marketplace` - Browse marketplace items
- `WS /ws/robot/{id}` - WebSocket connection for real-time robot control

## Development

### Running Tests

```bash
# Frontend tests
cd HumanoidTrainingPlatform
npm test

# Backend tests
cd backend
pytest
```

### Code Style

- Frontend: ESLint + Prettier
- Backend: Black + isort + mypy

```bash
# Frontend linting
npm run lint

# Backend formatting
black app/
isort app/
mypy app/
```

### Building for Production

#### Mobile Apps
```bash
cd HumanoidTrainingPlatform

# iOS
npx expo build:ios

# Android
npx expo build:android
```

#### Backend Deployment
```bash
cd backend
docker build -t humanoid-platform-backend .
docker run -p 8000:8000 humanoid-platform-backend
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write clear, self-documenting code
- Add tests for new features
- Update documentation as needed
- Follow existing code style
- Keep commits atomic and meaningful

### Areas for Contribution

- **Computer Vision**: Improve hand tracking accuracy and performance
- **Robot Integration**: Add support for new robot platforms
- **UI/UX**: Enhance mobile app interface and user experience
- **Backend**: Optimize API performance and add new features
- **Documentation**: Improve guides and API documentation
- **Testing**: Increase test coverage and add E2E tests

## Architecture

### Data Flow

1. **Capture**: Smartphone camera captures video frames
2. **Process**: Hand tracking service extracts pose data
3. **Transform**: Convert to LeRobot-compatible format
4. **Store**: Save training data to database
5. **Export**: Generate datasets for robot training

### Security

- JWT-based authentication
- AES-256 encryption for sensitive data
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection

## Roadmap

- [x] MediaPipe integration for improved hand tracking
- [x] Support for NVIDIA Isaac Sim
- [x] Multi-camera synchronization
- [x] Cloud training pipeline
- [x] Federated learning support
- [x] AR visualization overlay

## Resources

- [Documentation](https://docs.humanoidplatform.com)
- [API Reference](https://api.humanoidplatform.com/docs)
- [Discord Community](https://discord.gg/humanoidplatform)
- [Blog](https://blog.humanoidplatform.com)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/gephrplatform/humanoid-training-platform/issues)
- Email: support@humanoidplatform.com
- Discord: Join our community for discussions

## Acknowledgments

- LeRobot team for dataset format specification
- MediaPipe for hand tracking models
- React Native community for mobile framework
- FastAPI team for excellent Python web framework

---

Built with passion for advancing humanoid robotics. Join us in democratizing robot training!