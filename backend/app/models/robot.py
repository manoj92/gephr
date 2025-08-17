from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class Robot(Base):
    __tablename__ = "robots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    robot_type = Column(String, nullable=False)  # 'unitree_g1', 'custom_humanoid'
    model = Column(String)
    serial_number = Column(String, unique=True)
    
    # Hardware specifications
    capabilities = Column(JSON)  # List of capabilities
    joint_count = Column(Integer)
    max_payload = Column(Float)  # kg
    battery_capacity = Column(Float)  # Wh
    
    # Status
    is_active = Column(Boolean, default=True)
    firmware_version = Column(String)
    last_maintenance = Column(DateTime(timezone=True))
    
    # Connection info
    default_ip_address = Column(String)
    default_port = Column(Integer)
    bluetooth_mac = Column(String)
    
    # Metadata
    description = Column(Text)
    manufacturer = Column(String)
    purchase_date = Column(DateTime(timezone=True))
    warranty_expires = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    connections = relationship("RobotConnection", back_populates="robot")
    commands = relationship("RobotCommand", back_populates="robot")

    def __repr__(self):
        return f"<Robot(id={self.id}, name={self.name}, type={self.robot_type})>"


class RobotConnection(Base):
    __tablename__ = "robot_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    robot_id = Column(String, ForeignKey("robots.id"), nullable=False)
    
    # Connection details
    connection_type = Column(String, nullable=False)  # 'wifi', 'bluetooth', 'usb', 'ethernet'
    ip_address = Column(String)
    port = Column(Integer)
    bluetooth_id = Column(String)
    
    # Status
    status = Column(String, default="disconnected")  # 'connected', 'disconnected', 'connecting', 'error'
    connection_quality = Column(Float, default=0.0)  # 0-1 scale
    latency_ms = Column(Float)
    
    # Session info
    session_start = Column(DateTime(timezone=True))
    session_end = Column(DateTime(timezone=True))
    total_commands_sent = Column(Integer, default=0)
    successful_commands = Column(Integer, default=0)
    
    # Robot state
    current_battery_level = Column(Float)
    current_position = Column(JSON)  # {x, y, z}
    current_rotation = Column(JSON)  # {x, y, z, w}
    joint_positions = Column(JSON)  # array of joint positions
    joint_velocities = Column(JSON)  # array of joint velocities
    error_state = Column(Boolean, default=False)
    error_message = Column(Text)
    current_task = Column(String)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_heartbeat = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="robot_connections")
    robot = relationship("Robot", back_populates="connections")

    def __repr__(self):
        return f"<RobotConnection(id={self.id}, user_id={self.user_id}, robot_id={self.robot_id}, status={self.status})>"


class RobotCommand(Base):
    __tablename__ = "robot_commands"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    robot_id = Column(String, ForeignKey("robots.id"), nullable=False)
    connection_id = Column(String, ForeignKey("robot_connections.id"))
    
    # Command details
    command_type = Column(String, nullable=False)  # 'move', 'pick', 'place', 'rotate', 'stop', 'navigate', 'custom'
    parameters = Column(JSON, nullable=False)
    priority = Column(String, default="medium")  # 'low', 'medium', 'high', 'emergency', 'critical'
    
    # Execution details
    status = Column(String, default="pending")  # 'pending', 'executing', 'completed', 'failed', 'cancelled'
    progress = Column(Float, default=0.0)  # 0-1 scale
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    timeout_seconds = Column(Integer, default=30)
    estimated_duration_seconds = Column(Integer)
    
    # Results
    result_data = Column(JSON)
    error_message = Column(Text)
    execution_log = Column(Text)
    
    # Relationships
    robot = relationship("Robot", back_populates="commands")

    def __repr__(self):
        return f"<RobotCommand(id={self.id}, robot_id={self.robot_id}, type={self.command_type}, status={self.status})>"