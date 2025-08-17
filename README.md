# Humanoid Training Platform

Transform smartphone footage into robot training data using advanced hand tracking and computer vision.

## Overview

The Humanoid Training Platform enables developers to create high-quality training datasets for humanoid robots by capturing and processing hand movements from smartphone cameras. Built with React Native and FastAPI, it provides real-time hand tracking, LeRobot-compatible data export, and a marketplace for sharing robot behaviors.

## Core Features

### Hand Tracking & Computer Vision
- **MediaPipe Integration**: Advanced hand pose detection with 21-point landmarks
- **Real-time Processing**: <50ms latency hand tracking with gesture classification
- **Multi-Camera Sync**: Synchronized recording from up to 4 cameras simultaneously
- **AR Visualization**: Real-time 3D hand skeleton overlay with trajectory tracking

### Robot Integration
- **Unitree G1 Support**: Direct integration with Unitree G1 humanoid robots
- **Custom Robot Support**: Configurable support for custom humanoid platforms
- **LeRobot Compatibility**: Export training data in LeRobot format
- **WebSocket Control**: Real-time robot command and status communication

### Advanced Training Pipeline
- **Cloud Training**: Multi-provider support (AWS, GCP, Azure, NVIDIA NGC)
- **NVIDIA Isaac Sim**: Full simulation environment integration
- **Federated Learning**: Privacy-preserving distributed training
- **Model Optimization**: Automatic quantization and deployment optimization

### Mobile Application
- **Cross-Platform**: iOS, Android, and web support
- **Skills Marketplace**: Share and monetize robot behaviors and datasets
- **3D Visualization**: Interactive robot models and environment mapping
- **Gamification**: User progression system with achievements

## Tech Stack

### Frontend
- React Native 0.79.5 with Expo SDK 53
- TypeScript 5.8 with strict mode
- React Navigation 7.x for navigation
- React Native Reanimated 4.0 for animations
- Three.js/React Three Fiber for 3D rendering
- TensorFlow.js for on-device ML inference
- MediaPipe for hand tracking

### Backend
- FastAPI with async support and automatic documentation
- PostgreSQL for data persistence
- WebSocket for real-time communication
- Redis for caching and session management
- AWS S3 for file storage
- SQLAlchemy ORM with Alembic migrations
- JWT authentication with role-based access

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

## Functionality Overview

### Implemented Services

#### Frontend Services
- **MediaPipeIntegration**: Advanced hand tracking with gesture classification
- **IsaacSimIntegration**: NVIDIA Isaac Sim simulation integration
- **MultiCameraSync**: Synchronized multi-camera recording and processing
- **ARTrackingService**: AR plane detection and 3D visualization
- **WebSocketService**: Real-time communication with backend
- **CameraHandTracker**: Camera interface with hand pose overlay

#### Backend Services
- **CloudTrainingPipeline**: Multi-cloud model training automation
- **FederatedLearning**: Privacy-preserving distributed learning
- **HandTrackingService**: Hand pose processing and analysis
- **RobotService**: Robot connection and command management
- **FileStorageService**: Secure file upload and management

#### API Endpoints
- **Authentication**: JWT-based user authentication and authorization
- **Training Sessions**: Create, manage, and monitor training sessions
- **Hand Tracking**: Real-time hand pose processing and analysis
- **Robot Control**: Connect to and control humanoid robots
- **File Upload**: Secure upload for training data, images, and models
- **Statistics**: Platform and user analytics
- **Marketplace**: Browse and purchase robot behaviors
- **WebSocket**: Real-time updates and robot control

### Interactive API Documentation
Once running, access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

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

## Implementation Status

All core features are fully implemented and working:

- [x] **MediaPipe Integration** - Advanced hand tracking with 21-point landmarks
- [x] **NVIDIA Isaac Sim** - Full simulation environment integration
- [x] **Multi-Camera Sync** - Synchronized recording from multiple cameras
- [x] **Cloud Training Pipeline** - Multi-provider training automation
- [x] **Federated Learning** - Privacy-preserving distributed training
- [x] **AR Visualization** - Real-time 3D hand tracking overlay
- [x] **Robot Control** - Unitree G1 integration and custom robot support
- [x] **Skills Marketplace** - Platform for sharing robot behaviors
- [x] **Real-time Communication** - WebSocket-based robot control
- [x] **File Management** - Secure upload and storage system

## Advanced Features

### Cloud Training Pipeline
- Support for AWS SageMaker, Google Cloud AI, Azure ML, and NVIDIA NGC
- Automated hyperparameter optimization and model deployment
- Real-time training metrics and cost estimation
- Model validation and performance benchmarking

### Federated Learning
- Privacy-preserving distributed training across multiple devices
- Differential privacy and secure aggregation protocols
- Reputation-based participant selection
- Multiple aggregation algorithms (FedAvg, FedProx, SCAFFOLD)

### Multi-Camera System
- Synchronized capture from up to 4 cameras
- Automatic time offset calibration
- Real-time frame synchronization with <50ms latency
- Cross-camera hand pose correlation

### AR Visualization
- Real-time 3D hand skeleton rendering
- Environment plane detection and mapping
- Robot trajectory visualization
- Interactive 3D scene with lighting estimation

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