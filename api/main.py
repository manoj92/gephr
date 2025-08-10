from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Gephr Training Platform API",
    description="Backend API for robot training data collection",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Gephr Humanoid Training Platform API", 
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "robots": "/api/v1/robots",
            "training": "/api/v1/training/sessions",
            "marketplace": "/api/v1/marketplace"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": "2025-08-10"}

@app.get("/api/v1/robots")
def list_robots():
    return {
        "robots": [
            {"id": 1, "name": "Unitree G1", "status": "available"},
            {"id": 2, "name": "Boston Dynamics Spot", "status": "offline"}
        ],
        "total": 2
    }

@app.get("/api/v1/training/sessions")  
def list_training_sessions():
    return {
        "sessions": [
            {"id": 1, "name": "Hand Gesture Training", "status": "completed"},
            {"id": 2, "name": "Object Manipulation", "status": "in_progress"}
        ],
        "total": 2
    }

@app.get("/api/v1/marketplace")
def list_marketplace():
    return {
        "items": [
            {"id": 1, "name": "Pick and Place Skill", "price": 99},
            {"id": 2, "name": "Navigation Behavior", "price": 149}
        ],
        "total": 2
    }