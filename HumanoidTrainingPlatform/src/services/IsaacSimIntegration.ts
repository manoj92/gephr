import { apiService } from './ApiService';
import { RobotState, RobotCommand, LerobotAction } from '../types';

interface IsaacSimConfig {
  serverUrl: string;
  apiKey?: string;
  environment: 'warehouse' | 'office' | 'home' | 'outdoor' | 'custom';
  physicsRate: number;
  renderRate: number;
  enableGPU: boolean;
}

interface SimulationState {
  isRunning: boolean;
  currentTime: number;
  robotStates: Map<string, RobotState>;
  environmentState: any;
  physicsMetrics: {
    fps: number;
    stepTime: number;
    collisions: number;
  };
}

interface SimulationResult {
  success: boolean;
  metrics: {
    successRate: number;
    avgCompletionTime: number;
    collisionCount: number;
    energyEfficiency: number;
  };
  trajectory: Array<{
    timestamp: number;
    robotState: RobotState;
    action: LerobotAction;
  }>;
}

export class IsaacSimIntegrationService {
  private config: IsaacSimConfig;
  private ws: WebSocket | null = null;
  private simulationState: SimulationState;
  private isConnected = false;
  private commandQueue: RobotCommand[] = [];
  
  constructor(config?: Partial<IsaacSimConfig>) {
    this.config = {
      serverUrl: process.env.ISAAC_SIM_URL || 'ws://localhost:8080',
      environment: 'warehouse',
      physicsRate: 60,
      renderRate: 30,
      enableGPU: true,
      ...config
    };
    
    this.simulationState = {
      isRunning: false,
      currentTime: 0,
      robotStates: new Map(),
      environmentState: null,
      physicsMetrics: {
        fps: 0,
        stepTime: 0,
        collisions: 0
      }
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);
        
        this.ws.onopen = () => {
          this.isConnected = true;
          this.sendConfig();
          console.log('Connected to NVIDIA Isaac Sim');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onerror = (error) => {
          console.error('Isaac Sim connection error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('Disconnected from Isaac Sim');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private sendConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.ws.send(JSON.stringify({
      type: 'config',
      data: {
        environment: this.config.environment,
        physicsRate: this.config.physicsRate,
        renderRate: this.config.renderRate,
        enableGPU: this.config.enableGPU
      }
    }));
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'state_update':
        this.updateSimulationState(message.data);
        break;
      case 'robot_state':
        this.updateRobotState(message.data);
        break;
      case 'physics_metrics':
        this.simulationState.physicsMetrics = message.data;
        break;
      case 'collision':
        this.handleCollision(message.data);
        break;
      case 'simulation_complete':
        this.handleSimulationComplete(message.data);
        break;
    }
  }

  private updateSimulationState(data: any): void {
    this.simulationState.isRunning = data.isRunning;
    this.simulationState.currentTime = data.currentTime;
    this.simulationState.environmentState = data.environment;
  }

  private updateRobotState(data: any): void {
    const robotState: RobotState = {
      id: data.robotId,
      position: data.position,
      orientation: data.orientation,
      jointStates: data.jointStates,
      sensors: data.sensors,
      battery: data.battery,
      status: data.status,
      timestamp: new Date(data.timestamp)
    };
    
    this.simulationState.robotStates.set(data.robotId, robotState);
  }

  private handleCollision(data: any): void {
    console.warn('Collision detected:', data);
    this.simulationState.physicsMetrics.collisions++;
  }

  private handleSimulationComplete(data: any): void {
    console.log('Simulation completed:', data);
  }

  async loadEnvironment(environmentName: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Isaac Sim');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Environment load timeout'));
      }, 30000);
      
      const handleLoad = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'environment_loaded') {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handleLoad);
          resolve();
        }
      };
      
      this.ws?.addEventListener('message', handleLoad);
      
      this.ws?.send(JSON.stringify({
        type: 'load_environment',
        data: { name: environmentName }
      }));
    });
  }

  async spawnRobot(robotType: string, position?: [number, number, number]): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Not connected to Isaac Sim');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Robot spawn timeout'));
      }, 10000);
      
      const handleSpawn = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'robot_spawned') {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handleSpawn);
          resolve(message.data.robotId);
        }
      };
      
      this.ws?.addEventListener('message', handleSpawn);
      
      this.ws?.send(JSON.stringify({
        type: 'spawn_robot',
        data: {
          type: robotType,
          position: position || [0, 0, 0]
        }
      }));
    });
  }

  async runSimulation(
    actions: LerobotAction[],
    duration: number
  ): Promise<SimulationResult> {
    if (!this.isConnected) {
      throw new Error('Not connected to Isaac Sim');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Simulation timeout'));
      }, duration * 1000 + 60000); // Add 60s buffer
      
      const trajectory: any[] = [];
      
      const handleUpdate = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'state_update') {
          trajectory.push({
            timestamp: message.data.currentTime,
            robotState: message.data.robotState,
            action: message.data.lastAction
          });
        } else if (message.type === 'simulation_complete') {
          clearTimeout(timeout);
          this.ws?.removeEventListener('message', handleUpdate);
          
          resolve({
            success: message.data.success,
            metrics: message.data.metrics,
            trajectory
          });
        }
      };
      
      this.ws?.addEventListener('message', handleUpdate);
      
      // Start simulation
      this.ws?.send(JSON.stringify({
        type: 'start_simulation',
        data: {
          actions,
          duration,
          recordTrajectory: true
        }
      }));
    });
  }

  async validateTrajectory(
    trajectory: Array<{ position: [number, number, number]; orientation: [number, number, number, number] }>
  ): Promise<{ valid: boolean; issues: string[] }> {
    if (!this.isConnected) {
      throw new Error('Not connected to Isaac Sim');
    }
    
    return new Promise((resolve) => {
      const handleValidation = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'trajectory_validation') {
          this.ws?.removeEventListener('message', handleValidation);
          resolve(message.data);
        }
      };
      
      this.ws?.addEventListener('message', handleValidation);
      
      this.ws?.send(JSON.stringify({
        type: 'validate_trajectory',
        data: { trajectory }
      }));
    });
  }

  async testSkill(
    skillName: string,
    robotId: string,
    parameters: any
  ): Promise<SimulationResult> {
    // Test a specific skill in simulation
    const testActions: LerobotAction[] = [
      {
        action_type: skillName,
        timestamp: new Date().toISOString(),
        hand_pose: parameters.handPose || {},
        robot_state: parameters.robotState || {}
      }
    ];
    
    return this.runSimulation(testActions, 30); // 30 second test
  }

  async exportSimulationData(format: 'json' | 'csv' | 'rosbag'): Promise<Blob> {
    if (!this.isConnected) {
      throw new Error('Not connected to Isaac Sim');
    }
    
    return new Promise((resolve, reject) => {
      const handleExport = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'export_complete') {
          this.ws?.removeEventListener('message', handleExport);
          
          // Convert base64 to blob
          const byteCharacters = atob(message.data.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: message.data.mimeType });
          
          resolve(blob);
        }
      };
      
      this.ws?.addEventListener('message', handleExport);
      
      this.ws?.send(JSON.stringify({
        type: 'export_data',
        data: { format }
      }));
    });
  }

  async benchmarkModel(
    modelPath: string,
    testScenarios: string[]
  ): Promise<{
    avgSuccessRate: number;
    avgCompletionTime: number;
    perScenarioMetrics: Map<string, any>;
  }> {
    const results = new Map<string, any>();
    let totalSuccessRate = 0;
    let totalCompletionTime = 0;
    
    for (const scenario of testScenarios) {
      await this.loadEnvironment(scenario);
      const robotId = await this.spawnRobot('unitree_g1');
      
      // Load and run model
      const result = await this.runSimulation([], 60); // 60 second test
      
      results.set(scenario, result.metrics);
      totalSuccessRate += result.metrics.successRate;
      totalCompletionTime += result.metrics.avgCompletionTime;
    }
    
    return {
      avgSuccessRate: totalSuccessRate / testScenarios.length,
      avgCompletionTime: totalCompletionTime / testScenarios.length,
      perScenarioMetrics: results
    };
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getSimulationState(): SimulationState {
    return { ...this.simulationState };
  }

  isSimulationRunning(): boolean {
    return this.simulationState.isRunning;
  }
}

// Singleton instance
export const isaacSimIntegration = new IsaacSimIntegrationService();
export default isaacSimIntegration;