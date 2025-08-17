import asyncio
import json
import random
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from app.models.robot import RobotConnection, RobotCommand, Robot
from app.core.websocket import websocket_manager
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)


class RobotService:
    def __init__(self):
        self.active_connections: Dict[str, Dict] = {}
        self.command_queue: Dict[str, list] = {}
        
        # Supported robot configurations
        self.supported_robots = {
            "unitree_g1": {
                "name": "Unitree G1",
                "manufacturer": "Unitree",
                "joint_count": 23,
                "max_payload": 2.0,  # kg
                "battery_capacity": 90,  # Wh
                "capabilities": ["bipedal_walking", "manipulation", "vision", "balance", "navigation"],
                "default_port": 8080,
                "control_frequency": 500,  # Hz
                "communication_protocol": "unitree_sdk"
            },
            "custom_humanoid": {
                "name": "Custom Humanoid",
                "manufacturer": "Custom",
                "joint_count": 25,
                "max_payload": 3.0,  # kg
                "battery_capacity": 120,  # Wh
                "capabilities": ["bipedal_walking", "manipulation", "vision", "balance", "navigation", "speech"],
                "default_port": 9090,
                "control_frequency": 1000,  # Hz
                "communication_protocol": "custom_api"
            }
        }
    
    def get_supported_robots(self) -> Dict[str, Any]:
        """Get list of supported robot types"""
        return {
            "supported_robots": self.supported_robots,
            "total_count": len(self.supported_robots)
        }
    
    def get_robot_config(self, robot_type: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific robot type"""
        return self.supported_robots.get(robot_type)
    
    def validate_robot_type(self, robot_type: str) -> bool:
        """Validate if robot type is supported"""
        return robot_type in self.supported_robots
        
    async def connect_robot(self, connection: RobotConnection, robot_type: str = "unitree_g1") -> Optional[Dict[str, Any]]:
        """
        Connect to a robot. In production, this would establish actual network connections.
        For now, we simulate the connection process with robot-specific configurations.
        """
        try:
            # Validate robot type
            if not self.validate_robot_type(robot_type):
                raise Exception(f"Unsupported robot type: {robot_type}")
            
            robot_config = self.get_robot_config(robot_type)
            
            # Simulate connection process
            await asyncio.sleep(0.5)  # Simulate connection delay
            
            # Mock connection result based on robot type
            if connection.robot_id not in self.active_connections:
                # Simulate connection success/failure (higher success rate for supported robots)
                success_rate = 0.95 if robot_type == "unitree_g1" else 0.85
                
                if random.random() < success_rate:
                    connection_info = {
                        "robot_id": connection.robot_id,
                        "connection_id": connection.id,
                        "robot_type": robot_type,
                        "robot_config": robot_config,
                        "status": "connected",
                        "quality": random.uniform(0.8, 1.0),
                        "latency": random.uniform(5, 25) if robot_type == "unitree_g1" else random.uniform(10, 50),
                        "capabilities": robot_config["capabilities"],
                        "joint_count": robot_config["joint_count"],
                        "battery_level": random.uniform(0.4, 1.0),
                        "control_frequency": robot_config["control_frequency"],
                        "communication_protocol": robot_config["communication_protocol"]
                    }
                    
                    self.active_connections[connection.robot_id] = connection_info
                    self.command_queue[connection.robot_id] = []
                    
                    # Start heartbeat task
                    asyncio.create_task(self._heartbeat_task(connection))
                    
                    # Send connection notification
                    await notification_service.send_robot_status_notification(
                        user_id=connection.user_id,
                        robot_name=robot_config["name"],
                        status="connected",
                        details={"robot_type": robot_type, "battery_level": connection_info["battery_level"]}
                    )
                    
                    logger.info(f"Robot {connection.robot_id} ({robot_type}) connected successfully")
                    return connection_info
                else:
                    raise Exception(f"Robot connection timeout for {robot_type}")
            else:
                raise Exception("Robot already connected")
                
        except Exception as e:
            logger.error(f"Robot connection failed: {str(e)}")
            
            # Send error notification
            await notification_service.send_robot_status_notification(
                user_id=connection.user_id,
                robot_name=f"Robot {connection.robot_id}",
                status="error",
                details={"error": str(e)}
            )
            
            return None

    async def disconnect_robot(self, connection: RobotConnection):
        """Disconnect from robot"""
        if connection.robot_id in self.active_connections:
            del self.active_connections[connection.robot_id]
            
        if connection.robot_id in self.command_queue:
            del self.command_queue[connection.robot_id]

    async def send_command(self, command: RobotCommand):
        """Send command to robot"""
        if command.robot_id not in self.active_connections:
            raise Exception("Robot not connected")
        
        # Add to command queue
        if command.robot_id not in self.command_queue:
            self.command_queue[command.robot_id] = []
        
        self.command_queue[command.robot_id].append({
            "command": command,
            "queued_at": datetime.utcnow()
        })
        
        # Process command asynchronously
        asyncio.create_task(self._process_command(command))

    async def _process_command(self, command: RobotCommand):
        """Process robot command (mock implementation)"""
        try:
            # Simulate command processing time
            processing_time = random.uniform(0.5, 3.0)
            await asyncio.sleep(processing_time)
            
            # Simulate command success/failure
            success_rate = 0.9
            if command.priority == "emergency":
                success_rate = 0.95
            elif command.priority == "low":
                success_rate = 0.8
            
            if random.random() < success_rate:
                # Command successful
                command.status = "completed"
                command.completed_at = datetime.utcnow()
                command.progress = 1.0
                
                # Generate mock result based on command type
                if command.command_type == "move":
                    command.result_data = {
                        "final_position": {
                            "x": command.parameters.get("position", {}).get("x", 0),
                            "y": command.parameters.get("position", {}).get("y", 0),
                            "z": command.parameters.get("position", {}).get("z", 0)
                        },
                        "execution_time": processing_time
                    }
                elif command.command_type == "pick":
                    command.result_data = {
                        "object_grasped": True,
                        "grasp_force": random.uniform(0.1, 0.8),
                        "execution_time": processing_time
                    }
                elif command.command_type == "place":
                    command.result_data = {
                        "object_placed": True,
                        "placement_accuracy": random.uniform(0.8, 1.0),
                        "execution_time": processing_time
                    }
                
                # Notify via websocket
                await websocket_manager.broadcast({
                    "type": "command_completed",
                    "command_id": command.id,
                    "robot_id": command.robot_id,
                    "result": command.result_data
                })
                
            else:
                # Command failed
                command.status = "failed"
                command.completed_at = datetime.utcnow()
                command.error_message = "Command execution failed"
                
                # Notify via websocket
                await websocket_manager.broadcast({
                    "type": "command_failed", 
                    "command_id": command.id,
                    "robot_id": command.robot_id,
                    "error": command.error_message
                })
                
        except Exception as e:
            command.status = "failed"
            command.error_message = str(e)
            command.completed_at = datetime.utcnow()

    async def get_robot_state(self, connection: RobotConnection) -> Dict[str, Any]:
        """Get current robot state with robot-specific configurations"""
        if connection.robot_id not in self.active_connections:
            raise Exception("Robot not connected")
        
        conn_info = self.active_connections[connection.robot_id]
        robot_type = conn_info.get("robot_type", "unitree_g1")
        robot_config = conn_info.get("robot_config", self.supported_robots["unitree_g1"])
        joint_count = robot_config["joint_count"]
        
        # Generate robot-specific state
        if robot_type == "unitree_g1":
            # Unitree G1 specific state
            state = {
                "position": {
                    "x": random.uniform(-0.5, 0.5),
                    "y": random.uniform(-0.5, 0.5), 
                    "z": random.uniform(0.8, 1.2)  # Standing height
                },
                "rotation": {
                    "x": random.uniform(-0.1, 0.1),
                    "y": random.uniform(-0.1, 0.1),
                    "z": random.uniform(-3.14, 3.14),
                    "w": random.uniform(0.9, 1.0)
                },
                "joint_positions": [random.uniform(-1.57, 1.57) for _ in range(joint_count)],
                "joint_velocities": [random.uniform(-0.3, 0.3) for _ in range(joint_count)],
                "joint_torques": [random.uniform(-10, 10) for _ in range(joint_count)],
                "battery_level": random.uniform(0.3, 1.0),
                "battery_voltage": random.uniform(20.0, 25.2),  # V
                "motor_temperatures": [random.uniform(25, 55) for _ in range(joint_count)],  # Celsius
                "imu_data": {
                    "acceleration": [random.uniform(-1, 1) for _ in range(3)],
                    "gyroscope": [random.uniform(-0.5, 0.5) for _ in range(3)],
                    "orientation": [random.uniform(-0.1, 0.1) for _ in range(4)]
                },
                "foot_contact": [random.choice([True, False]) for _ in range(2)],
                "walking_state": random.choice(["standing", "walking", "running", "balancing"]),
                "error_state": False,
                "current_task": None,
                "connection_quality": random.uniform(0.8, 1.0),
                "control_mode": random.choice(["position", "velocity", "torque", "hybrid"]),
                "timestamp": datetime.utcnow()
            }
        else:  # custom_humanoid
            # Custom humanoid state with additional features
            state = {
                "position": {
                    "x": random.uniform(-1, 1),
                    "y": random.uniform(-1, 1), 
                    "z": random.uniform(0.7, 1.5)
                },
                "rotation": {
                    "x": random.uniform(-0.2, 0.2),
                    "y": random.uniform(-0.2, 0.2),
                    "z": random.uniform(-3.14, 3.14),
                    "w": random.uniform(0.8, 1.0)
                },
                "joint_positions": [random.uniform(-2.0, 2.0) for _ in range(joint_count)],
                "joint_velocities": [random.uniform(-0.5, 0.5) for _ in range(joint_count)],
                "joint_torques": [random.uniform(-15, 15) for _ in range(joint_count)],
                "battery_level": random.uniform(0.3, 1.0),
                "battery_voltage": random.uniform(22.0, 29.4),  # V
                "motor_temperatures": [random.uniform(20, 60) for _ in range(joint_count)],
                "imu_data": {
                    "acceleration": [random.uniform(-2, 2) for _ in range(3)],
                    "gyroscope": [random.uniform(-1, 1) for _ in range(3)],
                    "orientation": [random.uniform(-0.2, 0.2) for _ in range(4)]
                },
                "foot_contact": [random.choice([True, False]) for _ in range(2)],
                "hand_force": [random.uniform(0, 50) for _ in range(2)],  # N
                "walking_state": random.choice(["standing", "walking", "running", "balancing", "dancing"]),
                "speech_active": random.choice([True, False]),
                "vision_active": random.choice([True, False]),
                "error_state": False,
                "current_task": None,
                "connection_quality": random.uniform(0.8, 1.0),
                "control_mode": random.choice(["position", "velocity", "torque", "hybrid", "compliance"]),
                "timestamp": datetime.utcnow()
            }
        
        return state

    async def _heartbeat_task(self, connection: RobotConnection):
        """Maintain connection heartbeat"""
        while connection.robot_id in self.active_connections:
            try:
                await asyncio.sleep(5)  # Heartbeat every 5 seconds
                
                # Update connection info
                if connection.robot_id in self.active_connections:
                    conn_info = self.active_connections[connection.robot_id]
                    conn_info["last_heartbeat"] = datetime.utcnow()
                    conn_info["battery_level"] = max(0, conn_info["battery_level"] - 0.001)  # Simulate battery drain
                    
                    # Send heartbeat via websocket
                    await websocket_manager.broadcast_robot_status(
                        connection.robot_id,
                        {
                            "status": "connected",
                            "battery_level": conn_info["battery_level"],
                            "connection_quality": conn_info["quality"],
                            "last_heartbeat": conn_info["last_heartbeat"].isoformat()
                        }
                    )
                    
            except Exception as e:
                print(f"Heartbeat error for robot {connection.robot_id}: {str(e)}")
                break

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "active_connections": len(self.active_connections),
            "total_queued_commands": sum(len(queue) for queue in self.command_queue.values()),
            "robots": {
                robot_id: {
                    "status": info["status"],
                    "quality": info["quality"],
                    "battery_level": info["battery_level"],
                    "queued_commands": len(self.command_queue.get(robot_id, []))
                }
                for robot_id, info in self.active_connections.items()
            }
        }

    async def emergency_stop_all(self):
        """Emergency stop for all connected robots"""
        for robot_id in self.active_connections.keys():
            # Clear command queue
            if robot_id in self.command_queue:
                self.command_queue[robot_id].clear()
            
            # Send stop command
            await websocket_manager.broadcast({
                "type": "emergency_stop",
                "robot_id": robot_id,
                "timestamp": datetime.utcnow().isoformat()
            })