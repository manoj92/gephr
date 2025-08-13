import boto3
import os
from boto3.dynamodb.conditions import Key
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import json

class DynamoDBService:
    def __init__(self):
        # Use local DynamoDB for development, AWS for production
        if os.getenv('AWS_SAM_LOCAL') or os.getenv('IS_LOCAL'):
            self.dynamodb = boto3.resource('dynamodb', endpoint_url='http://localhost:8000')
        else:
            self.dynamodb = boto3.resource('dynamodb')
        
        # Table names from environment variables
        self.robots_table_name = os.getenv('ROBOTS_TABLE', 'humanoid-robots')
        self.sessions_table_name = os.getenv('SESSIONS_TABLE', 'training-sessions')
        self.marketplace_table_name = os.getenv('MARKETPLACE_TABLE', 'marketplace-items')
        
        # Initialize tables
        self.robots_table = self.dynamodb.Table(self.robots_table_name)
        self.sessions_table = self.dynamodb.Table(self.sessions_table_name)
        self.marketplace_table = self.dynamodb.Table(self.marketplace_table_name)

    async def init_sample_data(self):
        """Initialize tables with sample data if they're empty"""
        try:
            # Check if robots table is empty
            response = self.robots_table.scan(Limit=1)
            if response['Count'] == 0:
                await self._populate_robots()
            
            # Check if marketplace table is empty
            response = self.marketplace_table.scan(Limit=1)
            if response['Count'] == 0:
                await self._populate_marketplace()
                
            # Check if sessions table is empty
            response = self.sessions_table.scan(Limit=1)
            if response['Count'] == 0:
                await self._populate_sessions()
                
        except Exception as e:
            print(f"Error initializing sample data: {e}")

    async def _populate_robots(self):
        """Populate robots table with sample data"""
        robots = [
            {"id": "robot_1", "name": "Unitree G1", "type": "humanoid", "status": "available", "ip_address": "192.168.1.100", "created_at": datetime.now().isoformat()},
            {"id": "robot_2", "name": "Boston Dynamics Spot", "type": "quadruped", "status": "offline", "ip_address": "192.168.1.101", "created_at": datetime.now().isoformat()},
            {"id": "robot_3", "name": "Tesla Bot", "type": "humanoid", "status": "busy", "ip_address": "192.168.1.102", "created_at": datetime.now().isoformat()},
            {"id": "robot_4", "name": "Custom Robot", "type": "custom", "status": "available", "ip_address": "192.168.1.103", "created_at": datetime.now().isoformat()}
        ]
        
        for robot in robots:
            self.robots_table.put_item(Item=robot)

    async def _populate_marketplace(self):
        """Populate marketplace table with sample data"""
        items = [
            {"id": "skill_1", "name": "Pick and Place Mastery", "description": "Advanced pick and place skills for precision manipulation", "price": 99.99, "rating": 4.8, "downloads": 156, "creator": "RoboticsLab", "created_at": datetime.now().isoformat()},
            {"id": "skill_2", "name": "Navigation Behavior Pack", "description": "Complete navigation and pathfinding behaviors", "price": 149.99, "rating": 4.5, "downloads": 89, "creator": "NavTech", "created_at": datetime.now().isoformat()},
            {"id": "skill_3", "name": "Human Interaction Module", "description": "Natural human-robot interaction patterns", "price": 199.99, "rating": 4.9, "downloads": 234, "creator": "SocialBots", "created_at": datetime.now().isoformat()},
            {"id": "skill_4", "name": "Safety Protocols Suite", "description": "Comprehensive safety behaviors and emergency responses", "price": 79.99, "rating": 4.7, "downloads": 321, "creator": "SafetyFirst", "created_at": datetime.now().isoformat()}
        ]
        
        for item in items:
            self.marketplace_table.put_item(Item=item)

    async def _populate_sessions(self):
        """Populate sessions table with sample data"""
        sessions = [
            {"id": "session_1", "name": "Hand Gesture Training", "robot_id": "robot_1", "status": "completed", "start_time": "2025-08-10T10:00:00Z", "data_points": 1500, "created_at": datetime.now().isoformat()},
            {"id": "session_2", "name": "Object Manipulation", "robot_id": "robot_2", "status": "in_progress", "start_time": "2025-08-10T11:30:00Z", "data_points": 800, "created_at": datetime.now().isoformat()},
            {"id": "session_3", "name": "Walking Patterns", "robot_id": "robot_1", "status": "completed", "start_time": "2025-08-09T14:00:00Z", "data_points": 2200, "end_time": "2025-08-09T16:30:00Z", "created_at": datetime.now().isoformat()}
        ]
        
        for session in sessions:
            self.sessions_table.put_item(Item=session)

    # Robot operations
    async def get_all_robots(self) -> List[Dict[str, Any]]:
        """Get all robots from DynamoDB"""
        try:
            response = self.robots_table.scan()
            return response.get('Items', [])
        except Exception as e:
            print(f"Error getting robots: {e}")
            return []

    async def get_robot(self, robot_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific robot by ID"""
        try:
            response = self.robots_table.get_item(Key={'id': robot_id})
            return response.get('Item')
        except Exception as e:
            print(f"Error getting robot {robot_id}: {e}")
            return None

    async def update_robot_status(self, robot_id: str, status: str, last_seen: str = None) -> bool:
        """Update robot status"""
        try:
            update_expression = "SET #status = :status"
            expression_attribute_names = {"#status": "status"}
            expression_attribute_values = {":status": status}
            
            if last_seen:
                update_expression += ", last_seen = :last_seen"
                expression_attribute_values[":last_seen"] = last_seen
            
            self.robots_table.update_item(
                Key={'id': robot_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values
            )
            return True
        except Exception as e:
            print(f"Error updating robot {robot_id}: {e}")
            return False

    # Training session operations
    async def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Get all training sessions"""
        try:
            response = self.sessions_table.scan()
            return response.get('Items', [])
        except Exception as e:
            print(f"Error getting sessions: {e}")
            return []

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific training session by ID"""
        try:
            response = self.sessions_table.get_item(Key={'id': session_id})
            return response.get('Item')
        except Exception as e:
            print(f"Error getting session {session_id}: {e}")
            return None

    async def create_session(self, name: str, robot_id: str) -> Dict[str, Any]:
        """Create a new training session"""
        session = {
            "id": f"session_{uuid.uuid4().hex[:8]}",
            "name": name,
            "robot_id": robot_id,
            "status": "active",
            "start_time": datetime.now().isoformat(),
            "data_points": 0,
            "created_at": datetime.now().isoformat()
        }
        
        try:
            self.sessions_table.put_item(Item=session)
            return session
        except Exception as e:
            print(f"Error creating session: {e}")
            raise

    async def update_session_data_points(self, session_id: str, additional_points: int) -> bool:
        """Update session data points count"""
        try:
            self.sessions_table.update_item(
                Key={'id': session_id},
                UpdateExpression="ADD data_points :points",
                ExpressionAttributeValues={":points": additional_points}
            )
            return True
        except Exception as e:
            print(f"Error updating session data points {session_id}: {e}")
            return False

    async def complete_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Mark a training session as completed"""
        try:
            self.sessions_table.update_item(
                Key={'id': session_id},
                UpdateExpression="SET #status = :status, end_time = :end_time",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":status": "completed",
                    ":end_time": datetime.now().isoformat()
                }
            )
            
            # Return updated session
            return await self.get_session(session_id)
        except Exception as e:
            print(f"Error completing session {session_id}: {e}")
            return None

    # Marketplace operations
    async def get_all_marketplace_items(self) -> List[Dict[str, Any]]:
        """Get all marketplace items"""
        try:
            response = self.marketplace_table.scan()
            return response.get('Items', [])
        except Exception as e:
            print(f"Error getting marketplace items: {e}")
            return []

    async def get_marketplace_item(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific marketplace item by ID"""
        try:
            response = self.marketplace_table.get_item(Key={'id': item_id})
            return response.get('Item')
        except Exception as e:
            print(f"Error getting marketplace item {item_id}: {e}")
            return None

    async def increment_downloads(self, item_id: str) -> bool:
        """Increment download count for a marketplace item"""
        try:
            self.marketplace_table.update_item(
                Key={'id': item_id},
                UpdateExpression="ADD downloads :inc",
                ExpressionAttributeValues={":inc": 1}
            )
            return True
        except Exception as e:
            print(f"Error incrementing downloads for {item_id}: {e}")
            return False

# Singleton instance
db_service = DynamoDBService()