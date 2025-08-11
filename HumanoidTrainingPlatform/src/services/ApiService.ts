import { API_BASE_URL, API_ENDPOINTS, API_CONFIG, buildApiUrl } from '../config/api';

// Types
export interface Robot {
  id: string;
  name: string;
  type: string;
  status: string;
  ip_address?: string;
  last_seen?: string;
}

export interface TrainingSession {
  id: string;
  name: string;
  robot_id: string;
  status: string;
  start_time: string;
  end_time?: string;
  data_points: number;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  downloads: number;
  creator: string;
}

export interface LerobotAction {
  action_type: string;
  timestamp: string;
  hand_pose: Record<string, any>;
  robot_state: Record<string, any>;
}

export interface PlatformStats {
  total_robots: number;
  active_sessions: number;
  completed_sessions: number;
  marketplace_items: number;
  total_downloads: number;
  platform_uptime: string;
}

class ApiService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Generic HTTP methods
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = buildApiUrl(endpoint);
    const config = {
      ...API_CONFIG,
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response.text() as unknown as T;
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Health check methods
  async healthCheck(): Promise<{ status: string; environment: string; timestamp: string }> {
    return this.get(API_ENDPOINTS.health);
  }

  async apiHealthCheck(): Promise<{ status: string; api_version: string; timestamp: string }> {
    return this.get(API_ENDPOINTS.apiHealth);
  }

  // Robot management methods
  async getRobots(): Promise<{ robots: Robot[]; total: number }> {
    return this.get(API_ENDPOINTS.robots);
  }

  async getRobot(robotId: string): Promise<Robot> {
    return this.get(API_ENDPOINTS.robotById(robotId));
  }

  async connectRobot(robotId: string): Promise<{ message: string; status: string }> {
    return this.post(API_ENDPOINTS.connectRobot(robotId));
  }

  async disconnectRobot(robotId: string): Promise<{ message: string; status: string }> {
    return this.post(API_ENDPOINTS.disconnectRobot(robotId));
  }

  // Training session methods
  async getTrainingSessions(): Promise<{ sessions: TrainingSession[]; total: number }> {
    return this.get(API_ENDPOINTS.trainingSessions);
  }

  async getTrainingSession(sessionId: string): Promise<TrainingSession> {
    return this.get(API_ENDPOINTS.trainingSessionById(sessionId));
  }

  async createTrainingSession(name: string, robotId: string): Promise<TrainingSession> {
    return this.post(API_ENDPOINTS.trainingSessions, { name, robot_id: robotId });
  }

  async uploadTrainingData(
    sessionId: string, 
    actions: LerobotAction[]
  ): Promise<{ message: string; total_points: number }> {
    return this.post(API_ENDPOINTS.uploadTrainingData(sessionId), actions);
  }

  async completeTrainingSession(sessionId: string): Promise<{ message: string; session: TrainingSession }> {
    return this.post(API_ENDPOINTS.completeSession(sessionId));
  }

  // Marketplace methods
  async getMarketplaceItems(): Promise<{ items: MarketplaceItem[]; total: number }> {
    return this.get(API_ENDPOINTS.marketplace);
  }

  async getMarketplaceItem(itemId: string): Promise<MarketplaceItem> {
    return this.get(API_ENDPOINTS.marketplaceItemById(itemId));
  }

  async purchaseMarketplaceItem(itemId: string): Promise<{ message: string; download_url: string }> {
    return this.post(API_ENDPOINTS.purchaseItem(itemId));
  }

  // Hand tracking methods
  async processHandPose(poseData: Record<string, any>): Promise<{
    processed: boolean;
    timestamp: string;
    commands: Array<{ joint: string; angle: number }>;
  }> {
    return this.post(API_ENDPOINTS.handPose, poseData);
  }

  async getTrackingStatus(): Promise<{
    tracking_active: boolean;
    fps: number;
    latency_ms: number;
    hands_detected: number;
  }> {
    return this.get(API_ENDPOINTS.trackingStatus);
  }

  // Statistics methods
  async getPlatformStats(): Promise<PlatformStats> {
    return this.get(API_ENDPOINTS.stats);
  }

  // File upload method
  async uploadFile(file: any): Promise<{
    filename: string;
    size: number;
    content_type: string;
    uploaded_at: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request(API_ENDPOINTS.uploadFile, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;