import { RobotService } from '../../src/services/RobotService';
import NetInfo from '@react-native-community/netinfo';
import { RobotConnection, RobotCommand } from '../../src/types';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('@react-native-async-storage/async-storage');

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
})) as any;

describe('RobotService', () => {
  let robotService: RobotService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    robotService = new RobotService();
    
    // Mock network as connected by default
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      type: 'wifi',
    });
  });

  afterEach(() => {
    robotService.dispose();
  });

  describe('Robot Discovery', () => {
    it('should discover robots on the network', async () => {
      // Mock successful network scan
      const mockRobots = await robotService.scanForRobots('192.168.1');
      
      expect(Array.isArray(mockRobots)).toBe(true);
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should throw error when network is not connected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
        isConnected: false,
        type: 'none',
      });

      await expect(robotService.scanForRobots()).rejects.toThrow('Network connection required');
    });

    it('should handle discovery errors gracefully', async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(robotService.scanForRobots()).rejects.toThrow('Network error');
    });

    it('should not start discovery if already in progress', async () => {
      const promise1 = robotService.scanForRobots();
      
      await expect(robotService.scanForRobots()).rejects.toThrow('Discovery already in progress');
      
      await promise1; // Clean up
    });
  });

  describe('Robot Connection', () => {
    let mockRobot: RobotConnection;

    beforeEach(() => {
      mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1',
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90,
      };
    });

    it('should connect to a robot successfully', async () => {
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      // Mock successful WebSocket connection
      (global.WebSocket as jest.Mock).mockImplementationOnce(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 100);
        return ws;
      });

      const connectedRobot = await robotService.connectToRobot(mockRobot);

      expect(connectedRobot.isConnected).toBe(true);
      expect(connectedRobot.id).toBe(mockRobot.id);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('handshake')
      );
    });

    it('should handle connection timeout', async () => {
      const mockWebSocket = {
        readyState: 0,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      // Mock WebSocket that never opens
      (global.WebSocket as jest.Mock).mockImplementationOnce(() => mockWebSocket);

      await expect(robotService.connectToRobot(mockRobot)).rejects.toThrow('Connection timeout');
    });

    it('should retry connection on failure', async () => {
      let attemptCount = 0;
      
      (global.WebSocket as jest.Mock).mockImplementation(() => {
        attemptCount++;
        const ws = {
          readyState: 0,
          send: jest.fn(),
          close: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          onopen: jest.fn(),
          onclose: jest.fn(),
          onmessage: jest.fn(),
          onerror: jest.fn(),
        };

        if (attemptCount < 3) {
          setTimeout(() => ws.onerror?.(new Error('Connection failed')), 50);
        } else {
          setTimeout(() => ws.onopen?.(), 50);
        }

        return ws;
      });

      const connectedRobot = await robotService.connectToRobot(mockRobot);
      
      expect(connectedRobot.isConnected).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should prevent duplicate connections', async () => {
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      // Connect first time
      await robotService.connectToRobot(mockRobot);
      
      // Try to connect again
      await expect(robotService.connectToRobot(mockRobot)).rejects.toThrow('Already connected');
    });
  });

  describe('Robot Commands', () => {
    let mockRobot: RobotConnection;
    let mockCommand: RobotCommand;

    beforeEach(async () => {
      mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1',
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90,
      };

      mockCommand = {
        id: 'cmd-1',
        type: 'move',
        parameters: { position: [1, 0, 0] },
        timestamp: Date.now(),
        priority: 'normal',
      };

      // Mock successful connection
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      await robotService.connectToRobot(mockRobot);
    });

    it('should send command to connected robot', async () => {
      await robotService.sendCommand(mockRobot.id, mockCommand);
      
      const commandQueue = robotService.getCommandQueue(mockRobot.id);
      expect(commandQueue).toContainEqual(expect.objectContaining({
        id: mockCommand.id,
        type: mockCommand.type,
      }));
    });

    it('should throw error when sending command to disconnected robot', async () => {
      await expect(robotService.sendCommand('nonexistent-robot', mockCommand))
        .rejects.toThrow('Robot nonexistent-robot is not connected');
    });

    it('should handle emergency stop for all robots', async () => {
      await robotService.emergencyStop();
      
      const commandQueue = robotService.getCommandQueue(mockRobot.id);
      expect(commandQueue).toContainEqual(expect.objectContaining({
        type: 'emergency_stop',
        priority: 'emergency',
      }));
    });

    it('should clear command queue', () => {
      robotService.clearCommandQueue(mockRobot.id);
      
      const commandQueue = robotService.getCommandQueue(mockRobot.id);
      expect(commandQueue).toHaveLength(0);
    });
  });

  describe('LeRobot Action Conversion', () => {
    it('should convert LeRobot action to robot command', () => {
      const lerobotAction = {
        type: 'pick',
        parameters: { position: [0.5, 0.5, 0.5] },
        timestamp: Date.now(),
        confidence: 0.9,
      };

      const command = robotService.convertLeRobotActionToCommand(lerobotAction);

      expect(command).toMatchObject({
        type: 'pick',
        parameters: lerobotAction.parameters,
        timestamp: lerobotAction.timestamp,
        priority: 'high',
      });
      expect(command.id).toBeDefined();
    });

    it('should assign correct priorities to different action types', () => {
      const emergencyAction = {
        type: 'emergency_stop',
        parameters: {},
        timestamp: Date.now(),
        confidence: 1.0,
      };

      const normalAction = {
        type: 'move',
        parameters: { position: [0, 0, 0] },
        timestamp: Date.now(),
        confidence: 0.8,
      };

      const emergencyCommand = robotService.convertLeRobotActionToCommand(emergencyAction);
      const normalCommand = robotService.convertLeRobotActionToCommand(normalAction);

      expect(emergencyCommand.priority).toBe('emergency');
      expect(normalCommand.priority).toBe('normal');
    });
  });

  describe('Robot Management', () => {
    it('should return list of connected robots', async () => {
      const mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1' as const,
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90,
      };

      // Mock connection
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      await robotService.connectToRobot(mockRobot);
      
      const connectedRobots = robotService.getConnectedRobots();
      expect(connectedRobots).toHaveLength(1);
      expect(connectedRobots[0].id).toBe(mockRobot.id);
      expect(connectedRobots[0].isConnected).toBe(true);
    });

    it('should disconnect from robot', async () => {
      const mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1' as const,
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90,
      };

      // Mock connection
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      await robotService.connectToRobot(mockRobot);
      await robotService.disconnectFromRobot(mockRobot.id);
      
      const connectedRobots = robotService.getConnectedRobots();
      expect(connectedRobots).toHaveLength(0);
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should check robot connection status', async () => {
      const mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1' as const,
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90,
      };

      expect(robotService.isRobotConnected(mockRobot.id)).toBe(false);

      // Mock connection
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      await robotService.connectToRobot(mockRobot);
      expect(robotService.isRobotConnected(mockRobot.id)).toBe(true);
    });
  });

  describe('Telemetry and Monitoring', () => {
    let mockRobot: RobotConnection;

    beforeEach(async () => {
      mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1',
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90,
      };

      // Mock connection
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      await robotService.connectToRobot(mockRobot);
    });

    it('should collect robot telemetry', () => {
      // Wait for telemetry collection
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const telemetry = robotService.getRobotTelemetry(mockRobot.id, 1);
          expect(Array.isArray(telemetry)).toBe(true);
          resolve();
        }, 1100); // Wait for at least one telemetry collection cycle
      });
    });

    it('should get robot protocol information', () => {
      const protocol = robotService.getRobotProtocol(mockRobot.id);
      expect(protocol).toBeDefined();
      expect(protocol?.name).toBe('Unitree SDK');
      expect(protocol?.capabilities).toContain('locomotion');
    });
  });

  describe('Event System', () => {
    let mockRobot: RobotConnection;
    let eventCallback: jest.Mock;

    beforeEach(async () => {
      mockRobot = {
        id: 'test-robot-1',
        name: 'Test Robot',
        type: 'unitree_g1',
        ipAddress: '192.168.1.100',
        port: 8080,
        isConnected: false,
        batteryLevel: 85,
        lastSeen: new Date(),
        signalStrength: 90,
      };

      eventCallback = jest.fn();

      // Mock connection
      const mockWebSocket = {
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: jest.fn(),
        onclose: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
      };

      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = mockWebSocket;
        setTimeout(() => ws.onopen?.(), 50);
        return ws;
      });

      await robotService.connectToRobot(mockRobot);
    });

    it('should register and trigger event listeners', () => {
      robotService.addEventListener(mockRobot.id, 'test-event', eventCallback);
      
      // Trigger event manually (simulate robot message)
      (robotService as any).emitEvent(mockRobot.id, 'test-event', { data: 'test' });
      
      expect(eventCallback).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should remove event listeners', () => {
      robotService.addEventListener(mockRobot.id, 'test-event', eventCallback);
      robotService.removeEventListener(mockRobot.id, 'test-event', eventCallback);
      
      (robotService as any).emitEvent(mockRobot.id, 'test-event', { data: 'test' });
      
      expect(eventCallback).not.toHaveBeenCalled();
    });
  });
});