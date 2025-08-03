# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Humanoid Training Platform - a React Native mobile application that transforms smartphone footage into comprehensive robot training data. The platform enables users to capture hand movements, generate LeRobot-compatible datasets, and participate in a skills marketplace for robot behaviors.

## Development Commands

### Expo/React Native Commands
```bash
# Start development server
cd HumanoidTrainingPlatform && npx expo start

# Run on specific platforms
cd HumanoidTrainingPlatform && npx expo start --android
cd HumanoidTrainingPlatform && npx expo start --ios
cd HumanoidTrainingPlatform && npx expo start --web

# Install dependencies
cd HumanoidTrainingPlatform && npm install
```

### Testing and Build
```bash
# Run tests (when implemented)
cd HumanoidTrainingPlatform && npm test

# Build for production
cd HumanoidTrainingPlatform && npx expo build:ios
cd HumanoidTrainingPlatform && npx expo build:android
```

## Code Architecture

### Project Structure
The main application code is located in `/HumanoidTrainingPlatform/` with two additional directories:
- `/src/` - Contains shared components and services for the root level
- `/HumanoidTrainingPlatform/src/` - Main application source code

### Key Components

#### Navigation System (`src/navigation/AppNavigator.tsx`)
- Custom bottom tab navigator with animated icons
- Six main screens: Home, Record, Map, Marketplace, Robot, Profile  
- Uses React Navigation with custom tab bar implementation
- Animated transitions and focus states with React Native Reanimated

#### Hand Tracking Service (`src/services/HandTrackingService.ts`)
- Core ML service for hand pose detection and gesture recognition
- Processes camera frames to extract hand landmarks (21 points per hand)
- Classifies actions: pick, place, move, rotate, open, close
- Generates LeRobot-compatible training data
- Mock implementation ready for MediaPipe integration
- Manages gesture recording sessions and data export

#### Robot Service (`src/services/RobotService.ts`)
- Handles robot discovery, connection, and command execution
- Supports multiple robot types: Unitree G1, Boston Dynamics, Tesla Bot, Custom
- Command queue system with priority handling
- Real-time robot state monitoring and heartbeat system
- Converts LeRobot actions to robot-specific commands

#### Type Definitions (`src/types/index.ts`)
- Comprehensive TypeScript interfaces for:
  - Hand tracking data structures (HandPose, HandKeypoint)
  - LeRobot compatibility (LerobotAction, LerobotObservation, LerobotDataPoint)
  - Robot connectivity (RobotConnection, RobotCommand, RobotState)
  - Camera and sensor data (CameraFrame)

### Core Technologies
- **React Native 0.79.5** with **Expo SDK 53**
- **TypeScript 5.8.3** with strict mode enabled
- **React Navigation 7.x** for navigation
- **React Native Reanimated 4.0** for animations
- **Expo Camera/AV** for media capture
- **Expo Sensors** for device motion data
- **Three.js** for 3D rendering and mapping

### Data Flow
1. **Camera Capture** → Camera frames captured via Expo Camera
2. **Hand Tracking** → HandTrackingService processes frames to detect hand poses
3. **Action Classification** → Hand poses classified into LeRobot actions
4. **Robot Communication** → RobotService converts actions to robot commands
5. **Data Storage** → Training data stored in LeRobot-compatible format

### Key Features
- Real-time hand tracking with <50ms latency
- LeRobot dataset generation for robot training
- Multi-robot connectivity and control
- 3D environment mapping capabilities
- Skills marketplace integration
- Gamification system with user progression

## Development Notes

### Theme System
Uses a centralized theme system in `/src/constants/theme.ts` with cyberpunk-inspired dark UI colors and consistent spacing/typography tokens.

### Mock Services
Current services contain mock implementations for development:
- Hand tracking uses simulated MediaPipe data
- Robot connections simulate network discovery
- All services are structured for easy integration with real hardware

### State Management
The project includes a store directory suggesting Redux or similar state management (not yet implemented in analyzed files).

### Platform Compatibility
- Minimum: iOS 12+ / Android 8+
- Recommended: iOS 15+ / Android 11+
- Optimal: iPhone 14 Pro / Samsung S23+ with LIDAR

## Security & Privacy
- Local hand tracking processing (no cloud dependency)
- AES-256 encryption for data storage
- GDPR compliance features
- Anonymous contribution options available