import { RobotConnection, RobotCommand, RobotState, RobotCapability, LerobotAction } from '../types';
import { encryptionService } from './EncryptionService';
import { validationService } from './ValidationService';
import { auditService } from './AuditService';
import CryptoJS from 'crypto-js';

export interface SecureRobotConnectionConfig {
  type: 'unitree_g1' | 'boston_dynamics' | 'tesla_bot' | 'custom';
  connectionMethod: 'wifi' | 'bluetooth' | 'ethernet';
  address: string;
  port?: number;
  authentication: {
    certificatePath?: string;
    privateKeyPath?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    mTLS?: boolean;
  };
  security: {
    encryption: boolean;
    messageAuthentication: boolean;
    sessionTimeout: number;
    maxRetries: number;
  };
}

export interface SecureRobotConnection extends RobotConnection {
  sessionId: string;
  encryptionKey: string;
  lastAuthentication: number;
  authenticationMethod: 'certificate' | 'api_key' | 'username_password';
  securityLevel: 'basic' | 'enhanced' | 'military';
  connectionHash: string;
}

export interface SecureRobotCommand extends RobotCommand {
  sessionId: string;
  signature: string;
  nonce: string;
  encryptedPayload?: string;
}

export class SecureRobotService {
  private connections: Map<string, SecureRobotConnection> = new Map();
  private activeConnection: SecureRobotConnection | null = null;
  private commandQueue: SecureRobotCommand[] = [];
  private isExecutingCommands = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionKeys: Map<string, string> = new Map();

  private readonly ROBOT_CONFIGS = {
    unitree_g1: {
      capabilities: ['navigation', 'manipulation', 'vision', 'balance'] as RobotCapability[],
      defaultPort: 8080,
      maxCommandQueueSize: 100,
      heartbeatInterval: 1000,
      jointCount: 12,
      maxSpeed: 1.5,
      securityLevel: 'enhanced' as const,
      requiredAuth: ['certificate', 'api_key'] as const
    },
    boston_dynamics: {
      capabilities: ['navigation', 'manipulation', 'vision', 'balance', 'climbing'] as RobotCapability[],
      defaultPort: 443,
      maxCommandQueueSize: 50,
      heartbeatInterval: 2000,
      jointCount: 20,
      maxSpeed: 1.6,
      securityLevel: 'military' as const,
      requiredAuth: ['certificate'] as const
    },
    tesla_bot: {
      capabilities: ['navigation', 'manipulation', 'vision', 'speech', 'fine_motor'] as RobotCapability[],
      defaultPort: 9000,
      maxCommandQueueSize: 150,
      heartbeatInterval: 500,
      jointCount: 28,
      maxSpeed: 2.0,
      securityLevel: 'enhanced' as const,
      requiredAuth: ['api_key', 'username_password'] as const
    },
    custom: {
      capabilities: ['navigation', 'manipulation'] as RobotCapability[],
      defaultPort: 8888,
      maxCommandQueueSize: 50,
      heartbeatInterval: 1000,
      jointCount: 6,
      maxSpeed: 1.0,
      securityLevel: 'basic' as const,
      requiredAuth: ['username_password'] as const
    },
  };

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    console.log('Secure robot service initialized');
    this.startCommandProcessor();
    this.startSecurityMonitoring();
  }

  /**
   * Discover robots with security validation
   */
  public async discoverRobots(): Promise<SecureRobotConnection[]> {
    console.log('Discovering robots with security validation...');
    
    await auditService.logEvent({
      action: 'robot_discovery_started',
      userId: 'current_user',
      metadata: { timestamp: Date.now() }
    });

    // In production, this would scan network and validate certificates
    const mockRobots: SecureRobotConnection[] = [
      {
        id: 'unitree_g1_001',
        name: 'Unitree G1 #001',
        type: 'unitree_g1',
        status: 'disconnected',
        ipAddress: '192.168.1.100',
        capabilities: this.ROBOT_CONFIGS.unitree_g1.capabilities,
        batteryLevel: 85,
        lastHeartbeat: Date.now(),
        sessionId: '',
        encryptionKey: '',
        lastAuthentication: 0,
        authenticationMethod: 'certificate',
        securityLevel: this.ROBOT_CONFIGS.unitree_g1.securityLevel,
        connectionHash: ''
      },
      {
        id: 'custom_robot_001',
        name: 'Custom Robot #001',
        type: 'custom',
        status: 'disconnected',
        ipAddress: '192.168.1.101',
        capabilities: this.ROBOT_CONFIGS.custom.capabilities,
        batteryLevel: 92,
        lastHeartbeat: Date.now(),
        sessionId: '',
        encryptionKey: '',
        lastAuthentication: 0,
        authenticationMethod: 'username_password',
        securityLevel: this.ROBOT_CONFIGS.custom.securityLevel,
        connectionHash: ''
      },
    ];

    // Validate discovered robots
    for (const robot of mockRobots) {
      const validation = validationService.validateRobotConnection(robot);
      if (!validation.isValid) {
        console.error(`Invalid robot configuration: ${robot.id}`, validation.errors);
        continue;
      }

      this.connections.set(robot.id, robot);
    }

    await auditService.logEvent({
      action: 'robot_discovery_completed',
      userId: 'current_user',
      metadata: { robotCount: mockRobots.length }
    });

    return mockRobots;
  }

  /**
   * Securely connect to a robot with full authentication
   */
  public async connectToRobot(
    robotId: string,
    config: SecureRobotConnectionConfig
  ): Promise<{
    success: boolean;
    connection?: SecureRobotConnection;
    error?: string;
  }> {
    const robot = this.connections.get(robotId);
    if (!robot) {
      await auditService.logEvent({
        action: 'robot_connection_failed',
        userId: 'current_user',
        metadata: { robotId, reason: 'robot_not_found' },
        severity: 'medium'
      });
      return { success: false, error: `Robot with ID ${robotId} not found` };
    }

    try {
      robot.status = 'connecting';
      
      // Validate configuration
      const validation = this.validateConnectionConfig(config, robot.type);
      if (!validation.isValid) {
        robot.status = 'error';
        return { success: false, error: validation.error };
      }

      // Establish secure connection
      const connectionResult = await this.establishSecureConnection(robot, config);
      if (!connectionResult.success) {
        robot.status = 'error';
        await auditService.logEvent({
          action: 'robot_connection_failed',
          userId: 'current_user',
          metadata: { robotId, reason: connectionResult.error },
          severity: 'medium'
        });
        return connectionResult;
      }

      // Perform authentication
      const authResult = await this.performAuthentication(robot, config);
      if (!authResult.success) {
        robot.status = 'error';
        await auditService.logEvent({
          action: 'robot_authentication_failed',
          userId: 'current_user',
          metadata: { robotId, reason: authResult.error },
          severity: 'high'
        });
        return authResult;
      }

      // Initialize secure session
      await this.initializeSecureSession(robot, config);

      robot.status = 'connected';
      robot.lastHeartbeat = Date.now();
      robot.lastAuthentication = Date.now();
      this.activeConnection = robot;

      // Start secure heartbeat
      this.startSecureHeartbeat(robot);

      await auditService.logEvent({
        action: 'robot_connected',
        userId: 'current_user',
        metadata: {
          robotId,
          securityLevel: robot.securityLevel,
          authMethod: robot.authenticationMethod
        }
      });

      console.log(`Successfully connected to ${robot.name} with ${robot.securityLevel} security`);
      return { success: true, connection: robot };

    } catch (error) {
      robot.status = 'error';
      await auditService.logEvent({
        action: 'robot_connection_error',
        userId: 'current_user',
        metadata: { robotId, error: String(error) },
        severity: 'high'
      });
      console.error(`Failed to connect to ${robot.name}:`, error);
      return { success: false, error: String(error) };
    }
  }

  private validateConnectionConfig(
    config: SecureRobotConnectionConfig,
    robotType: string
  ): { isValid: boolean; error?: string } {
    const robotConfig = this.ROBOT_CONFIGS[robotType as keyof typeof this.ROBOT_CONFIGS];
    
    // Check if authentication method is supported
    const hasValidAuth = robotConfig.requiredAuth.some(method => {
      switch (method) {
        case 'certificate':
          return config.authentication.certificatePath && config.authentication.privateKeyPath;
        case 'api_key':
          return config.authentication.apiKey;
        case 'username_password':
          return config.authentication.username && config.authentication.password;
        default:
          return false;
      }
    });

    if (!hasValidAuth) {
      return {
        isValid: false,
        error: `Robot requires one of: ${robotConfig.requiredAuth.join(', ')}`
      };
    }

    // Validate security requirements
    if (robotConfig.securityLevel === 'military' && !config.security.encryption) {
      return {
        isValid: false,
        error: 'Military-grade robots require encryption enabled'
      };
    }

    return { isValid: true };
  }

  private async establishSecureConnection(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate session ID
      robot.sessionId = CryptoJS.lib.WordArray.random(128/8).toString();
      
      // Create connection hash for integrity verification
      robot.connectionHash = encryptionService.generateHash(
        `${robot.id}:${robot.sessionId}:${Date.now()}`
      );

      // Simulate secure connection establishment
      console.log(`Establishing ${config.security.encryption ? 'encrypted' : 'standard'} connection to ${config.address}:${config.port}`);
      
      // Simulate network handshake with security validation
      await this.performSecureHandshake(robot, config);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async performSecureHandshake(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<void> {
    // Simulate TLS handshake
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (config.security.encryption) {
      // Generate session encryption key
      const sessionKey = CryptoJS.lib.WordArray.random(256/8).toString();
      robot.encryptionKey = sessionKey;
      this.sessionKeys.set(robot.sessionId, sessionKey);
    }

    // Simulate certificate validation for enhanced/military security
    if (robot.securityLevel !== 'basic') {
      await this.validateRobotCertificate(robot, config);
    }
  }

  private async validateRobotCertificate(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<void> {
    // Simulate certificate validation
    console.log(`Validating robot certificate for ${robot.name}`);
    
    if (config.authentication.certificatePath) {
      // In production, this would verify the actual certificate
      console.log('Certificate validated successfully');
    } else {
      throw new Error('Certificate validation failed');
    }
  }

  private async performAuthentication(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (config.authentication.certificatePath) {
        robot.authenticationMethod = 'certificate';
        await this.authenticateWithCertificate(robot, config);
      } else if (config.authentication.apiKey) {
        robot.authenticationMethod = 'api_key';
        await this.authenticateWithApiKey(robot, config);
      } else if (config.authentication.username && config.authentication.password) {
        robot.authenticationMethod = 'username_password';
        await this.authenticateWithCredentials(robot, config);
      } else {
        throw new Error('No valid authentication method provided');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async authenticateWithCertificate(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<void> {
    console.log(`Authenticating ${robot.name} with certificate`);
    
    // Simulate certificate-based authentication
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In production, this would perform actual certificate authentication
    if (Math.random() > 0.02) { // 98% success rate
      console.log('Certificate authentication successful');
    } else {
      throw new Error('Certificate authentication failed - invalid certificate');
    }
  }

  private async authenticateWithApiKey(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<void> {
    console.log(`Authenticating ${robot.name} with API key`);
    
    // Validate API key format
    if (!config.authentication.apiKey || config.authentication.apiKey.length < 32) {
      throw new Error('Invalid API key format');
    }

    // Generate secure authentication token
    const authToken = await encryptionService.generateRobotAuthToken(robot.id, 'current_user');
    
    // Simulate API key authentication
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (Math.random() > 0.05) { // 95% success rate
      console.log('API key authentication successful');
    } else {
      throw new Error('API key authentication failed - invalid key');
    }
  }

  private async authenticateWithCredentials(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<void> {
    console.log(`Authenticating ${robot.name} with credentials`);
    
    // Encrypt credentials for transmission
    const encryptedCreds = await encryptionService.encryptCredentials({
      username: config.authentication.username!,
      password: config.authentication.password!
    });

    // Simulate credential authentication
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (Math.random() > 0.1) { // 90% success rate
      console.log('Credential authentication successful');
    } else {
      throw new Error('Credential authentication failed - invalid username/password');
    }
  }

  private async initializeSecureSession(
    robot: SecureRobotConnection,
    config: SecureRobotConnectionConfig
  ): Promise<void> {
    // Initialize robot state monitoring with security
    console.log('Initializing secure session monitoring');
    
    // Set session timeout
    setTimeout(() => {
      if (robot.sessionId && this.connections.get(robot.id)?.sessionId === robot.sessionId) {
        this.terminateSession(robot.id, 'session_timeout');
      }
    }, config.security.sessionTimeout || 3600000); // Default 1 hour

    console.log(`Secure session initialized for ${robot.name}`);
  }

  /**
   * Execute a command with full security validation
   */
  public async executeSecureCommand(action: LerobotAction): Promise<{
    success: boolean;
    commandId?: string;
    error?: string;
  }> {
    if (!this.activeConnection) {
      return { success: false, error: 'No robot connected' };
    }

    try {
      // Validate action
      const validation = validationService.validate(action, {
        action_type: { required: true },
        confidence: { 
          required: true,
          custom: (value: number) => value >= 0 && value <= 1
        }
      });

      if (!validation.isValid) {
        await auditService.logEvent({
          action: 'command_validation_failed',
          userId: 'current_user',
          metadata: { errors: validation.errors },
          severity: 'medium'
        });
        return { success: false, error: 'Invalid action parameters' };
      }

      // Convert to secure command
      const secureCommand = await this.createSecureCommand(action);
      
      // Add to secure queue
      const result = await this.executeSecureCommandInternal(secureCommand);
      
      await auditService.logEvent({
        action: 'robot_command_executed',
        userId: 'current_user',
        metadata: {
          robotId: this.activeConnection.id,
          commandType: action.action_type,
          commandId: secureCommand.id
        }
      });

      return result;

    } catch (error) {
      await auditService.logEvent({
        action: 'robot_command_error',
        userId: 'current_user',
        metadata: { error: String(error) },
        severity: 'high'
      });
      return { success: false, error: String(error) };
    }
  }

  private async createSecureCommand(action: LerobotAction): Promise<SecureRobotCommand> {
    if (!this.activeConnection) {
      throw new Error('No active connection');
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nonce = CryptoJS.lib.WordArray.random(128/8).toString();
    
    // Create base command
    const baseCommand: RobotCommand = {
      id: commandId,
      type: this.mapActionToCommandType(action.action_type),
      parameters: {
        action_type: action.action_type,
        joint_positions: action.joint_positions,
        joint_velocities: action.joint_velocities,
        gripper_position: action.gripper_position,
        confidence: action.confidence,
      },
      priority: action.confidence > 0.8 ? 'high' : 'medium',
      timestamp: Date.now(),
      estimatedDuration: this.estimateCommandDuration(action),
    };

    // Create secure payload
    let encryptedPayload: string | undefined;
    if (this.activeConnection.encryptionKey) {
      const payload = JSON.stringify(baseCommand.parameters);
      const encrypted = await encryptionService.encryptData(payload, this.activeConnection.encryptionKey);
      encryptedPayload = JSON.stringify(encrypted);
    }

    // Generate signature
    const signatureData = `${commandId}:${nonce}:${baseCommand.timestamp}:${this.activeConnection.sessionId}`;
    const signature = encryptionService.generateHMAC(signatureData);

    return {
      ...baseCommand,
      sessionId: this.activeConnection.sessionId,
      signature,
      nonce,
      encryptedPayload,
    };
  }

  private mapActionToCommandType(actionType: string): any {
    const commandMap: Record<string, string> = {
      pick: 'grasp_object',
      place: 'release_object',
      move: 'move_to_position',
      rotate: 'rotate_joint',
      open: 'open_gripper',
      close: 'close_gripper',
      custom: 'custom_action',
    };
    return commandMap[actionType] || 'custom_action';
  }

  private estimateCommandDuration(action: LerobotAction): number {
    const baseDurations = {
      pick: 3000,
      place: 2000,
      move: 1500,
      rotate: 1000,
      open: 500,
      close: 500,
      custom: 2000,
    };
    return baseDurations[action.action_type as keyof typeof baseDurations] || 2000;
  }

  private async executeSecureCommandInternal(command: SecureRobotCommand): Promise<{
    success: boolean;
    commandId?: string;
    error?: string;
  }> {
    // Verify command signature
    const signatureData = `${command.id}:${command.nonce}:${command.timestamp}:${command.sessionId}`;
    if (!encryptionService.verifyHMAC(signatureData, command.signature)) {
      return { success: false, error: 'Command signature verification failed' };
    }

    // Add to queue
    this.commandQueue.push(command);
    
    // Limit queue size
    const maxQueueSize = this.ROBOT_CONFIGS[this.activeConnection!.type].maxCommandQueueSize;
    if (this.commandQueue.length > maxQueueSize) {
      this.commandQueue.shift();
    }

    console.log(`Secure command queued: ${command.type}`);
    return { success: true, commandId: command.id };
  }

  private async processSecureCommand(command: SecureRobotCommand): Promise<void> {
    if (!this.activeConnection) return;

    try {
      console.log(`Executing secure command: ${command.type}`);
      this.activeConnection.currentTask = command.id;

      // Decrypt payload if encrypted
      let parameters = command.parameters;
      if (command.encryptedPayload && this.activeConnection.encryptionKey) {
        const encryptedData = JSON.parse(command.encryptedPayload);
        const decrypted = await encryptionService.decryptData(encryptedData, this.activeConnection.encryptionKey);
        parameters = JSON.parse(decrypted);
      }

      // Simulate secure command execution
      await this.simulateSecureCommandExecution(command, parameters);

      console.log(`Secure command completed: ${command.type}`);
      this.activeConnection.currentTask = undefined;

      await auditService.logEvent({
        action: 'robot_command_completed',
        userId: 'current_user',
        metadata: {
          robotId: this.activeConnection.id,
          commandId: command.id,
          commandType: command.type
        }
      });

    } catch (error) {
      console.error(`Secure command failed: ${command.type}`, error);
      this.activeConnection.currentTask = undefined;
      
      await auditService.logEvent({
        action: 'robot_command_failed',
        userId: 'current_user',
        metadata: {
          robotId: this.activeConnection.id,
          commandId: command.id,
          error: String(error)
        },
        severity: 'high'
      });
    }
  }

  private async simulateSecureCommandExecution(command: SecureRobotCommand, parameters: any): Promise<void> {
    const duration = command.estimatedDuration || 2000;
    const steps = 10;
    const stepDuration = duration / steps;

    for (let i = 0; i < steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      
      if (this.activeConnection) {
        this.updateSecureRobotState(command, i / steps);
      }
    }
  }

  private updateSecureRobotState(command: SecureRobotCommand, progress: number): void {
    if (!this.activeConnection) return;

    // Create secure state update with integrity check
    const mockState: RobotState = {
      position: { x: Math.random(), y: Math.random(), z: Math.random() },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      joint_positions: Array(this.ROBOT_CONFIGS[this.activeConnection.type].jointCount).fill(0).map(() => Math.random() * 2 - 1),
      joint_velocities: Array(this.ROBOT_CONFIGS[this.activeConnection.type].jointCount).fill(0).map(() => Math.random() * 0.1),
      battery_level: this.activeConnection.batteryLevel || 100,
      error_state: false,
      current_task: command.id,
      connection_quality: 0.95,
      timestamp: Date.now(),
      gripperState: command.type === 'grasp_object' ? 'grasping' : 'open',
    };

    console.log(`Secure robot state updated: ${Math.round(progress * 100)}% complete`);
  }

  private startSecureHeartbeat(robot: SecureRobotConnection): void {
    const interval = this.ROBOT_CONFIGS[robot.type].heartbeatInterval;
    
    this.heartbeatInterval = setInterval(async () => {
      await this.sendSecureHeartbeat(robot);
    }, interval);
  }

  private async sendSecureHeartbeat(robot: SecureRobotConnection): Promise<void> {
    try {
      // Generate secure heartbeat with timestamp and signature
      const heartbeatData = {
        robotId: robot.id,
        sessionId: robot.sessionId,
        timestamp: Date.now(),
        batteryLevel: robot.batteryLevel,
        status: robot.status
      };

      const signature = encryptionService.generateHMAC(JSON.stringify(heartbeatData));
      
      robot.lastHeartbeat = Date.now();
      
      // Simulate battery drain
      if (robot.batteryLevel !== undefined) {
        robot.batteryLevel = Math.max(0, robot.batteryLevel - 0.01);
      }

      // Check for security issues
      if (Math.random() > 0.999) { // 0.1% chance of security alert
        await auditService.logEvent({
          action: 'robot_security_alert',
          userId: 'current_user',
          metadata: {
            robotId: robot.id,
            alertType: 'suspicious_activity',
            timestamp: Date.now()
          },
          severity: 'high'
        });
      }

    } catch (error) {
      robot.status = 'error';
      console.error(`Secure heartbeat failed for ${robot.name}:`, error);
      
      await auditService.logEvent({
        action: 'robot_heartbeat_failed',
        userId: 'current_user',
        metadata: { robotId: robot.id, error: String(error) },
        severity: 'medium'
      });
    }
  }

  private async startCommandProcessor(): Promise<void> {
    if (this.isExecutingCommands) return;

    this.isExecutingCommands = true;

    while (this.isExecutingCommands) {
      if (this.commandQueue.length > 0 && this.activeConnection?.status === 'connected') {
        const command = this.commandQueue.shift()!;
        await this.processSecureCommand(command);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private startSecurityMonitoring(): void {
    setInterval(async () => {
      for (const [robotId, robot] of this.connections) {
        // Check session expiry
        if (robot.status === 'connected' && robot.lastAuthentication) {
          const sessionAge = Date.now() - robot.lastAuthentication;
          const maxSessionAge = 3600000; // 1 hour
          
          if (sessionAge > maxSessionAge) {
            await this.terminateSession(robotId, 'session_expired');
          }
        }

        // Check heartbeat timeout
        if (robot.status === 'connected' && robot.lastHeartbeat) {
          const heartbeatAge = Date.now() - robot.lastHeartbeat;
          const maxHeartbeatAge = this.ROBOT_CONFIGS[robot.type].heartbeatInterval * 3;
          
          if (heartbeatAge > maxHeartbeatAge) {
            await this.terminateSession(robotId, 'heartbeat_timeout');
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async terminateSession(robotId: string, reason: string): Promise<void> {
    const robot = this.connections.get(robotId);
    if (!robot) return;

    robot.status = 'disconnected';
    robot.sessionId = '';
    robot.encryptionKey = '';
    
    if (this.activeConnection?.id === robotId) {
      this.activeConnection = null;
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }

    // Clear session key
    if (robot.sessionId) {
      this.sessionKeys.delete(robot.sessionId);
    }

    await auditService.logEvent({
      action: 'robot_session_terminated',
      userId: 'current_user',
      metadata: { robotId, reason },
      severity: reason === 'session_expired' ? 'medium' : 'high'
    });

    console.log(`Session terminated for ${robot.name}: ${reason}`);
  }

  public async emergencyStop(): Promise<void> {
    if (!this.activeConnection) return;

    // Clear all commands
    this.commandQueue = [];

    // Send emergency stop with highest priority
    const emergencyCommand: SecureRobotCommand = {
      id: 'emergency_stop_' + Date.now(),
      type: 'stop',
      parameters: { immediate: true },
      priority: 'emergency',
      timestamp: Date.now(),
      sessionId: this.activeConnection.sessionId,
      signature: encryptionService.generateHMAC(`emergency_stop_${Date.now()}`),
      nonce: CryptoJS.lib.WordArray.random(128/8).toString(),
    };

    await this.processSecureCommand(emergencyCommand);
    
    await auditService.logEvent({
      action: 'robot_emergency_stop',
      userId: 'current_user',
      metadata: { robotId: this.activeConnection.id },
      severity: 'critical'
    });

    console.log('Emergency stop executed');
  }

  public getSecureConnections(): SecureRobotConnection[] {
    return Array.from(this.connections.values());
  }

  public getActiveSecureConnection(): SecureRobotConnection | null {
    return this.activeConnection;
  }

  public async shutdown(): Promise<void> {
    this.isExecutingCommands = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Terminate all sessions
    for (const robotId of this.connections.keys()) {
      await this.terminateSession(robotId, 'service_shutdown');
    }

    // Clear all session keys
    this.sessionKeys.clear();

    await auditService.logEvent({
      action: 'robot_service_shutdown',
      userId: 'current_user',
      metadata: { timestamp: Date.now() }
    });

    console.log('Secure robot service shutdown');
  }
}

export const secureRobotService = new SecureRobotService();