# Flutter App Scaffold Plan

## Overview
This directory will host the Flutter application using a modular, package-based architecture. The goal is to leverage `melos` for workspace management and ensure production-ready quality from day one.

## Planned Structure
- `lib/` – main application entrypoint and feature modules
- `lib/app/` – app bootstrap, routing (go_router), dependency injection setup
- `lib/features/` – domain-driven feature folders (capture, review, marketplace, robot_control, settings)
- `lib/shared/` – reusable widgets, theming, localization
- `assets/` – fonts, icons, Lottie animations, Rive files
- `test/` – unit and widget tests per feature
- `integration_test/` – end-to-end flows using `flutter_test`

## Tooling
- Flutter 3.27+ with Dart 3.x
- `melos` for workspace orchestration
- `flutter_lints` + custom lint rules
- `very_good_analysis` for static analysis
- `build_runner` for code generation (json_serializable, freezed)

## Initial Tasks
1. Initialize Flutter project (`flutter create humanoid_training_v2`).
2. Configure melos workspace spanning app and shared packages.
3. Set up analysis options with strict lints and CI enforcement.
4. Implement theming primitives (color tokens, typography, spacing).
5. Build authentication flow skeleton with Cognito integration stubs.
