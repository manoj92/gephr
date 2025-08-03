from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class SkillBase(BaseModel):
    name: str
    description: str
    category: str
    difficulty_level: int
    robot_types: List[str]
    price: float
    
    @validator('difficulty_level')
    def validate_difficulty(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Difficulty level must be between 1 and 10')
        return v
    
    @validator('price')
    def validate_price(cls, v):
        if v < 0:
            raise ValueError('Price must be non-negative')
        return v


class SkillCreate(SkillBase):
    tags: Optional[List[str]] = []
    required_capabilities: Optional[List[str]] = []
    training_session_id: Optional[str] = None
    is_free: Optional[bool] = False
    is_public: Optional[bool] = True
    documentation: Optional[str] = None
    usage_instructions: Optional[str] = None


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    tags: Optional[List[str]] = None
    documentation: Optional[str] = None
    usage_instructions: Optional[str] = None
    is_public: Optional[bool] = None


class SkillResponse(SkillBase):
    id: str
    creator_id: str
    tags: List[str]
    required_capabilities: List[str]
    training_session_id: Optional[str] = None
    is_free: bool
    is_public: bool
    is_featured: bool
    status: str
    approval_status: str
    download_count: int
    purchase_count: int
    average_rating: float
    rating_count: int
    total_revenue: float
    thumbnail_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    model_format: str
    model_size_mb: Optional[float] = None
    version: str
    created_at: datetime
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SkillSearchParams(BaseModel):
    query: Optional[str] = None
    category: Optional[str] = None
    robot_type: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    difficulty_min: Optional[int] = None
    difficulty_max: Optional[int] = None
    min_rating: Optional[float] = None
    is_free: Optional[bool] = None
    sort_by: Optional[str] = "created_at"  # 'created_at', 'price', 'rating', 'downloads'
    sort_order: Optional[str] = "desc"  # 'asc', 'desc'
    page: int = 1
    page_size: int = 20


class SkillPurchaseCreate(BaseModel):
    skill_id: str
    payment_method: Optional[str] = "credit_card"
    license_type: Optional[str] = "standard"


class SkillPurchaseResponse(BaseModel):
    id: str
    skill_id: str
    buyer_id: str
    purchase_price: float
    currency: str
    payment_status: str
    license_type: str
    download_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class SkillRatingCreate(BaseModel):
    skill_id: str
    rating: int
    review_title: Optional[str] = None
    review_text: Optional[str] = None
    ease_of_use: Optional[int] = None
    performance: Optional[int] = None
    documentation: Optional[int] = None
    value_for_money: Optional[int] = None
    robot_type_used: Optional[str] = None
    use_case: Optional[str] = None
    
    @validator('rating', 'ease_of_use', 'performance', 'documentation', 'value_for_money')
    def validate_rating_range(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v


class SkillRatingResponse(BaseModel):
    id: str
    skill_id: str
    user_id: str
    rating: int
    review_title: Optional[str] = None
    review_text: Optional[str] = None
    ease_of_use: Optional[int] = None
    performance: Optional[int] = None
    documentation: Optional[int] = None
    value_for_money: Optional[int] = None
    robot_type_used: Optional[str] = None
    use_case: Optional[str] = None
    is_verified_purchase: bool
    helpful_votes: int
    total_votes: int
    created_at: datetime
    
    class Config:
        from_attributes = True