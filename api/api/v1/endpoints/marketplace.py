from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.user import User
from app.models.marketplace import Skill, SkillPurchase, SkillRating
from app.schemas.marketplace import (
    SkillCreate, SkillResponse, SkillUpdate, SkillSearchParams,
    SkillPurchaseCreate, SkillPurchaseResponse,
    SkillRatingCreate, SkillRatingResponse
)
from app.api.deps import get_current_user, get_optional_current_user
from app.services.file_storage import FileStorageService
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()
file_storage = FileStorageService()


@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    skill_data: SkillCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    db_skill = Skill(
        creator_id=current_user.id,
        **skill_data.dict()
    )
    
    db.add(db_skill)
    await db.commit()
    await db.refresh(db_skill)
    
    # Update user stats
    current_user.skills_created += 1
    await db.commit()
    
    return db_skill


@router.get("/skills", response_model=List[SkillResponse])
async def search_skills(
    query: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    robot_type: Optional[str] = Query(None, description="Filter by robot type"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    difficulty_min: Optional[int] = Query(None, description="Minimum difficulty"),
    difficulty_max: Optional[int] = Query(None, description="Maximum difficulty"),
    min_rating: Optional[float] = Query(None, description="Minimum rating"),
    is_free: Optional[bool] = Query(None, description="Filter free skills"),
    sort_by: str = Query("created_at", description="Sort by field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Base query - only published skills
    base_query = select(Skill).where(
        and_(
            Skill.status == "published",
            Skill.approval_status == "approved",
            Skill.is_public == True
        )
    )
    
    # Apply filters
    if query:
        search_filter = or_(
            Skill.name.ilike(f"%{query}%"),
            Skill.description.ilike(f"%{query}%"),
            Skill.tags.op("@>")(f'["{query}"]')  # JSON array contains
        )
        base_query = base_query.where(search_filter)
    
    if category:
        base_query = base_query.where(Skill.category == category)
    
    if robot_type:
        base_query = base_query.where(Skill.robot_types.op("@>")(f'["{robot_type}"]'))
    
    if min_price is not None:
        base_query = base_query.where(Skill.price >= min_price)
    
    if max_price is not None:
        base_query = base_query.where(Skill.price <= max_price)
    
    if difficulty_min is not None:
        base_query = base_query.where(Skill.difficulty_level >= difficulty_min)
    
    if difficulty_max is not None:
        base_query = base_query.where(Skill.difficulty_level <= difficulty_max)
    
    if min_rating is not None:
        base_query = base_query.where(Skill.average_rating >= min_rating)
    
    if is_free is not None:
        base_query = base_query.where(Skill.is_free == is_free)
    
    # Apply sorting
    sort_field = getattr(Skill, sort_by, Skill.created_at)
    if sort_order == "desc":
        base_query = base_query.order_by(sort_field.desc())
    else:
        base_query = base_query.order_by(sort_field.asc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = base_query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    skills = result.scalars().all()
    
    return skills


@router.get("/skills/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id)
    )
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Check if skill is accessible
    if not skill.is_public and (not current_user or skill.creator_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Skill is private"
        )
    
    return skill


@router.put("/skills/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: str,
    skill_update: SkillUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Skill)
        .where(Skill.id == skill_id)
        .where(Skill.creator_id == current_user.id)
    )
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Update fields
    update_data = skill_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(skill, field, value)
    
    skill.last_updated = datetime.utcnow()
    
    await db.commit()
    await db.refresh(skill)
    
    return skill


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Skill)
        .where(Skill.id == skill_id)
        .where(Skill.creator_id == current_user.id)
    )
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Archive instead of delete if there are purchases
    result = await db.execute(
        select(func.count(SkillPurchase.id)).where(SkillPurchase.skill_id == skill_id)
    )
    purchase_count = result.scalar()
    
    if purchase_count > 0:
        skill.status = "archived"
        await db.commit()
    else:
        await db.delete(skill)
        await db.commit()


@router.post("/skills/{skill_id}/purchase", response_model=SkillPurchaseResponse, status_code=status.HTTP_201_CREATED)
async def purchase_skill(
    skill_id: str,
    purchase_data: SkillPurchaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get skill
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    if skill.creator_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot purchase your own skill"
        )
    
    # Check if already purchased
    result = await db.execute(
        select(SkillPurchase)
        .where(SkillPurchase.skill_id == skill_id)
        .where(SkillPurchase.buyer_id == current_user.id)
        .where(SkillPurchase.payment_status == "completed")
    )
    existing_purchase = result.scalar_one_or_none()
    
    if existing_purchase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill already purchased"
        )
    
    # Create purchase record
    db_purchase = SkillPurchase(
        skill_id=skill_id,
        buyer_id=current_user.id,
        purchase_price=skill.price,
        payment_method=purchase_data.payment_method,
        license_type=purchase_data.license_type,
        transaction_id=str(uuid.uuid4()),
        payment_status="completed"  # Mock payment processing
    )
    
    db.add(db_purchase)
    
    # Update skill stats
    skill.purchase_count += 1
    skill.total_revenue += skill.price
    skill.creator_earnings += skill.price * (1 - 0.05)  # 5% platform fee
    skill.platform_fees += skill.price * 0.05
    
    # Update user stats
    current_user.skills_purchased += 1
    
    await db.commit()
    await db.refresh(db_purchase)
    
    return db_purchase


@router.get("/purchases", response_model=List[SkillPurchaseResponse])
async def get_user_purchases(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SkillPurchase)
        .where(SkillPurchase.buyer_id == current_user.id)
        .order_by(SkillPurchase.created_at.desc())
    )
    purchases = result.scalars().all()
    return purchases


@router.post("/skills/{skill_id}/rate", response_model=SkillRatingResponse, status_code=status.HTTP_201_CREATED)
async def rate_skill(
    skill_id: str,
    rating_data: SkillRatingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify skill exists
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Check if user has purchased the skill
    result = await db.execute(
        select(SkillPurchase)
        .where(SkillPurchase.skill_id == skill_id)
        .where(SkillPurchase.buyer_id == current_user.id)
        .where(SkillPurchase.payment_status == "completed")
    )
    purchase = result.scalar_one_or_none()
    
    # Check for existing rating
    result = await db.execute(
        select(SkillRating)
        .where(SkillRating.skill_id == skill_id)
        .where(SkillRating.user_id == current_user.id)
    )
    existing_rating = result.scalar_one_or_none()
    
    if existing_rating:
        # Update existing rating
        for field, value in rating_data.dict(exclude_unset=True).items():
            if field != "skill_id":
                setattr(existing_rating, field, value)
        
        await db.commit()
        await db.refresh(existing_rating)
        
        # Recalculate skill average rating
        await _update_skill_rating(skill_id, db)
        
        return existing_rating
    else:
        # Create new rating
        db_rating = SkillRating(
            user_id=current_user.id,
            is_verified_purchase=purchase is not None,
            **rating_data.dict()
        )
        
        db.add(db_rating)
        await db.commit()
        await db.refresh(db_rating)
        
        # Update skill rating stats
        skill.rating_count += 1
        await _update_skill_rating(skill_id, db)
        
        return db_rating


@router.get("/skills/{skill_id}/ratings", response_model=List[SkillRatingResponse])
async def get_skill_ratings(
    skill_id: str,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SkillRating)
        .where(SkillRating.skill_id == skill_id)
        .where(SkillRating.moderation_status == "published")
        .offset(skip)
        .limit(limit)
        .order_by(SkillRating.created_at.desc())
    )
    ratings = result.scalars().all()
    return ratings


@router.post("/skills/{skill_id}/upload/thumbnail")
async def upload_skill_thumbnail(
    skill_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify skill ownership
    result = await db.execute(
        select(Skill)
        .where(Skill.id == skill_id)
        .where(Skill.creator_id == current_user.id)
    )
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )
    
    # Upload thumbnail
    file_path = await file_storage.upload_image(file, purpose="thumbnail")
    
    # Update skill
    skill.thumbnail_url = file_storage.get_file_url(file_path)
    await db.commit()
    
    return {"thumbnail_url": skill.thumbnail_url}


async def _update_skill_rating(skill_id: str, db: AsyncSession):
    """Update skill average rating"""
    result = await db.execute(
        select(func.avg(SkillRating.rating))
        .where(SkillRating.skill_id == skill_id)
        .where(SkillRating.moderation_status == "published")
    )
    avg_rating = result.scalar()
    
    if avg_rating:
        skill_result = await db.execute(select(Skill).where(Skill.id == skill_id))
        skill = skill_result.scalar_one()
        skill.average_rating = round(float(avg_rating), 2)
        await db.commit()