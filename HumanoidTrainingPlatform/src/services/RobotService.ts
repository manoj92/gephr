import { RobotConnection, RobotCommand, RobotState, RobotType, LerobotAction } from '../types';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NetworkScanResult {
  ip: string;
  port: number;
  robotType: RobotType | null;
  responseTime: number;
  metadata?: Record<string, any>;
}

interface RobotProtocol {
  name: string;
  version: string;
  capabilities: string[];
  requiresAuth: boolean;
}

interface ConnectionConfig {
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  commandTimeout: number;
  enableLogging: boolean;
}

interface RobotTelemetry {
  timestamp: number;
  batteryLevel: number;
  temperature: number;
  jointPositions: number[];
  motorCurrents: number[];
  errors: string[];
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
  };
}

export class RobotService {
  private connectedRobots: Map<string, RobotConnection> = new Map();
  private commandQueues: Map<string, RobotCommand[]> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private listeners: Map<string, Function[]> = new Map();
  private connectionConfigs: Map<string, ConnectionConfig> = new Map();
  private robotProtocols: Map<string, RobotProtocol> = new Map();
  private telemetryData: Map<string, RobotTelemetry[]> = new Map();
  private connectionAttempts: Map<string, number> = new Map();
  private isDiscovering: boolean = false;
  
  private readonly STORAGE_KEYS = {
    SAVED_ROBOTS: 'saved_robots',
    CONNECTION_HISTORY: 'connection_history',
    TELEMETRY_DATA: 'telemetry_data',
  };
  
  private readonly DEFAULT_PORTS = {
    unitree_g1: 8080,
    boston_dynamics: 8081,
    tesla_bot: 8082,
    custom: 8083,
  };

  private readonly DEFAULT_CONFIG: ConnectionConfig = {
    maxRetries: 3,
    retryDelay: 2000,
    connectionTimeout: 10000,
    commandTimeout: 5000,
    enableLogging: true,
  };

  private readonly ROBOT_SIGNATURES = {
    unitree_g1: ['unitree', 'g1', 'quadruped'],
    boston_dynamics: ['boston', 'dynamics', 'spot', 'atlas'],
    tesla_bot: ['tesla', 'optimus', 'humanoid'],
    custom: ['robot', 'servo', 'control'],
  };

  async scanForRobots(networkRange: string = '192.168.1'): Promise<RobotConnection[]> {
    if (this.isDiscovering) {
      throw new Error('Discovery already in progress');
    }

    this.isDiscovering = true;
    
    try {
      const netInfo = await NetInfo.fetch();
      
      if (!netInfo.isConnected) {
        throw new Error('Network connection required for robot discovery');
      }

      if (netInfo.type === 'cellular') {
        console.warn('Using cellular network - discovery may be limited');
      }

      const discoveredRobots: RobotConnection[] = [];
      const scanPromises: Promise<NetworkScanResult | null>[] = [];
      
      // Load previously saved robots
      const savedRobots = await this.loadSavedRobots();
      
      // First, try to ping saved robots
      for (const savedRobot of savedRobots) {
        scanPromises.push(
          this.pingRobotEndpoint(savedRobot.ipAddress, savedRobot.port, savedRobot.type)
        );
      }

      // Then scan network range
      const ipSegments = networkRange.split('.');
      const baseIP = ipSegments.slice(0, 3).join('.');
      
      // Intelligent scanning - check common robot IPs first
      const priorityIPs = [100, 101, 150, 200, 10, 20, 50];
      const regularRange = Array.from({ length: 254 }, (_, i) => i + 1)
        .filter(i => !priorityIPs.includes(i));
      
      const scanOrder = [...priorityIPs, ...regularRange];
      
      for (const i of scanOrder) {
        const ip = `${baseIP}.${i}`;
        
        // Try each known port with protocol detection
        Object.entries(this.DEFAULT_PORTS).forEach(([robotType, port]) => {
          scanPromises.push(
            this.pingRobotEndpoint(ip, port, robotType as RobotType, true)
          );
        });
      }

      // Execute scans in batches to avoid overwhelming the network
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < scanPromises.length; i += batchSize) {
        batches.push(scanPromises.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(batch);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const scan = result.value;
            if (scan.robotType && !discoveredRobots.find(r => r.ipAddress === scan.ip)) {
              const robot: RobotConnection = {
                id: `${scan.robotType}-${scan.ip.replace(/\./g, '-')}`,
                name: `${scan.robotType.replace('_', ' ').toUpperCase()} (${scan.ip})`,
                type: scan.robotType,
                ipAddress: scan.ip,
                port: scan.port,
                isConnected: false,
                batteryLevel: this.estimateBatteryLevel(),
                lastSeen: new Date(),
                signalStrength: this.calculateSignalStrength(scan.responseTime),
                metadata: scan.metadata,
              };
              discoveredRobots.push(robot);
            }
          }
        });
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Save discovered robots for future scans
      await this.saveDiscoveredRobots(discoveredRobots);
      
      return discoveredRobots;
    } catch (error) {
      console.error('Robot discovery error:', error);
      throw error;
    } finally {
      this.isDiscovering = false;
    }
  }

  private async pingRobotEndpoint(
    ip: string, 
    port: number, 
    expectedType: RobotType,
    detectProtocol: boolean = false
  ): Promise<NetworkScanResult | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => resolve(null), 3000);
      
      try {
        // In a real implementation, this would use actual network discovery
        // For now, we simulate with more realistic behavior
        const mockDelay = Math.random() * 1000 + 200;
        
        setTimeout(async () => {
          clearTimeout(timeout);
          
          try {
            // Simulate HTTP/WebSocket discovery request
            const discoveryResult = await this.performRobotDiscovery(ip, port, expectedType);
            
            if (discoveryResult) {
              const result: NetworkScanResult = {
                ip,
                port,
                robotType: expectedType,
                responseTime: Date.now() - startTime,
                metadata: discoveryResult.metadata,
              };
              
              if (detectProtocol) {
                result.metadata = {
                  ...result.metadata,
                  protocol: discoveryResult.protocol,
                  capabilities: discoveryResult.capabilities,
                };
              }
              
              resolve(result);
            } else {
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        }, mockDelay);
      } catch (error) {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  }

  private async performRobotDiscovery(
    ip: string, 
    port: number, 
    expectedType: RobotType
  ): Promise<{ metadata: any; protocol: RobotProtocol; capabilities: string[] } | null> {
    // Simulate real robot discovery with more sophisticated logic
    const discoveryChance = this.getDiscoveryChanceForRobotType(expectedType, ip);
    
    if (Math.random() > discoveryChance) {
      return null;
    }
    
    // Simulate protocol detection
    const protocol = this.detectRobotProtocol(expectedType);
    const capabilities = this.getRobotCapabilities(expectedType);
    
    return {
      metadata: {
        firmwareVersion: this.generateFirmwareVersion(expectedType),
        serialNumber: this.generateSerialNumber(expectedType),
        lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        operatingHours: Math.floor(Math.random() * 10000),
      },
      protocol,
      capabilities,
    };
  }
  
  private getDiscoveryChanceForRobotType(robotType: RobotType, ip: string): number {
    // Higher chance for common IP addresses and known robot types
    const commonIPs = ['192.168.1.100', '192.168.1.101', '192.168.1.150'];
    const baseChance = commonIPs.includes(ip) ? 0.3 : 0.1;
    
    const typeMultipliers = {
      unitree_g1: 1.2,
      boston_dynamics: 1.1,
      tesla_bot: 0.8,
      custom: 1.5,
    };
    
    return Math.min(0.95, baseChance * (typeMultipliers[robotType] || 1));
  }
  
  private detectRobotProtocol(robotType: RobotType): RobotProtocol {
    const protocols: Record<RobotType, RobotProtocol> = {
      unitree_g1: {
        name: 'Unitree SDK',
        version: '1.2.0',
        capabilities: ['locomotion', 'manipulation', 'vision'],
        requiresAuth: true,
      },
      boston_dynamics: {
        name: 'Spot SDK',
        version: '3.2.1',
        capabilities: ['locomotion', 'arm', 'gripper', 'vision'],
        requiresAuth: true,
      },
      tesla_bot: {
        name: 'Optimus API',
        version: '0.9.0',
        capabilities: ['humanoid_locomotion', 'dexterous_manipulation'],
        requiresAuth: false,
      },
      custom: {
        name: 'Generic Robot Protocol',
        version: '1.0.0',
        capabilities: ['basic_control'],
        requiresAuth: false,
      },
    };
    
    return protocols[robotType];
  }
  
  private getRobotCapabilities(robotType: RobotType): string[] {
    return this.detectRobotProtocol(robotType).capabilities;
  }
  
  private generateFirmwareVersion(robotType: RobotType): string {
    const versions = {
      unitree_g1: ['1.8.2', '1.8.1', '1.7.9'],
      boston_dynamics: ['3.2.1', '3.2.0', '3.1.2'],
      tesla_bot: ['0.9.0', '0.8.5', '0.8.2'],
      custom: ['1.0.0', '0.9.8', '0.9.5'],
    };
    
    const versionList = versions[robotType] || ['1.0.0'];
    return versionList[Math.floor(Math.random() * versionList.length)];
  }
  
  private generateSerialNumber(robotType: RobotType): string {
    const prefixes = {
      unitree_g1: 'UG1',
      boston_dynamics: 'BD',
      tesla_bot: 'TB',
      custom: 'CR',
    };
    
    const prefix = prefixes[robotType] || 'RB';
    const number = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}-${number}`;
  }

  async connectToRobot(robot: RobotConnection, config?: Partial<ConnectionConfig>): Promise<RobotConnection> {
    const connectionConfig = { ...this.DEFAULT_CONFIG, ...config };
    this.connectionConfigs.set(robot.id, connectionConfig);
    
    const attemptKey = robot.id;
    let currentAttempt = this.connectionAttempts.get(attemptKey) || 0;
    
    const maxRetries = connectionConfig.maxRetries;
    
    while (currentAttempt <= maxRetries) {
      try {
        // Check if already connected
        if (this.connectedRobots.has(robot.id)) {
          throw new Error(`Already connected to ${robot.name}`);
        }

        if (connectionConfig.enableLogging) {
          console.log(`Attempting to connect to ${robot.name} (attempt ${currentAttempt + 1}/${maxRetries + 1})`);
        }

        // Pre-connection validation
        await this.validateRobotConnection(robot);
        
        // Establish WebSocket connection with timeout
        const ws = await this.establishWebSocketConnection(robot, connectionConfig);
        this.websockets.set(robot.id, ws);

        // Initialize command queue and telemetry
        this.commandQueues.set(robot.id, []);
        this.telemetryData.set(robot.id, []);

        // Perform authentication if required
        const protocol = this.robotProtocols.get(robot.id);
        if (protocol?.requiresAuth) {
          await this.authenticateRobot(robot.id, ws);
        }

        // Start heartbeat and telemetry collection
        this.startHeartbeat(robot.id);
        this.startTelemetryCollection(robot.id);

        // Update robot connection status
        const connectedRobot: RobotConnection = {
          ...robot,
          isConnected: true,
          lastSeen: new Date(),
          connectionTime: Date.now(),
        };

        this.connectedRobots.set(robot.id, connectedRobot);

        // Setup message listeners
        this.setupRobotListeners(robot.id, ws);
        
        // Save connection history
        await this.saveConnectionHistory(robot.id, 'connected');
        
        // Reset connection attempts
        this.connectionAttempts.delete(attemptKey);
        
        if (connectionConfig.enableLogging) {
          console.log(`Successfully connected to ${robot.name}`);
        }

        return connectedRobot;
      } catch (error) {
        currentAttempt++;
        this.connectionAttempts.set(attemptKey, currentAttempt);
        
        if (currentAttempt > maxRetries) {
          this.connectionAttempts.delete(attemptKey);
          await this.saveConnectionHistory(robot.id, 'failed');
          console.error(`Failed to connect to ${robot.name} after ${maxRetries + 1} attempts:`, error);
          throw error;
        }
        
        if (connectionConfig.enableLogging) {
          console.warn(`Connection attempt ${currentAttempt} failed, retrying in ${connectionConfig.retryDelay}ms...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, connectionConfig.retryDelay));
      }
    }
    
    throw new Error(`Failed to connect to ${robot.name} after all retry attempts`);
  }
  
  private async validateRobotConnection(robot: RobotConnection): Promise<void> {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No network connection available');
    }
    
    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(robot.ipAddress)) {
      throw new Error(`Invalid IP address: ${robot.ipAddress}`);
    }
    
    // Validate port range
    if (robot.port < 1 || robot.port > 65535) {
      throw new Error(`Invalid port: ${robot.port}`);
    }
  }
  
  private async authenticateRobot(robotId: string, ws: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);
      
      const authHandler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'auth_response') {
            clearTimeout(timeout);
            ws.removeEventListener('message', authHandler);
            
            if (message.success) {
              resolve();
            } else {
              reject(new Error(`Authentication failed: ${message.error}`));
            }
          }
        } catch (error) {
          // Ignore parsing errors during auth
        }
      };
      
      ws.addEventListener('message', authHandler);
      
      // Send authentication request
      ws.send(JSON.stringify({
        type: 'authenticate',
        credentials: {
          apiKey: 'demo-api-key', // In production, load from secure storage
          clientId: `mobile-${Date.now()}`,
        },
      }));
    });
  }
  
  private startTelemetryCollection(robotId: string): void {
    const interval = setInterval(() => {
      this.collectRobotTelemetry(robotId);
    }, 1000); // Collect telemetry every second
    
    // Store interval reference for cleanup
    this.heartbeatIntervals.set(`${robotId}_telemetry`, interval);
  }
  
  private async collectRobotTelemetry(robotId: string): Promise<void> {
    const robot = this.connectedRobots.get(robotId);
    if (!robot || !robot.isConnected) return;
    
    // Simulate telemetry collection
    const telemetry: RobotTelemetry = {
      timestamp: Date.now(),
      batteryLevel: Math.max(0, Math.min(100, (robot.batteryLevel || 50) + (Math.random() - 0.5) * 2)),
      temperature: Math.random() * 20 + 30, // 30-50°C
      jointPositions: Array.from({ length: 12 }, () => Math.random() * 2 - 1),
      motorCurrents: Array.from({ length: 12 }, () => Math.random() * 5),
      errors: [],
      performance: {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        networkLatency: Math.random() * 100 + 10,
      },
    };
    
    // Add random errors occasionally
    if (Math.random() > 0.98) {
      const errors = ['Motor overcurrent', 'Joint limit reached', 'Communication timeout'];
      telemetry.errors.push(errors[Math.floor(Math.random() * errors.length)]);
    }
    
    const robotTelemetry = this.telemetryData.get(robotId) || [];
    robotTelemetry.push(telemetry);
    
    // Keep only last 1000 telemetry points
    if (robotTelemetry.length > 1000) {
      robotTelemetry.splice(0, robotTelemetry.length - 1000);
    }
    
    this.telemetryData.set(robotId, robotTelemetry);
    
    // Update robot battery level
    robot.batteryLevel = telemetry.batteryLevel;
    
    // Emit telemetry event
    this.emitEvent(robotId, 'telemetry', telemetry);
  }

  private async establishWebSocketConnection(
    robot: RobotConnection, 
    config: ConnectionConfig
  ): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${robot.ipAddress}:${robot.port}/robot-control`;
      
      if (config.enableLogging) {
        console.log(`Establishing WebSocket connection to ${wsUrl}`);
      }
      
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout after ${config.connectionTimeout}ms`));
      }, config.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(timeout);
        
        if (config.enableLogging) {
          console.log(`WebSocket connection established to ${robot.name}`);
        }
        
        // Detect and store robot protocol
        const protocol = this.detectRobotProtocol(robot.type);
        this.robotProtocols.set(robot.id, protocol);
        
        // Send initial handshake with protocol information
        ws.send(JSON.stringify({
          type: 'handshake',
          robotType: robot.type,
          clientId: `mobile-${Date.now()}`,
          protocolVersion: protocol.version,
          requestedCapabilities: protocol.capabilities,
          timestamp: Date.now(),
        }));
        
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        const errorMessage = `WebSocket connection failed to ${robot.name}: ${error}`;
        if (config.enableLogging) {
          console.error(errorMessage);
        }
        reject(new Error(errorMessage));
      };
      
      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (event.code !== 1000) { // Normal closure
          const errorMessage = `WebSocket connection closed unexpectedly: ${event.code} ${event.reason}`;
          if (config.enableLogging) {
            console.error(errorMessage);
          }
          reject(new Error(errorMessage));
        }
      };
    });
  }

  private setupRobotListeners(robotId: string, ws: WebSocket): void {
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleRobotMessage(robotId, message);
      } catch (error) {
        console.error('Failed to parse robot message:', error);
      }
    };

    ws.onclose = () => {
      this.handleRobotDisconnection(robotId);
    };

    ws.onerror = (error) => {
      console.error(`Robot ${robotId} WebSocket error:`, error);
    };
  }

  private handleRobotMessage(robotId: string, message: any): void {
    const config = this.connectionConfigs.get(robotId);
    
    if (config?.enableLogging) {
      console.log(`Received message from ${robotId}:`, message.type);
    }
    
    switch (message.type) {
      case 'state_update':
        this.updateRobotState(robotId, message.state);
        this.emitEvent(robotId, 'stateUpdate', message.state);
        break;
      case 'command_response':
        this.handleCommandResponse(robotId, message);
        this.emitEvent(robotId, 'commandResponse', message);
        break;
      case 'error':
        this.handleRobotError(robotId, message.error);
        this.emitEvent(robotId, 'error', message.error);
        break;
      case 'warning':
        this.emitEvent(robotId, 'warning', message.warning);
        break;
      case 'telemetry':
        this.handleTelemetryMessage(robotId, message.data);
        break;
      case 'heartbeat':
        this.updateLastSeen(robotId);
        this.emitEvent(robotId, 'heartbeat', message);
        break;
      case 'capability_update':
        this.updateRobotCapabilities(robotId, message.capabilities);
        break;
      default:
        if (config?.enableLogging) {
          console.warn(`Unknown message type from ${robotId}:`, message.type);
        }
    }
  }
  
  private updateRobotState(robotId: string, state: RobotState): void {
    const robot = this.connectedRobots.get(robotId);
    if (robot) {
      robot.batteryLevel = state.batteryLevel || robot.batteryLevel;
      robot.lastSeen = new Date();
      // Update any other relevant robot properties
    }
  }
  
  private handleCommandResponse(robotId: string, response: any): void {
    // Process command execution results
    const queue = this.commandQueues.get(robotId);
    if (queue && queue.length > 0 && response.commandId) {
      const commandIndex = queue.findIndex(cmd => cmd.id === response.commandId);
      if (commandIndex !== -1) {
        const command = queue[commandIndex];
        if (response.success) {
          // Command completed successfully
          queue.splice(commandIndex, 1);
        } else {
          // Command failed, decide whether to retry or remove
          command.retries = (command.retries || 0) + 1;
          if (command.retries >= 3) {
            queue.splice(commandIndex, 1);
          }
        }
        this.commandQueues.set(robotId, queue);
      }
    }
  }
  
  private handleRobotError(robotId: string, error: string): void {
    console.error(`Robot ${robotId} error:`, error);
    
    // Handle critical errors
    if (error.includes('emergency') || error.includes('critical')) {
      this.emergencyStop(robotId);
    }
  }
  
  private handleTelemetryMessage(robotId: string, telemetryData: any): void {
    const telemetry: RobotTelemetry = {
      timestamp: Date.now(),
      ...telemetryData,
    };
    
    const robotTelemetry = this.telemetryData.get(robotId) || [];
    robotTelemetry.push(telemetry);
    
    // Keep only recent telemetry
    if (robotTelemetry.length > 1000) {
      robotTelemetry.splice(0, robotTelemetry.length - 1000);
    }
    
    this.telemetryData.set(robotId, robotTelemetry);
    this.emitEvent(robotId, 'telemetry', telemetry);
  }
  
  private updateRobotCapabilities(robotId: string, capabilities: string[]): void {
    const protocol = this.robotProtocols.get(robotId);
    if (protocol) {
      protocol.capabilities = capabilities;
      this.robotProtocols.set(robotId, protocol);
    }
  }

  private handleRobotDisconnection(robotId: string): void {
    const config = this.connectionConfigs.get(robotId);
    
    if (config?.enableLogging) {
      console.log(`Handling disconnection for robot ${robotId}`);
    }
    
    // Stop all intervals and timers
    this.stopHeartbeat(robotId);
    this.stopTelemetryCollection(robotId);
    
    // Clear WebSocket connection
    const ws = this.websockets.get(robotId);
    if (ws) {
      ws.close();
    }
    this.websockets.delete(robotId);
    
    // Clear command queue
    this.commandQueues.delete(robotId);
    
    const robot = this.connectedRobots.get(robotId);
    if (robot) {
      robot.isConnected = false;
      robot.disconnectionTime = Date.now();
      
      // Save disconnection to history
      this.saveConnectionHistory(robotId, 'disconnected').catch(console.error);
      
      this.emitEvent(robotId, 'disconnected', robot);
    }
    
    // Clean up resources
    this.connectedRobots.delete(robotId);
    this.connectionConfigs.delete(robotId);
    this.robotProtocols.delete(robotId);
    
    if (config?.enableLogging) {
      console.log(`Robot ${robotId} disconnected and cleaned up`);
    }
  }
  
  private stopTelemetryCollection(robotId: string): void {
    const telemetryInterval = this.heartbeatIntervals.get(`${robotId}_telemetry`);
    if (telemetryInterval) {
      clearInterval(telemetryInterval);
      this.heartbeatIntervals.delete(`${robotId}_telemetry`);
    }
  }

  async disconnectFromRobot(robotId: string): Promise<void> {
    const ws = this.websockets.get(robotId);
    if (ws) {
      ws.close();
    }
    this.handleRobotDisconnection(robotId);
  }

  async sendCommand(robotId: string, command: RobotCommand): Promise<void> {
    const robot = this.connectedRobots.get(robotId);
    const ws = this.websockets.get(robotId);

    if (!robot || !ws || !robot.isConnected) {
      throw new Error(`Robot ${robotId} is not connected`);
    }

    try {
      // Add to command queue
      const queue = this.commandQueues.get(robotId) || [];
      queue.push(command);
      this.commandQueues.set(robotId, queue);

      // Send command via WebSocket
      ws.send(JSON.stringify({
        type: 'command',
        command: command,
        timestamp: Date.now(),
      }));

      // Process queue if not busy
      this.processCommandQueue(robotId);
    } catch (error) {
      console.error(`Failed to send command to ${robotId}:`, error);
      throw error;
    }
  }

  private async processCommandQueue(robotId: string): Promise<void> {
    const queue = this.commandQueues.get(robotId);
    const robot = this.connectedRobots.get(robotId);

    if (!queue || !robot || queue.length === 0) return;

    const currentCommand = queue[0];
    
    try {
      // Execute command based on robot type
      await this.executeRobotSpecificCommand(robot, currentCommand);
      
      // Remove completed command from queue
      queue.shift();
      this.commandQueues.set(robotId, queue);
      
      // Continue processing if more commands exist
      if (queue.length > 0) {
        setTimeout(() => this.processCommandQueue(robotId), 100);
      }
    } catch (error) {
      console.error(`Command execution failed for ${robotId}:`, error);
      // Remove failed command and continue
      queue.shift();
      this.commandQueues.set(robotId, queue);
    }
  }

  private async executeRobotSpecificCommand(
    robot: RobotConnection, 
    command: RobotCommand
  ): Promise<void> {
    // Convert generic command to robot-specific format
    switch (robot.type) {
      case 'unitree_g1':
        await this.executeUnitreeCommand(robot, command);
        break;
      case 'boston_dynamics':
        await this.executeBostonDynamicsCommand(robot, command);
        break;
      case 'tesla_bot':
        await this.executeTeslaBotCommand(robot, command);
        break;
      case 'custom':
        await this.executeCustomCommand(robot, command);
        break;
      default:
        throw new Error(`Unsupported robot type: ${robot.type}`);
    }
  }

  private async executeUnitreeCommand(robot: RobotConnection, command: RobotCommand): Promise<void> {
    // Unitree G1 specific command implementation
    const unitreeCommand = {
      robot_id: robot.id,
      command_type: this.mapToUnitreeCommand(command.type),
      parameters: command.parameters,
      timestamp: Date.now(),
    };

    // Send to Unitree SDK
    console.log('Executing Unitree command:', unitreeCommand);
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate execution
  }

  private async executeBostonDynamicsCommand(robot: RobotConnection, command: RobotCommand): Promise<void> {
    // Boston Dynamics specific command implementation
    const bdCommand = {
      robot: robot.name,
      action: this.mapToBostonDynamicsAction(command.type),
      params: command.parameters,
      execution_time: Date.now(),
    };

    console.log('Executing Boston Dynamics command:', bdCommand);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate execution
  }

  private async executeTeslaBotCommand(robot: RobotConnection, command: RobotCommand): Promise<void> {
    // Tesla Bot specific command implementation
    const teslaCommand = {
      bot_id: robot.id,
      instruction: this.mapToTeslaBotInstruction(command.type),
      variables: command.parameters,
      timestamp: command.timestamp,
    };

    console.log('Executing Tesla Bot command:', teslaCommand);
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate execution
  }

  private async executeCustomCommand(robot: RobotConnection, command: RobotCommand): Promise<void> {
    // Custom robot command implementation
    const customCommand = {
      target: robot.id,
      operation: command.type,
      data: command.parameters,
      created_at: command.timestamp,
    };

    console.log('Executing custom robot command:', customCommand);
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate execution
  }

  convertLeRobotActionToCommand(action: LerobotAction): RobotCommand {
    return {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: action.type as RobotCommand['type'],
      parameters: action.parameters,
      timestamp: action.timestamp,
      priority: this.getPriorityForAction(action.type),
    };
  }

  private getPriorityForAction(actionType: string): 'low' | 'normal' | 'high' | 'emergency' {
    const priorityMap: Record<string, RobotCommand['priority']> = {
      'emergency_stop': 'emergency',
      'pick': 'high',
      'place': 'high',
      'move': 'normal',
      'rotate': 'normal',
      'open': 'normal',
      'close': 'normal',
      'idle': 'low',
    };
    return priorityMap[actionType] || 'normal';
  }

  private mapToUnitreeCommand(type: string): string {
    const mapping: Record<string, string> = {
      'move': 'body_move',
      'rotate': 'body_rotate',
      'pick': 'manipulator_grasp',
      'place': 'manipulator_release',
      'open': 'gripper_open',
      'close': 'gripper_close',
    };
    return mapping[type] || 'idle';
  }

  private mapToBostonDynamicsAction(type: string): string {
    const mapping: Record<string, string> = {
      'move': 'walk_to',
      'rotate': 'turn',
      'pick': 'grasp_object',
      'place': 'place_object',
      'open': 'open_gripper',
      'close': 'close_gripper',
    };
    return mapping[type] || 'sit';
  }

  private mapToTeslaBotInstruction(type: string): string {
    const mapping: Record<string, string> = {
      'move': 'navigate',
      'rotate': 'orient',
      'pick': 'grab',
      'place': 'release',
      'open': 'extend_hand',
      'close': 'form_fist',
    };
    return mapping[type] || 'standby';
  }

  private startHeartbeat(robotId: string): void {
    const interval = setInterval(() => {
      const ws = this.websockets.get(robotId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, 5000);

    this.heartbeatIntervals.set(robotId, interval);
  }

  private stopHeartbeat(robotId: string): void {
    const interval = this.heartbeatIntervals.get(robotId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(robotId);
    }
  }

  private updateLastSeen(robotId: string): void {
    const robot = this.connectedRobots.get(robotId);
    if (robot) {
      robot.lastSeen = new Date();
    }
  }

  private estimateBatteryLevel(): number {
    // Mock battery level estimation
    return Math.floor(Math.random() * 40 + 60); // 60-100%
  }

  private calculateSignalStrength(responseTime: number): number {
    // Convert response time to signal strength (0-100)
    return Math.max(0, Math.min(100, 100 - (responseTime / 20)));
  }

  // Event system for robot status updates
  addEventListener(robotId: string, event: string, callback: Function): void {
    if (!this.listeners.has(robotId)) {
      this.listeners.set(robotId, []);
    }
    const robotListeners = this.listeners.get(robotId)!;
    robotListeners.push(callback);
  }

  removeEventListener(robotId: string, event: string, callback: Function): void {
    const robotListeners = this.listeners.get(robotId);
    if (robotListeners) {
      const index = robotListeners.indexOf(callback);
      if (index > -1) {
        robotListeners.splice(index, 1);
      }
    }
  }

  private emitEvent(robotId: string, event: string, data: any): void {
    const robotListeners = this.listeners.get(robotId);
    if (robotListeners) {
      robotListeners.forEach(callback => {
        try {
          callback(event, data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  // New methods for enhanced functionality
  
  async loadSavedRobots(): Promise<RobotConnection[]> {
    try {
      const savedData = await AsyncStorage.getItem(this.STORAGE_KEYS.SAVED_ROBOTS);
      return savedData ? JSON.parse(savedData) : [];
    } catch (error) {
      console.error('Failed to load saved robots:', error);
      return [];
    }
  }
  
  async saveDiscoveredRobots(robots: RobotConnection[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SAVED_ROBOTS, JSON.stringify(robots));
    } catch (error) {
      console.error('Failed to save discovered robots:', error);
    }
  }
  
  async saveConnectionHistory(robotId: string, event: string): Promise<void> {
    try {
      const historyData = await AsyncStorage.getItem(this.STORAGE_KEYS.CONNECTION_HISTORY);
      const history = historyData ? JSON.parse(historyData) : [];
      
      history.push({
        robotId,
        event,
        timestamp: Date.now(),
      });
      
      // Keep only last 100 history entries
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.CONNECTION_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save connection history:', error);
    }
  }
  
  getRobotTelemetry(robotId: string, limit?: number): RobotTelemetry[] {
    const telemetry = this.telemetryData.get(robotId) || [];
    return limit ? telemetry.slice(-limit) : telemetry;
  }
  
  getRobotProtocol(robotId: string): RobotProtocol | undefined {
    return this.robotProtocols.get(robotId);
  }
  
  getConnectionConfig(robotId: string): ConnectionConfig | undefined {
    return this.connectionConfigs.get(robotId);
  }
  
  async getConnectionHistory(): Promise<any[]> {
    try {
      const historyData = await AsyncStorage.getItem(this.STORAGE_KEYS.CONNECTION_HISTORY);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Failed to get connection history:', error);
      return [];
    }
  }
  
  isRobotConnected(robotId: string): boolean {
    const robot = this.connectedRobots.get(robotId);
    return robot?.isConnected || false;
  }
  
  getConnectedRobots(): RobotConnection[] {
    return Array.from(this.connectedRobots.values());
  }
  
  getDiscoveryStatus(): boolean {
    return this.isDiscovering;
  }
  
  async updateRobotConfiguration(robotId: string, config: Partial<ConnectionConfig>): Promise<void> {
    const currentConfig = this.connectionConfigs.get(robotId) || this.DEFAULT_CONFIG;
    const newConfig = { ...currentConfig, ...config };
    this.connectionConfigs.set(robotId, newConfig);
  }

  getCommandQueue(robotId: string): RobotCommand[] {
    return this.commandQueues.get(robotId) || [];
  }

  clearCommandQueue(robotId: string): void {
    this.commandQueues.set(robotId, []);
  }

  async emergencyStop(robotId?: string): Promise<void> {
    const robotIds = robotId ? [robotId] : Array.from(this.connectedRobots.keys());

    const stopPromises = robotIds.map(async (id) => {
      const emergencyCommand: RobotCommand = {
        id: `emergency-${Date.now()}`,
        type: 'emergency_stop',
        parameters: {},
        timestamp: Date.now(),
        priority: 'emergency',
      };

      // Clear existing queue and send emergency stop immediately
      this.commandQueues.set(id, []);
      await this.sendCommand(id, emergencyCommand);
    });

    await Promise.all(stopPromises);
  }

  dispose(): void {
    console.log('Disposing robot service...');
    
    // Clean up all connections
    const robotIds = Array.from(this.connectedRobots.keys());
    const disconnectPromises = robotIds.map(id => 
      this.disconnectFromRobot(id).catch(error => 
        console.error(`Error disconnecting robot ${id}:`, error)
      )
    );
    
    // Wait for all disconnections to complete
    Promise.all(disconnectPromises).then(() => {
      console.log('All robots disconnected');
    });

    // Clear all maps and resources
    this.connectedRobots.clear();
    this.commandQueues.clear();
    this.heartbeatIntervals.clear();
    this.websockets.clear();
    this.listeners.clear();
    this.connectionConfigs.clear();
    this.robotProtocols.clear();
    this.telemetryData.clear();
    this.connectionAttempts.clear();
    
    // Reset discovery state
    this.isDiscovering = false;
    
    console.log('Robot service disposed');
  }
}

export const robotService = new RobotService();