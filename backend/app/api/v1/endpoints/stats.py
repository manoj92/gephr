from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.user import User
from app.models.training import TrainingSession
from app.models.marketplace import MarketplaceItem
from app.models.robot import RobotConnection
from app.api.deps import get_current_user
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Application start time for uptime calculation
app_start_time = datetime.now()

@router.get("/")
async def get_platform_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get overall platform statistics"""
    try:
        # Count total robots (connections)
        robot_count_result = await db.execute(
            select(func.count(RobotConnection.id))
        )
        total_robots = robot_count_result.scalar() or 0
        
        # Count active sessions
        active_sessions_result = await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.status == "active")
        )
        active_sessions = active_sessions_result.scalar() or 0
        
        # Count completed sessions
        completed_sessions_result = await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.status == "completed")
        )
        completed_sessions = completed_sessions_result.scalar() or 0
        
        # Count marketplace items
        marketplace_items_result = await db.execute(
            select(func.count(MarketplaceItem.id))
        )
        marketplace_items = marketplace_items_result.scalar() or 0
        
        # Calculate total downloads (sum of download counts from marketplace items)
        total_downloads_result = await db.execute(
            select(func.sum(MarketplaceItem.downloads))
        )
        total_downloads = total_downloads_result.scalar() or 0
        
        # Calculate uptime
        uptime_duration = datetime.now() - app_start_time
        uptime_str = f"{uptime_duration.days}d {uptime_duration.seconds // 3600}h {(uptime_duration.seconds % 3600) // 60}m"
        
        return {
            "total_robots": total_robots,
            "active_sessions": active_sessions,
            "completed_sessions": completed_sessions,
            "marketplace_items": marketplace_items,
            "total_downloads": total_downloads,
            "platform_uptime": uptime_str,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting platform stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get platform statistics: {str(e)}"
        )

@router.get("/user")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for the current user"""
    try:
        # Count user's training sessions
        user_sessions_result = await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.user_id == current_user.id)
        )
        total_sessions = user_sessions_result.scalar() or 0
        
        # Count user's active sessions
        active_sessions_result = await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.user_id == current_user.id)
            .where(TrainingSession.status == "active")
        )
        active_sessions = active_sessions_result.scalar() or 0
        
        # Count user's marketplace items
        user_items_result = await db.execute(
            select(func.count(MarketplaceItem.id))
            .where(MarketplaceItem.creator_id == current_user.id)
        )
        marketplace_items = user_items_result.scalar() or 0
        
        # Calculate total earnings (if price field exists)
        total_earnings_result = await db.execute(
            select(func.sum(MarketplaceItem.price * MarketplaceItem.downloads))
            .where(MarketplaceItem.creator_id == current_user.id)
        )
        total_earnings = total_earnings_result.scalar() or 0.0
        
        # Get recent activity (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_sessions_result = await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.user_id == current_user.id)
            .where(TrainingSession.created_at >= week_ago)
        )
        recent_sessions = recent_sessions_result.scalar() or 0
        
        return {
            "user_id": str(current_user.id),
            "username": current_user.username,
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "marketplace_items": marketplace_items,
            "total_earnings": float(total_earnings),
            "recent_sessions_7d": recent_sessions,
            "account_created": current_user.created_at.isoformat() if hasattr(current_user, 'created_at') else None,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user statistics: {str(e)}"
        )

@router.get("/activity")
async def get_activity_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get activity statistics for the specified time period"""
    try:
        if days < 1 or days > 365:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days parameter must be between 1 and 365"
            )
        
        start_date = datetime.now() - timedelta(days=days)
        
        # Get training sessions in period
        sessions_result = await db.execute(
            select(func.count(TrainingSession.id))
            .where(TrainingSession.created_at >= start_date)
        )
        total_sessions = sessions_result.scalar() or 0
        
        # Get new users in period (if user has created_at field)
        users_result = await db.execute(
            select(func.count(User.id))
            .where(User.created_at >= start_date) if hasattr(User, 'created_at') else select(func.count(User.id)).where(False)
        )
        new_users = users_result.scalar() or 0
        
        # Get new marketplace items in period
        items_result = await db.execute(
            select(func.count(MarketplaceItem.id))
            .where(MarketplaceItem.created_at >= start_date)
        )
        new_items = items_result.scalar() or 0
        
        # Calculate daily averages
        daily_avg_sessions = total_sessions / days if days > 0 else 0
        daily_avg_users = new_users / days if days > 0 else 0
        
        return {
            "period_days": days,
            "start_date": start_date.isoformat(),
            "end_date": datetime.now().isoformat(),
            "total_sessions": total_sessions,
            "new_users": new_users,
            "new_marketplace_items": new_items,
            "daily_avg_sessions": round(daily_avg_sessions, 2),
            "daily_avg_new_users": round(daily_avg_users, 2),
            "last_updated": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activity stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get activity statistics: {str(e)}"
        )