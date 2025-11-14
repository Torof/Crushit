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

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    MaterialIcons: Text,
    Ionicons: Text,
    FontAwesome: Text,
    Entypo: Text,
    AntDesign: Text,
  };
});

// Mock Expo Google Fonts
jest.mock('@expo-google-fonts/caveat', () => ({
  useFonts: () => [true],
  Caveat_400Regular: 'Caveat_400Regular',
  Caveat_700Bold: 'Caveat_700Bold',
}));

jest.mock('@expo-google-fonts/dancing-script', () => ({
  useFonts: () => [true],
  DancingScript_400Regular: 'DancingScript_400Regular',
  DancingScript_700Bold: 'DancingScript_700Bold',
}));

// Mock Expo Linear Gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: require('react-native').View,
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
