# Humanoid Training Platform

A React Native mobile application that transforms smartphone footage into comprehensive robot training data. The platform enables users to capture hand movements while performing any task, generate LeRobot-compatible datasets, and contribute to humanoid robot training.

## The Problem We're Solving

**Humanoid robots face a critical data shortage.** Despite significant advances in robotics hardware and AI, humanoid robots struggle to perform everyday tasks that humans execute effortlessly. The primary bottleneck isn't computational power or mechanical capability—it's the lack of diverse, high-quality training data.

Current challenges in humanoid robot training:
- **Limited datasets**: Most robot training data comes from controlled lab environments
- **Expensive data collection**: Traditional motion capture systems cost hundreds of thousands of dollars
- **Narrow skill coverage**: Existing datasets focus on specific tasks, not general human activities
- **Scalability issues**: Professional data collection doesn't scale to millions of everyday scenarios

## Our Solution

This app democratizes robot training data collection by turning every smartphone into a professional motion capture system. By crowdsourcing human demonstrations of everyday tasks, we can build the massive, diverse datasets that humanoid robots need to learn human-level dexterity and adaptability.

**Key Innovation**: We leverage the ubiquity of smartphones and computer vision to capture the same quality hand tracking data that traditionally required expensive laboratory equipment.

## Overview

This application is designed to work with smartphones worn on the user's body to capture video and extract hand tracking data in LeRobot format. It can record anything from cooking an omelette to a whole day's housework to tasks in a car factory, with adaptive UI for any episode length.

### What Makes This App Different

- **Accessibility**: Uses standard smartphone hardware—no special equipment needed
- **Real-world data**: Captures genuine human behavior in natural environments
- **Scalable**: Anyone can contribute training data from anywhere
- **Comprehensive**: Records the full spectrum of human hand movements and tasks
- **Industry-standard**: Outputs data in LeRobot format for immediate use in robot training pipelines

## Key Features

- **Universal Task Recording**: Capture any human activity from 30 seconds to 8+ hours
- **Real-time Hand Tracking**: 21-point hand landmark detection using MediaPipe
- **LeRobot Compatibility**: Generate training datasets in industry-standard format
- **Adaptive UI**: Scales from quick tasks to full workday recordings
- **Professional Export**: Zip-based episode export with sharing capabilities
- **Body-worn Design**: Optimized for smartphone mounting on body/head

## Use Cases

### Domestic Tasks
- Cooking and food preparation
- Cleaning and household maintenance
- Personal care routines
- Pet care activities

### Industrial Applications
- Manufacturing assembly tasks
- Quality control procedures
- Warehouse operations
- Equipment maintenance

### Research & Development
- Gesture analysis studies
- Ergonomic assessments
- Skill acquisition research
- Human-robot interaction studies

## Technical Architecture

### Hand Tracking System
- **MediaPipe Integration**: 21-point hand landmark detection
- **Real-time Processing**: <50ms latency for live feedback
- **Dual Hand Support**: Simultaneous tracking of both hands
- **Activity Classification**: Automatic detection of pick, place, move, rotate, open, close actions

### Data Format
```typescript
interface LerobotDataPoint {
  timestamp: number;
  hands: {
    left?: HandPose;
    right?: HandPose;
  };
  action: LerobotAction;
  episode_id: string;
  skill_label: string;
}
```

### Camera Integration
- **Expo Camera**: Cross-platform camera access
- **10 FPS Capture**: Balanced performance and data quality
- **Permission Handling**: Graceful camera access management
- **Front/Back Switch**: Adaptable to mounting configuration

## Installation

### Prerequisites
- Node.js 18+
- React Native development environment
- Expo CLI

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd HumanoidTrainingNative

# Install dependencies
npm install

# Start development server
npm start

# Run on device/simulator
npm run android  # Android
npm run ios      # iOS
```

### Dependencies
- React Native 0.79.5
- Expo SDK (Camera, FileSystem, Sharing)
- MediaPipe (for hand tracking)
- React Navigation 7.x
- TypeScript 5.0+

## Usage

### Recording Sessions
1. **Mount Device**: Secure smartphone on body/head for optimal hand visibility
2. **Select Skill**: Choose or create skill category (cooking, cleaning, etc.)
3. **Start Recording**: Begin task execution with real-time hand tracking
4. **Monitor Progress**: View tracking quality and episode duration
5. **Stop & Export**: End session and export LeRobot dataset

### Data Export
- **Zip Format**: Episodes exported as compressed archives
- **Shareable**: Direct sharing to cloud storage, email, or research platforms
- **Structured**: Organized by skill type and episode timestamp
- **Compatible**: Ready for LeRobot training pipelines

## Episode Management

### Short Tasks (30 seconds - 5 minutes)
- Quick skill demonstrations
- Gesture pattern capture
- Quality control checks

### Medium Tasks (5 minutes - 1 hour)
- Complete cooking recipes
- Assembly procedures
- Maintenance routines

### Long Tasks (1-8+ hours)
- Full workday capture
- Extended research sessions
- Comprehensive skill documentation

## Hardware Recommendations

### Optimal Setup
- **Device**: iPhone 14 Pro / Samsung S23+ or newer
- **Mounting**: Head-mounted or chest-mounted rig
- **Storage**: 64GB+ available space for long sessions
- **Battery**: External power bank for extended recording

### Minimum Requirements
- **OS**: iOS 12+ / Android 8+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 16GB+ available space
- **Camera**: 1080p recording capability

## Integration Examples

### Research Pipeline
```bash
# Export training data
1. Record human demonstrations
2. Export as LeRobot dataset
3. Train humanoid robot models
4. Deploy to physical robots
```

### Industrial Workflow
```bash
# Quality assurance process
1. Record expert performing task
2. Generate reference dataset
3. Train robot to replicate task
4. Validate robot performance
```

## Privacy & Security

- **Local Processing**: Hand tracking performed on-device
- **No Cloud Dependency**: All data remains on user's device
- **Secure Export**: AES-256 encryption for sensitive datasets
- **Anonymous Options**: Remove identifying information from exports

## Contributing

This platform is designed for the robotics research community. Contributions welcome for:
- Additional hand gesture recognition
- New robot integration protocols
- Enhanced data visualization
- Performance optimizations

## License

[License information to be added]

## Support

For technical support or research collaboration inquiries, please open an issue in this repository.
