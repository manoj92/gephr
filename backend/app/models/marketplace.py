from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class Skill(Base):
    __tablename__ = "skills"
    
    model_config = {"protected_namespaces": ()}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Basic info
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)  # 'manipulation', 'navigation', 'interaction', etc.
    tags = Column(JSON)  # Array of tags
    
    # Skill details
    difficulty_level = Column(Integer, nullable=False)  # 1-10 scale
    robot_types = Column(JSON, nullable=False)  # Compatible robot types
    required_capabilities = Column(JSON)  # Required robot capabilities
    
    # Training data
    training_session_id = Column(String, ForeignKey("training_sessions.id"))
    gesture_count = Column(Integer, default=0)
    dataset_size_mb = Column(Float, default=0.0)
    average_confidence = Column(Float, default=0.0)
    
    # Marketplace info
    price = Column(Float, nullable=False)  # USD
    currency = Column(String, default="USD")
    is_free = Column(Boolean, default=False)
    is_public = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Status
    status = Column(String, default="draft")  # 'draft', 'pending_review', 'published', 'rejected', 'archived'
    approval_status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'
    rejection_reason = Column(Text)
    
    # Performance metrics
    download_count = Column(Integer, default=0)
    purchase_count = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    # Revenue
    total_revenue = Column(Float, default=0.0)
    creator_earnings = Column(Float, default=0.0)
    platform_fees = Column(Float, default=0.0)
    
    # Media
    thumbnail_url = Column(String)
    demo_video_url = Column(String)
    preview_images = Column(JSON)  # Array of image URLs
    
    # Technical details
    model_format = Column(String, default="lerobot")  # 'lerobot', 'onnx', 'pytorch', etc.
    model_size_mb = Column(Float)
    inference_time_ms = Column(Float)
    hardware_requirements = Column(JSON)
    
    # Documentation
    documentation = Column(Text)
    usage_instructions = Column(Text)
    installation_guide = Column(Text)
    changelog = Column(Text)
    
    # Version control
    version = Column(String, default="1.0.0")
    previous_version_id = Column(String, ForeignKey("skills.id"))
    is_latest_version = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True))
    
    # Relationships
    creator = relationship("User", back_populates="created_skills")
    purchases = relationship("SkillPurchase", back_populates="skill")
    ratings = relationship("SkillRating", back_populates="skill")
    previous_version = relationship("Skill", remote_side=[id])

    def __repr__(self):
        return f"<Skill(id={self.id}, name={self.name}, creator_id={self.creator_id}, status={self.status})>"


class SkillPurchase(Base):
    __tablename__ = "skill_purchases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Purchase details
    purchase_price = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    payment_method = Column(String)  # 'credit_card', 'paypal', 'crypto', 'credits'
    
    # Transaction info
    transaction_id = Column(String, unique=True)
    payment_status = Column(String, default="pending")  # 'pending', 'completed', 'failed', 'refunded'
    payment_processor = Column(String)  # 'stripe', 'paypal', etc.
    
    # License details
    license_type = Column(String, default="standard")  # 'standard', 'commercial', 'unlimited'
    license_expires_at = Column(DateTime(timezone=True))
    usage_limit = Column(Integer)  # -1 for unlimited
    current_usage = Column(Integer, default=0)
    
    # Download info
    download_count = Column(Integer, default=0)
    first_download_at = Column(DateTime(timezone=True))
    last_download_at = Column(DateTime(timezone=True))
    download_url = Column(String)  # Temporary signed URL
    download_expires_at = Column(DateTime(timezone=True))
    
    # Refund info
    is_refunded = Column(Boolean, default=False)
    refund_reason = Column(Text)
    refunded_at = Column(DateTime(timezone=True))
    refund_amount = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    skill = relationship("Skill", back_populates="purchases")
    buyer = relationship("User", back_populates="skill_purchases")

    def __repr__(self):
        return f"<SkillPurchase(id={self.id}, skill_id={self.skill_id}, buyer_id={self.buyer_id}, status={self.payment_status})>"


class SkillRating(Base):
    __tablename__ = "skill_ratings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Rating details
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_title = Column(String)
    review_text = Column(Text)
    
    # Detailed ratings
    ease_of_use = Column(Integer)  # 1-5
    performance = Column(Integer)  # 1-5
    documentation = Column(Integer)  # 1-5
    value_for_money = Column(Integer)  # 1-5
    
    # Context
    robot_type_used = Column(String)
    use_case = Column(String)
    experience_level = Column(String)  # 'beginner', 'intermediate', 'advanced'
    
    # Moderation
    is_verified_purchase = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String)
    moderation_status = Column(String, default="published")  # 'published', 'hidden', 'under_review'
    
    # Helpfulness
    helpful_votes = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    skill = relationship("Skill", back_populates="ratings")
    user = relationship("User", back_populates="skill_ratings")

    def __repr__(self):
        return f"<SkillRating(id={self.id}, skill_id={self.skill_id}, user_id={self.user_id}, rating={self.rating})>"