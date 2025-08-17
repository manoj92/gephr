from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.core.websocket import websocket_manager
from app.api.deps import get_current_user
from app.models.user import User
import uuid
import json
from typing import Optional

router = APIRouter()


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: Optional[str] = Query(None),
    robot_id: Optional[str] = Query(None)
):
    connection_id = str(uuid.uuid4())
    
    try:
        await websocket_manager.connect(websocket, connection_id, user_id, robot_id)
        
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "connection_id": connection_id,
            "user_id": user_id,
            "robot_id": robot_id
        }))
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(message, connection_id, user_id, robot_id)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "error", 
                    "message": str(e)
                }))
                
    except WebSocketDisconnect:
        pass
    finally:
        websocket_manager.disconnect(connection_id, user_id, robot_id)


async def handle_websocket_message(message: dict, connection_id: str, user_id: Optional[str], robot_id: Optional[str]):
    """Handle different types of websocket messages"""
    
    message_type = message.get("type")
    
    if message_type == "ping":
        await websocket_manager.send_personal_message(
            {"type": "pong", "timestamp": message.get("timestamp")},
            connection_id
        )
    
    elif message_type == "robot_heartbeat" and robot_id:
        # Update robot status
        robot_status = message.get("status", {})
        await websocket_manager.broadcast_robot_status(robot_id, robot_status)
    
    elif message_type == "training_progress" and user_id:
        # Broadcast training progress to user's connections
        progress = message.get("progress", {})
        await websocket_manager.broadcast_training_progress(user_id, progress)
    
    elif message_type == "chat_message" and user_id:
        # Handle chat messages (for community features)
        chat_data = {
            "type": "chat_message",
            "user_id": user_id,
            "message": message.get("message"),
            "timestamp": message.get("timestamp"),
            "room": message.get("room", "general")
        }
        await websocket_manager.broadcast(chat_data)
    
    elif message_type == "robot_command_update" and robot_id:
        # Handle robot command status updates
        command_update = {
            "type": "robot_command_update",
            "robot_id": robot_id,
            "command_id": message.get("command_id"),
            "status": message.get("status"),
            "progress": message.get("progress", 0),
            "result": message.get("result"),
            "error": message.get("error")
        }
        await websocket_manager.broadcast(command_update)
    
    elif message_type == "join_room":
        # Handle room joining for specific features
        room = message.get("room")
        if room and user_id:
            await websocket_manager.send_personal_message(
                {"type": "joined_room", "room": room},
                connection_id
            )
    
    elif message_type == "leave_room":
        # Handle room leaving
        room = message.get("room")
        if room and user_id:
            await websocket_manager.send_personal_message(
                {"type": "left_room", "room": room},
                connection_id
            )
    
    else:
        # Unknown message type
        await websocket_manager.send_personal_message(
            {"type": "error", "message": f"Unknown message type: {message_type}"},
            connection_id
        )


@router.get("/stats")
async def get_websocket_stats():
    """Get websocket connection statistics"""
    return websocket_manager.get_connection_stats()


@router.post("/broadcast")
async def broadcast_message(
    message: dict,
    current_user: User = Depends(get_current_user)
):
    """Broadcast message to all connected clients (admin only)"""
    # In production, add admin role check
    await websocket_manager.broadcast({
        "type": "admin_broadcast",
        "message": message,
        "from_user": current_user.username
    })
    
    return {"message": "Message broadcasted successfully"}