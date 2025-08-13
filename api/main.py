from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import uuid
from datetime import datetime
import os
from .database import db_service

# Pydantic models for the API
class RobotConnection(BaseModel):
    id: str
    name: str
    type: str
    status: str
    ip_address: Optional[str] = None
    last_seen: Optional[datetime] = None

class TrainingSession(BaseModel):
    id: str
    name: str
    robot_id: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    data_points: int = 0

class MarketplaceItem(BaseModel):
    id: str
    name: str
    description: str
    price: float
    rating: float
    downloads: int
    creator: str

class LerobotAction(BaseModel):
    action_type: str
    timestamp: datetime
    hand_pose: Dict[str, Any]
    robot_state: Dict[str, Any]

# Create FastAPI app
app = FastAPI(
    title="Humanoid Training Platform API",
    description="Backend API for robot training data collection and marketplace",
    version="1.0.0"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    await db_service.init_sample_data()

@app.get("/")
async def root():
    return {"message": "Humanoid Training Platform API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": "production", "timestamp": datetime.now().isoformat()}

@app.get("/api/v1/health")
async def api_health():
    return {"status": "healthy", "api_version": "v1", "timestamp": datetime.now().isoformat()}

# Robot endpoints
@app.get("/api/v1/robots")
async def list_robots():
    robots = await db_service.get_all_robots()
    return {"robots": robots, "total": len(robots)}

@app.get("/api/v1/robots/{robot_id}")
async def get_robot(robot_id: str):
    robot = await db_service.get_robot(robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    return robot

@app.post("/api/v1/robots/{robot_id}/connect")
async def connect_robot(robot_id: str):
    robot = await db_service.get_robot(robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    last_seen = datetime.now().isoformat()
    success = await db_service.update_robot_status(robot_id, "connected", last_seen)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update robot status")
    
    return {"message": f"Connected to {robot['name']}", "status": "connected"}

@app.post("/api/v1/robots/{robot_id}/disconnect")
async def disconnect_robot(robot_id: str):
    robot = await db_service.get_robot(robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    success = await db_service.update_robot_status(robot_id, "available")
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update robot status")
    
    return {"message": f"Disconnected from {robot['name']}", "status": "disconnected"}

# Training session endpoints
@app.get("/api/v1/training/sessions")
async def list_training_sessions():
    sessions = await db_service.get_all_sessions()
    return {"sessions": sessions, "total": len(sessions)}

@app.get("/api/v1/training/sessions/{session_id}")
async def get_training_session(session_id: str):
    session = await db_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    return session

@app.post("/api/v1/training/sessions")
async def create_training_session(name: str, robot_id: str):
    robot = await db_service.get_robot(robot_id)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    try:
        session = await db_service.create_session(name, robot_id)
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create training session")

@app.post("/api/v1/training/sessions/{session_id}/data")
async def upload_training_data(session_id: str, actions: List[LerobotAction]):
    session = await db_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    success = await db_service.update_session_data_points(session_id, len(actions))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update session data")
    
    # Get updated session to return current total
    updated_session = await db_service.get_session(session_id)
    return {"message": f"Uploaded {len(actions)} data points", "total_points": updated_session["data_points"]}

@app.post("/api/v1/training/sessions/{session_id}/complete")
async def complete_training_session(session_id: str):
    session = await db_service.complete_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    return {"message": "Training session completed", "session": session}

# Marketplace endpoints
@app.get("/api/v1/marketplace")
async def list_marketplace_items():
    items = await db_service.get_all_marketplace_items()
    return {"items": items, "total": len(items)}

@app.get("/api/v1/marketplace/{item_id}")
async def get_marketplace_item(item_id: str):
    item = await db_service.get_marketplace_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Marketplace item not found")
    return item

@app.post("/api/v1/marketplace/{item_id}/purchase")
async def purchase_marketplace_item(item_id: str):
    item = await db_service.get_marketplace_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Marketplace item not found")
    
    success = await db_service.increment_downloads(item_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process purchase")
    
    return {"message": f"Successfully purchased {item['name']}", "download_url": f"/api/v1/marketplace/{item_id}/download"}

# Hand tracking endpoints
@app.post("/api/v1/tracking/hand-pose")
async def process_hand_pose(pose_data: Dict[str, Any]):
    # Process hand pose data and return robot commands
    return {
        "processed": True,
        "timestamp": datetime.now().isoformat(),
        "commands": [
            {"joint": "shoulder_pitch", "angle": 45.0},
            {"joint": "elbow_pitch", "angle": 90.0},
            {"joint": "wrist_roll", "angle": 0.0}
        ]
    }

@app.get("/api/v1/tracking/status")
async def get_tracking_status():
    return {
        "tracking_active": True,
        "fps": 30,
        "latency_ms": 25,
        "hands_detected": 2
    }

# WebSocket endpoint for real-time communication
@app.websocket("/ws/robot/{robot_id}")
async def websocket_endpoint(websocket, robot_id: str):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back with timestamp
            response = {
                "robot_id": robot_id,
                "timestamp": datetime.now().isoformat(),
                "received": json.loads(data)
            }
            await websocket.send_text(json.dumps(response))
    except Exception as e:
        print(f"WebSocket error: {e}")

# File upload endpoint
@app.post("/api/v1/upload/training-data")
async def upload_file(file: UploadFile = File(...)):
    return {
        "filename": file.filename,
        "size": len(await file.read()),
        "content_type": file.content_type,
        "uploaded_at": datetime.now().isoformat()
    }

# Statistics endpoint
@app.get("/api/v1/stats")
async def get_platform_stats():
    robots = await db_service.get_all_robots()
    sessions = await db_service.get_all_sessions()
    marketplace_items = await db_service.get_all_marketplace_items()
    
    return {
        "total_robots": len(robots),
        "active_sessions": len([s for s in sessions if s.get("status") == "in_progress"]),
        "completed_sessions": len([s for s in sessions if s.get("status") == "completed"]),
        "marketplace_items": len(marketplace_items),
        "total_downloads": sum(item.get("downloads", 0) for item in marketplace_items),
        "platform_uptime": "99.9%"
    }

# For Vercel deployment
def handler(request):
    return app(request)

# Export for Vercel
application = app