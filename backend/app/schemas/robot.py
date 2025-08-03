from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class RobotBase(BaseModel):
    name: str
    robot_type: str
    model: Optional[str] = None
    description: Optional[str] = None


class RobotCreate(RobotBase):
    serial_number: Optional[str] = None
    capabilities: Optional[List[str]] = []
    joint_count: Optional[int] = None
    max_payload: Optional[float] = None
    battery_capacity: Optional[float] = None
    manufacturer: Optional[str] = None
    
    @validator('robot_type')
    def validate_robot_type(cls, v):
        allowed_types = ['unitree_g1', 'boston_dynamics', 'tesla_bot', 'custom']
        if v not in allowed_types:
            raise ValueError(f'Robot type must be one of: {allowed_types}')
        return v


class RobotResponse(RobotBase):
    id: str
    serial_number: Optional[str] = None
    capabilities: Optional[List[str]] = []
    joint_count: Optional[int] = None
    max_payload: Optional[float] = None
    battery_capacity: Optional[float] = None
    is_active: bool
    firmware_version: Optional[str] = None
    manufacturer: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class RobotConnectionCreate(BaseModel):
    robot_id: str
    connection_type: str
    ip_address: Optional[str] = None
    port: Optional[int] = None
    bluetooth_id: Optional[str] = None
    
    @validator('connection_type')
    def validate_connection_type(cls, v):
        allowed_types = ['wifi', 'bluetooth', 'usb', 'ethernet']
        if v not in allowed_types:
            raise ValueError(f'Connection type must be one of: {allowed_types}')
        return v


class RobotConnectionResponse(BaseModel):
    id: str
    robot_id: str
    user_id: str
    connection_type: str
    status: str
    connection_quality: float
    current_battery_level: Optional[float] = None
    current_position: Optional[Dict[str, float]] = None
    current_rotation: Optional[Dict[str, float]] = None
    joint_positions: Optional[List[float]] = None
    created_at: datetime
    last_heartbeat: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RobotCommandCreate(BaseModel):
    robot_id: str
    command_type: str
    parameters: Dict[str, Any]
    priority: Optional[str] = "medium"
    timeout_seconds: Optional[int] = 30
    
    @validator('command_type')
    def validate_command_type(cls, v):
        allowed_types = ['move', 'pick', 'place', 'rotate', 'stop', 'navigate', 'custom', 'grasp_object']
        if v not in allowed_types:
            raise ValueError(f'Command type must be one of: {allowed_types}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        allowed_priorities = ['low', 'medium', 'high', 'emergency', 'critical']
        if v not in allowed_priorities:
            raise ValueError(f'Priority must be one of: {allowed_priorities}')
        return v


class RobotCommandResponse(BaseModel):
    id: str
    robot_id: str
    command_type: str
    parameters: Dict[str, Any]
    status: str
    progress: float
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class RobotState(BaseModel):
    position: Dict[str, float]
    rotation: Dict[str, float]
    joint_positions: List[float]
    joint_velocities: Optional[List[float]] = []
    battery_level: float
    error_state: bool
    current_task: Optional[str] = None
    connection_quality: float
    timestamp: datetime