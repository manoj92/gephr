import { buildWebSocketUrl, WS_CONFIG } from '../config/api';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

interface WebSocketSubscription {
  id: string;
  callback: (data: any) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, WebSocketSubscription[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WS_CONFIG.maxReconnectAttempts;
  private reconnectInterval = WS_CONFIG.reconnectInterval;
  private isConnecting = false;
  private isManualClose = false;
  private heartbeatInterval: number | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.isManualClose = false;

    try {
      const wsUrl = buildWebSocketUrl('/ws');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.isManualClose = true;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval as any);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    this.reconnectAttempts = 0;
  }

  subscribe(topic: string, callback: (data: any) => void): string {
    const subscriptionId = `${topic}_${Date.now()}_${Math.random()}`;
    
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }

    this.subscriptions.get(topic)!.push({
      id: subscriptionId,
      callback,
    });

    // Send subscription message if connected
    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        data: { topic },
      });
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string) {
    for (const [topic, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        
        // If no more subscriptions for this topic, unsubscribe from server
        if (subs.length === 0) {
          this.subscriptions.delete(topic);
          
          if (this.isConnected()) {
            this.send({
              type: 'unsubscribe',
              data: { topic },
            });
          }
        }
        break;
      }
    }
  }

  send(message: WebSocketMessage) {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }

    try {
      this.ws!.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleOpen() {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Resubscribe to all topics
    for (const topic of this.subscriptions.keys()) {
      this.send({
        type: 'subscribe',
        data: { topic },
      });
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle heartbeat response
      if (message.type === 'heartbeat_response') {
        return;
      }

      // Distribute message to subscribers
      const subscribers = this.subscriptions.get(message.type) || [];
      subscribers.forEach(sub => {
        try {
          sub.callback(message.data);
        } catch (error) {
          console.error('Error in WebSocket subscription callback:', error);
        }
      });
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval as any);
      this.heartbeatInterval = null;
    }

    if (!this.isManualClose) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    this.isConnecting = false;
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      if (!this.isManualClose) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }
    }, this.reconnectInterval);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'heartbeat',
          data: {},
        });
      }
    }, 30000) as any; // Send heartbeat every 30 seconds
  }

  // Convenience methods for common subscriptions
  subscribeToRobotStatus(robotId: string, callback: (data: any) => void): string {
    return this.subscribe(`robot_status_${robotId}`, callback);
  }

  subscribeToTrainingUpdates(sessionId: string, callback: (data: any) => void): string {
    return this.subscribe(`training_session_${sessionId}`, callback);
  }

  subscribeToNotifications(userId: string, callback: (data: any) => void): string {
    return this.subscribe(`user_notifications_${userId}`, callback);
  }

  // Send robot commands
  sendRobotCommand(robotId: string, command: any) {
    this.send({
      type: 'robot_command',
      data: {
        robot_id: robotId,
        command,
      },
    });
  }

  // Send training data
  sendTrainingData(sessionId: string, data: any) {
    this.send({
      type: 'training_data',
      data: {
        session_id: sessionId,
        training_data: data,
      },
    });
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Auto-connect when the service is imported
webSocketService.connect();

export default webSocketService;