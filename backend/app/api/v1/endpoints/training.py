from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.user import User
from app.models.training import TrainingSession, GestureData, HandPose
from app.schemas.training import (
    TrainingSessionCreate, TrainingSessionResponse, 
    GestureDataCreate, GestureDataResponse,
    HandPoseData, LeRobotDataPoint
)
from app.api.deps import get_current_user
from app.services.file_storage import FileStorageService
from typing import List, Optional
import json
import uuid
from datetime import datetime

router = APIRouter()
file_storage = FileStorageService()


@router.post("/sessions", response_model=TrainingSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_training_session(
    session_data: TrainingSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    db_session = TrainingSession(
        user_id=current_user.id,
        **session_data.dict()
    )
    
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    
    return db_session


@router.get("/sessions", response_model=List[TrainingSessionResponse])
async def get_training_sessions(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(TrainingSession).where(TrainingSession.user_id == current_user.id)
    
    if status_filter:
        query = query.where(TrainingSession.status == status_filter)
    
    query = query.offset(skip).limit(limit).order_by(TrainingSession.created_at.desc())
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    return sessions


@router.get("/sessions/{session_id}", response_model=TrainingSessionResponse)
async def get_training_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    return session


@router.put("/sessions/{session_id}", response_model=TrainingSessionResponse)
async def update_training_session(
    session_id: str,
    session_update: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    for field, value in session_update.items():
        if hasattr(session, field):
            setattr(session, field, value)
    
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_training_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    await db.delete(session)
    await db.commit()


@router.post("/sessions/{session_id}/gestures", response_model=GestureDataResponse, status_code=status.HTTP_201_CREATED)
async def create_gesture_data(
    session_id: str,
    gesture_data: GestureDataCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify session ownership
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    # Get next sequence number
    seq_result = await db.execute(
        select(func.max(GestureData.sequence_number))
        .where(GestureData.training_session_id == session_id)
    )
    max_seq = seq_result.scalar() or 0
    
    # Calculate duration if end_time provided
    duration_ms = None
    if gesture_data.end_time:
        duration_ms = (gesture_data.end_time - gesture_data.start_time).total_seconds() * 1000
    
    db_gesture = GestureData(
        training_session_id=session_id,
        sequence_number=max_seq + 1,
        duration_ms=duration_ms,
        **gesture_data.dict()
    )
    
    db.add(db_gesture)
    await db.commit()
    await db.refresh(db_gesture)
    
    # Update session stats
    session.total_gestures += 1
    if gesture_data.confidence_score >= 0.7:
        session.successful_gestures += 1
    else:
        session.failed_gestures += 1
    
    await db.commit()
    
    return db_gesture


@router.get("/sessions/{session_id}/gestures", response_model=List[GestureDataResponse])
async def get_session_gestures(
    session_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify session ownership
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    result = await db.execute(
        select(GestureData)
        .where(GestureData.training_session_id == session_id)
        .offset(skip)
        .limit(limit)
        .order_by(GestureData.sequence_number)
    )
    gestures = result.scalars().all()
    return gestures


@router.post("/upload/video")
async def upload_training_video(
    session_id: str = Form(...),
    gesture_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify session ownership
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    # Upload file
    file_path = await file_storage.upload_video(file, session_id, gesture_id)
    
    # Update gesture if gesture_id provided
    if gesture_id:
        result = await db.execute(
            select(GestureData)
            .where(GestureData.id == gesture_id)
            .where(GestureData.training_session_id == session_id)
        )
        gesture = result.scalar_one_or_none()
        
        if gesture:
            gesture.video_path = file_path
            await db.commit()
    
    return {"file_path": file_path, "message": "Video uploaded successfully"}


@router.post("/upload/hand-poses")
async def upload_hand_poses(
    gesture_id: str = Form(...),
    hand_poses: str = Form(...),  # JSON string
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        poses_data = json.loads(hand_poses)
        hand_poses_list = [HandPoseData(**pose) for pose in poses_data]
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid hand poses data: {str(e)}"
        )
    
    # Verify gesture ownership through session
    result = await db.execute(
        select(GestureData)
        .join(TrainingSession)
        .where(GestureData.id == gesture_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    gesture = result.scalar_one_or_none()
    
    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found"
        )
    
    # Save hand poses
    for i, pose_data in enumerate(hand_poses_list):
        relative_time = (pose_data.timestamp - gesture.start_time).total_seconds() * 1000
        
        db_pose = HandPose(
            gesture_id=gesture_id,
            handedness=pose_data.handedness,
            frame_number=i,
            landmarks=pose_data.landmarks,
            confidence=pose_data.confidence,
            timestamp=pose_data.timestamp,
            relative_time_ms=relative_time,
            world_landmarks=pose_data.world_landmarks
        )
        db.add(db_pose)
    
    await db.commit()
    
    return {"message": f"Uploaded {len(hand_poses_list)} hand poses"}


@router.get("/sessions/{session_id}/export/lerobot")
async def export_lerobot_dataset(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify session ownership and get data
    result = await db.execute(
        select(TrainingSession)
        .options(selectinload(TrainingSession.gestures).selectinload(GestureData.hand_poses))
        .where(TrainingSession.id == session_id)
        .where(TrainingSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found"
        )
    
    # Generate LeRobot dataset
    dataset = {
        "info": {
            "dataset_name": session.name,
            "total_episodes": 1,
            "total_frames": len([pose for gesture in session.gestures for pose in gesture.hand_poses]),
            "fps": 30,
            "created_at": datetime.utcnow().isoformat(),
            "user_id": current_user.id,
            "robot_type": session.robot_type,
            "task_type": session.task_type
        },
        "episodes": []
    }
    
    episode_data = []
    for gesture in session.gestures:
        for pose in gesture.hand_poses:
            data_point = LeRobotDataPoint(
                observation={
                    "hand_poses": [pose.landmarks],
                    "timestamp": pose.timestamp.isoformat(),
                    "handedness": pose.handedness
                },
                action=gesture.lerobot_action or {},
                reward=gesture.confidence_score * 0.1,
                done=False,
                metadata={
                    "task_id": session.id,
                    "user_id": current_user.id,
                    "robot_type": session.robot_type,
                    "difficulty": session.difficulty_level,
                    "gesture_type": gesture.gesture_type
                }
            )
            episode_data.append(data_point.dict())
    
    dataset["episodes"] = episode_data
    
    # Save dataset file
    dataset_path = await file_storage.save_lerobot_dataset(dataset, session_id)
    
    # Update session
    session.exported_at = datetime.utcnow()
    session.export_path = dataset_path
    await db.commit()
    
    return FileResponse(
        path=dataset_path,
        filename=f"lerobot_dataset_{session_id}.json",
        media_type="application/json"
    )