from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.api.deps import get_current_user
from app.models.user import User
from app.services.file_storage import FileStorageService
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()
file_storage = FileStorageService()

ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.json', '.csv', '.h5', '.pkl'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB

@router.post("/training-data")
async def upload_training_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload training data file (video, sensor data, etc.)"""
    try:
        # Validate file extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size {file_size / (1024*1024):.2f}MB exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Save file
        saved_path = await file_storage.save_file(
            file=file,
            user_id=str(current_user.id),
            file_type="training_data"
        )
        
        return {
            "filename": file.filename,
            "size": file_size,
            "content_type": file.content_type,
            "uploaded_at": datetime.now().isoformat(),
            "path": saved_path,
            "message": "File uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload image file (for thumbnails, previews, etc.)"""
    try:
        # Validate image file
        allowed_image_types = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_image_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed. Allowed image types: {', '.join(allowed_image_types)}"
            )
        
        # Check file size (10MB max for images)
        contents = await file.read()
        file_size = len(contents)
        max_image_size = 10 * 1024 * 1024  # 10MB
        
        if file_size > max_image_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image size {file_size / (1024*1024):.2f}MB exceeds maximum allowed size of {max_image_size / (1024*1024)}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Save image
        saved_path = await file_storage.save_file(
            file=file,
            user_id=str(current_user.id),
            file_type="image"
        )
        
        return {
            "filename": file.filename,
            "size": file_size,
            "content_type": file.content_type,
            "uploaded_at": datetime.now().isoformat(),
            "path": saved_path,
            "message": "Image uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )

@router.post("/model")
async def upload_model(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload trained model file"""
    try:
        # Validate model file
        allowed_model_types = {'.h5', '.pkl', '.pt', '.pth', '.onnx', '.pb', '.json'}
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_model_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed. Allowed model types: {', '.join(allowed_model_types)}"
            )
        
        # Check file size (1GB max for models)
        contents = await file.read()
        file_size = len(contents)
        max_model_size = 1024 * 1024 * 1024  # 1GB
        
        if file_size > max_model_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Model size {file_size / (1024*1024):.2f}MB exceeds maximum allowed size of {max_model_size / (1024*1024)}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Save model
        saved_path = await file_storage.save_file(
            file=file,
            user_id=str(current_user.id),
            file_type="model"
        )
        
        return {
            "filename": file.filename,
            "size": file_size,
            "content_type": file.content_type,
            "uploaded_at": datetime.now().isoformat(),
            "path": saved_path,
            "message": "Model uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload model: {str(e)}"
        )