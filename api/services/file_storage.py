import os
import json
import uuid
from pathlib import Path
from typing import Optional
import aiofiles
from fastapi import UploadFile, HTTPException
from app.core.config import settings


class FileStorageService:
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.upload_dir / "videos").mkdir(exist_ok=True)
        (self.upload_dir / "images").mkdir(exist_ok=True)
        (self.upload_dir / "datasets").mkdir(exist_ok=True)
        (self.upload_dir / "models").mkdir(exist_ok=True)
        (self.upload_dir / "thumbnails").mkdir(exist_ok=True)

    async def upload_video(self, file: UploadFile, session_id: str, gesture_id: Optional[str] = None) -> str:
        """Upload training video file"""
        if file.content_type not in settings.ALLOWED_VIDEO_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {settings.ALLOWED_VIDEO_TYPES}"
            )
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        filename = f"{session_id}_{gesture_id or uuid.uuid4().hex}{file_extension}"
        file_path = self.upload_dir / "videos" / filename
        
        # Check file size
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE} bytes"
            )
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        return str(file_path)

    async def upload_image(self, file: UploadFile, purpose: str = "general") -> str:
        """Upload image file"""
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {settings.ALLOWED_IMAGE_TYPES}"
            )
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        filename = f"{uuid.uuid4().hex}{file_extension}"
        
        # Determine subdirectory based on purpose
        subdir = "thumbnails" if purpose == "thumbnail" else "images"
        file_path = self.upload_dir / subdir / filename
        
        # Check file size
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE} bytes"
            )
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        return str(file_path)

    async def save_lerobot_dataset(self, dataset: dict, session_id: str) -> str:
        """Save LeRobot dataset as JSON file"""
        filename = f"lerobot_dataset_{session_id}_{uuid.uuid4().hex}.json"
        file_path = self.upload_dir / "datasets" / filename
        
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(dataset, indent=2, default=str))
        
        return str(file_path)

    async def save_skill_model(self, file: UploadFile, skill_id: str) -> str:
        """Save skill model file"""
        file_extension = Path(file.filename).suffix
        filename = f"skill_model_{skill_id}{file_extension}"
        file_path = self.upload_dir / "models" / filename
        
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE} bytes"
            )
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        return str(file_path)

    def get_file_url(self, file_path: str) -> str:
        """Generate public URL for file"""
        # In production, this would generate a signed URL for S3 or similar
        # For now, return a local path
        return f"/uploads/{Path(file_path).name}"

    async def delete_file(self, file_path: str) -> bool:
        """Delete file from storage"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False

    def get_storage_stats(self) -> dict:
        """Get storage usage statistics"""
        stats = {
            "total_files": 0,
            "total_size_bytes": 0,
            "videos": {"count": 0, "size_bytes": 0},
            "images": {"count": 0, "size_bytes": 0},
            "datasets": {"count": 0, "size_bytes": 0},
            "models": {"count": 0, "size_bytes": 0}
        }
        
        for subdir in ["videos", "images", "datasets", "models"]:
            path = self.upload_dir / subdir
            if path.exists():
                for file_path in path.iterdir():
                    if file_path.is_file():
                        size = file_path.stat().st_size
                        stats[subdir]["count"] += 1
                        stats[subdir]["size_bytes"] += size
                        stats["total_files"] += 1
                        stats["total_size_bytes"] += size
        
        return stats