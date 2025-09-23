# Humanoid Training Platform v2

## Vision
Deliver a production-ready cross-platform mobile experience that captures multi-camera humanoid training data, syncs it to an AWS-native backend, and exposes a marketplace for reusable robot behaviors. Version 2 embraces Flutter for consistent UI fidelity and deploys a scalable serverless backend.

## Key Product Pillars
- **Capture:** High-fidelity multi-angle recording with real-time gesture overlays, offline caching, and auto-sync.
- **Review & Annotate:** Session playback, frame tagging, and 3D pose visualization for dataset curation.
- **Marketplace:** Discover, purchase, and deploy robot behaviors with licensing controls.
- **Robot Telemetry:** Two-way WebSocket streams for live control and monitoring.

## Target Platforms
- iOS 15+
- Android 10+
- Web (PWA with limited capture features)

## Backend Platform
- AWS API Gateway + Lambda (FastAPI via Mangum) for HTTP APIs
- AWS AppSync (GraphQL) for real-time collaboration and subscriptions
- Amazon S3 for media storage
- Amazon DynamoDB for sessions, metadata, and marketplace listings
- Amazon RDS (Aurora Serverless v2, PostgreSQL) for transactional data requiring relational queries
- Amazon Cognito for auth (OAuth + email/password + M2M)
- Amazon ElastiCache (Redis) for session coordination and rate limiting
- AWS Step Functions for long-running training pipelines
- AWS EventBridge + SQS for asynchronous processing

## Mobile Architecture (Flutter)
- **State Management:** Riverpod + StateNotifier for composable, testable state.
- **Navigation:** go_router with nested routes and deep-linking.
- **Networking:** `dio` with interceptors for auth refresh; WebSockets via `web_socket_channel`.
- **Media:** `camera`, `flutter_webrtc`, and custom `mediapipe` plugin (via platform channels) for hand tracking.
- **Rendering:** `rive` and `Lottie` for high-fidelity animations; `three_dart` for 3D playback.
- **Storage:** `hive` for offline caches, `isar` for structured local datasets.

## Module Breakdown
1. **App Shell:** Onboarding, auth, theming, localization.
2. **Capture Module:** Multi-camera setup wizard, live preview, calibration, session recording.
3. **Review Module:** Timeline scrubber, gesture tagging, data export.
4. **Marketplace Module:** Listings, purchases, downloads, and license management.
5. **Robot Control Module:** Teleoperation dashboards, telemetry feeds, WebRTC channels.
6. **Settings & Admin:** User profiles, device management, subscription plans.

## UX North Star
- Cyberpunk-inspired aesthetic with neon gradients, depth effects, and glassmorphism cards.
- Haptic-rich interactions, parallax hero sections, and smooth micro-animations.
- Accessibility-first: text scaling, high-contrast dark/light modes, screen reader support.

## Next Steps
1. Define detailed requirements & user stories per module.
2. Establish design system (color tokens, typography, component library) in Figma.
3. Scaffold Flutter workspace and shared packages (`/v2/app`, `/v2/packages/core_ui`, `/v2/packages/api_client`).
4. Provision AWS infrastructure IaC (CDK or Terraform) with dev/stage/prod stacks.
5. Implement authentication flow end-to-end (Cognito + Flutter).
6. Build capture pipeline with offline-first data sync.
7. Layer marketplace and robot control features.
8. Establish CI/CD (GitHub Actions + AWS CodeBuild) with automated testing and deployments.
