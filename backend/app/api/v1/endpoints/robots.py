from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.robot import Robot, RobotConnection, RobotCommand
from app.schemas.robot import (
    RobotCreate, RobotResponse, 
    RobotConnectionCreate, RobotConnectionResponse,
    RobotCommandCreate, RobotCommandResponse,
    RobotState
)
from app.api.deps import get_current_user
from app.services.robot_service import RobotService
from app.core.websocket import websocket_manager
from typing import List, Optional
from datetime import datetime

router = APIRouter()
robot_service = RobotService()


@router.post("/", response_model=RobotResponse, status_code=status.HTTP_201_CREATED)
async def create_robot(
    robot_data: RobotCreate,
    db: AsyncSession = Depends(get_db)
):
    # Check if serial number already exists
    if robot_data.serial_number:
        result = await db.execute(
            select(Robot).where(Robot.serial_number == robot_data.serial_number)
        )
        existing_robot = result.scalar_one_or_none()
        
        if existing_robot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Robot with this serial number already exists"
            )
    
    db_robot = Robot(**robot_data.dict())
    db.add(db_robot)
    await db.commit()
    await db.refresh(db_robot)
    
    return db_robot


@router.get("/", response_model=List[RobotResponse])
async def get_robots(
    skip: int = 0,
    limit: int = 20,
    robot_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Robot).where(Robot.is_active == True)
    
    if robot_type:
        query = query.where(Robot.robot_type == robot_type)
    
    query = query.offset(skip).limit(limit).order_by(Robot.created_at.desc())
    
    result = await db.execute(query)
    robots = result.scalars().all()
    return robots


@router.get("/{robot_id}", response_model=RobotResponse)
async def get_robot(
    robot_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Robot).where(Robot.id == robot_id))
    robot = result.scalar_one_or_none()
    
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found"
        )
    
    return robot


@router.post("/connect", response_model=RobotConnectionResponse, status_code=status.HTTP_201_CREATED)
async def connect_to_robot(
    connection_data: RobotConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify robot exists
    result = await db.execute(select(Robot).where(Robot.id == connection_data.robot_id))
    robot = result.scalar_one_or_none()
    
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found"
        )
    
    # Check for existing active connection
    result = await db.execute(
        select(RobotConnection)
        .where(RobotConnection.user_id == current_user.id)
        .where(RobotConnection.robot_id == connection_data.robot_id)
        .where(RobotConnection.status == "connected")
    )
    existing_connection = result.scalar_one_or_none()
    
    if existing_connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already connected to this robot"
        )
    
    # Create connection
    db_connection = RobotConnection(
        user_id=current_user.id,
        robot_id=connection_data.robot_id,
        connection_type=connection_data.connection_type,
        ip_address=connection_data.ip_address,
        port=connection_data.port,
        bluetooth_id=connection_data.bluetooth_id,
        status="connecting",
        session_start=datetime.utcnow()
    )
    
    db.add(db_connection)
    await db.commit()
    await db.refresh(db_connection)
    
    # Attempt actual robot connection
    try:
        connection_result = await robot_service.connect_robot(db_connection)
        db_connection.status = "connected" if connection_result else "error"
        db_connection.connection_quality = connection_result.get('quality', 0.0) if connection_result else 0.0
        db_connection.latency_ms = connection_result.get('latency', 0.0) if connection_result else 0.0
        db_connection.last_heartbeat = datetime.utcnow()
        
        await db.commit()
        
        # Notify via websocket
        await websocket_manager.send_to_user(
            {"type": "robot_connected", "robot_id": robot.id, "connection_id": db_connection.id},
            current_user.id
        )
        
    except Exception as e:
        db_connection.status = "error"
        db_connection.error_message = str(e)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to robot: {str(e)}"
        )
    
    return db_connection


@router.get("/connections/", response_model=List[RobotConnectionResponse])
async def get_user_robot_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RobotConnection)
        .where(RobotConnection.user_id == current_user.id)
        .order_by(RobotConnection.created_at.desc())
    )
    connections = result.scalars().all()
    return connections


@router.post("/connections/{connection_id}/disconnect")
async def disconnect_robot(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RobotConnection)
        .where(RobotConnection.id == connection_id)
        .where(RobotConnection.user_id == current_user.id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Disconnect robot
    await robot_service.disconnect_robot(connection)
    
    # Update connection status
    connection.status = "disconnected"
    connection.session_end = datetime.utcnow()
    await db.commit()
    
    # Notify via websocket
    await websocket_manager.send_to_user(
        {"type": "robot_disconnected", "robot_id": connection.robot_id, "connection_id": connection.id},
        current_user.id
    )
    
    return {"message": "Robot disconnected successfully"}


@router.post("/commands", response_model=RobotCommandResponse, status_code=status.HTTP_201_CREATED)
async def send_robot_command(
    command_data: RobotCommandCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify active connection to robot
    result = await db.execute(
        select(RobotConnection)
        .where(RobotConnection.user_id == current_user.id)
        .where(RobotConnection.robot_id == command_data.robot_id)
        .where(RobotConnection.status == "connected")
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active connection to this robot"
        )
    
    # Create command
    db_command = RobotCommand(
        robot_id=command_data.robot_id,
        connection_id=connection.id,
        command_type=command_data.command_type,
        parameters=command_data.parameters,
        priority=command_data.priority,
        timeout_seconds=command_data.timeout_seconds
    )
    
    db.add(db_command)
    await db.commit()
    await db.refresh(db_command)
    
    # Send command to robot
    try:
        await robot_service.send_command(db_command)
        
        # Update command status
        db_command.status = "executing"
        db_command.started_at = datetime.utcnow()
        await db.commit()
        
        # Notify via websocket
        await websocket_manager.send_to_user(
            {"type": "command_sent", "command_id": db_command.id, "robot_id": command_data.robot_id},
            current_user.id
        )
        
    except Exception as e:
        db_command.status = "failed"
        db_command.error_message = str(e)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send command: {str(e)}"
        )
    
    return db_command


@router.get("/commands", response_model=List[RobotCommandResponse])
async def get_robot_commands(
    robot_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get commands for user's robot connections
    query = (
        select(RobotCommand)
        .join(RobotConnection)
        .where(RobotConnection.user_id == current_user.id)
    )
    
    if robot_id:
        query = query.where(RobotCommand.robot_id == robot_id)
    
    if status_filter:
        query = query.where(RobotCommand.status == status_filter)
    
    query = query.offset(skip).limit(limit).order_by(RobotCommand.created_at.desc())
    
    result = await db.execute(query)
    commands = result.scalars().all()
    return commands


@router.get("/connections/{connection_id}/state")
async def get_robot_state(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RobotConnection)
        .where(RobotConnection.id == connection_id)
        .where(RobotConnection.user_id == current_user.id)
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    if connection.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Robot is not connected"
        )
    
    # Get current robot state
    robot_state = await robot_service.get_robot_state(connection)
    
    return RobotState(
        position=connection.current_position or {"x": 0, "y": 0, "z": 0},
        rotation=connection.current_rotation or {"x": 0, "y": 0, "z": 0, "w": 1},
        joint_positions=connection.joint_positions or [],
        joint_velocities=connection.joint_velocities or [],
        battery_level=connection.current_battery_level or 0.0,
        error_state=connection.error_state,
        current_task=connection.current_task,
        connection_quality=connection.connection_quality,
        timestamp=datetime.utcnow()
    )