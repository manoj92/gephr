from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class TrainingSessionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: Optional[str] = None
    difficulty_level: Optional[int] = 1
    robot_type: str
    robot_id: Optional[str] = None
    environment_config: Optional[Dict[str, Any]] = {}
    
    @validator('difficulty_level')
    def validate_difficulty(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Difficulty level must be between 1 and 10')
        return v


class TrainingSessionResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    task_type: Optional[str] = None
    difficulty_level: int
    robot_type: str
    robot_id: Optional[str] = None
    status: str
    progress: float
    total_gestures: int
    successful_gestures: int
    failed_gestures: int
    average_confidence: float
    total_frames: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class GestureDataCreate(BaseModel):
    training_session_id: str
    gesture_type: str
    gesture_name: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    confidence_score: float
    environment_state: Optional[Dict[str, Any]] = {}
    lerobot_action: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    
    @validator('gesture_type')
    def validate_gesture_type(cls, v):
        allowed_types = ['pick', 'place', 'move', 'grasp', 'release', 'custom']
        if v not in allowed_types:
            raise ValueError(f'Gesture type must be one of: {allowed_types}')
        return v
    
    @validator('confidence_score')
    def validate_confidence(cls, v):
        if v < 0 or v > 1:
            raise ValueError('Confidence score must be between 0 and 1')
        return v


class GestureDataResponse(BaseModel):
    id: str
    training_session_id: str
    gesture_type: str
    gesture_name: Optional[str] = None
    sequence_number: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    confidence_score: float
    tracking_quality: Optional[float] = None
    is_successful: bool
    environment_state: Optional[Dict[str, Any]] = {}
    lerobot_action: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = None
    tags: Optional[List[str]] = []
    video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class HandPoseData(BaseModel):
    handedness: str
    landmarks: List[Dict[str, float]]
    confidence: float
    timestamp: datetime
    world_landmarks: Optional[List[Dict[str, float]]] = None
    
    @validator('handedness')
    def validate_handedness(cls, v):
        if v not in ['left', 'right']:
            raise ValueError('Handedness must be "left" or "right"')
        return v


class LeRobotDataPoint(BaseModel):
    observation: Dict[str, Any]
    action: Dict[str, Any]
    reward: Optional[float] = None
    done: bool = False
    metadata: Dict[str, Any]


class TrainingDataUpload(BaseModel):
    session_id: str
    gesture_data: List[GestureDataCreate]
    hand_poses: List[HandPoseData]
    video_files: Optional[List[str]] = []
    image_files: Optional[List[str]] = []