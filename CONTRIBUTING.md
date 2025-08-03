# Contributing to Humanoid Training Platform

Thank you for your interest in contributing to the Humanoid Training Platform! This project aims to democratize robot training by making it accessible to everyone with a smartphone. Every contribution helps build the future of robotics.

## How to Contribute

### Ways to Contribute
- **Bug Reports**: Found a bug? Help us fix it!
- **Feature Requests**: Have an idea? We'd love to hear it!
- **Code Contributions**: Submit pull requests with improvements
- **Documentation**: Help improve our docs and guides
- **Robot Integration**: Add support for new robot types
- **UI/UX**: Enhance the user experience
- **Testing**: Help us test on different devices and scenarios

### What We're Looking For
- Mobile app improvements and new features
- Computer vision and ML enhancements
- Robot communication protocols
- Performance optimizations
- Better UI animations and interactions
- Documentation improvements
- Test coverage expansion

## Getting Started

### 1. Fork and Clone
```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/yourusername/humanoid-training-platform.git
cd humanoid-training-platform

# Add upstream remote
git remote add upstream https://github.com/original-owner/humanoid-training-platform.git
```

### 2. Set Up Development Environment
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run tests
npm test
```

### 3. Create a Branch
```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

## Development Guidelines

### Code Style
- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow our ESLint configuration
- **Prettier**: Format code with Prettier
- **Naming**: Use descriptive names for variables and functions

### Component Structure
```typescript
// Example component structure
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.text,
  },
});

export default MyComponent;
```

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add LIDAR depth integration
fix: resolve hand tracking accuracy issue
docs: update robot setup instructions
style: improve dark theme colors
test: add unit tests for gesture recognition
```

### Testing Requirements
- Write unit tests for new features
- Test on both iOS and Android
- Ensure accessibility compliance
- Test with different camera qualities
- Verify performance on older devices

## Robot Integration Guidelines

### Adding New Robot Support
1. **Create Robot Configuration**
   ```typescript
   // In src/services/RobotService.ts
   const ROBOT_CONFIGS = {
     your_robot: {
       capabilities: ['navigation', 'manipulation'],
       defaultPort: 8080,
       maxCommandQueueSize: 100,
       heartbeatInterval: 1000,
       jointCount: 6,
       maxSpeed: 1.0,
     }
   };
   ```

2. **Implement Communication Protocol**
   - Add connection logic
   - Define command mapping
   - Handle robot-specific responses

3. **Add Documentation**
   - Update supported robots table
   - Add setup instructions
   - Include troubleshooting guide

### Testing Robot Integration
- Use robot simulators when possible
- Test with actual hardware if available
- Document hardware requirements
- Include safety warnings

## UI/UX Guidelines

### Design Principles
- **Dark Theme First**: Design for our cyberpunk aesthetic
- **Accessibility**: Ensure high contrast and screen reader support
- **Performance**: Maintain 60fps animations
- **Responsive**: Support various screen sizes

### Animation Guidelines
- Use React Native Reanimated for performance
- Keep animations under 300ms for quick interactions
- Use spring animations for natural feel
- Add haptic feedback where appropriate

## Platform-Specific Guidelines

### iOS Considerations
- Test with various iPhone models
- Verify LIDAR integration on Pro models
- Ensure proper permission handling
- Test with iOS camera APIs

### Android Considerations
- Test across different Android versions
- Handle various camera implementations
- Test with different screen densities
- Verify performance on budget devices

## Testing

### Running Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### Test Coverage
- Aim for >80% code coverage
- Test critical paths thoroughly
- Include edge cases
- Mock external dependencies

## Documentation

### Documentation Standards
- Clear, concise explanations
- Include code examples
- Add screenshots for UI changes
- Update README for new features

### API Documentation
- Document all public methods
- Include parameter types
- Provide usage examples
- Note breaking changes

## Pull Request Process

### Before Submitting
1. Test your changes thoroughly
2. Update documentation
3. Add/update tests
4. Run linting and type checks
5. Rebase on latest main branch

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Tested on multiple devices

## Screenshots
(If applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

### Review Process
1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Maintainers review code quality
3. **Testing**: Manual testing on various devices
4. **Merge**: Approved PRs are merged to main

## Issue Guidelines

### Bug Reports
Use the bug report template:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Device and OS information
- Screenshots/videos if helpful

### Feature Requests
Use the feature request template:
- Problem statement
- Proposed solution
- Alternative solutions considered
- Additional context

## Recognition

### Contributors
- All contributors are listed in our README
- Significant contributors get special recognition
- Most active contributors may become maintainers

### Ways We Say Thanks
- GitHub contributor badges
- Feature in our newsletter
- Speaking opportunities at events
- Early access to new features

## Getting Help

### Communication Channels
- [Discord Server](https://discord.gg/humanoid-training) - Real-time chat
- [GitHub Issues](https://github.com/yourusername/humanoid-training-platform/issues) - Bug reports and features
- Email: contributors@humanoidtraining.dev - Direct contact

### Mentorship Program
New to open source? We offer mentorship!
- Pair programming sessions
- Code review guidance
- Career development advice
- Open source best practices

## Development Setup Details

### Required Tools
- Node.js 18+
- npm or yarn
- Git
- Code editor (VS Code recommended)
- iOS Simulator / Android Emulator

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-react-native"
  ]
}
```

### Environment Variables
```bash
# .env.local
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_ENABLE_DEV_TOOLS=true
```

## Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

### Release Schedule
- **Patch releases**: Weekly (bug fixes)
- **Minor releases**: Monthly (new features)
- **Major releases**: Quarterly (breaking changes)

---

## Thank You

Your contributions make this project possible! Whether you're fixing bugs, adding features, or improving documentation, you're helping build the future of robotics. Together, we're making robot training accessible to everyone.

**Ready to contribute?** Check out our [good first issues](https://github.com/yourusername/humanoid-training-platform/labels/good%20first%20issue) and join our [Discord community](https://discord.gg/humanoid-training)!

---

*This contributing guide is a living document. Have suggestions for improvement? Please open an issue or submit a PR!* 