from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    avatar_url = Column(String)
    
    # Profile information
    bio = Column(Text)
    location = Column(String)
    website = Column(String)
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    
    # Gamification
    experience_points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    total_training_hours = Column(Float, default=0.0)
    skills_created = Column(Integer, default=0)
    skills_purchased = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_active = Column(DateTime(timezone=True))
    
    # Relationships
    training_sessions = relationship("TrainingSession", back_populates="user")
    created_skills = relationship("Skill", back_populates="creator")
    skill_purchases = relationship("SkillPurchase", back_populates="buyer")
    skill_ratings = relationship("SkillRating", back_populates="user")
    robot_connections = relationship("RobotConnection", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"