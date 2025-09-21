// Global polyfills for React Native to support Node.js modules
import 'react-native-get-random-values';

// Buffer polyfill
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Stream polyfill 
if (typeof global.stream === 'undefined') {
  global.stream = require('stream-browserify');
}

// Util polyfill
if (typeof global.util === 'undefined') {
  global.util = require('util');
}

// Process polyfill for WebSocket libraries
if (typeof global.process === 'undefined') {
  global.process = {
    env: {},
    nextTick: (callback, ...args) => {
      setTimeout(() => callback(...args), 0);
    },
    platform: 'react-native',
    version: 'v16.0.0', // Mock Node.js version
    versions: {
      node: '16.0.0'
    },
    browser: true
  };
}

// Ensure process.env exists and has basic properties
if (!global.process.env) {
  global.process.env = {};
}

// TextEncoder/TextDecoder polyfills for WebSocket support
if (typeof global.TextEncoder === 'undefined') {
  try {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
  } catch (error) {
    console.warn('TextEncoder/TextDecoder polyfill not available:', error);
  }
}

// WebSocket polyfills to prevent Node.js module imports
if (typeof global.WebSocket === 'undefined' && typeof global.window !== 'undefined') {
  // Only set if we're in a web-like environment
  global.WebSocket = global.window.WebSocket;
}

// Critical: Mock the ws module to prevent Node.js stream imports
global.mockWsModule = function() {
  // Create a mock WebSocket constructor that uses React Native's WebSocket
  const MockWebSocket = function(url, protocols, options) {
    // Use React Native's built-in WebSocket
    return new WebSocket(url, protocols);
  };
  
  // Copy static properties from native WebSocket
  Object.setPrototypeOf(MockWebSocket.prototype, WebSocket.prototype);
  MockWebSocket.CONNECTING = WebSocket.CONNECTING;
  MockWebSocket.OPEN = WebSocket.OPEN;
  MockWebSocket.CLOSING = WebSocket.CLOSING;
  MockWebSocket.CLOSED = WebSocket.CLOSED;
  
  return MockWebSocket;
};

// import.meta polyfill for React Native compatibility
// This is a comprehensive polyfill that handles various import.meta usages

// Define import.meta object
const importMetaObject = {
  url: 'file://react-native-bundle',
  env: global.process?.env || {},
  resolve: function(specifier) {
    // Simple resolve function for React Native
    return specifier;
  },
  hot: undefined, // HMR not supported in React Native
  glob: function() {
    // Glob functionality not supported
    return {};
  }
};

// Set up import.meta on global object
if (typeof global.import === 'undefined') {
  global.import = {};
}

if (typeof global.import.meta === 'undefined') {
  global.import.meta = importMetaObject;
}

// Also add it to globalThis for modern environments
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.import === 'undefined') {
    globalThis.import = {};
  }
  if (typeof globalThis.import.meta === 'undefined') {
    globalThis.import.meta = importMetaObject;
  }
}

// Add to window object for web compatibility (if available)
if (typeof window !== 'undefined') {
  if (typeof window.import === 'undefined') {
    window.import = {};
  }
  if (typeof window.import.meta === 'undefined') {
    window.import.meta = importMetaObject;
  }
}

// Define import as a function that returns a promise (for dynamic imports)
if (typeof global.import !== 'function') {
  const originalImport = global.import;
  global.import = function(specifier) {
    console.warn('Dynamic import not fully supported in React Native:', specifier);
    return Promise.reject(new Error('Dynamic import not supported'));
  };
  // Copy the meta property
  global.import.meta = originalImport?.meta || importMetaObject;
}

console.log('✅ Global polyfills loaded successfully');