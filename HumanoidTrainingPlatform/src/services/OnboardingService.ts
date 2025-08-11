import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'intro' | 'permission' | 'tutorial' | 'setup' | 'completion';
  required: boolean;
  completed: boolean;
  skippable: boolean;
  data?: any;
}

export interface OnboardingProgress {
  isCompleted: boolean;
  currentStep: string | null;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date | null;
  completedAt: Date | null;
  version: string;
}

export interface TutorialHighlight {
  id: string;
  element: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'tap' | 'swipe' | 'hold';
}

export class OnboardingService {
  private progress: OnboardingProgress;
  private steps: OnboardingStep[];
  private currentStepIndex: number = 0;
  private isActive: boolean = false;
  
  private readonly STORAGE_KEY = 'onboarding_progress';
  private readonly ONBOARDING_VERSION = '1.0.0';

  constructor() {
    this.progress = {
      isCompleted: false,
      currentStep: null,
      completedSteps: [],
      skippedSteps: [],
      startedAt: null,
      completedAt: null,
      version: this.ONBOARDING_VERSION,
    };

    this.steps = [
      {
        id: 'welcome',
        title: 'Welcome to HumanoidTrainingPlatform',
        description: 'Transform your smartphone into a powerful robot training tool',
        icon: 'robot',
        type: 'intro',
        required: true,
        completed: false,
        skippable: false,
      },
      {
        id: 'camera_permission',
        title: 'Camera Access',
        description: 'We need camera access to track your hand movements',
        icon: 'camera',
        type: 'permission',
        required: true,
        completed: false,
        skippable: false,
        data: { permission: 'camera' },
      },
      {
        id: 'microphone_permission',
        title: 'Microphone Access',
        description: 'Optional: Enable audio recording for enhanced training data',
        icon: 'microphone',
        type: 'permission',
        required: false,
        completed: false,
        skippable: true,
        data: { permission: 'microphone' },
      },
      {
        id: 'motion_permission',
        title: 'Motion Sensors',
        description: 'Access motion sensors for improved tracking accuracy',
        icon: 'motion',
        type: 'permission',
        required: false,
        completed: false,
        skippable: true,
        data: { permission: 'motion' },
      },
      {
        id: 'hand_tracking_tutorial',
        title: 'Hand Tracking Basics',
        description: 'Learn how to position your hands for optimal tracking',
        icon: 'hand',
        type: 'tutorial',
        required: true,
        completed: false,
        skippable: false,
        data: {
          highlights: [
            {
              id: 'hand_position',
              element: 'camera_view',
              title: 'Hand Position',
              description: 'Keep your hands visible in the camera frame',
              position: 'bottom',
              action: 'hold',
            },
            {
              id: 'gesture_recognition',
              element: 'gesture_indicator',
              title: 'Gesture Recognition',
              description: 'Make clear, deliberate gestures for better recognition',
              position: 'top',
              action: 'tap',
            },
          ],
        },
      },
      {
        id: 'recording_tutorial',
        title: 'Recording Sessions',
        description: 'Learn how to start and manage recording sessions',
        icon: 'record',
        type: 'tutorial',
        required: true,
        completed: false,
        skippable: false,
        data: {
          highlights: [
            {
              id: 'record_button',
              element: 'record_btn',
              title: 'Start Recording',
              description: 'Tap here to begin capturing hand movements',
              position: 'top',
              action: 'tap',
            },
            {
              id: 'pause_button',
              element: 'pause_btn',
              title: 'Pause/Resume',
              description: 'Pause recording when you need a break',
              position: 'top',
              action: 'tap',
            },
            {
              id: 'stop_button',
              element: 'stop_btn',
              title: 'Stop & Save',
              description: 'Stop recording and save your training data',
              position: 'top',
              action: 'tap',
            },
          ],
        },
      },
      {
        id: 'robot_connection',
        title: 'Connecting Robots',
        description: 'Learn how to connect and control robots',
        icon: 'wifi',
        type: 'tutorial',
        required: false,
        completed: false,
        skippable: true,
        data: {
          highlights: [
            {
              id: 'scan_robots',
              element: 'scan_button',
              title: 'Scan for Robots',
              description: 'Discover available robots on your network',
              position: 'bottom',
              action: 'tap',
            },
            {
              id: 'connect_robot',
              element: 'robot_item',
              title: 'Connect Robot',
              description: 'Tap on a robot to establish connection',
              position: 'right',
              action: 'tap',
            },
          ],
        },
      },
      {
        id: 'marketplace_intro',
        title: 'Skills Marketplace',
        description: 'Discover and share robot skills with the community',
        icon: 'store',
        type: 'tutorial',
        required: false,
        completed: false,
        skippable: true,
        data: {
          highlights: [
            {
              id: 'browse_skills',
              element: 'skill_grid',
              title: 'Browse Skills',
              description: 'Explore skills created by other users',
              position: 'top',
              action: 'swipe',
            },
            {
              id: 'purchase_skill',
              element: 'purchase_button',
              title: 'Purchase Skills',
              description: 'Buy skills to expand your robot capabilities',
              position: 'bottom',
              action: 'tap',
            },
          ],
        },
      },
      {
        id: 'profile_setup',
        title: 'Profile Setup',
        description: 'Personalize your profile and preferences',
        icon: 'user',
        type: 'setup',
        required: false,
        completed: false,
        skippable: true,
        data: {
          fields: ['displayName', 'avatar', 'preferences'],
        },
      },
      {
        id: 'completion',
        title: 'Ready to Start!',
        description: 'You are all set up and ready to train robots',
        icon: 'check',
        type: 'completion',
        required: true,
        completed: false,
        skippable: false,
      },
    ];
  }

  async initialize(): Promise<void> {
    try {
      await this.loadProgress();
      
      // Check if onboarding version has changed
      if (this.progress.version !== this.ONBOARDING_VERSION) {
        await this.resetOnboarding();
      }
      
      console.log('Onboarding service initialized');
    } catch (error) {
      console.error('Onboarding initialization error:', error);
      throw error;
    }
  }

  async startOnboarding(): Promise<void> {
    if (this.progress.isCompleted) {
      console.log('Onboarding already completed');
      return;
    }

    this.isActive = true;
    this.progress.startedAt = new Date();
    this.currentStepIndex = this.findCurrentStepIndex();

    if (this.currentStepIndex === -1) {
      this.currentStepIndex = 0;
    }

    this.progress.currentStep = this.steps[this.currentStepIndex].id;
    await this.saveProgress();

    console.log(`Starting onboarding at step: ${this.progress.currentStep}`);
  }

  async completeStep(stepId: string, data?: any): Promise<boolean> {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    if (step.completed) {
      return false; // Already completed
    }

    step.completed = true;
    step.data = { ...step.data, ...data };

    this.progress.completedSteps.push(stepId);
    await this.saveProgress();

    console.log(`Step completed: ${stepId}`);

    // Auto-advance to next step
    return await this.advanceToNextStep();
  }

  async skipStep(stepId: string): Promise<boolean> {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    if (!step.skippable) {
      throw new Error(`Step cannot be skipped: ${stepId}`);
    }

    this.progress.skippedSteps.push(stepId);
    await this.saveProgress();

    console.log(`Step skipped: ${stepId}`);

    // Auto-advance to next step
    return await this.advanceToNextStep();
  }

  private async advanceToNextStep(): Promise<boolean> {
    this.currentStepIndex++;

    // Find next incomplete required step
    while (this.currentStepIndex < this.steps.length) {
      const step = this.steps[this.currentStepIndex];
      
      if (!step.completed && !this.progress.skippedSteps.includes(step.id)) {
        this.progress.currentStep = step.id;
        await this.saveProgress();
        return true;
      }
      
      this.currentStepIndex++;
    }

    // No more steps - complete onboarding
    await this.completeOnboarding();
    return false;
  }

  private async completeOnboarding(): Promise<void> {
    this.progress.isCompleted = true;
    this.progress.completedAt = new Date();
    this.progress.currentStep = null;
    this.isActive = false;

    await this.saveProgress();
    console.log('Onboarding completed successfully');
  }

  getCurrentStep(): OnboardingStep | null {
    if (!this.progress.currentStep) return null;
    return this.steps.find(s => s.id === this.progress.currentStep) || null;
  }

  getNextStep(): OnboardingStep | null {
    const nextIndex = this.currentStepIndex + 1;
    if (nextIndex >= this.steps.length) return null;

    // Find next incomplete step
    for (let i = nextIndex; i < this.steps.length; i++) {
      const step = this.steps[i];
      if (!step.completed && !this.progress.skippedSteps.includes(step.id)) {
        return step;
      }
    }

    return null;
  }

  getAllSteps(): OnboardingStep[] {
    return [...this.steps];
  }

  getProgress(): OnboardingProgress {
    return { ...this.progress };
  }

  getProgressPercentage(): number {
    const totalRequiredSteps = this.steps.filter(s => s.required).length;
    const completedRequiredSteps = this.steps.filter(s => 
      s.required && (s.completed || this.progress.completedSteps.includes(s.id))
    ).length;

    return Math.round((completedRequiredSteps / totalRequiredSteps) * 100);
  }

  isOnboardingCompleted(): boolean {
    return this.progress.isCompleted;
  }

  isOnboardingActive(): boolean {
    return this.isActive && !this.progress.isCompleted;
  }

  async requestPermission(permissionType: string): Promise<boolean> {
    // This would integrate with actual permission requests
    switch (permissionType) {
      case 'camera':
        // Request camera permission
        console.log('Requesting camera permission');
        break;
      case 'microphone':
        // Request microphone permission
        console.log('Requesting microphone permission');
        break;
      case 'motion':
        // Request motion sensors permission
        console.log('Requesting motion sensors permission');
        break;
      default:
        console.log(`Unknown permission type: ${permissionType}`);
        return false;
    }

    // Simulate permission result
    return Math.random() > 0.1; // 90% chance of success
  }

  getTutorialHighlights(stepId: string): TutorialHighlight[] {
    const step = this.steps.find(s => s.id === stepId);
    return step?.data?.highlights || [];
  }

  async resetOnboarding(): Promise<void> {
    this.progress = {
      isCompleted: false,
      currentStep: null,
      completedSteps: [],
      skippedSteps: [],
      startedAt: null,
      completedAt: null,
      version: this.ONBOARDING_VERSION,
    };

    // Reset all steps
    this.steps.forEach(step => {
      step.completed = false;
    });

    this.currentStepIndex = 0;
    this.isActive = false;

    await this.saveProgress();
    console.log('Onboarding reset');
  }

  async updateStepData(stepId: string, data: any): Promise<void> {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.data = { ...step.data, ...data };
      await this.saveProgress();
    }
  }

  canSkipStep(stepId: string): boolean {
    const step = this.steps.find(s => s.id === stepId);
    return step ? step.skippable : false;
  }

  isStepCompleted(stepId: string): boolean {
    const step = this.steps.find(s => s.id === stepId);
    return step ? step.completed : false;
  }

  isStepRequired(stepId: string): boolean {
    const step = this.steps.find(s => s.id === stepId);
    return step ? step.required : false;
  }

  getStepsByType(type: OnboardingStep['type']): OnboardingStep[] {
    return this.steps.filter(s => s.type === type);
  }

  getCompletedSteps(): OnboardingStep[] {
    return this.steps.filter(s => s.completed);
  }

  getRemainingSteps(): OnboardingStep[] {
    return this.steps.filter(s => !s.completed && !this.progress.skippedSteps.includes(s.id));
  }

  private findCurrentStepIndex(): number {
    if (!this.progress.currentStep) return 0;

    return this.steps.findIndex(s => s.id === this.progress.currentStep);
  }

  private async loadProgress(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.progress = {
          ...this.progress,
          ...parsed,
          startedAt: parsed.startedAt ? new Date(parsed.startedAt) : null,
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : null,
        };

        // Update step completion status
        this.steps.forEach(step => {
          step.completed = this.progress.completedSteps.includes(step.id);
        });
      }
    } catch (error) {
      console.error('Load onboarding progress error:', error);
    }
  }

  private async saveProgress(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.progress));
    } catch (error) {
      console.error('Save onboarding progress error:', error);
    }
  }

  // Analytics integration
  async trackOnboardingEvent(event: string, data?: any): Promise<void> {
    console.log(`Onboarding event: ${event}`, data);
    
    // This would integrate with the analytics service
    // analyticsService.trackEvent(`onboarding_${event}`, data);
  }

  async exportOnboardingData(): Promise<string> {
    const data = {
      progress: this.progress,
      steps: this.steps.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        completed: s.completed,
        required: s.required,
      })),
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }
}

export const onboardingService = new OnboardingService();