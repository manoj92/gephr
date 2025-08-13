// API Configuration for Humanoid Training Platform

// AWS Lambda + API Gateway backend for cloud deployment
export const API_BASE_URL = 'https://h5ealiw6qj.execute-api.us-east-1.amazonaws.com/prod';
export const DEMO_MODE = false;

// API endpoints
export const API_ENDPOINTS = {
  // Health checks
  health: '/health',
  apiHealth: '/api/v1/health',
  
  // Robot management
  robots: '/api/v1/robots',
  robotById: (id: string) => `/api/v1/robots/${id}`,
  connectRobot: (id: string) => `/api/v1/robots/${id}/connect`,
  disconnectRobot: (id: string) => `/api/v1/robots/${id}/disconnect`,
  
  // Training sessions
  trainingSessions: '/api/v1/training/sessions',
  trainingSessionById: (id: string) => `/api/v1/training/sessions/${id}`,
  uploadTrainingData: (id: string) => `/api/v1/training/sessions/${id}/data`,
  completeSession: (id: string) => `/api/v1/training/sessions/${id}/complete`,
  
  // Marketplace
  marketplace: '/api/v1/marketplace',
  marketplaceItemById: (id: string) => `/api/v1/marketplace/${id}`,
  purchaseItem: (id: string) => `/api/v1/marketplace/${id}/purchase`,
  
  // Hand tracking
  handPose: '/api/v1/tracking/hand-pose',
  trackingStatus: '/api/v1/tracking/status',
  
  // File upload
  uploadFile: '/api/v1/upload/training-data',
  
  // Statistics
  stats: '/api/v1/stats',
  
  // WebSocket
  robotWebSocket: (id: string) => `/ws/robot/${id}`,
};

// HTTP client configuration
export const API_CONFIG = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// WebSocket configuration  
export const WS_CONFIG = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to build WebSocket URL
export const buildWebSocketUrl = (endpoint: string): string => {
  const wsBaseUrl = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  return `${wsBaseUrl}${endpoint}`;
};