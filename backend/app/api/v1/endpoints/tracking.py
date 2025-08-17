from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
from app.api.deps import get_current_user
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Global tracking state (in production, use Redis or similar)
tracking_state = {
    "active": False,
    "fps": 0,
    "latency_ms": 0,
    "hands_detected": 0,
    "last_update": None
}

class HandPoseRequest(BaseModel):
    landmarks: List[Dict[str, float]]
    gesture: str
    confidence: float
    timestamp: str

class HandPoseResponse(BaseModel):
    processed: bool
    timestamp: str
    commands: List[Dict[str, Any]]

class TrackingStatusResponse(BaseModel):
    tracking_active: bool
    fps: int
    latency_ms: int
    hands_detected: int

@router.post("/hand-pose", response_model=HandPoseResponse)
async def process_hand_pose(
    pose_data: HandPoseRequest,
    current_user: User = Depends(get_current_user)
):
    """Process hand pose data and generate robot commands"""
    try:
        # Update tracking state
        tracking_state["active"] = True
        tracking_state["hands_detected"] = 1 if pose_data.landmarks else 0
        tracking_state["last_update"] = datetime.now()
        
        # Generate commands based on gesture
        commands = []
        if pose_data.gesture == "pick":
            commands = [
                {"joint": "gripper", "angle": 0},
                {"joint": "wrist", "angle": 45}
            ]
        elif pose_data.gesture == "place":
            commands = [
                {"joint": "gripper", "angle": 90},
                {"joint": "wrist", "angle": 0}
            ]
        elif pose_data.gesture == "move":
            commands = [
                {"joint": "shoulder", "angle": 30},
                {"joint": "elbow", "angle": 60}
            ]
        elif pose_data.gesture == "rotate":
            commands = [
                {"joint": "wrist", "angle": 180}
            ]
        elif pose_data.gesture == "open":
            commands = [
                {"joint": "gripper", "angle": 90}
            ]
        elif pose_data.gesture == "close":
            commands = [
                {"joint": "gripper", "angle": 0}
            ]
        
        return HandPoseResponse(
            processed=True,
            timestamp=datetime.now().isoformat(),
            commands=commands
        )
        
    except Exception as e:
        logger.error(f"Error processing hand pose: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process hand pose: {str(e)}"
        )

@router.get("/status", response_model=TrackingStatusResponse)
async def get_tracking_status(
    current_user: User = Depends(get_current_user)
):
    """Get current tracking status"""
    try:
        # Calculate FPS based on last update
        fps = 0
        if tracking_state["last_update"]:
            time_diff = (datetime.now() - tracking_state["last_update"]).total_seconds()
            if time_diff > 0 and time_diff < 2:  # Only calculate if updated recently
                fps = int(1 / time_diff) if time_diff > 0 else 0
        
        # Update FPS in state
        tracking_state["fps"] = fps
        
        # Estimate latency (mock for now, would measure actual processing time)
        tracking_state["latency_ms"] = 25 if tracking_state["active"] else 0
        
        return TrackingStatusResponse(
            tracking_active=tracking_state["active"],
            fps=tracking_state["fps"],
            latency_ms=tracking_state["latency_ms"],
            hands_detected=tracking_state["hands_detected"]
        )
        
    except Exception as e:
        logger.error(f"Error getting tracking status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tracking status: {str(e)}"
        )

@router.post("/start")
async def start_tracking(
    current_user: User = Depends(get_current_user)
):
    """Start hand tracking session"""
    try:
        tracking_state["active"] = True
        tracking_state["last_update"] = datetime.now()
        
        return {
            "success": True,
            "message": "Hand tracking started",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error starting tracking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start tracking: {str(e)}"
        )

@router.post("/stop")
async def stop_tracking(
    current_user: User = Depends(get_current_user)
):
    """Stop hand tracking session"""
    try:
        tracking_state["active"] = False
        tracking_state["fps"] = 0
        tracking_state["latency_ms"] = 0
        tracking_state["hands_detected"] = 0
        
        return {
            "success": True,
            "message": "Hand tracking stopped",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error stopping tracking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop tracking: {str(e)}"
        )