from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, robots, training, marketplace, websocket, groot_training, training_pipeline

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(robots.router, prefix="/robots", tags=["robots"])
api_router.include_router(training.router, prefix="/training", tags=["training"])
api_router.include_router(groot_training.router, prefix="/groot", tags=["groot_training"])
api_router.include_router(training_pipeline.router, prefix="/pipeline", tags=["training_pipeline"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])