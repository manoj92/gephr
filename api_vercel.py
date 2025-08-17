from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

# Pydantic models
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory data storage (for demo purposes)
robots_data = [
    {"id": "robot_1", "name": "Unitree G1", "type": "humanoid", "status": "available", "ip_address": "192.168.1.100"},
    {"id": "robot_2", "name": "Boston Dynamics Spot", "type": "quadruped", "status": "offline", "ip_address": "192.168.1.101"},
    {"id": "robot_3", "name": "Tesla Bot", "type": "humanoid", "status": "busy", "ip_address": "192.168.1.102"},
    {"id": "robot_4", "name": "Custom Robot", "type": "custom", "status": "available", "ip_address": "192.168.1.103"}
]

sessions_data = [
    {"id": "session_1", "name": "Hand Gesture Training", "robot_id": "robot_1", "status": "completed", "start_time": "2025-08-10T10:00:00Z", "data_points": 1500},
    {"id": "session_2", "name": "Object Manipulation", "robot_id": "robot_2", "status": "in_progress", "start_time": "2025-08-10T11:30:00Z", "data_points": 800},
    {"id": "session_3", "name": "Walking Patterns", "robot_id": "robot_1", "status": "completed", "start_time": "2025-08-09T14:00:00Z", "data_points": 2200}
]

marketplace_data = [
    {"id": "skill_1", "name": "Pick and Place Mastery", "description": "Advanced pick and place skills for precision manipulation", "price": 99.99, "rating": 4.8, "downloads": 156, "creator": "RoboticsLab"},
    {"id": "skill_2", "name": "Navigation Behavior Pack", "description": "Complete navigation and pathfinding behaviors", "price": 149.99, "rating": 4.5, "downloads": 89, "creator": "NavTech"},
    {"id": "skill_3", "name": "Human Interaction Module", "description": "Natural human-robot interaction patterns", "price": 199.99, "rating": 4.9, "downloads": 234, "creator": "SocialBots"},
    {"id": "skill_4", "name": "Safety Protocols Suite", "description": "Comprehensive safety behaviors and emergency responses", "price": 79.99, "rating": 4.7, "downloads": 321, "creator": "SafetyFirst"}
]

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
    return {"robots": robots_data, "total": len(robots_data)}

@app.get("/api/v1/robots/{robot_id}")
async def get_robot(robot_id: str):
    robot = next((r for r in robots_data if r["id"] == robot_id), None)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    return robot

@app.post("/api/v1/robots/{robot_id}/connect")
async def connect_robot(robot_id: str):
    robot = next((r for r in robots_data if r["id"] == robot_id), None)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    robot["status"] = "connected"
    robot["last_seen"] = datetime.now().isoformat()
    return {"message": f"Connected to {robot['name']}", "status": "connected"}

@app.post("/api/v1/robots/{robot_id}/disconnect")
async def disconnect_robot(robot_id: str):
    robot = next((r for r in robots_data if r["id"] == robot_id), None)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    robot["status"] = "available"
    return {"message": f"Disconnected from {robot['name']}", "status": "disconnected"}

# Training session endpoints
@app.get("/api/v1/training/sessions")
async def list_training_sessions():
    return {"sessions": sessions_data, "total": len(sessions_data)}

@app.get("/api/v1/training/sessions/{session_id}")
async def get_training_session(session_id: str):
    session = next((s for s in sessions_data if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    return session

@app.post("/api/v1/training/sessions")
async def create_training_session(name: str, robot_id: str):
    robot = next((r for r in robots_data if r["id"] == robot_id), None)
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    session = {
        "id": f"session_{uuid.uuid4().hex[:8]}",
        "name": name,
        "robot_id": robot_id,
        "status": "active",
        "start_time": datetime.now().isoformat(),
        "data_points": 0
    }
    sessions_data.append(session)
    return session

@app.post("/api/v1/training/sessions/{session_id}/data")
async def upload_training_data(session_id: str, actions: List[LerobotAction]):
    session = next((s for s in sessions_data if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    session["data_points"] += len(actions)
    return {"message": f"Uploaded {len(actions)} data points", "total_points": session["data_points"]}

@app.post("/api/v1/training/sessions/{session_id}/complete")
async def complete_training_session(session_id: str):
    session = next((s for s in sessions_data if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    session["status"] = "completed"
    session["end_time"] = datetime.now().isoformat()
    return {"message": "Training session completed", "session": session}

# Marketplace endpoints
@app.get("/api/v1/marketplace")
async def list_marketplace_items():
    return {"items": marketplace_data, "total": len(marketplace_data)}

@app.get("/api/v1/marketplace/{item_id}")
async def get_marketplace_item(item_id: str):
    item = next((i for i in marketplace_data if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Marketplace item not found")
    return item

@app.post("/api/v1/marketplace/{item_id}/purchase")
async def purchase_marketplace_item(item_id: str):
    item = next((i for i in marketplace_data if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Marketplace item not found")
    
    item["downloads"] += 1
    return {"message": f"Successfully purchased {item['name']}", "download_url": f"/api/v1/marketplace/{item_id}/download"}

# Hand tracking endpoints
@app.post("/api/v1/tracking/hand-pose")
async def process_hand_pose(pose_data: Dict[str, Any]):
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
    return {
        "total_robots": len(robots_data),
        "active_sessions": len([s for s in sessions_data if s["status"] == "in_progress"]),
        "completed_sessions": len([s for s in sessions_data if s["status"] == "completed"]),
        "marketplace_items": len(marketplace_data),
        "total_downloads": sum(item["downloads"] for item in marketplace_data),
        "platform_uptime": "99.9%"
    }

# For Vercel deployment
def handler(request):
    return app(request)

# Export for Vercel
application = app