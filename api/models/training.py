from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Session details
    name = Column(String, nullable=False)
    description = Column(Text)
    task_type = Column(String)  # 'pick_and_place', 'navigation', 'manipulation', etc.
    difficulty_level = Column(Integer, default=1)  # 1-10 scale
    
    # Robot info
    robot_type = Column(String, nullable=False)
    robot_id = Column(String, ForeignKey("robots.id"))
    
    # Session status
    status = Column(String, default="active")  # 'active', 'paused', 'completed', 'failed'
    progress = Column(Float, default=0.0)  # 0-1 scale
    
    # Metrics
    total_gestures = Column(Integer, default=0)
    successful_gestures = Column(Integer, default=0)
    failed_gestures = Column(Integer, default=0)
    average_confidence = Column(Float, default=0.0)
    total_frames = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Float, default=0.0)
    
    # Environment data
    environment_config = Column(JSON)
    camera_settings = Column(JSON)
    lighting_conditions = Column(String)
    
    # LeRobot dataset info
    dataset_name = Column(String)
    dataset_version = Column(String)
    lerobot_compatible = Column(Boolean, default=True)
    exported_at = Column(DateTime(timezone=True))
    export_path = Column(String)
    
    # Quality metrics
    data_quality_score = Column(Float)  # 0-1 scale
    annotation_complete = Column(Boolean, default=False)
    review_status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="training_sessions")
    gestures = relationship("GestureData", back_populates="training_session")

    def __repr__(self):
        return f"<TrainingSession(id={self.id}, user_id={self.user_id}, name={self.name}, status={self.status})>"


class GestureData(Base):
    __tablename__ = "gesture_data"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    training_session_id = Column(String, ForeignKey("training_sessions.id"), nullable=False)
    
    # Gesture identification
    gesture_type = Column(String, nullable=False)  # 'pick', 'place', 'move', 'grasp', 'release', 'custom'
    gesture_name = Column(String)
    sequence_number = Column(Integer)  # Order within the session
    
    # Timing
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True))
    duration_ms = Column(Float)
    
    # Quality metrics
    confidence_score = Column(Float, nullable=False)  # 0-1 scale
    tracking_quality = Column(Float)  # 0-1 scale
    is_successful = Column(Boolean, default=True)
    
    # Environment context
    environment_state = Column(JSON)
    object_positions = Column(JSON)
    camera_angle = Column(String)
    
    # Action classification
    lerobot_action = Column(JSON)  # LeRobot action format
    joint_positions = Column(JSON)
    joint_velocities = Column(JSON)
    gripper_position = Column(Float)
    
    # Metadata
    notes = Column(Text)
    tags = Column(JSON)  # Array of tags
    is_validated = Column(Boolean, default=False)
    validation_notes = Column(Text)
    
    # File references
    video_path = Column(String)
    thumbnail_path = Column(String)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    training_session = relationship("TrainingSession", back_populates="gestures")
    hand_poses = relationship("HandPose", back_populates="gesture")

    def __repr__(self):
        return f"<GestureData(id={self.id}, type={self.gesture_type}, confidence={self.confidence_score})>"


class HandPose(Base):
    __tablename__ = "hand_poses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    gesture_id = Column(String, ForeignKey("gesture_data.id"), nullable=False)
    
    # Hand identification
    handedness = Column(String, nullable=False)  # 'left', 'right'
    frame_number = Column(Integer, nullable=False)
    
    # Pose data
    landmarks = Column(JSON, nullable=False)  # Array of 21 hand landmarks
    confidence = Column(Float, nullable=False)  # 0-1 scale
    
    # 3D pose data (if available)
    world_landmarks = Column(JSON)  # 3D coordinates in world space
    
    # Derived features
    hand_bbox = Column(JSON)  # Bounding box coordinates
    palm_center = Column(JSON)  # Center point of palm
    fingers_extended = Column(JSON)  # Boolean array for each finger
    
    # Gesture analysis
    velocity = Column(JSON)  # Hand velocity vector
    acceleration = Column(JSON)  # Hand acceleration vector
    is_static = Column(Boolean, default=False)
    
    # Timing
    timestamp = Column(DateTime(timezone=True), nullable=False)
    relative_time_ms = Column(Float)  # Time relative to gesture start
    
    # Quality metrics
    tracking_confidence = Column(Float)
    occlusion_level = Column(Float)  # 0-1 scale
    motion_blur = Column(Float)  # 0-1 scale
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    gesture = relationship("GestureData", back_populates="hand_poses")

    def __repr__(self):
        return f"<HandPose(id={self.id}, handedness={self.handedness}, confidence={self.confidence})>"