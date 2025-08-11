// Test setup file
import 'react-native';
import 'jest-enzyme';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

// Configure enzyme
configure({ adapter: new Adapter() });

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock FileSystem
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/document/directory/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('{}')),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
  deleteAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Camera
jest.mock('expo-camera', () => ({
  Camera: {
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
    Constants: {
      Type: {
        back: 'back',
        front: 'front',
      },
    },
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: () => Promise.resolve({
    isConnected: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock Sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock MediaPipe
jest.mock('@mediapipe/hands', () => ({
  Hands: jest.fn().mockImplementation(() => ({
    onResults: jest.fn(),
    initialize: jest.fn(() => Promise.resolve()),
    send: jest.fn(() => Promise.resolve()),
    close: jest.fn(),
  })),
}));

// Mock TensorFlow
jest.mock('@tensorflow/tfjs-react-native', () => ({
  platform: jest.fn(),
}));

// Global test utilities
global.mockFetch = (response: any, ok: boolean = true) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response)
  );
};

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};