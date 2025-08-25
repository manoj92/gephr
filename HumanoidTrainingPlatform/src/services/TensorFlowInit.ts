// Conditional TensorFlow.js imports for production builds
let tf: any = null;
try {
  tf = require('@tensorflow/tfjs');
  require('@tensorflow/tfjs-react-native');
  require('@tensorflow/tfjs-backend-webgl');
} catch (error) {
  console.warn('TensorFlow.js packages not available:', error);
}

import { Platform } from 'react-native';

export class TensorFlowInitService {
  private static instance: TensorFlowInitService;
  private initialized = false;

  static getInstance(): TensorFlowInitService {
    if (!TensorFlowInitService.instance) {
      TensorFlowInitService.instance = new TensorFlowInitService();
    }
    return TensorFlowInitService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Skip TensorFlow initialization in Expo Go
    console.warn('TensorFlow.js skipped for Expo Go compatibility');
    this.initialized = false;
    return;

    /* Commented out for Expo Go compatibility
    if (!tf) {
      console.warn('TensorFlow.js not available, skipping initialization');
      this.initialized = false;
      return;
    }

    try {
      console.log('Initializing TensorFlow.js for React Native...');
      
      // Wait for the platform to be ready
      await tf.ready();
      
      // Initialize the platform-specific backend
      if (Platform.OS === 'web') {
        await tf.setBackend('webgl');
      } else {
        // For mobile platforms, use the default backend
        const backends = tf.engine().registry;
        if (backends && backends.has && backends.has('rn-webgl')) {
          await tf.setBackend('rn-webgl');
        } else if (backends && backends.has && backends.has('cpu')) {
          await tf.setBackend('cpu');
        }
      }

      console.log(`TensorFlow.js initialized with backend: ${tf.getBackend()}`);
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      this.initialized = false;
      // Don't throw in production
      console.warn('Continuing without TensorFlow.js support');
    }
    */
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getBackend(): string {
    return tf ? tf.getBackend() : 'none';
  }

  async warmUp(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!tf) {
      console.warn('TensorFlow.js not available for warmup');
      return;
    }

    try {
      // Create a small tensor to warm up the backend
      const warmupTensor = tf.zeros([1, 224, 224, 3]);
      const result = tf.add(warmupTensor, tf.scalar(1));
      await result.data(); // Force execution
      
      // Clean up
      warmupTensor.dispose();
      result.dispose();
      
      console.log('TensorFlow.js backend warmed up successfully');
    } catch (error) {
      console.warn('TensorFlow.js warmup failed:', error);
    }
  }
}

export const tensorFlowInit = TensorFlowInitService.getInstance();