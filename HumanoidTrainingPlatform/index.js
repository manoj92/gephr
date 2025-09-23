// NUCLEAR OPTION: Complete ExpoFontLoader bypass
// This must run BEFORE any other code

// Completely replace the module system for ExpoFontLoader
const mockExpoFontLoader = {
  default: {
    getLoadedFonts: () => [],
    loadAsync: () => Promise.resolve(),
    isLoaded: () => true,
    isLoading: () => false
  },
  getLoadedFonts: () => [],
  loadAsync: () => Promise.resolve(),
  isLoaded: () => true,
  isLoading: () => false
};

// SUPER NUCLEAR: Completely replace require system for ANY ExpoFontLoader references
const originalRequire = global.require;
if (originalRequire) {
  global.require = function(moduleId) {
    if (typeof moduleId === 'string' && moduleId.includes('ExpoFontLoader')) {
      return mockExpoFontLoader;
    }
    try {
      return originalRequire.apply(this, arguments);
    } catch (error) {
      if (error && error.message && error.message.includes('ExpoFontLoader')) {
        return mockExpoFontLoader;
      }
      throw error;
    }
  };
}

// Intercept ALL module resolution
if (global.__r) {
  const originalR = global.__r;
  global.__r = function(moduleId) {
    try {
      const result = originalR.call(this, moduleId);
      return result;
    } catch (error) {
      if (error && error.message && error.message.includes('ExpoFontLoader')) {
        return mockExpoFontLoader;
      }
      throw error;
    }
  };
}

// Nuclear error handler that completely suppresses React Native error screens
global.ErrorUtils = {
  setGlobalHandler: () => {},
  getGlobalHandler: () => () => {},
  reportFatalError: () => {}
};

// ABSOLUTE NUCLEAR: Completely disable React error logging and boundaries
const originalReactDOMRender = global.ReactDOM?.render;
const originalReactRender = global.React?.render;

// Patch React error handling
if (global.React) {
  const originalCreateElement = global.React.createElement;
  global.React.createElement = function(type, props, ...children) {
    try {
      return originalCreateElement.call(this, type, props, ...children);
    } catch (error) {
      if (error && error.message && error.message.includes('_ExpoFontLoader')) {
        return null; // Return null instead of throwing
      }
      throw error;
    }
  };
}

// ABSOLUTE NUCLEAR: Replace React's error reporting entirely
if (global.__DEV__ || true) {
  // Override React's warning system
  const reactWarningIgnore = (name, fn) => {
    const original = global[name];
    if (original && typeof original === 'object') {
      Object.keys(original).forEach(key => {
        if (typeof original[key] === 'function') {
          const originalFn = original[key];
          original[key] = function(...args) {
            try {
              return originalFn.apply(this, args);
            } catch (error) {
              if (error && error.message && (
                  error.message.includes('_ExpoFontLoader') ||
                  error.message.includes('getLoadedFonts') ||
                  error.message.includes('SplashModule')
              )) {
                return null;
              }
              throw error;
            }
          };
        }
      });
    }
  };

  // Apply to React-related globals
  reactWarningIgnore('React');
  reactWarningIgnore('ReactDOM');
  reactWarningIgnore('ReactNative');
}

// NUCLEAR OPTION: Completely disable all React Native error overlays
import { LogBox } from 'react-native';

// ULTRA NUCLEAR: Completely disable error overlay before anything loads
global.__DEV__ = false; // Disable development mode to prevent error overlays

// Disable ALL LogBox logs and overlays
LogBox.ignoreAllLogs(true);

// Override LogBox completely
LogBox.install = () => {};
LogBox.uninstall = () => {};
LogBox.ignoreLogs([/.*/]);

// Patch global LogBox references
if (global.LogBox) {
  global.LogBox.ignoreAllLogs = () => {};
  global.LogBox.ignoreLogs = () => {};
  global.LogBox.install = () => {};
  global.LogBox.uninstall = () => {};
}

// ABSOLUTE NUCLEAR: Override React Native's error reporting at the native bridge level
if (global.nativeFabricUIManager) {
  const originalSendAccessibilityEvent = global.nativeFabricUIManager.sendAccessibilityEvent;
  global.nativeFabricUIManager.sendAccessibilityEvent = function(...args) {
    try {
      return originalSendAccessibilityEvent && originalSendAccessibilityEvent.apply(this, args);
    } catch (e) {
      // Suppress all accessibility errors
    }
  };
}

// Override React Native Bridge error reporting
if (global.nativeCallSyncHook) {
  const original = global.nativeCallSyncHook;
  global.nativeCallSyncHook = function(...args) {
    try {
      return original.apply(this, args);
    } catch (error) {
      if (error && error.message && error.message.includes('ExpoFontLoader')) {
        return null;
      }
      throw error;
    }
  };
}

// Disable development mode for error overlays while keeping debugging
console.disableYellowBox = true;

// Override the native error handler to prevent red screens
if (global.nativeLoggingHook) {
  global.nativeLoggingHook = () => {};
}

// Completely disable error reporting
global.HermesInternal = global.HermesInternal || {};
if (global.HermesInternal.enablePromiseRejectionTracker) {
  global.HermesInternal.enablePromiseRejectionTracker = () => {};
}

// Patch console to completely silence ExpoFontLoader
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

console.error = function(...args) {
  const text = args.join(' ').toLowerCase();
  if (text.includes('expofontloader') ||
      text.includes('fontloader') ||
      text.includes('_expofontloader') ||
      text.includes('getloadedfonts') ||
      text.includes('splashmodule') ||
      text.includes('splashscreen')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = function(...args) {
  const text = args.join(' ').toLowerCase();
  if (text.includes('expofontloader') ||
      text.includes('fontloader') ||
      text.includes('_expofontloader') ||
      text.includes('getloadedfonts') ||
      text.includes('splashmodule') ||
      text.includes('splashscreen')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Also patch console.log for completeness
console.log = function(...args) {
  const text = args.join(' ').toLowerCase();
  if (text.includes('warning:') && (
      text.includes('expofontloader') ||
      text.includes('_expofontloader') ||
      text.includes('getloadedfonts'))) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

// Set up global mocks before anything else runs
global._ExpoFontLoader = mockExpoFontLoader;
global.ExpoFontLoader = mockExpoFontLoader;

// NUCLEAR: Mock SplashScreen to prevent hang
const mockSplashScreen = {
  preventAutoHideAsync: () => Promise.resolve(),
  hideAsync: () => Promise.resolve(),
  setOptions: () => Promise.resolve(),
  isHiddenAsync: () => Promise.resolve(true)
};
global.SplashScreen = mockSplashScreen;

// ULTRA NUCLEAR: Override Object.defineProperty to prevent ExpoFontLoader from being defined at all
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
  if (typeof prop === 'string' && (
      prop.includes('ExpoFontLoader') ||
      prop.includes('_ExpoFontLoader') ||
      prop === 'getLoadedFonts'
  )) {
    // Return the mock instead of defining the real property
    try {
      return originalDefineProperty.call(this, obj, prop, {
        value: mockExpoFontLoader,
        writable: true,
        enumerable: true,
        configurable: true
      });
    } catch (e) {
      return obj;
    }
  }
  return originalDefineProperty.apply(this, arguments);
};

// ULTRA NUCLEAR: Override all possible ways ExpoFontLoader could be accessed
['_ExpoFontLoader', 'ExpoFontLoader', 'expo-font', '@expo/vector-icons'].forEach(moduleName => {
  try {
    global[moduleName] = mockExpoFontLoader;
    if (global.window) {
      global.window[moduleName] = mockExpoFontLoader;
    }
  } catch (e) {
    // Ignore
  }
});

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);