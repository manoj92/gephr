from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from app.services.robot_service import RobotService
from app.core.deps import get_current_user
from app.models.user import User
from app.models.robot import RobotConnection, RobotCommand
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
robot_service = RobotService()

class RobotConnectionRequest(BaseModel):
    robot_id: str = Field(..., description="Unique robot identifier")
    robot_type: str = Field(default="unitree_g1", description="Robot type")
    connection_type: str = Field(default="wifi", description="Connection type")
    ip_address: Optional[str] = Field(None, description="Robot IP address")
    port: Optional[int] = Field(None, description="Robot port")

class RobotCommandRequest(BaseModel):
    robot_id: str = Field(..., description="Target robot ID")
    command_type: str = Field(..., description="Command type")
    parameters: Dict[str, Any] = Field(..., description="Command parameters")
    priority: str = Field(default="medium", description="Command priority")
    timeout_seconds: int = Field(default=30, description="Command timeout")

@router.get("/supported")
async def get_supported_robots():
    """Get list of supported robot types"""
    try:
        result = robot_service.get_supported_robots()
        return result
    except Exception as e:
        logger.error(f"Error getting supported robots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/types/{robot_type}/config")
async def get_robot_config(robot_type: str):
    """Get configuration for a specific robot type"""
    try:
        config = robot_service.get_robot_config(robot_type)
        if not config:
            raise HTTPException(
                status_code=404,
                detail=f"Robot type '{robot_type}' not supported"
            )
        return {
            "robot_type": robot_type,
            "config": config
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting robot config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/connect")
async def connect_robot(
    request: RobotConnectionRequest,
    current_user: User = Depends(get_current_user)
):
    """Connect to a robot"""
    try:
        # Validate robot type
        if not robot_service.validate_robot_type(request.robot_type):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported robot type: {request.robot_type}"
            )
        
        # Create connection object
        connection = RobotConnection(
            user_id=current_user.id,
            robot_id=request.robot_id,
            connection_type=request.connection_type,
            ip_address=request.ip_address,
            port=request.port
        )
        
        # Attempt connection
        result = await robot_service.connect_robot(connection, request.robot_type)
        
        if not result:
            raise HTTPException(
                status_code=400,
                detail="Failed to connect to robot"
            )
        
        return {
            "success": True,
            "connection_info": result,
            "message": f"Successfully connected to {request.robot_type}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting to robot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commands/templates")
async def get_command_templates():
    """Get predefined command templates for different robot types"""
    templates = {
        "unitree_g1": {
            "walk_forward": {
                "command_type": "move",
                "parameters": {
                    "direction": "forward",
                    "speed": 0.5,
                    "distance": 1.0
                },
                "description": "Walk forward 1 meter at moderate speed"
            },
            "stand_up": {
                "command_type": "posture",
                "parameters": {
                    "posture": "standing",
                    "transition_time": 3.0
                },
                "description": "Stand up from current position"
            },
            "pick_object": {
                "command_type": "pick",
                "parameters": {
                    "target_position": {"x": 0.3, "y": 0.0, "z": 0.8},
                    "grasp_force": 0.5
                },
                "description": "Pick up object at specified position"
            },
            "turn_left": {
                "command_type": "rotate",
                "parameters": {
                    "angle": 90,
                    "angular_velocity": 30
                },
                "description": "Turn left 90 degrees"
            }
        },
        "custom_humanoid": {
            "walk_forward": {
                "command_type": "move",
                "parameters": {
                    "direction": "forward",
                    "speed": 0.8,
                    "distance": 1.5,
                    "gait_type": "dynamic"
                },
                "description": "Walk forward with dynamic gait"
            },
            "dance_move": {
                "command_type": "custom",
                "parameters": {
                    "action": "dance",
                    "dance_type": "wave",
                    "duration": 10.0
                },
                "description": "Perform wave dance for 10 seconds"
            },
            "speak": {
                "command_type": "speak",
                "parameters": {
                    "text": "Hello, I am a humanoid robot!",
                    "language": "en",
                    "emotion": "friendly"
                },
                "description": "Speak a greeting message"
            },
            "precision_grasp": {
                "command_type": "pick",
                "parameters": {
                    "target_position": {"x": 0.25, "y": 0.0, "z": 0.9},
                    "grasp_type": "precision",
                    "approach_vector": {"x": 0, "y": 0, "z": -1}
                },
                "description": "Precision grasp of small object"
            }
        }
    }
    
    return {
        "templates": templates,
        "supported_robot_types": list(templates.keys())
    }