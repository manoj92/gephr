import json
from datetime import datetime

def lambda_handler(event, context):
    """Simple AWS Lambda handler for Humanoid Training Platform API"""
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS requests (CORS preflight)
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight'})
        }
    
    # Sample robot data
    robots = [
        {"id": "robot_1", "name": "Unitree G1", "type": "humanoid", "status": "available", "ip_address": "192.168.1.100"},
        {"id": "robot_2", "name": "Boston Dynamics Spot", "type": "quadruped", "status": "offline", "ip_address": "192.168.1.101"},
        {"id": "robot_3", "name": "Tesla Bot", "type": "humanoid", "status": "busy", "ip_address": "192.168.1.102"},
        {"id": "robot_4", "name": "Custom Robot", "type": "custom", "status": "available", "ip_address": "192.168.1.103"}
    ]
    
    sessions = [
        {"id": "session_1", "name": "Hand Gesture Training", "robot_id": "robot_1", "status": "completed", "start_time": "2025-08-10T10:00:00Z", "data_points": 1500},
        {"id": "session_2", "name": "Object Manipulation", "robot_id": "robot_2", "status": "in_progress", "start_time": "2025-08-10T11:30:00Z", "data_points": 800}
    ]
    
    marketplace = [
        {"id": "skill_1", "name": "Pick and Place Mastery", "description": "Advanced pick and place skills", "price": 99.99, "rating": 4.8, "downloads": 156, "creator": "RoboticsLab"},
        {"id": "skill_2", "name": "Navigation Behavior Pack", "description": "Complete navigation behaviors", "price": 149.99, "rating": 4.5, "downloads": 89, "creator": "NavTech"}
    ]
    
    # Route handling
    path = event.get('path', '/')
    
    try:
        if path == '/' or path == '/health':
            response_body = {"message": "Humanoid Training Platform API", "version": "1.0.0", "status": "running"}
        elif path == '/api/v1/health':
            response_body = {"status": "healthy", "api_version": "v1", "timestamp": datetime.now().isoformat()}
        elif path == '/api/v1/robots':
            response_body = {"robots": robots, "total": len(robots)}
        elif path == '/api/v1/training/sessions':
            response_body = {"sessions": sessions, "total": len(sessions)}
        elif path == '/api/v1/marketplace':
            response_body = {"items": marketplace, "total": len(marketplace)}
        elif path == '/api/v1/tracking/status':
            response_body = {"tracking_active": True, "fps": 30, "latency_ms": 25, "hands_detected": 2}
        elif path == '/api/v1/stats':
            response_body = {"total_robots": 4, "active_sessions": 1, "completed_sessions": 2, "marketplace_items": 4, "total_downloads": 245, "platform_uptime": "99.9%"}
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Endpoint not found'})
            }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_body)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }