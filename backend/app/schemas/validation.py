"""
Comprehensive data validation schemas for the Humanoid Training Platform
"""

from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date
from enum import Enum
import re
from pydantic import (
    BaseModel, 
    Field, 
    validator, 
    root_validator,
    EmailStr,
    HttpUrl,
    constr,
    confloat,
    conint,
    conlist
)

# ==================== ENUMS ====================

class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    RESEARCHER = "researcher"
    OPERATOR = "operator"
    VIEWER = "viewer"

class RobotTypeEnum(str, Enum):
    UNITREE_G1 = "unitree_g1"
    CUSTOM_HUMANOID = "custom_humanoid"

class TrainingStatusEnum(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class GestureTypeEnum(str, Enum):
    GRASP = "grasp"
    RELEASE = "release"
    POINT = "point"
    WAVE = "wave"
    PICK = "pick"
    PLACE = "place"
    ROTATE = "rotate"
    PUSH = "push"
    PULL = "pull"

class DataFormatEnum(str, Enum):
    JSON = "json"
    CSV = "csv"
    LErobot = "lerobot"
    H5 = "h5"

# ==================== CUSTOM VALIDATORS ====================

def validate_phone_number(phone: str) -> str:
    """Validate phone number format"""
    pattern = r'^\+?1?\d{9,15}$'
    if not re.match(pattern, phone):
        raise ValueError('Invalid phone number format')
    return phone

def validate_password_strength(password: str) -> str:
    """Validate password strength"""
    if len(password) < 8:
        raise ValueError('Password must be at least 8 characters long')
    
    if not re.search(r'[A-Z]', password):
        raise ValueError('Password must contain at least one uppercase letter')
    
    if not re.search(r'[a-z]', password):
        raise ValueError('Password must contain at least one lowercase letter')
    
    if not re.search(r'\d', password):
        raise ValueError('Password must contain at least one digit')
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError('Password must contain at least one special character')
    
    return password

def validate_robot_serial_number(serial: str) -> str:
    """Validate robot serial number format"""
    pattern = r'^[A-Z]{2}\d{6}[A-Z]{2}$'
    if not re.match(pattern, serial):
        raise ValueError('Invalid robot serial number format (expected: XX######XX)')
    return serial

def validate_coordinates(coords: List[float]) -> List[float]:
    """Validate 3D coordinates"""
    if len(coords) != 3:
        raise ValueError('Coordinates must contain exactly 3 values (x, y, z)')
    
    for coord in coords:
        if not -1000 <= coord <= 1000:
            raise ValueError('Coordinate values must be between -1000 and 1000')
    
    return coords

def validate_joint_angles(angles: List[float]) -> List[float]:
    """Validate joint angles in degrees"""
    if len(angles) > 30:
        raise ValueError('Too many joint angles (maximum 30)')
    
    for angle in angles:
        if not -360 <= angle <= 360:
            raise ValueError('Joint angles must be between -360 and 360 degrees')
    
    return angles

# ==================== USER SCHEMAS ====================

class UserCreateSchema(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: constr(min_length=8, max_length=128) = Field(..., description="User password")
    full_name: constr(min_length=2, max_length=100) = Field(..., description="User full name")
    phone: Optional[str] = Field(None, description="User phone number")
    role: UserRoleEnum = Field(UserRoleEnum.VIEWER, description="User role")
    organization: Optional[constr(max_length=100)] = Field(None, description="User organization")
    
    @validator('password')
    def validate_password(cls, v):
        return validate_password_strength(v)
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            return validate_phone_number(v)
        return v
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if not re.match(r'^[a-zA-Z\s\-\.\']+$', v):
            raise ValueError('Full name can only contain letters, spaces, hyphens, dots, and apostrophes')
        return v.strip()

class UserUpdateSchema(BaseModel):
    full_name: Optional[constr(min_length=2, max_length=100)] = None
    phone: Optional[str] = None
    organization: Optional[constr(max_length=100)] = None
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            return validate_phone_number(v)
        return v

class UserResponseSchema(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str]
    role: UserRoleEnum
    organization: Optional[str]
    is_active: bool
    email_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True

# ==================== ROBOT SCHEMAS ====================

class RobotCreateSchema(BaseModel):
    name: constr(min_length=1, max_length=50) = Field(..., description="Robot name")
    robot_type: RobotTypeEnum = Field(..., description="Type of robot")
    serial_number: constr(min_length=8, max_length=20) = Field(..., description="Robot serial number")
    ip_address: str = Field(..., description="Robot IP address")
    port: conint(ge=1024, le=65535) = Field(8080, description="Robot communication port")
    specifications: Dict[str, Any] = Field(default_factory=dict, description="Robot specifications")
    
    @validator('serial_number')
    def validate_serial(cls, v):
        return validate_robot_serial_number(v)
    
    @validator('ip_address')
    def validate_ip(cls, v):
        import ipaddress
        try:
            ipaddress.ip_address(v)
        except ValueError:
            raise ValueError('Invalid IP address format')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if not re.match(r'^[a-zA-Z0-9\s\-_]+$', v):
            raise ValueError('Robot name can only contain letters, numbers, spaces, hyphens, and underscores')
        return v.strip()

class RobotStateSchema(BaseModel):
    robot_id: str = Field(..., description="Robot ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="State timestamp")
    position: List[float] = Field(..., description="Robot position (x, y, z)")
    orientation: List[float] = Field(..., description="Robot orientation (roll, pitch, yaw)")
    joint_angles: List[float] = Field(..., description="Current joint angles")
    battery_level: confloat(ge=0, le=100) = Field(..., description="Battery level percentage")
    temperature: confloat(ge=-50, le=100) = Field(..., description="Operating temperature in Celsius")
    status: str = Field(..., description="Robot status")
    
    @validator('position')
    def validate_position(cls, v):
        return validate_coordinates(v)
    
    @validator('orientation')
    def validate_orientation(cls, v):
        if len(v) != 3:
            raise ValueError('Orientation must contain exactly 3 values (roll, pitch, yaw)')
        for angle in v:
            if not -180 <= angle <= 180:
                raise ValueError('Orientation angles must be between -180 and 180 degrees')
        return v
    
    @validator('joint_angles')
    def validate_joints(cls, v):
        return validate_joint_angles(v)

class RobotCommandSchema(BaseModel):
    robot_id: str = Field(..., description="Robot ID")
    command_type: str = Field(..., description="Type of command")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Command parameters")
    priority: conint(ge=1, le=10) = Field(5, description="Command priority (1=highest, 10=lowest)")
    timeout: conint(ge=1, le=300) = Field(30, description="Command timeout in seconds")
    
    @validator('command_type')
    def validate_command_type(cls, v):
        allowed_commands = [
            'move_to_position', 'set_joint_angles', 'grasp_object', 
            'release_object', 'emergency_stop', 'reset_position',
            'start_recording', 'stop_recording', 'calibrate'
        ]
        if v not in allowed_commands:
            raise ValueError(f'Invalid command type. Allowed: {", ".join(allowed_commands)}')
        return v

# ==================== TRAINING SCHEMAS ====================

class HandKeypointSchema(BaseModel):
    x: confloat(ge=0, le=1) = Field(..., description="X coordinate (normalized)")
    y: confloat(ge=0, le=1) = Field(..., description="Y coordinate (normalized)")
    z: confloat(ge=-1, le=1) = Field(..., description="Z coordinate (normalized)")
    confidence: confloat(ge=0, le=1) = Field(..., description="Detection confidence")

class HandPoseSchema(BaseModel):
    landmarks: conlist(HandKeypointSchema, min_items=21, max_items=21) = Field(
        ..., description="21 hand landmarks"
    )
    gesture: GestureTypeEnum = Field(..., description="Detected gesture")
    confidence: confloat(ge=0, le=1) = Field(..., description="Gesture confidence")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Detection timestamp")

class TrainingDataSchema(BaseModel):
    session_id: str = Field(..., description="Training session ID")
    sequence_id: conint(ge=0) = Field(..., description="Sequence number in session")
    hand_pose: HandPoseSchema = Field(..., description="Hand pose data")
    robot_state: Optional[RobotStateSchema] = Field(None, description="Corresponding robot state")
    camera_frame: Optional[str] = Field(None, description="Base64 encoded camera frame")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('camera_frame')
    def validate_camera_frame(cls, v):
        if v is not None:
            # Basic base64 validation
            import base64
            try:
                base64.b64decode(v)
            except Exception:
                raise ValueError('Invalid base64 encoded camera frame')
        return v

class TrainingSessionCreateSchema(BaseModel):
    name: constr(min_length=1, max_length=100) = Field(..., description="Session name")
    description: Optional[constr(max_length=500)] = Field(None, description="Session description")
    robot_id: str = Field(..., description="Robot ID for training")
    model_type: str = Field(..., description="Type of model to train")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Training parameters")
    
    @validator('model_type')
    def validate_model_type(cls, v):
        allowed_types = ['manipulation', 'navigation', 'custom', 'groot_n1']
        if v not in allowed_types:
            raise ValueError(f'Invalid model type. Allowed: {", ".join(allowed_types)}')
        return v
    
    @validator('parameters')
    def validate_parameters(cls, v):
        # Validate common training parameters
        if 'learning_rate' in v:
            lr = v['learning_rate']
            if not isinstance(lr, (int, float)) or not 0.0001 <= lr <= 1.0:
                raise ValueError('Learning rate must be between 0.0001 and 1.0')
        
        if 'batch_size' in v:
            bs = v['batch_size']
            if not isinstance(bs, int) or not 1 <= bs <= 1024:
                raise ValueError('Batch size must be between 1 and 1024')
        
        if 'epochs' in v:
            epochs = v['epochs']
            if not isinstance(epochs, int) or not 1 <= epochs <= 10000:
                raise ValueError('Epochs must be between 1 and 10000')
        
        return v

# ==================== GROOT TRAINING SCHEMAS ====================

class GrootTrainingJobSchema(BaseModel):
    name: constr(min_length=1, max_length=100) = Field(..., description="Training job name")
    robot_type: RobotTypeEnum = Field(..., description="Target robot type")
    dataset_id: str = Field(..., description="Training dataset ID")
    model_config: Dict[str, Any] = Field(..., description="Model configuration")
    training_config: Dict[str, Any] = Field(..., description="Training configuration")
    
    @validator('model_config')
    def validate_model_config(cls, v):
        required_keys = ['architecture', 'input_size', 'output_size']
        for key in required_keys:
            if key not in v:
                raise ValueError(f'Missing required model config key: {key}')
        
        if 'architecture' in v and v['architecture'] not in ['transformer', 'lstm', 'cnn']:
            raise ValueError('Invalid architecture. Allowed: transformer, lstm, cnn')
        
        return v
    
    @validator('training_config')
    def validate_training_config(cls, v):
        if 'max_steps' in v:
            steps = v['max_steps']
            if not isinstance(steps, int) or not 100 <= steps <= 1000000:
                raise ValueError('Max steps must be between 100 and 1,000,000')
        
        if 'checkpoint_frequency' in v:
            freq = v['checkpoint_frequency']
            if not isinstance(freq, int) or not 10 <= freq <= 10000:
                raise ValueError('Checkpoint frequency must be between 10 and 10,000')
        
        return v

class SimulationTestSchema(BaseModel):
    model_id: str = Field(..., description="Trained model ID")
    environment: str = Field(..., description="Simulation environment")
    test_scenarios: List[str] = Field(..., description="Test scenarios to run")
    duration: conint(ge=60, le=3600) = Field(300, description="Test duration in seconds")
    
    @validator('environment')
    def validate_environment(cls, v):
        allowed_envs = [
            'warehouse_navigation', 'manipulation_lab', 
            'outdoor_terrain', 'balance_challenge'
        ]
        if v not in allowed_envs:
            raise ValueError(f'Invalid environment. Allowed: {", ".join(allowed_envs)}')
        return v

# ==================== DATA EXPORT SCHEMAS ====================

class DataExportRequestSchema(BaseModel):
    session_ids: List[str] = Field(..., description="Training session IDs to export")
    format: DataFormatEnum = Field(DataFormatEnum.JSON, description="Export format")
    include_frames: bool = Field(False, description="Include camera frames in export")
    include_metadata: bool = Field(True, description="Include metadata in export")
    compression: bool = Field(True, description="Compress exported data")
    
    @validator('session_ids')
    def validate_session_ids(cls, v):
        if len(v) == 0:
            raise ValueError('At least one session ID is required')
        if len(v) > 100:
            raise ValueError('Maximum 100 sessions can be exported at once')
        return v

# ==================== ANALYTICS SCHEMAS ====================

class MetricsQuerySchema(BaseModel):
    start_date: date = Field(..., description="Query start date")
    end_date: date = Field(..., description="Query end date")
    robot_ids: Optional[List[str]] = Field(None, description="Filter by robot IDs")
    user_ids: Optional[List[str]] = Field(None, description="Filter by user IDs")
    metrics: List[str] = Field(..., description="Metrics to include")
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        
        # Limit to 1 year range
        if 'start_date' in values and (v - values['start_date']).days > 365:
            raise ValueError('Date range cannot exceed 365 days')
        
        return v
    
    @validator('metrics')
    def validate_metrics(cls, v):
        allowed_metrics = [
            'accuracy', 'loss', 'training_time', 'data_volume',
            'robot_uptime', 'user_activity', 'gesture_distribution'
        ]
        
        for metric in v:
            if metric not in allowed_metrics:
                raise ValueError(f'Invalid metric: {metric}. Allowed: {", ".join(allowed_metrics)}')
        
        return v

# ==================== WEBSOCKET SCHEMAS ====================

class WebSocketMessageSchema(BaseModel):
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(default_factory=dict, description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    
    @validator('type')
    def validate_message_type(cls, v):
        allowed_types = [
            'subscribe', 'unsubscribe', 'heartbeat_response',
            'robot_command', 'training_start', 'training_stop'
        ]
        if v not in allowed_types:
            raise ValueError(f'Invalid message type. Allowed: {", ".join(allowed_types)}')
        return v

# ==================== FILE UPLOAD SCHEMAS ====================

class FileUploadSchema(BaseModel):
    filename: constr(min_length=1, max_length=255) = Field(..., description="Original filename")
    content_type: str = Field(..., description="File MIME type")
    size: conint(ge=1, le=100*1024*1024) = Field(..., description="File size in bytes")  # Max 100MB
    description: Optional[constr(max_length=500)] = Field(None, description="File description")
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = [
            'application/json', 'text/csv', 'application/octet-stream',
            'image/jpeg', 'image/png', 'video/mp4', 'application/zip'
        ]
        if v not in allowed_types:
            raise ValueError(f'Invalid content type. Allowed: {", ".join(allowed_types)}')
        return v
    
    @validator('filename')
    def validate_filename(cls, v):
        # Basic filename validation
        if not re.match(r'^[a-zA-Z0-9._\-\s]+$', v):
            raise ValueError('Filename contains invalid characters')
        
        # Check file extension
        allowed_extensions = ['.json', '.csv', '.h5', '.jpg', '.jpeg', '.png', '.mp4', '.zip']
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError(f'Invalid file extension. Allowed: {", ".join(allowed_extensions)}')
        
        return v

# ==================== RESPONSE SCHEMAS ====================

class StandardResponseSchema(BaseModel):
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    data: Optional[Any] = Field(None, description="Response data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")

class PaginatedResponseSchema(BaseModel):
    items: List[Any] = Field(..., description="Page items")
    total: int = Field(..., description="Total items count")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total pages count")

class ErrorResponseSchema(BaseModel):
    error: Dict[str, Any] = Field(..., description="Error details")
    success: bool = Field(False, description="Always false for errors")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

# Export all schemas
__all__ = [
    # Enums
    'UserRoleEnum', 'RobotTypeEnum', 'TrainingStatusEnum', 'GestureTypeEnum', 'DataFormatEnum',
    
    # User schemas
    'UserCreateSchema', 'UserUpdateSchema', 'UserResponseSchema',
    
    # Robot schemas
    'RobotCreateSchema', 'RobotStateSchema', 'RobotCommandSchema',
    
    # Training schemas
    'HandKeypointSchema', 'HandPoseSchema', 'TrainingDataSchema', 'TrainingSessionCreateSchema',
    
    # GR00T schemas
    'GrootTrainingJobSchema', 'SimulationTestSchema',
    
    # Export schemas
    'DataExportRequestSchema',
    
    # Analytics schemas
    'MetricsQuerySchema',
    
    # WebSocket schemas
    'WebSocketMessageSchema',
    
    # File upload schemas
    'FileUploadSchema',
    
    # Response schemas
    'StandardResponseSchema', 'PaginatedResponseSchema', 'ErrorResponseSchema',
]