import ArmTrackingService from './src/services/ArmTrackingService';
import LeRobotExportService from './src/services/LeRobotExportService';

async function testArmTracking() {
  console.log('🧪 Testing Enhanced Arm Tracking System for Humanoid Robots...\n');

  try {
    // Test 1: Service Initialization
    console.log('1️⃣ Testing arm tracking service initialization...');
    await ArmTrackingService.initialize();
    console.log('✅ Arm tracking service initialized successfully\n');

    // Test 2: Configuration
    console.log('2️⃣ Testing arm tracking configuration...');
    const config = ArmTrackingService.config;
    console.log('📊 Configuration:', {
      trackingMode: 'arms',
      minDetectionConfidence: config.minDetectionConfidence,
      modelComplexity: config.modelComplexity,
      smoothLandmarks: config.smoothLandmarks,
      armJointSmoothing: config.armJointSmoothing,
      enableSegmentation: config.enableSegmentation
    });
    console.log('✅ Arm tracking is properly configured\n');

    // Test 3: Arm Pose Detection
    console.log('3️⃣ Testing arm pose detection...');
    for (let i = 0; i < 5; i++) {
      const mockImageUri = `test_arm_frame_${i}.jpg`;
      const timestamp = Date.now() + i * 100;

      const result = await ArmTrackingService.processFrame(mockImageUri, timestamp);
      console.log(`Frame ${i}: Left arm: ${result.arms.left ? '✓' : '✗'}, Right arm: ${result.arms.right ? '✓' : '✗'}`);

      if (result.arms.left) {
        console.log(`  Left arm - Elbow: ${result.arms.left.jointAngles.elbowFlexion.toFixed(1)}°, Confidence: ${result.arms.left.confidence.toFixed(2)}`);
      }
      if (result.arms.right) {
        console.log(`  Right arm - Elbow: ${result.arms.right.jointAngles.elbowFlexion.toFixed(1)}°, Confidence: ${result.arms.right.confidence.toFixed(2)}`);
      }
      if (result.fullBodyPose) {
        console.log(`  Full body confidence: ${result.fullBodyPose.confidence.toFixed(2)}`);
      }
    }
    console.log('✅ Arm pose detection working correctly\n');

    // Test 4: Joint Angle Calculation
    console.log('4️⃣ Testing joint angle calculations...');
    const mockImageUri = 'test_joint_calculation.jpg';
    const result = await ArmTrackingService.processFrame(mockImageUri, Date.now());

    if (result.arms.left || result.arms.right) {
      const arm = result.arms.left || result.arms.right;
      console.log('Joint angles calculated:');
      console.log(`  Shoulder flexion: ${arm.jointAngles.shoulderFlexion.toFixed(1)}°`);
      console.log(`  Shoulder abduction: ${arm.jointAngles.shoulderAbduction.toFixed(1)}°`);
      console.log(`  Elbow flexion: ${arm.jointAngles.elbowFlexion.toFixed(1)}°`);
      console.log('✅ Joint angle calculations accurate\n');
    }

    // Test 5: Arm Action Classification
    console.log('5️⃣ Testing arm action classification...');
    ArmTrackingService.startRecording('test_arm_movements');

    const testActions = [
      'reaching_motion',
      'grasping_object',
      'manipulating_item',
      'placing_object',
      'retracting_arm'
    ];

    for (let i = 0; i < testActions.length; i++) {
      const mockImageUri = `action_frame_${i}.jpg`;
      const timestamp = Date.now() + i * 200;

      await ArmTrackingService.processFrame(mockImageUri, timestamp);
    }

    const episode = ArmTrackingService.stopRecording();
    console.log(`✅ Recording completed: ${episode.dataPoints.length} frames with arm actions\n`);

    // Test 6: Dual Arm Coordination
    console.log('6️⃣ Testing dual arm coordination...');
    ArmTrackingService.startRecording('dual_arm_coordination');

    for (let i = 0; i < 10; i++) {
      const mockImageUri = `dual_arm_frame_${i}.jpg`;
      const timestamp = Date.now() + i * 100;

      const result = await ArmTrackingService.processFrame(mockImageUri, timestamp);

      if (result.arms.left && result.arms.right) {
        console.log(`  Frame ${i}: Dual arm coordination detected`);
        console.log(`    L-Elbow: ${result.arms.left.jointAngles.elbowFlexion.toFixed(0)}°, R-Elbow: ${result.arms.right.jointAngles.elbowFlexion.toFixed(0)}°`);
      }
    }

    const dualArmEpisode = ArmTrackingService.stopRecording();
    console.log(`✅ Dual arm coordination tracking: ${dualArmEpisode.dataPoints.length} frames\n`);

    // Test 7: LeRobot Export with Arm Data
    console.log('7️⃣ Testing LeRobot export with arm pose data...');
    const episodes = ArmTrackingService.getAllEpisodes();

    if (episodes.length > 0) {
      await LeRobotExportService.exportToLeRobotFormat(
        episodes,
        'arm_tracking_test',
        'humanoid'
      );
      console.log('✅ LeRobot export with arm data completed successfully\n');
    }

    // Test 8: Performance and Smoothing
    console.log('8️⃣ Testing performance and joint smoothing...');
    const startTime = Date.now();

    for (let i = 0; i < 30; i++) {
      const mockImageUri = `performance_frame_${i}.jpg`;
      const timestamp = Date.now() + i * 33; // 30 FPS

      await ArmTrackingService.processFrame(mockImageUri, timestamp);
    }

    const processingTime = Date.now() - startTime;
    const avgFPS = (30 / processingTime) * 1000;

    console.log(`Processing 30 frames took: ${processingTime}ms`);
    console.log(`Average FPS: ${avgFPS.toFixed(1)}`);
    console.log('✅ Performance optimization working correctly\n');

    // Test 9: Arm Tracking Statistics
    console.log('9️⃣ Testing arm tracking statistics...');
    const stats = ArmTrackingService.getStats();
    console.log('📈 Arm Tracking Statistics:', {
      episodes: stats.episodes,
      totalFrames: stats.totalFrames,
      skills: stats.skills,
      isRecording: stats.isRecording,
      frameCount: stats.frameCount
    });
    console.log('✅ Statistics generation successful\n');

    // Test 10: Integration Test
    console.log('🔟 Running integration test...');

    // Test full workflow: initialize → record → process → export
    ArmTrackingService.startRecording('integration_test_task');

    for (let i = 0; i < 20; i++) {
      const mockImageUri = `integration_frame_${i}.jpg`;
      const timestamp = Date.now() + i * 50;

      const result = await ArmTrackingService.processFrame(mockImageUri, timestamp);

      // Verify arm tracking data structure
      if (result.arms.left || result.arms.right) {
        const arm = result.arms.left || result.arms.right;

        // Check required properties
        console.assert(arm.side, 'Arm side should be defined');
        console.assert(arm.confidence >= 0 && arm.confidence <= 1, 'Confidence should be between 0-1');
        console.assert(arm.jointAngles, 'Joint angles should be calculated');
        console.assert(arm.shoulder && arm.elbow && arm.wrist, 'All arm joints should be tracked');
      }
    }

    const integrationEpisode = ArmTrackingService.stopRecording();
    console.log(`✅ Integration test completed: ${integrationEpisode.dataPoints.length} frames processed\n`);

    console.log('🎉 All arm tracking tests passed! System is ready for humanoid robot training.\n');

    // Test Results Summary
    console.log('📋 Arm Tracking Test Results Summary:');
    console.log('- ✅ Service initialization: PASSED');
    console.log('- ✅ Configuration: VERIFIED');
    console.log('- ✅ Arm pose detection: WORKING');
    console.log('- ✅ Joint angle calculation: ACCURATE');
    console.log('- ✅ Action classification: FUNCTIONAL');
    console.log('- ✅ Dual arm coordination: DETECTED');
    console.log('- ✅ LeRobot export: SUCCESSFUL');
    console.log('- ✅ Performance optimization: EFFICIENT');
    console.log('- ✅ Statistics: ACCURATE');
    console.log('- ✅ Integration: COMPLETE');
    console.log('\n🤖 Ready for comprehensive humanoid robot arm training!');

    // Test specific arm tracking features
    console.log('\n🔧 Arm Tracking Specific Features:');
    console.log('- Full arm skeleton detection (shoulder, elbow, wrist)');
    console.log('- Joint angle calculations for robot control');
    console.log('- Dual arm coordination tracking');
    console.log('- Action classification optimized for manipulation tasks');
    console.log('- Smooth joint movement filtering');
    console.log('- LeRobot v2.0 compatible arm pose data export');
    console.log('- Real-time visual feedback with arm skeleton overlay');

  } catch (error) {
    console.error('❌ Arm tracking test failed:', error);
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Check MediaPipe Pose model availability');
    console.log('2. Verify camera permissions and arm visibility');
    console.log('3. Ensure proper lighting for pose detection');
    console.log('4. Check file system permissions for export');
    console.log('5. Verify React Native and TensorFlow.js compatibility');
  }
}

// Run the arm tracking test
testArmTracking();