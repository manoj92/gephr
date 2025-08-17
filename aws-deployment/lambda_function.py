import json
import boto3
import uuid
from datetime import datetime
from typing import Dict, Any, List

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """AWS Lambda handler for Humanoid Training Platform API"""
    
    # Parse the request
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = event.get('body', '{}')
    
    # Parse JSON body if present
    try:
        body_data = json.loads(body) if body else {}
    except:
        body_data = {}
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS requests (CORS preflight)
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight'})
        }
    
    try:
        # Route the request
        if path == '/' or path == '/health':
            return handle_health(headers)
        elif path == '/api/v1/health':
            return handle_api_health(headers)
        elif path == '/api/v1/robots':
            return handle_robots(method, headers, body_data)
        elif path.startswith('/api/v1/robots/') and path.endswith('/connect'):
            robot_id = path.split('/')[-2]
            return handle_robot_connect(robot_id, headers)
        elif path.startswith('/api/v1/robots/') and path.endswith('/disconnect'):
            robot_id = path.split('/')[-2]
            return handle_robot_disconnect(robot_id, headers)
        elif path.startswith('/api/v1/robots/') and len(path.split('/')) == 5:
            robot_id = path.split('/')[-1]
            return handle_robot_by_id(robot_id, headers)
        elif path == '/api/v1/training/sessions':
            return handle_training_sessions(method, headers, body_data)
        elif path == '/api/v1/marketplace':
            return handle_marketplace(headers)
        elif path == '/api/v1/tracking/status':
            return handle_tracking_status(headers)
        elif path == '/api/v1/stats':
            return handle_stats(headers)
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def handle_health(headers):
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': 'Humanoid Training Platform API',
            'version': '1.0.0',
            'status': 'running'
        })
    }

def handle_api_health(headers):
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'status': 'healthy',
            'api_version': 'v1',
            'timestamp': datetime.now().isoformat()
        })
    }

def handle_robots(method, headers, body_data):
    if method == 'GET':
        # Mock robot data for now
        robots = [
            {"id": "robot_1", "name": "Unitree G1", "type": "humanoid", "status": "available", "ip_address": "192.168.1.100"},
            {"id": "robot_2", "name": "Boston Dynamics Spot", "type": "quadruped", "status": "offline", "ip_address": "192.168.1.101"},
            {"id": "robot_3", "name": "Tesla Bot", "type": "humanoid", "status": "busy", "ip_address": "192.168.1.102"},
            {"id": "robot_4", "name": "Custom Robot", "type": "custom", "status": "available", "ip_address": "192.168.1.103"}
        ]
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'robots': robots, 'total': len(robots)})
        }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'})
    }

def handle_robot_by_id(robot_id, headers):
    # Mock data
    robots = {
        "robot_1": {"id": "robot_1", "name": "Unitree G1", "type": "humanoid", "status": "available", "ip_address": "192.168.1.100"},
        "robot_2": {"id": "robot_2", "name": "Boston Dynamics Spot", "type": "quadruped", "status": "offline", "ip_address": "192.168.1.101"},
        "robot_3": {"id": "robot_3", "name": "Tesla Bot", "type": "humanoid", "status": "busy", "ip_address": "192.168.1.102"},
        "robot_4": {"id": "robot_4", "name": "Custom Robot", "type": "custom", "status": "available", "ip_address": "192.168.1.103"}
    }
    
    robot = robots.get(robot_id)
    if not robot:
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'error': 'Robot not found'})
        }
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps(robot)
    }

def handle_robot_connect(robot_id, headers):
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': f'Connected to robot {robot_id}',
            'status': 'connected'
        })
    }

def handle_robot_disconnect(robot_id, headers):
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'message': f'Disconnected from robot {robot_id}',
            'status': 'disconnected'
        })
    }

def handle_training_sessions(method, headers, body_data):
    if method == 'GET':
        sessions = [
            {"id": "session_1", "name": "Hand Gesture Training", "robot_id": "robot_1", "status": "completed", "start_time": "2025-08-10T10:00:00Z", "data_points": 1500},
            {"id": "session_2", "name": "Object Manipulation", "robot_id": "robot_2", "status": "in_progress", "start_time": "2025-08-10T11:30:00Z", "data_points": 800},
            {"id": "session_3", "name": "Walking Patterns", "robot_id": "robot_1", "status": "completed", "start_time": "2025-08-09T14:00:00Z", "data_points": 2200}
        ]
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'sessions': sessions, 'total': len(sessions)})
        }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'})
    }

def handle_marketplace(headers):
    items = [
        {"id": "skill_1", "name": "Pick and Place Mastery", "description": "Advanced pick and place skills for precision manipulation", "price": 99.99, "rating": 4.8, "downloads": 156, "creator": "RoboticsLab"},
        {"id": "skill_2", "name": "Navigation Behavior Pack", "description": "Complete navigation and pathfinding behaviors", "price": 149.99, "rating": 4.5, "downloads": 89, "creator": "NavTech"},
        {"id": "skill_3", "name": "Human Interaction Module", "description": "Natural human-robot interaction patterns", "price": 199.99, "rating": 4.9, "downloads": 234, "creator": "SocialBots"},
        {"id": "skill_4", "name": "Safety Protocols Suite", "description": "Comprehensive safety behaviors and emergency responses", "price": 79.99, "rating": 4.7, "downloads": 321, "creator": "SafetyFirst"}
    ]
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'items': items, 'total': len(items)})
    }

def handle_tracking_status(headers):
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'tracking_active': True,
            'fps': 30,
            'latency_ms': 25,
            'hands_detected': 2
        })
    }

def handle_stats(headers):
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'total_robots': 4,
            'active_sessions': 1,
            'completed_sessions': 2,
            'marketplace_items': 4,
            'total_downloads': 800,
            'platform_uptime': '99.9%'
        })
    }