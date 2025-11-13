// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

// Mock DevMenu (SDK 55 canary issue)
jest.mock('react-native/src/private/devsupport/devmenu/DevMenu', () => ({
  show: jest.fn(),
  reload: jest.fn(),
}));

// Add TextEncoder polyfill for Node.js (Jest environment)
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
}

// Global DEV flag
global.__DEV__ = true;

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
