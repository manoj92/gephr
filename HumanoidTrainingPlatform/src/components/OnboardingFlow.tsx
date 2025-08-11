import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { onboardingService, OnboardingStep } from '../services/OnboardingService';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCurrentStep();
  }, []);

  const loadCurrentStep = async () => {
    try {
      await onboardingService.startOnboarding();
      const step = onboardingService.getCurrentStep();
      setCurrentStep(step);
      updateProgress();
    } catch (error) {
      console.error('Failed to load onboarding step:', error);
      Alert.alert('Error', 'Failed to load onboarding. Please try again.');
    }
  };

  const updateProgress = () => {
    const progressPercent = onboardingService.getProgressPercentage();
    setProgress(progressPercent);
  };

  const handleNext = async () => {
    if (!currentStep) return;

    setIsLoading(true);
    try {
      let success = false;

      switch (currentStep.type) {
        case 'permission':
          success = await handlePermissionStep();
          break;
        case 'tutorial':
          success = await handleTutorialStep();
          break;
        case 'setup':
          success = await handleSetupStep();
          break;
        default:
          success = true;
          break;
      }

      if (success) {
        await onboardingService.completeStep(currentStep.id);
        const nextStep = onboardingService.getCurrentStep();
        
        if (nextStep) {
          setCurrentStep(nextStep);
          updateProgress();
        } else {
          // Onboarding complete
          onComplete();
        }
      }
    } catch (error) {
      console.error('Failed to advance onboarding step:', error);
      Alert.alert('Error', 'Failed to advance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentStep) return;

    if (!currentStep.skippable) {
      Alert.alert('Required Step', 'This step is required and cannot be skipped.');
      return;
    }

    setIsLoading(true);
    try {
      await onboardingService.skipStep(currentStep.id);
      const nextStep = onboardingService.getCurrentStep();
      
      if (nextStep) {
        setCurrentStep(nextStep);
        updateProgress();
      } else {
        // Onboarding complete
        onSkip();
      }
    } catch (error) {
      console.error('Failed to skip onboarding step:', error);
      Alert.alert('Error', 'Failed to skip step. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionStep = async (): Promise<boolean> => {
    if (!currentStep?.data?.permission) return false;

    try {
      const granted = await onboardingService.requestPermission(currentStep.data.permission);
      
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'This permission is required for the app to function properly. Please grant the permission in your device settings.',
          [
            { text: 'Skip', onPress: () => handleSkip() },
            { text: 'Try Again', onPress: () => handlePermissionStep() },
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  const handleTutorialStep = async (): Promise<boolean> => {
    // For tutorial steps, we just mark them as completed
    // In a real app, you might wait for user interaction with tutorial elements
    return true;
  };

  const handleSetupStep = async (): Promise<boolean> => {
    // For setup steps, you might collect user preferences
    // For now, we'll just complete them
    return true;
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepIcon}>
          {getStepIcon(currentStep.type)}
        </Text>
        
        <Text style={styles.stepTitle}>
          {currentStep.title}
        </Text>
        
        <Text style={styles.stepDescription}>
          {currentStep.description}
        </Text>

        {currentStep.type === 'tutorial' && (
          <View style={styles.tutorialContent}>
            <Text style={styles.tutorialText}>
              Follow the highlighted elements on screen to learn how to use this feature.
            </Text>
          </View>
        )}

        {currentStep.type === 'permission' && (
          <View style={styles.permissionContent}>
            <Text style={styles.permissionText}>
              We need your permission to access {currentStep.data?.permission} 
              for the best experience.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getStepIcon = (type: string): string => {
    const icons = {
      intro: '👋',
      permission: '🔒',
      tutorial: '🎯',
      setup: '⚙️',
      completion: '✅',
    };
    return icons[type as keyof typeof icons] || '📱';
  };

  if (!currentStep) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading onboarding...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${progress}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {progress}% Complete
        </Text>
      </View>

      {/* Step Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {currentStep.skippable && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            !currentStep.skippable && styles.nextButtonFullWidth
          ]}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>
            {isLoading ? 'Loading...' : 
             currentStep.type === 'completion' ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  progressContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 2,
  },
  progressText: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  stepContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stepIcon: {
    fontSize: 80,
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepDescription: {
    fontSize: 18,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  tutorialContent: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  tutorialText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionContent: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#00E5FF',
  },
  permissionText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingVertical: 30,
    gap: 15,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#555555',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#00E5FF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonFullWidth: {
    flex: 1,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 18,
    textAlign: 'center',
    marginTop: screenHeight * 0.4,
  },
});

export default OnboardingFlow;