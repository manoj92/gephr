import { encryptionService } from './EncryptionService';
import { validationService } from './ValidationService';
import { auditService } from './AuditService';

export interface WebSocketMessage {
  id: string;
  type: 'command' | 'status' | 'data' | 'auth' | 'heartbeat' | 'alert';
  payload: any;
  timestamp: number;
  encrypted?: boolean;
  signature?: string;
  nonce?: string;
}

export interface SecureConnection {
  id: string;
  userId: string;
  robotId?: string;
  sessionKey: string;
  authenticated: boolean;
  lastActivity: number;
  permissions: string[];
}

export class SecureWebSocketService {
  private ws: WebSocket | null = null;
  private connections: Map<string, SecureConnection> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;
  private connectionId: string | null = null;

  private readonly WS_ENDPOINTS = {
    development: 'ws://localhost:8000/ws',
    production: 'wss://api.humanoidtraining.com/ws'
  };

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Establish secure WebSocket connection
   */
  public async connect(
    userId: string,
    robotId?: string,
    permissions: string[] = ['read', 'write']
  ): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return true;
    }

    try {
      this.isConnecting = true;
      const endpoint = process.env.NODE_ENV === 'production' 
        ? this.WS_ENDPOINTS.production 
        : this.WS_ENDPOINTS.development;

      this.ws = new WebSocket(endpoint);
      
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.ws.onopen = async () => {
          try {
            // Generate connection ID and session key
            this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const sessionKey = await this.generateSessionKey();

            // Create secure connection
            const connection: SecureConnection = {
              id: this.connectionId,
              userId,
              robotId,
              sessionKey,
              authenticated: false,
              lastActivity: Date.now(),
              permissions
            };

            this.connections.set(this.connectionId, connection);

            // Send authentication message
            await this.authenticate(connection);
            
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            
            await auditService.logEvent({
              action: 'websocket_connected',
              userId,
              metadata: { robotId, connectionId: this.connectionId }
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          reject(new Error(`WebSocket connection failed: ${error}`));
        };

        this.ws.onclose = (event) => {
          this.handleDisconnection(event);
        };

        this.ws.onmessage = async (event) => {
          await this.handleMessage(event);
        };
      });

      // Start heartbeat
      this.startHeartbeat();
      
      return true;

    } catch (error) {
      this.isConnecting = false;
      console.error('WebSocket connection failed:', error);
      
      await auditService.logEvent({
        action: 'websocket_connection_failed',
        userId,
        metadata: { error: String(error) },
        severity: 'medium'
      });

      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(userId, robotId, permissions);
        }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
      }

      return false;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.ws) {
        this.ws.close(1000, 'Client disconnect');
        this.ws = null;
      }

      if (this.connectionId) {
        const connection = this.connections.get(this.connectionId);
        if (connection) {
          await auditService.logEvent({
            action: 'websocket_disconnected',
            userId: connection.userId,
            metadata: { connectionId: this.connectionId }
          });
        }
        this.connections.delete(this.connectionId);
        this.connectionId = null;
      }

      this.messageQueue = [];
      this.reconnectAttempts = 0;

    } catch (error) {
      console.error('Error during WebSocket disconnect:', error);
    }
  }

  /**
   * Send secure message
   */
  public async sendMessage(
    type: WebSocketMessage['type'],
    payload: any,
    encrypt: boolean = true
  ): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connectionId) {
      console.warn('WebSocket not connected, queuing message');
      const message: WebSocketMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        timestamp: Date.now(),
        encrypted: encrypt
      };
      this.messageQueue.push(message);
      return false;
    }

    try {
      const connection = this.connections.get(this.connectionId);
      if (!connection || !connection.authenticated) {
        throw new Error('Connection not authenticated');
      }

      // Validate payload
      const validation = this.validatePayload(type, payload);
      if (!validation.isValid) {
        await auditService.logEvent({
          action: 'websocket_message_validation_failed',
          userId: connection.userId,
          metadata: { type, errors: validation.errors },
          severity: 'medium'
        });
        return false;
      }

      // Create message
      const message: WebSocketMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload: encrypt ? await this.encryptPayload(payload, connection.sessionKey) : payload,
        timestamp: Date.now(),
        encrypted: encrypt
      };

      // Sign message
      message.signature = await this.signMessage(message, connection.sessionKey);
      message.nonce = this.generateNonce();

      // Send message
      this.ws.send(JSON.stringify(message));

      // Update connection activity
      connection.lastActivity = Date.now();

      await auditService.logEvent({
        action: 'websocket_message_sent',
        userId: connection.userId,
        metadata: {
          messageId: message.id,
          type,
          encrypted: encrypt,
          connectionId: this.connectionId
        }
      });

      return true;

    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      
      if (this.connectionId) {
        const connection = this.connections.get(this.connectionId);
        await auditService.logEvent({
          action: 'websocket_message_send_failed',
          userId: connection?.userId || 'unknown',
          metadata: { error: String(error) },
          severity: 'medium'
        });
      }

      return false;
    }
  }

  /**
   * Send robot command securely
   */
  public async sendRobotCommand(command: any): Promise<boolean> {
    // Validate robot command
    const validation = validationService.validate(command, {
      type: { required: true },
      parameters: { required: true },
      priority: { required: true }
    });

    if (!validation.isValid) {
      return false;
    }

    return this.sendMessage('command', command, true);
  }

  /**
   * Send training data
   */
  public async sendTrainingData(data: any): Promise<boolean> {
    return this.sendMessage('data', data, true);
  }

  /**
   * Request robot status
   */
  public async requestRobotStatus(): Promise<boolean> {
    return this.sendMessage('status', { request: 'status' }, false);
  }

  private async authenticate(connection: SecureConnection): Promise<void> {
    const authPayload = {
      connectionId: connection.id,
      userId: connection.userId,
      robotId: connection.robotId,
      permissions: connection.permissions,
      timestamp: Date.now()
    };

    // Generate authentication token
    const authToken = await encryptionService.generateRobotAuthToken(
      connection.robotId || 'no_robot',
      connection.userId
    );

    const authMessage: WebSocketMessage = {
      id: `auth_${Date.now()}`,
      type: 'auth',
      payload: {
        ...authPayload,
        token: authToken.token,
        signature: authToken.signature
      },
      timestamp: Date.now(),
      encrypted: false
    };

    if (this.ws) {
      this.ws.send(JSON.stringify(authMessage));
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Validate message structure
      if (!message.id || !message.type || !message.timestamp) {
        throw new Error('Invalid message structure');
      }

      if (!this.connectionId) {
        throw new Error('No active connection');
      }

      const connection = this.connections.get(this.connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Verify message signature if present
      if (message.signature) {
        const isValid = await this.verifyMessageSignature(message, connection.sessionKey);
        if (!isValid) {
          throw new Error('Message signature verification failed');
        }
      }

      // Decrypt payload if encrypted
      if (message.encrypted && message.payload) {
        message.payload = await this.decryptPayload(message.payload, connection.sessionKey);
      }

      // Handle different message types
      switch (message.type) {
        case 'auth':
          await this.handleAuthResponse(message, connection);
          break;
        case 'status':
          await this.handleStatusUpdate(message, connection);
          break;
        case 'data':
          await this.handleDataMessage(message, connection);
          break;
        case 'alert':
          await this.handleAlert(message, connection);
          break;
        case 'heartbeat':
          await this.handleHeartbeat(message, connection);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }

      // Update connection activity
      connection.lastActivity = Date.now();

      await auditService.logEvent({
        action: 'websocket_message_received',
        userId: connection.userId,
        metadata: {
          messageId: message.id,
          type: message.type,
          encrypted: message.encrypted || false
        }
      });

    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      
      await auditService.logEvent({
        action: 'websocket_message_error',
        userId: this.connectionId ? this.connections.get(this.connectionId)?.userId || 'unknown' : 'unknown',
        metadata: { error: String(error) },
        severity: 'medium'
      });
    }
  }

  private async handleAuthResponse(message: WebSocketMessage, connection: SecureConnection): Promise<void> {
    if (message.payload.success) {
      connection.authenticated = true;
      
      // Process queued messages
      await this.processMessageQueue();
      
      await auditService.logEvent({
        action: 'websocket_authenticated',
        userId: connection.userId,
        metadata: { connectionId: connection.id }
      });
    } else {
      await auditService.logEvent({
        action: 'websocket_authentication_failed',
        userId: connection.userId,
        metadata: { 
          connectionId: connection.id,
          reason: message.payload.error 
        },
        severity: 'high'
      });
      
      // Close connection
      this.disconnect();
    }
  }

  private async handleStatusUpdate(message: WebSocketMessage, connection: SecureConnection): Promise<void> {
    // Emit status update event
    this.emit('robotStatus', message.payload);
  }

  private async handleDataMessage(message: WebSocketMessage, connection: SecureConnection): Promise<void> {
    // Emit data received event
    this.emit('dataReceived', message.payload);
  }

  private async handleAlert(message: WebSocketMessage, connection: SecureConnection): Promise<void> {
    await auditService.logEvent({
      action: 'websocket_alert_received',
      userId: connection.userId,
      metadata: { 
        alertType: message.payload.type,
        alertMessage: message.payload.message 
      },
      severity: message.payload.severity
    });

    // Emit alert event
    this.emit('alert', message.payload);
  }

  private async handleHeartbeat(message: WebSocketMessage, connection: SecureConnection): Promise<void> {
    // Respond to heartbeat
    this.sendMessage('heartbeat', { pong: true }, false);
  }

  private handleDisconnection(event: CloseEvent): void {
    console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Attempt reconnection if not a clean disconnect
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        // Re-establish connection with existing parameters
        if (this.connectionId) {
          const connection = this.connections.get(this.connectionId);
          if (connection) {
            this.connect(connection.userId, connection.robotId, connection.permissions);
          }
        }
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.sendMessage(message.type, message.payload, message.encrypted || false);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage('heartbeat', { ping: true }, false);
    }, 30000); // 30 seconds
  }

  private async generateSessionKey(): Promise<string> {
    return encryptionService.generateHash(
      `${Date.now()}_${Math.random()}_${navigator.userAgent || 'mobile'}`
    );
  }

  private generateNonce(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  private async encryptPayload(payload: any, sessionKey: string): Promise<any> {
    const payloadString = JSON.stringify(payload);
    return await encryptionService.encryptData(payloadString, sessionKey);
  }

  private async decryptPayload(encryptedPayload: any, sessionKey: string): Promise<any> {
    const decrypted = await encryptionService.decryptData(encryptedPayload, sessionKey);
    return JSON.parse(decrypted);
  }

  private async signMessage(message: WebSocketMessage, sessionKey: string): Promise<string> {
    const signatureData = `${message.id}:${message.type}:${message.timestamp}`;
    return encryptionService.generateHMAC(signatureData, sessionKey);
  }

  private async verifyMessageSignature(message: WebSocketMessage, sessionKey: string): Promise<boolean> {
    if (!message.signature) return false;
    
    const signatureData = `${message.id}:${message.type}:${message.timestamp}`;
    return encryptionService.verifyHMAC(signatureData, message.signature, sessionKey);
  }

  private validatePayload(type: string, payload: any): { isValid: boolean; errors: any } {
    // Basic validation based on message type
    switch (type) {
      case 'command':
        return validationService.validate(payload, {
          type: { required: true },
          parameters: { required: true }
        });
      case 'data':
        return validationService.validate(payload, {
          timestamp: { required: true },
          data: { required: true }
        });
      default:
        return { isValid: true, errors: {} };
    }
  }

  // Event emitter functionality
  private eventListeners: { [event: string]: Function[] } = {};

  public on(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  public off(event: string, listener: Function): void {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(listener);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    connectionId: string | null;
    lastActivity: number | null;
  } {
    const connection = this.connectionId ? this.connections.get(this.connectionId) : null;
    
    return {
      connected: this.ws?.readyState === WebSocket.OPEN || false,
      authenticated: connection?.authenticated || false,
      connectionId: this.connectionId,
      lastActivity: connection?.lastActivity || null
    };
  }

  /**
   * Get message queue status
   */
  public getMessageQueueStatus(): {
    queueLength: number;
    messages: WebSocketMessage[];
  } {
    return {
      queueLength: this.messageQueue.length,
      messages: [...this.messageQueue] // Return copy
    };
  }

  private setupEventHandlers(): void {
    // Handle app state changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // App went to background - reduce heartbeat frequency
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = setInterval(() => {
              this.sendMessage('heartbeat', { ping: true }, false);
            }, 60000); // 1 minute
          }
        } else {
          // App came to foreground - restore normal heartbeat
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.startHeartbeat();
          }
        }
      });
    }
  }
}

export const secureWebSocketService = new SecureWebSocketService();