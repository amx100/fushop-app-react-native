// Mock WebSocket module for React Native compatibility
// This replaces the Node.js 'ws' library with React Native's built-in WebSocket

// Import React Native's WebSocket
const NativeWebSocket = global.WebSocket || WebSocket;

class MockWebSocket extends NativeWebSocket {
  constructor(url, protocols, options) {
    // Handle different argument patterns
    if (typeof protocols === 'object' && !Array.isArray(protocols)) {
      // If protocols is actually options object
      options = protocols;
      protocols = undefined;
    }
    
    super(url, protocols);
    
    // Handle options if needed
    if (options && options.headers) {
      // React Native WebSocket doesn't support custom headers in the same way
      console.warn('WebSocket headers not fully supported in React Native');
    }
  }
}

// Copy static constants from native WebSocket
MockWebSocket.CONNECTING = NativeWebSocket.CONNECTING || 0;
MockWebSocket.OPEN = NativeWebSocket.OPEN || 1;
MockWebSocket.CLOSING = NativeWebSocket.CLOSING || 2;
MockWebSocket.CLOSED = NativeWebSocket.CLOSED || 3;

// Mock the stream-related parts that ws library expects
MockWebSocket.createWebSocketStream = function() {
  throw new Error('WebSocket streams are not supported in React Native');
};

// Mock the Server class that ws provides (not used in client-side)
MockWebSocket.Server = function() {
  throw new Error('WebSocket Server is not supported in React Native');
};

// Export as default for ES6 imports and named export for CommonJS
export default MockWebSocket;
module.exports = MockWebSocket;
module.exports.default = MockWebSocket;
module.exports.WebSocket = MockWebSocket;
module.exports.Server = MockWebSocket.Server;
module.exports.createWebSocketStream = MockWebSocket.createWebSocketStream;
