from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.user import User
from app.models.training import TrainingSession
from app.models.marketplace import Skill, SkillPurchase
from app.schemas.user import UserResponse, UserUpdate, UserStats
from app.api.deps import get_current_user
from typing import List

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    update_data = user_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/stats", response_model=UserStats)
async def get_current_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get training session stats
    training_stats = await db.execute(
        select(
            func.count(TrainingSession.id).label('total_sessions'),
            func.coalesce(func.sum(TrainingSession.total_gestures), 0).label('total_gestures'),
            func.coalesce(func.sum(TrainingSession.duration_seconds), 0).label('total_seconds')
        ).where(TrainingSession.user_id == current_user.id)
    )
    training_result = training_stats.first()
    
    # Get skill stats
    skill_stats = await db.execute(
        select(
            func.count(Skill.id).label('skills_created'),
            func.coalesce(func.sum(Skill.total_revenue), 0).label('total_earnings'),
            func.coalesce(func.avg(Skill.average_rating), 0).label('avg_rating')
        ).where(Skill.creator_id == current_user.id)
    )
    skill_result = skill_stats.first()
    
    # Get purchase stats
    purchase_stats = await db.execute(
        select(func.count(SkillPurchase.id)).where(SkillPurchase.buyer_id == current_user.id)
    )
    purchase_count = purchase_stats.scalar()
    
    return UserStats(
        total_training_sessions=training_result.total_sessions or 0,
        total_gestures_recorded=training_result.total_gestures or 0,
        total_training_hours=round((training_result.total_seconds or 0) / 3600, 2),
        skills_created=skill_result.skills_created or 0,
        skills_purchased=purchase_count or 0,
        total_earnings=skill_result.total_earnings or 0.0,
        average_skill_rating=round(skill_result.avg_rating or 0.0, 2)
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return users