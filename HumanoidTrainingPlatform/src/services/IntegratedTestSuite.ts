import { robotSimulator } from './RobotSimulatorService';
import { enhancedLeRobotExportService } from './EnhancedLeRobotExportService';
import { enhancedGamificationService } from './EnhancedGamificationService';
import { enhancedMarketplaceService } from './EnhancedMarketplaceService';
import { enhanced3DMappingService } from './Enhanced3DMappingService';
import { mediaPipeIntegration } from './MediaPipeIntegration';
import { enhancedAuthService } from './EnhancedAuthService';

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'warning';
  duration: number;
  details: string;
  error?: Error;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

export class IntegratedTestSuite {
  private testResults: TestResult[] = [];
  private testCallbacks: Array<(result: TestResult) => void> = [];

  constructor() {}

  async runAllTests(): Promise<TestSuite> {
    console.log('🚀 Starting Integrated Test Suite...');
    this.testResults = [];

    // Run test suites in order
    await this.testAuthenticationService();
    await this.testHandTrackingSystem();
    await this.testRobotSimulator();
    await this.test3DMappingService();
    await this.testMarketplaceService();
    await this.testGamificationSystem();
    await this.testDataExportService();
    await this.testIntegrationScenarios();

    return this.generateTestSuite();
  }

  private async testAuthenticationService(): Promise<void> {
    console.log('🔐 Testing Authentication Service...');

    // Test initialization
    await this.runTest('Auth Service Initialization', async () => {
      const isInitialized = enhancedAuthService !== undefined;
      if (!isInitialized) throw new Error('Auth service not initialized');
      return 'Auth service initialized successfully';
    });

    // Test biometric config
    await this.runTest('Biometric Configuration', async () => {
      const config = enhancedAuthService.getBiometricConfig();
      if (!config) throw new Error('Biometric config not loaded');
      return `Biometric available: ${config.enabled}, Type: ${config.type}`;
    });

    // Test mock login
    await this.runTest('Mock User Login', async () => {
      const user = await enhancedAuthService.login({
        email: 'demo@example.com',
        password: 'password123'
      });
      if (!user) throw new Error('Login failed');
      return `Logged in as ${user.firstName} ${user.lastName}`;
    });

    // Test user session
    await this.runTest('User Session Validation', async () => {
      const isAuth = enhancedAuthService.isAuthenticated();
      const currentUser = enhancedAuthService.getCurrentUser();
      if (!isAuth || !currentUser) throw new Error('Session validation failed');
      return `Session valid for user: ${currentUser.username}`;
    });
  }

  private async testHandTrackingSystem(): Promise<void> {
    console.log('👋 Testing Hand Tracking System...');

    // Test MediaPipe initialization
    await this.runTest('MediaPipe Initialization', async () => {
      await mediaPipeIntegration.initialize();
      return 'MediaPipe initialized with TensorFlow.js backend';
    });

    // Test hand pose processing
    await this.runTest('Hand Pose Processing', async () => {
      // Simulate image data
      const mockImageData = new ImageData(new Uint8ClampedArray(640 * 480 * 4), 640, 480);
      const result = await mediaPipeIntegration.processImage(mockImageData);

      if (!result || !result.multiHandLandmarks) {
        throw new Error('Hand pose processing failed');
      }
      return `Processed hands: ${result.multiHandLandmarks.length}`;
    });

    // Test gesture classification
    await this.runTest('Gesture Classification', async () => {
      const mockLandmarks = Array(21).fill(null).map((_, i) => ({
        x: 0.5 + Math.random() * 0.1,
        y: 0.5 + Math.random() * 0.1,
        z: Math.random() * 0.1,
        confidence: 0.9
      }));

      const handPoses = mediaPipeIntegration.convertToHandPose({
        multiHandLandmarks: [mockLandmarks],
        multiHandWorldLandmarks: [mockLandmarks],
        multiHandedness: [{ index: 0, score: 0.95, label: 'Right' }]
      });

      if (handPoses.length === 0) throw new Error('Gesture classification failed');
      return `Detected gesture: ${handPoses[0].gesture}`;
    });
  }

  private async testRobotSimulator(): Promise<void> {
    console.log('🤖 Testing Robot Simulator...');

    // Test simulator initialization
    await this.runTest('Robot Simulator Initialization', async () => {
      await robotSimulator.initialize();
      const state = robotSimulator.getState();
      if (!state || state.status !== 'connected') {
        throw new Error('Robot simulator initialization failed');
      }
      return `Simulator initialized - Robot: ${state.type}`;
    });

    // Test robot commands
    await this.runTest('Robot Command Execution', async () => {
      await robotSimulator.executeCommand({
        type: 'move',
        parameters: { x: 1, y: 0, z: 0 },
        priority: 'normal',
        timestamp: new Date()
      });

      const state = robotSimulator.getState();
      return `Command executed - Position: (${state.position.x.toFixed(2)}, ${state.position.y.toFixed(2)}, ${state.position.z.toFixed(2)})`;
    });

    // Test joint control
    await this.runTest('Joint Control System', async () => {
      robotSimulator.setJointPosition('right_shoulder', Math.PI / 4);
      robotSimulator.setJointVelocity('left_elbow', 0.5);

      const state = robotSimulator.getState();
      const jointCount = Object.keys(state.jointStates).length;
      if (jointCount === 0) throw new Error('Joint control failed');
      return `Controlling ${jointCount} joints`;
    });

    // Test simulator start/stop
    await this.runTest('Simulator Lifecycle', async () => {
      await robotSimulator.start();
      await new Promise(resolve => setTimeout(resolve, 100)); // Let it run briefly
      await robotSimulator.stop();
      return 'Simulator lifecycle test completed';
    });
  }

  private async test3DMappingService(): Promise<void> {
    console.log('🗺️ Testing 3D Mapping Service...');

    // Test mapping initialization
    await this.runTest('3D Mapping Initialization', async () => {
      const scene = enhanced3DMappingService.getScene();
      if (!scene) throw new Error('3D mapping scene not initialized');
      return `Scene initialized with ${scene.children.length} objects`;
    });

    // Test scanning functionality
    await this.runTest('Environment Scanning', async () => {
      await enhanced3DMappingService.startScanning();
      await new Promise(resolve => setTimeout(resolve, 500)); // Scan for 500ms
      await enhanced3DMappingService.stopScanning();

      const pointCloud = enhanced3DMappingService.getPointCloud();
      return `Scanning completed - Point cloud has ${pointCloud.geometry.attributes.position.count} points`;
    });

    // Test object detection
    await this.runTest('Object Detection', async () => {
      const scannedObjects = enhanced3DMappingService.getScannedObjects();
      return `Detected ${scannedObjects.length} objects in environment`;
    });

    // Test export functionality
    await this.runTest('Point Cloud Export', async () => {
      const plyData = enhanced3DMappingService.exportPointCloud('ply');
      if (!plyData || plyData.length === 0) throw new Error('Export failed');
      return `Exported ${plyData.length} characters of PLY data`;
    });
  }

  private async testMarketplaceService(): Promise<void> {
    console.log('🛒 Testing Marketplace Service...');

    // Test marketplace initialization
    await this.runTest('Marketplace Initialization', async () => {
      const featuredItems = enhancedMarketplaceService.getFeaturedItems();
      if (featuredItems.length === 0) throw new Error('No featured items loaded');
      return `Loaded ${featuredItems.length} featured items`;
    });

    // Test search functionality
    await this.runTest('Item Search', async () => {
      const results = await enhancedMarketplaceService.searchItems('manipulation', {
        type: 'skill',
        minRating: 4.0
      });
      return `Found ${results.length} items matching search criteria`;
    });

    // Test wallet operations
    await this.runTest('Wallet Operations', async () => {
      const wallet = enhancedMarketplaceService.getUserWallet();
      if (!wallet) throw new Error('Wallet not initialized');

      await enhancedMarketplaceService.addCredits(100);
      const updatedWallet = enhancedMarketplaceService.getUserWallet();

      if (!updatedWallet || updatedWallet.credits <= wallet.credits) {
        throw new Error('Credit addition failed');
      }
      return `Wallet updated - Credits: ${updatedWallet.credits}`;
    });

    // Test cart functionality
    await this.runTest('Shopping Cart', async () => {
      const items = enhancedMarketplaceService.getFeaturedItems();
      if (items.length > 0) {
        await enhancedMarketplaceService.addToCart(items[0].id);
        const cart = enhancedMarketplaceService.getCart();
        if (cart.length === 0) throw new Error('Add to cart failed');
        return `Cart contains ${cart.length} items`;
      }
      return 'No items available for cart test';
    });
  }

  private async testGamificationSystem(): Promise<void> {
    console.log('🏆 Testing Gamification System...');

    // Test user level system
    await this.runTest('User Level System', async () => {
      const userLevel = enhancedGamificationService.getUserLevel();
      if (!userLevel) throw new Error('User level not initialized');
      return `Current level: ${userLevel.level} (${userLevel.currentXP}/${userLevel.requiredXP} XP)`;
    });

    // Test achievements
    await this.runTest('Achievement System', async () => {
      const achievements = enhancedGamificationService.getAchievements();
      const unlockedCount = enhancedGamificationService.getUnlockedCount();
      return `${achievements.length} achievements available, ${unlockedCount} unlocked`;
    });

    // Test activity recording
    await this.runTest('Activity Recording', async () => {
      await enhancedGamificationService.recordActivity('recording', 1, { accuracy: 95 });
      await enhancedGamificationService.recordActivity('robot_connected', 1);
      return 'Activities recorded successfully';
    });

    // Test XP system
    await this.runTest('XP Award System', async () => {
      const initialLevel = enhancedGamificationService.getUserLevel();
      const leveledUp = await enhancedGamificationService.addXP(100, 'Test activity');
      const newLevel = enhancedGamificationService.getUserLevel();

      return leveledUp ?
        `Level up! ${initialLevel.level} → ${newLevel.level}` :
        `XP gained: ${newLevel.currentXP - initialLevel.currentXP}`;
    });

    // Test quest system
    await this.runTest('Quest System', async () => {
      const activeQuests = enhancedGamificationService.getActiveQuests();
      const completedQuests = enhancedGamificationService.getCompletedQuests();
      return `${activeQuests.length} active quests, ${completedQuests.length} completed`;
    });
  }

  private async testDataExportService(): Promise<void> {
    console.log('📊 Testing Data Export Service...');

    // Test episode recording
    await this.runTest('Episode Recording', async () => {
      await enhancedLeRobotExportService.startEpisode('Test manipulation task');

      // Add some mock frames
      for (let i = 0; i < 10; i++) {
        const mockHandPoses = {
          right: {
            landmarks: Array(21).fill(null).map(() => ({
              x: Math.random(),
              y: Math.random(),
              z: Math.random(),
              confidence: 0.9
            })),
            gesture: 'open_hand',
            confidence: 0.9,
            timestamp: new Date()
          }
        };

        await enhancedLeRobotExportService.addFrame(mockHandPoses);
      }

      await enhancedLeRobotExportService.endEpisode(true);
      return 'Episode recorded with 10 frames';
    });

    // Test export functionality
    await this.runTest('Dataset Export', async () => {
      const filePath = await enhancedLeRobotExportService.exportDataset({
        format: 'json',
        compression: 'none',
        include_images: false,
        include_depth: false,
        include_audio: false,
        downsample_factor: 1,
        quality_filter: 0,
        anonymize: false
      });

      if (!filePath) throw new Error('Export failed');
      return `Dataset exported to: ${filePath.split('/').pop()}`;
    });

    // Test statistics
    await this.runTest('Dataset Statistics', async () => {
      const stats = enhancedLeRobotExportService.getDatasetStatistics();
      return `${stats.total_episodes} episodes, ${stats.total_frames} frames, ${stats.storage_size_mb.toFixed(2)} MB`;
    });
  }

  private async testIntegrationScenarios(): Promise<void> {
    console.log('🔄 Testing Integration Scenarios...');

    // Test complete recording workflow
    await this.runTest('Complete Recording Workflow', async () => {
      // Start episode
      await enhancedLeRobotExportService.startEpisode('Integration test');

      // Initialize hand tracking
      await mediaPipeIntegration.initialize();

      // Start robot simulator
      await robotSimulator.initialize();
      await robotSimulator.start();

      // Record activity for gamification
      await enhancedGamificationService.recordActivity('recording', 1);

      // Simulate hand tracking and robot control
      for (let i = 0; i < 5; i++) {
        const mockImageData = new ImageData(new Uint8ClampedArray(64 * 64 * 4), 64, 64);
        const handPoseResult = await mediaPipeIntegration.processImage(mockImageData);
        const handPoses = mediaPipeIntegration.convertToHandPose(handPoseResult);

        if (handPoses.length > 0) {
          // Add frame to dataset
          await enhancedLeRobotExportService.addFrame({ right: handPoses[0] });

          // Execute robot command
          await robotSimulator.executeCommand({
            type: 'move',
            parameters: { x: i * 0.1, y: 0, z: 0 },
            priority: 'normal',
            timestamp: new Date()
          });
        }
      }

      // End episode
      await enhancedLeRobotExportService.endEpisode(true);

      // Stop simulator
      await robotSimulator.stop();

      return 'Complete workflow executed successfully';
    });

    // Test marketplace purchase workflow
    await this.runTest('Marketplace Purchase Workflow', async () => {
      const featuredItems = enhancedMarketplaceService.getFeaturedItems();
      if (featuredItems.length === 0) {
        return 'No items available for purchase test';
      }

      const item = featuredItems[0];

      // Add credits if needed
      const wallet = enhancedMarketplaceService.getUserWallet();
      if (wallet && wallet.credits < item.price) {
        await enhancedMarketplaceService.addCredits(item.price);
      }

      // Purchase item
      const transaction = await enhancedMarketplaceService.purchaseItem(item.id);

      // Record activity for gamification
      await enhancedGamificationService.recordActivity('skill_purchased', 1);

      return `Purchased ${item.title} for ${item.price} credits`;
    });

    // Test 3D mapping with robot simulation
    await this.runTest('3D Mapping with Robot Simulation', async () => {
      // Start 3D mapping
      await enhanced3DMappingService.startScanning();

      // Move robot around
      await robotSimulator.executeCommand({
        type: 'move',
        parameters: { x: 1, y: 0, z: 0 },
        priority: 'normal',
        timestamp: new Date()
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      await robotSimulator.executeCommand({
        type: 'move',
        parameters: { x: 0, y: 1, z: 0 },
        priority: 'normal',
        timestamp: new Date()
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Stop mapping
      await enhanced3DMappingService.stopScanning();

      const scannedObjects = enhanced3DMappingService.getScannedObjects();
      return `3D mapping completed with robot movement, ${scannedObjects.length} objects detected`;
    });
  }

  private async runTest(testName: string, testFunction: () => Promise<string>): Promise<void> {
    const startTime = Date.now();
    let result: TestResult;

    try {
      const details = await testFunction();
      const duration = Date.now() - startTime;

      result = {
        testName,
        status: 'passed',
        duration,
        details
      };

      console.log(`✅ ${testName}: ${details} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;

      result = {
        testName,
        status: 'failed',
        duration,
        details: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : new Error(String(error))
      };

      console.log(`❌ ${testName}: ${result.details} (${duration}ms)`);
    }

    this.testResults.push(result);
    this.notifyTestResult(result);
  }

  private generateTestSuite(): TestSuite {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    const suite: TestSuite = {
      name: 'Humanoid Training Platform Integration Tests',
      tests: this.testResults,
      totalTests,
      passedTests,
      failedTests,
      totalDuration
    };

    console.log(`\n📊 Test Suite Complete:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Duration: ${totalDuration}ms`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    return suite;
  }

  private notifyTestResult(result: TestResult): void {
    this.testCallbacks.forEach(callback => callback(result));
  }

  public onTestResult(callback: (result: TestResult) => void): () => void {
    this.testCallbacks.push(callback);
    return () => {
      const index = this.testCallbacks.indexOf(callback);
      if (index > -1) {
        this.testCallbacks.splice(index, 1);
      }
    };
  }

  async runQuickTests(): Promise<TestSuite> {
    console.log('⚡ Running Quick Test Suite...');
    this.testResults = [];

    // Run essential tests only
    await this.runTest('Services Available', async () => {
      const services = [
        enhancedAuthService,
        mediaPipeIntegration,
        robotSimulator,
        enhanced3DMappingService,
        enhancedMarketplaceService,
        enhancedGamificationService,
        enhancedLeRobotExportService
      ];

      const unavailable = services.filter(service => !service);
      if (unavailable.length > 0) {
        throw new Error(`${unavailable.length} services unavailable`);
      }

      return `All ${services.length} core services available`;
    });

    await this.runTest('Mock Data Generation', async () => {
      // Test mock hand pose
      const mockImageData = new ImageData(new Uint8ClampedArray(64 * 64 * 4), 64, 64);
      const result = await mediaPipeIntegration.processImage(mockImageData);

      // Test robot state
      const robotState = robotSimulator.getState();

      // Test marketplace items
      const items = enhancedMarketplaceService.getFeaturedItems();

      return `Generated mock data: ${result.multiHandLandmarks.length} hands, ${Object.keys(robotState.jointStates).length} joints, ${items.length} items`;
    });

    return this.generateTestSuite();
  }

  getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  async cleanup(): Promise<void> {
    this.testCallbacks = [];
    this.testResults = [];
  }
}

export const integratedTestSuite = new IntegratedTestSuite();
export default integratedTestSuite;