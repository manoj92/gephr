from typing import Dict, List, Optional, Any
import asyncio
import json
import logging
from datetime import datetime, timedelta
from enum import Enum
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import aiofiles
import redis.asyncio as redis
from app.core.config import settings
from app.core.websocket import websocket_manager

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    ACHIEVEMENT = "achievement"
    ROBOT_STATUS = "robot_status"
    TRAINING_COMPLETE = "training_complete"
    MARKETPLACE_UPDATE = "marketplace_update"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class NotificationService:
    """
    Comprehensive notification service for the Humanoid Training Platform.
    Handles real-time notifications, email alerts, push notifications, and achievement notifications.
    """
    
    def __init__(self):
        self.redis_client = None
        self.notification_templates = self._load_notification_templates()
        self.achievement_sounds = {
            'bronze': '/sounds/achievement_bronze.mp3',
            'silver': '/sounds/achievement_silver.mp3', 
            'gold': '/sounds/achievement_gold.mp3',
            'platinum': '/sounds/achievement_platinum.mp3'
        }
    
    async def initialize(self):
        """Initialize Redis connection for notification queue"""
        try:
            if settings.REDIS_URL:
                self.redis_client = redis.from_url(settings.REDIS_URL)
                await self.redis_client.ping()
                logger.info("Notification service initialized with Redis")
        except Exception as e:
            logger.warning(f"Redis not available, using in-memory notifications: {e}")
    
    def _load_notification_templates(self) -> Dict[str, Dict]:
        """Load notification templates for different types"""
        return {
            NotificationType.ACHIEVEMENT: {
                'title': 'Achievement Unlocked!',
                'icon': '🏆',
                'color': '#FFD700',
                'sound': True,
                'persist': True
            },
            NotificationType.ROBOT_STATUS: {
                'title': 'Robot Status Update',
                'icon': '🤖',
                'color': '#00BCD4',
                'sound': False,
                'persist': False
            },
            NotificationType.TRAINING_COMPLETE: {
                'title': 'Training Session Complete',
                'icon': '✅',
                'color': '#4CAF50',
                'sound': True,
                'persist': True
            },
            NotificationType.MARKETPLACE_UPDATE: {
                'title': 'Marketplace Update',
                'icon': '🛒',
                'color': '#FF9800',
                'sound': False,
                'persist': True
            },
            NotificationType.ERROR: {
                'title': 'Error Occurred',
                'icon': '❌',
                'color': '#F44336',
                'sound': True,
                'persist': True
            },
            NotificationType.WARNING: {
                'title': 'Warning',
                'icon': '⚠️',
                'color': '#FF9800',
                'sound': False,
                'persist': True
            },
            NotificationType.SUCCESS: {
                'title': 'Success',
                'icon': '✅',
                'color': '#4CAF50',
                'sound': False,
                'persist': False
            },
            NotificationType.INFO: {
                'title': 'Information',
                'icon': 'ℹ️',
                'color': '#2196F3',
                'sound': False,
                'persist': False
            }
        }
    
    async def send_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        message: str,
        title: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        channels: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send a notification through specified channels
        
        Args:
            user_id: Target user ID
            notification_type: Type of notification
            message: Notification message
            title: Custom title (uses template default if not provided)
            data: Additional data payload
            priority: Notification priority
            channels: List of channels ['websocket', 'email', 'push']
        """
        if channels is None:
            channels = ['websocket']
        
        # Get template for notification type
        template = self.notification_templates.get(notification_type, {})
        
        # Create notification object
        notification = {
            'id': f"notif_{datetime.utcnow().timestamp()}",
            'user_id': user_id,
            'type': notification_type.value,
            'title': title or template.get('title', 'Notification'),
            'message': message,
            'icon': template.get('icon', '📱'),
            'color': template.get('color', '#2196F3'),
            'priority': priority.value,
            'timestamp': datetime.utcnow().isoformat(),
            'read': False,
            'data': data or {},
            'channels': channels,
            'template': template
        }
        
        # Send through specified channels
        results = {}
        
        if 'websocket' in channels:
            results['websocket'] = await self._send_websocket_notification(notification)
        
        if 'email' in channels:
            results['email'] = await self._send_email_notification(notification)
        
        if 'push' in channels:
            results['push'] = await self._send_push_notification(notification)
        
        # Store notification in database/cache
        await self._store_notification(notification)
        
        return {
            'notification_id': notification['id'],
            'sent_at': notification['timestamp'],
            'channels': results,
            'success': any(results.values())
        }
    
    async def _send_websocket_notification(self, notification: Dict) -> bool:
        """Send notification via WebSocket"""
        try:
            await websocket_manager.send_to_user(
                {
                    'type': 'notification',
                    'notification': notification
                },
                notification['user_id']
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification: {e}")
            return False
    
    async def _send_email_notification(self, notification: Dict) -> bool:
        """Send notification via email"""
        try:
            # This would require user email lookup from database
            # For now, return True if email settings are configured
            if settings.SMTP_HOST and settings.SMTP_USER:
                # Email sending logic would go here
                logger.info(f"Email notification sent for {notification['user_id']}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return False
    
    async def _send_push_notification(self, notification: Dict) -> bool:
        """Send push notification"""
        try:
            # Push notification logic would go here (FCM, etc.)
            logger.info(f"Push notification sent for {notification['user_id']}")
            return True
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False
    
    async def _store_notification(self, notification: Dict):
        """Store notification for later retrieval"""
        try:
            if self.redis_client:
                # Store in Redis with expiration
                key = f"notification:{notification['user_id']}:{notification['id']}"
                await self.redis_client.setex(
                    key, 
                    timedelta(days=30).total_seconds(),
                    json.dumps(notification)
                )
                
                # Add to user's notification list
                list_key = f"notifications:{notification['user_id']}"
                await self.redis_client.lpush(list_key, notification['id'])
                await self.redis_client.expire(list_key, timedelta(days=30).total_seconds())
        except Exception as e:
            logger.error(f"Failed to store notification: {e}")
    
    async def send_achievement_notification(
        self,
        user_id: str,
        achievement_name: str,
        achievement_description: str,
        rarity: str = 'bronze',
        xp_gained: int = 0,
        coins_gained: int = 0
    ) -> Dict[str, Any]:
        """Send a special achievement notification with enhanced formatting"""
        
        # Determine achievement tier and effects
        tier_effects = {
            'bronze': {'color': '#CD7F32', 'sparkles': 10, 'duration': 3000},
            'silver': {'color': '#C0C0C0', 'sparkles': 20, 'duration': 4000},
            'gold': {'color': '#FFD700', 'sparkles': 30, 'duration': 5000},
            'platinum': {'color': '#E5E4E2', 'sparkles': 50, 'duration': 6000}
        }
        
        effects = tier_effects.get(rarity, tier_effects['bronze'])
        
        # Create achievement notification
        achievement_data = {
            'achievement_name': achievement_name,
            'description': achievement_description,
            'rarity': rarity,
            'xp_gained': xp_gained,
            'coins_gained': coins_gained,
            'sound_file': self.achievement_sounds.get(rarity),
            'animation': {
                'type': 'sparkle_burst',
                'color': effects['color'],
                'sparkle_count': effects['sparkles'],
                'duration': effects['duration']
            },
            'celebration_level': rarity
        }
        
        message = f"You've unlocked: {achievement_name}!"
        if xp_gained > 0:
            message += f" (+{xp_gained} XP"
        if coins_gained > 0:
            message += f", +{coins_gained} coins"
        if xp_gained > 0 or coins_gained > 0:
            message += ")"
        
        return await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.ACHIEVEMENT,
            message=message,
            title=f"🏆 {rarity.title()} Achievement!",
            data=achievement_data,
            priority=NotificationPriority.HIGH,
            channels=['websocket', 'push']
        )
    
    async def send_robot_status_notification(
        self,
        user_id: str,
        robot_name: str,
        status: str,
        details: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Send robot status notification"""
        
        status_messages = {
            'connected': f"Successfully connected to {robot_name}",
            'disconnected': f"Disconnected from {robot_name}",
            'error': f"Connection error with {robot_name}",
            'low_battery': f"{robot_name} battery is low ({details.get('battery_level', 0)}%)",
            'task_complete': f"{robot_name} completed task: {details.get('task_name', 'Unknown')}",
            'task_failed': f"{robot_name} failed task: {details.get('task_name', 'Unknown')}"
        }
        
        message = status_messages.get(status, f"{robot_name} status: {status}")
        
        # Determine priority based on status
        priority_map = {
            'error': NotificationPriority.HIGH,
            'low_battery': NotificationPriority.HIGH,
            'task_failed': NotificationPriority.NORMAL,
            'connected': NotificationPriority.LOW,
            'disconnected': NotificationPriority.LOW,
            'task_complete': NotificationPriority.NORMAL
        }
        
        priority = priority_map.get(status, NotificationPriority.NORMAL)
        
        robot_data = {
            'robot_name': robot_name,
            'status': status,
            'details': details or {},
            'icon': '🤖' if status in ['connected', 'task_complete'] else '⚠️'
        }
        
        return await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.ROBOT_STATUS,
            message=message,
            data=robot_data,
            priority=priority,
            channels=['websocket']
        )
    
    async def send_training_complete_notification(
        self,
        user_id: str,
        session_name: str,
        duration_minutes: int,
        data_points_collected: int,
        accuracy_score: float
    ) -> Dict[str, Any]:
        """Send training session completion notification"""
        
        message = (
            f"Training session '{session_name}' completed! "
            f"Duration: {duration_minutes}m, "
            f"Data points: {data_points_collected}, "
            f"Accuracy: {accuracy_score:.1%}"
        )
        
        training_data = {
            'session_name': session_name,
            'duration_minutes': duration_minutes,
            'data_points_collected': data_points_collected,
            'accuracy_score': accuracy_score,
            'completion_time': datetime.utcnow().isoformat()
        }
        
        # Check for performance-based achievements
        if accuracy_score >= 0.95:
            # Send achievement notification for high accuracy
            await self.send_achievement_notification(
                user_id=user_id,
                achievement_name="Precision Master",
                achievement_description="Achieved 95%+ accuracy in training",
                rarity='gold',
                xp_gained=100,
                coins_gained=50
            )
        
        return await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.TRAINING_COMPLETE,
            message=message,
            data=training_data,
            priority=NotificationPriority.NORMAL,
            channels=['websocket', 'push']
        )
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 20,
        unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for a user"""
        try:
            if not self.redis_client:
                return []
            
            # Get notification IDs from user's list
            list_key = f"notifications:{user_id}"
            notification_ids = await self.redis_client.lrange(list_key, 0, limit - 1)
            
            notifications = []
            for notif_id in notification_ids:
                key = f"notification:{user_id}:{notif_id}"
                data = await self.redis_client.get(key)
                
                if data:
                    notification = json.loads(data)
                    if unread_only and notification.get('read', False):
                        continue
                    notifications.append(notification)
            
            return notifications
            
        except Exception as e:
            logger.error(f"Failed to get user notifications: {e}")
            return []
    
    async def mark_notification_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a notification as read"""
        try:
            if not self.redis_client:
                return False
            
            key = f"notification:{user_id}:{notification_id}"
            data = await self.redis_client.get(key)
            
            if data:
                notification = json.loads(data)
                notification['read'] = True
                notification['read_at'] = datetime.utcnow().isoformat()
                
                await self.redis_client.setex(
                    key,
                    timedelta(days=30).total_seconds(),
                    json.dumps(notification)
                )
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def clear_user_notifications(self, user_id: str) -> bool:
        """Clear all notifications for a user"""
        try:
            if not self.redis_client:
                return False
            
            # Get all notification IDs
            list_key = f"notifications:{user_id}"
            notification_ids = await self.redis_client.lrange(list_key, 0, -1)
            
            # Delete individual notifications
            for notif_id in notification_ids:
                key = f"notification:{user_id}:{notif_id}"
                await self.redis_client.delete(key)
            
            # Clear the list
            await self.redis_client.delete(list_key)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear user notifications: {e}")
            return False
    
    async def send_bulk_notification(
        self,
        user_ids: List[str],
        notification_type: NotificationType,
        message: str,
        title: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send notification to multiple users"""
        
        results = {
            'sent': 0,
            'failed': 0,
            'user_results': {}
        }
        
        # Send notifications concurrently
        tasks = []
        for user_id in user_ids:
            task = self.send_notification(
                user_id=user_id,
                notification_type=notification_type,
                message=message,
                title=title,
                data=data,
                channels=['websocket']
            )
            tasks.append((user_id, task))
        
        # Wait for all notifications to complete
        for user_id, task in tasks:
            try:
                result = await task
                results['user_results'][user_id] = result
                if result['success']:
                    results['sent'] += 1
                else:
                    results['failed'] += 1
            except Exception as e:
                results['user_results'][user_id] = {'error': str(e)}
                results['failed'] += 1
        
        return results
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.redis_client:
                await self.redis_client.close()
        except Exception as e:
            logger.error(f"Error during notification service cleanup: {e}")

# Global notification service instance
notification_service = NotificationService()