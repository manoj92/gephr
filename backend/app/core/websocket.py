from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, List[str]] = {}  # user_id -> connection_ids
        self.robot_connections: Dict[str, str] = {}  # robot_id -> connection_id

    async def connect(self, websocket: WebSocket, connection_id: str, user_id: str = None, robot_id: str = None):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(connection_id)
        
        if robot_id:
            self.robot_connections[robot_id] = connection_id

    def disconnect(self, connection_id: str, user_id: str = None, robot_id: str = None):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        if user_id and user_id in self.user_connections:
            if connection_id in self.user_connections[user_id]:
                self.user_connections[user_id].remove(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        if robot_id and robot_id in self.robot_connections:
            if self.robot_connections[robot_id] == connection_id:
                del self.robot_connections[robot_id]

    async def send_personal_message(self, message: dict, connection_id: str):
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            await websocket.send_text(json.dumps(message))

    async def send_to_user(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id]:
                await self.send_personal_message(message, connection_id)

    async def send_to_robot(self, message: dict, robot_id: str):
        if robot_id in self.robot_connections:
            connection_id = self.robot_connections[robot_id]
            await self.send_personal_message(message, connection_id)

    async def broadcast(self, message: dict):
        if self.active_connections:
            await asyncio.gather(
                *[websocket.send_text(json.dumps(message)) 
                  for websocket in self.active_connections.values()],
                return_exceptions=True
            )

    async def broadcast_robot_status(self, robot_id: str, status: dict):
        message = {
            "type": "robot_status_update",
            "robot_id": robot_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(message)

    async def broadcast_training_progress(self, user_id: str, progress: dict):
        message = {
            "type": "training_progress",
            "user_id": user_id,
            "progress": progress,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_to_user(message, user_id)

    async def disconnect_all(self):
        if self.active_connections:
            await asyncio.gather(
                *[websocket.close() for websocket in self.active_connections.values()],
                return_exceptions=True
            )
        self.active_connections.clear()
        self.user_connections.clear()
        self.robot_connections.clear()

    def get_connection_stats(self) -> dict:
        return {
            "total_connections": len(self.active_connections),
            "user_connections": len(self.user_connections),
            "robot_connections": len(self.robot_connections),
            "active_users": list(self.user_connections.keys()),
            "connected_robots": list(self.robot_connections.keys())
        }


websocket_manager = ConnectionManager()