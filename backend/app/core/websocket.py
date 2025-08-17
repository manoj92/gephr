"""
Enhanced real-time WebSocket notification system for the Humanoid Training Platform
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from enum import Enum
import uuid
from dataclasses import dataclass, asdict
import redis.asyncio as redis

from app.core.config import settings
from app.core.exceptions import AuthenticationError

logger = logging.getLogger(__name__)

class MessageType(str, Enum):
    # Robot notifications
    ROBOT_CONNECTED = "robot_connected"
    ROBOT_DISCONNECTED = "robot_disconnected"
    ROBOT_STATE_UPDATE = "robot_state_update"
    ROBOT_COMMAND_RESULT = "robot_command_result"
    ROBOT_ERROR = "robot_error"
    ROBOT_EMERGENCY_STOP = "robot_emergency_stop"
    
    # Training notifications
    TRAINING_STARTED = "training_started"
    TRAINING_PROGRESS = "training_progress"
    TRAINING_COMPLETED = "training_completed"
    TRAINING_FAILED = "training_failed"
    
    # GR00T notifications
    GROOT_TRAINING_STARTED = "groot_training_started"
    GROOT_TRAINING_PROGRESS = "groot_training_progress"
    GROOT_TRAINING_COMPLETED = "groot_training_completed"
    GROOT_SIMULATION_DEPLOYED = "groot_simulation_deployed"
    GROOT_TEST_RESULTS = "groot_test_results"
    
    # Pipeline notifications
    PIPELINE_STARTED = "pipeline_started"
    PIPELINE_STAGE_COMPLETED = "pipeline_stage_completed"
    PIPELINE_COMPLETED = "pipeline_completed"
    PIPELINE_FAILED = "pipeline_failed"
    
    # User notifications
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    DATA_EXPORT_READY = "data_export_ready"
    SYSTEM_MAINTENANCE = "system_maintenance"
    
    # System notifications
    HEARTBEAT = "heartbeat"
    USER_CONNECTED = "user_connected"
    USER_DISCONNECTED = "user_disconnected"

@dataclass
class NotificationMessage:
    """WebSocket notification message structure"""
    message_type: MessageType
    data: Dict[str, Any]
    timestamp: str = None
    message_id: str = None
    user_id: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow().isoformat()
        if self.message_id is None:
            self.message_id = str(uuid.uuid4())

class ConnectionManager:
    """Enhanced WebSocket connection manager with Redis support"""
    
    def __init__(self):
        # Enhanced connection tracking
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}  # user_id -> {connection_id: websocket}
        self.user_connections: Dict[str, List[str]] = {}  # user_id -> connection_ids (legacy support)
        self.robot_connections: Dict[str, str] = {}  # robot_id -> connection_id
        
        # Topic subscriptions: {topic: {user_id}}
        self.subscriptions: Dict[str, Set[str]] = {}
        # User metadata: {user_id: metadata}
        self.user_metadata: Dict[str, Dict[str, Any]] = {}
        # Message queue for offline users
        self.message_queue: Dict[str, List[NotificationMessage]] = {}
        self.redis_client: Optional[redis.Redis] = None
        
    async def initialize(self):
        """Initialize Redis connection for persistence"""
        try:
            if settings.REDIS_URL:
                self.redis_client = redis.from_url(settings.REDIS_URL)
                await self.redis_client.ping()
                logger.info("WebSocket manager initialized with Redis")
        except Exception as e:
            logger.warning(f"Redis not available for WebSocket manager: {e}")

    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str = None, robot_id: str = None):
        """Enhanced connect method with user-centric approach"""
        await websocket.accept()
        
        if connection_id is None:
            connection_id = str(uuid.uuid4())
        
        # Store connection with enhanced structure
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        
        self.active_connections[user_id][connection_id] = websocket
        
        # Legacy support
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        if connection_id not in self.user_connections[user_id]:
            self.user_connections[user_id].append(connection_id)
        
        # Set user metadata
        self.user_metadata[user_id] = {
            "connected_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "connection_count": len(self.active_connections[user_id])
        }
        
        if robot_id:
            self.robot_connections[robot_id] = connection_id
        
        logger.info(f"User {user_id} connected with connection {connection_id}")
        
        # Send queued messages
        await self._send_queued_messages(user_id)
        
        # Send connection confirmation
        await self.send_to_user_enhanced(user_id, NotificationMessage(
            message_type=MessageType.USER_CONNECTED,
            data={"connection_id": connection_id, "user_id": user_id}
        ))
        
        return connection_id

    async def disconnect(self, user_id: str, connection_id: str, robot_id: str = None):
        """Enhanced disconnect method"""
        if user_id in self.active_connections:
            if connection_id in self.active_connections[user_id]:
                del self.active_connections[user_id][connection_id]
                
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    if user_id in self.user_metadata:
                        del self.user_metadata[user_id]
                else:
                    # Update connection count
                    self.user_metadata[user_id]["connection_count"] = len(self.active_connections[user_id])
        
        # Legacy support
        if user_id and user_id in self.user_connections:
            if connection_id in self.user_connections[user_id]:
                self.user_connections[user_id].remove(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        if robot_id and robot_id in self.robot_connections:
            if self.robot_connections[robot_id] == connection_id:
                del self.robot_connections[robot_id]
        
        logger.info(f"User {user_id} disconnected from connection {connection_id}")
    
    async def subscribe_to_topic(self, user_id: str, topic: str):
        """Subscribe user to a topic"""
        if topic not in self.subscriptions:
            self.subscriptions[topic] = set()
        
        self.subscriptions[topic].add(user_id)
        logger.info(f"User {user_id} subscribed to topic {topic}")
    
    async def unsubscribe_from_topic(self, user_id: str, topic: str):
        """Unsubscribe user from a topic"""
        if topic in self.subscriptions:
            self.subscriptions[topic].discard(user_id)
            if not self.subscriptions[topic]:
                del self.subscriptions[topic]
        
        logger.info(f"User {user_id} unsubscribed from topic {topic}")

    async def send_personal_message(self, message: dict, connection_id: str):
        """Legacy method - maintained for backward compatibility"""
        # This needs to be updated to work with new structure
        for user_id, connections in self.active_connections.items():
            for conn_id, websocket in connections.items():
                if conn_id == connection_id:
                    await websocket.send_text(json.dumps(message))
                    return

    async def send_to_user_enhanced(self, user_id: str, message: NotificationMessage):
        """Enhanced method to send message to specific user"""
        message.user_id = user_id
        
        if user_id in self.active_connections:
            # User is online, send to all their connections
            disconnected_connections = []
            
            for connection_id, websocket in self.active_connections[user_id].items():
                try:
                    await websocket.send_text(json.dumps(asdict(message)))
                    # Update last activity
                    if user_id in self.user_metadata:
                        self.user_metadata[user_id]["last_activity"] = datetime.utcnow().isoformat()
                except Exception as e:
                    logger.error(f"Failed to send message to {user_id}/{connection_id}: {e}")
                    disconnected_connections.append(connection_id)
            
            # Clean up disconnected connections
            for connection_id in disconnected_connections:
                await self.disconnect(user_id, connection_id)
        else:
            # User is offline, queue message
            await self._queue_message(user_id, message)
    
    async def send_to_topic(self, topic: str, message: NotificationMessage):
        """Send message to all users subscribed to a topic"""
        if topic in self.subscriptions:
            for user_id in self.subscriptions[topic].copy():
                await self.send_to_user_enhanced(user_id, message)
    
    async def _queue_message(self, user_id: str, message: NotificationMessage):
        """Queue message for offline user"""
        if user_id not in self.message_queue:
            self.message_queue[user_id] = []
        
        self.message_queue[user_id].append(message)
        
        # Limit queue size
        if len(self.message_queue[user_id]) > 100:
            self.message_queue[user_id] = self.message_queue[user_id][-100:]
        
        # Persist to Redis if available
        if self.redis_client:
            try:
                await self.redis_client.lpush(
                    f"websocket_queue:{user_id}",
                    json.dumps(asdict(message))
                )
                await self.redis_client.ltrim(f"websocket_queue:{user_id}", 0, 99)
            except Exception as e:
                logger.error(f"Failed to persist queued message: {e}")
    
    async def _send_queued_messages(self, user_id: str):
        """Send queued messages to newly connected user"""
        # Send from memory queue
        if user_id in self.message_queue:
            for message in self.message_queue[user_id]:
                try:
                    if user_id in self.active_connections:
                        for websocket in self.active_connections[user_id].values():
                            await websocket.send_text(json.dumps(asdict(message)))
                except Exception as e:
                    logger.error(f"Failed to send queued message: {e}")
            
            # Clear queue after sending
            del self.message_queue[user_id]
        
        # Send from Redis queue if available
        if self.redis_client:
            try:
                queue_key = f"websocket_queue:{user_id}"
                messages = await self.redis_client.lrange(queue_key, 0, -1)
                
                for message_data in reversed(messages):
                    try:
                        message_dict = json.loads(message_data)
                        if user_id in self.active_connections:
                            for websocket in self.active_connections[user_id].values():
                                await websocket.send_text(message_data)
                    except Exception as e:
                        logger.error(f"Failed to send Redis queued message: {e}")
                
                # Clear Redis queue
                await self.redis_client.delete(queue_key)
                
            except Exception as e:
                logger.error(f"Failed to retrieve Redis queued messages: {e}")
    
    async def send_heartbeat(self):
        """Send heartbeat to all connected users"""
        heartbeat_message = NotificationMessage(
            message_type=MessageType.HEARTBEAT,
            data={"server_time": datetime.utcnow().isoformat()}
        )
        await self.broadcast_enhanced(heartbeat_message)

    async def send_to_user(self, message: dict, user_id: str):
        """Legacy method - maintained for backward compatibility"""
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id]:
                await self.send_personal_message(message, connection_id)
    
    async def broadcast_enhanced(self, message: NotificationMessage):
        """Enhanced broadcast method"""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user_enhanced(user_id, message)

    async def send_to_robot(self, message: dict, robot_id: str):
        """Legacy robot messaging - maintained for backward compatibility"""
        if robot_id in self.robot_connections:
            connection_id = self.robot_connections[robot_id]
            await self.send_personal_message(message, connection_id)

    async def broadcast(self, message: dict):
        """Legacy broadcast method - maintained for backward compatibility"""
        # Convert to new structure temporarily
        legacy_connections = []
        for user_connections in self.active_connections.values():
            legacy_connections.extend(user_connections.values())
        
        if legacy_connections:
            await asyncio.gather(
                *[websocket.send_text(json.dumps(message)) 
                  for websocket in legacy_connections],
                return_exceptions=True
            )

    async def broadcast_robot_status(self, robot_id: str, status: dict):
        """Enhanced robot status broadcasting"""
        message = NotificationMessage(
            message_type=MessageType.ROBOT_STATE_UPDATE,
            data={"robot_id": robot_id, "status": status}
        )
        await self.send_to_topic("robots", message)
        await self.send_to_topic(f"robot_{robot_id}", message)

    async def broadcast_training_progress(self, user_id: str, progress: dict):
        """Enhanced training progress broadcasting"""
        message = NotificationMessage(
            message_type=MessageType.TRAINING_PROGRESS,
            data={"progress": progress}
        )
        await self.send_to_user_enhanced(user_id, message)

    async def disconnect_all(self):
        """Enhanced disconnect all method"""
        all_websockets = []
        for user_connections in self.active_connections.values():
            all_websockets.extend(user_connections.values())
        
        if all_websockets:
            await asyncio.gather(
                *[websocket.close() for websocket in all_websockets],
                return_exceptions=True
            )
        
        self.active_connections.clear()
        self.user_connections.clear()
        self.robot_connections.clear()
        self.subscriptions.clear()
        self.user_metadata.clear()
        self.message_queue.clear()

    def get_connection_stats(self) -> dict:
        """Enhanced connection statistics"""
        total_connections = sum(len(conns) for conns in self.active_connections.values())
        return {
            "total_users": len(self.active_connections),
            "total_connections": total_connections,
            "user_connections": len(self.user_connections),  # Legacy support
            "robot_connections": len(self.robot_connections),
            "active_topics": len(self.subscriptions),
            "queued_messages": sum(len(queue) for queue in self.message_queue.values()),
            "active_users": list(self.active_connections.keys()),
            "connected_robots": list(self.robot_connections.keys())
        }

class NotificationService:
    """High-level notification service for the Humanoid Training Platform"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
    
    # Robot notifications
    async def notify_robot_connected(self, user_id: str, robot_id: str, robot_type: str):
        message = NotificationMessage(
            message_type=MessageType.ROBOT_CONNECTED,
            data={"robot_id": robot_id, "robot_type": robot_type}
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
        await self.connection_manager.send_to_topic("robots", message)
    
    async def notify_robot_state_update(self, robot_id: str, state_data: Dict[str, Any]):
        message = NotificationMessage(
            message_type=MessageType.ROBOT_STATE_UPDATE,
            data={"robot_id": robot_id, "state": state_data}
        )
        await self.connection_manager.send_to_topic("robots", message)
        await self.connection_manager.send_to_topic(f"robot_{robot_id}", message)
    
    async def notify_robot_emergency_stop(self, robot_id: str, reason: str):
        message = NotificationMessage(
            message_type=MessageType.ROBOT_EMERGENCY_STOP,
            data={"robot_id": robot_id, "reason": reason, "severity": "critical"}
        )
        await self.connection_manager.broadcast_enhanced(message)
    
    # Training notifications
    async def notify_training_progress(self, user_id: str, training_id: str, progress: float, stage: str):
        message = NotificationMessage(
            message_type=MessageType.TRAINING_PROGRESS,
            data={
                "training_id": training_id,
                "progress": progress,
                "stage": stage
            }
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
        await self.connection_manager.send_to_topic("training", message)
    
    async def notify_training_completed(self, user_id: str, training_id: str, results: Dict[str, Any]):
        message = NotificationMessage(
            message_type=MessageType.TRAINING_COMPLETED,
            data={
                "training_id": training_id,
                "results": results,
                "download_url": results.get("download_url")
            }
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
    
    # GR00T notifications
    async def notify_groot_training_progress(self, user_id: str, job_id: str, progress: float, stage: str):
        message = NotificationMessage(
            message_type=MessageType.GROOT_TRAINING_PROGRESS,
            data={
                "job_id": job_id,
                "progress": progress,
                "stage": stage,
                "estimated_completion": None  # TODO: Calculate ETA
            }
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
        await self.connection_manager.send_to_topic("groot_training", message)
    
    async def notify_groot_simulation_deployed(self, user_id: str, deployment_id: str, simulation_url: str):
        message = NotificationMessage(
            message_type=MessageType.GROOT_SIMULATION_DEPLOYED,
            data={
                "deployment_id": deployment_id,
                "simulation_url": simulation_url,
                "status": "ready"
            }
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
    
    # Pipeline notifications
    async def notify_pipeline_stage_completed(self, user_id: str, pipeline_id: str, stage: str, results: Dict):
        message = NotificationMessage(
            message_type=MessageType.PIPELINE_STAGE_COMPLETED,
            data={
                "pipeline_id": pipeline_id,
                "stage": stage,
                "results": results
            }
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
        await self.connection_manager.send_to_topic("pipeline", message)
    
    # User notifications
    async def notify_achievement_unlocked(self, user_id: str, achievement: Dict[str, Any]):
        message = NotificationMessage(
            message_type=MessageType.ACHIEVEMENT_UNLOCKED,
            data=achievement
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
    
    async def notify_data_export_ready(self, user_id: str, export_id: str, download_url: str):
        message = NotificationMessage(
            message_type=MessageType.DATA_EXPORT_READY,
            data={
                "export_id": export_id,
                "download_url": download_url,
                "expires_at": (datetime.utcnow().timestamp() + 86400)  # 24 hours
            }
        )
        await self.connection_manager.send_to_user_enhanced(user_id, message)
    
    async def notify_system_maintenance(self, maintenance_window: Dict[str, Any]):
        message = NotificationMessage(
            message_type=MessageType.SYSTEM_MAINTENANCE,
            data=maintenance_window
        )
        await self.connection_manager.broadcast_enhanced(message)

# Global instances
connection_manager = ConnectionManager()
notification_service = NotificationService(connection_manager)

# WebSocket endpoint handler
async def websocket_endpoint(websocket: WebSocket, user_id: str, token: str = None):
    """Main WebSocket endpoint"""
    connection_id = None
    
    try:
        # Authenticate user (simplified)
        if not user_id:
            await websocket.close(code=4001, reason="User ID required")
            return
        
        # TODO: Validate JWT token
        # if token:
        #     validate_jwt_token(token)
        
        # Connect user
        connection_id = await connection_manager.connect(websocket, user_id)
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle client messages (subscriptions, heartbeat responses, etc.)
                await handle_client_message(user_id, message_data)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "error": "Invalid message format",
                    "timestamp": datetime.utcnow().isoformat()
                }))
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    
    finally:
        if connection_id:
            await connection_manager.disconnect(user_id, connection_id)

async def handle_client_message(user_id: str, message_data: Dict[str, Any]):
    """Handle messages from WebSocket clients"""
    message_type = message_data.get("type")
    
    if message_type == "subscribe":
        topic = message_data.get("topic")
        if topic:
            await connection_manager.subscribe_to_topic(user_id, topic)
    
    elif message_type == "unsubscribe":
        topic = message_data.get("topic")
        if topic:
            await connection_manager.unsubscribe_from_topic(user_id, topic)
    
    elif message_type == "heartbeat_response":
        # Update user activity
        if user_id in connection_manager.user_metadata:
            connection_manager.user_metadata[user_id]["last_activity"] = datetime.utcnow().isoformat()
    
    else:
        logger.warning(f"Unknown message type from user {user_id}: {message_type}")

# Background task for heartbeat
async def start_heartbeat_task():
    """Start background heartbeat task"""
    while True:
        try:
            await connection_manager.send_heartbeat()
            await asyncio.sleep(30)  # Send heartbeat every 30 seconds
        except Exception as e:
            logger.error(f"Heartbeat task error: {e}")
            await asyncio.sleep(5)  # Retry after 5 seconds on error

# Legacy support - maintain existing global variable
websocket_manager = connection_manager