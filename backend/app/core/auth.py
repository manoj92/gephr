"""
Enhanced authentication and authorization system
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis.asyncio as redis
from sqlalchemy.orm import Session
import secrets
import uuid
from enum import Enum

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.core.exceptions import AuthenticationError, AuthorizationError, RateLimitError
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

class UserRole(str, Enum):
    ADMIN = "admin"
    RESEARCHER = "researcher"
    OPERATOR = "operator"
    VIEWER = "viewer"

class Permission(str, Enum):
    # Robot permissions
    ROBOT_CONNECT = "robot:connect"
    ROBOT_COMMAND = "robot:command"
    ROBOT_VIEW_TELEMETRY = "robot:view_telemetry"
    ROBOT_EMERGENCY_STOP = "robot:emergency_stop"
    
    # Training permissions
    TRAINING_CREATE = "training:create"
    TRAINING_VIEW = "training:view"
    TRAINING_DELETE = "training:delete"
    TRAINING_SHARE = "training:share"
    
    # GR00T permissions
    GROOT_TRAIN = "groot:train"
    GROOT_DEPLOY = "groot:deploy"
    GROOT_MANAGE = "groot:manage"
    
    # Pipeline permissions
    PIPELINE_CREATE = "pipeline:create"
    PIPELINE_MONITOR = "pipeline:monitor"
    PIPELINE_CANCEL = "pipeline:cancel"
    
    # Admin permissions
    USER_MANAGE = "user:manage"
    SYSTEM_MONITOR = "system:monitor"
    SYSTEM_CONFIGURE = "system:configure"

# Role-based permissions
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        # All permissions
        Permission.ROBOT_CONNECT, Permission.ROBOT_COMMAND, Permission.ROBOT_VIEW_TELEMETRY, 
        Permission.ROBOT_EMERGENCY_STOP, Permission.TRAINING_CREATE, Permission.TRAINING_VIEW,
        Permission.TRAINING_DELETE, Permission.TRAINING_SHARE, Permission.GROOT_TRAIN,
        Permission.GROOT_DEPLOY, Permission.GROOT_MANAGE, Permission.PIPELINE_CREATE,
        Permission.PIPELINE_MONITOR, Permission.PIPELINE_CANCEL, Permission.USER_MANAGE,
        Permission.SYSTEM_MONITOR, Permission.SYSTEM_CONFIGURE
    ],
    UserRole.RESEARCHER: [
        # Research and development permissions
        Permission.ROBOT_CONNECT, Permission.ROBOT_COMMAND, Permission.ROBOT_VIEW_TELEMETRY,
        Permission.TRAINING_CREATE, Permission.TRAINING_VIEW, Permission.TRAINING_SHARE,
        Permission.GROOT_TRAIN, Permission.GROOT_DEPLOY, Permission.PIPELINE_CREATE,
        Permission.PIPELINE_MONITOR, Permission.PIPELINE_CANCEL
    ],
    UserRole.OPERATOR: [
        # Operation permissions
        Permission.ROBOT_CONNECT, Permission.ROBOT_COMMAND, Permission.ROBOT_VIEW_TELEMETRY,
        Permission.ROBOT_EMERGENCY_STOP, Permission.TRAINING_VIEW, Permission.PIPELINE_MONITOR
    ],
    UserRole.VIEWER: [
        # Read-only permissions
        Permission.ROBOT_VIEW_TELEMETRY, Permission.TRAINING_VIEW, Permission.PIPELINE_MONITOR
    ]
}

class AuthService:
    """Enhanced authentication service"""
    
    def __init__(self):
        self.redis_client = None
        self.bearer_scheme = HTTPBearer()
        
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            if settings.REDIS_URL:
                self.redis_client = redis.from_url(settings.REDIS_URL)
                await self.redis_client.ping()
                logger.info("Auth service initialized with Redis")
        except Exception as e:
            logger.warning(f"Redis not available for auth service: {e}")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Generate password hash"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "type": "access",
            "jti": str(uuid.uuid4())  # JWT ID for token revocation
        })
        
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        to_encode = {
            "sub": user_id,
            "type": "refresh",
            "jti": str(uuid.uuid4()),
            "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        }
        
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            
            # Check if token is revoked
            if self.redis_client:
                jti = payload.get("jti")
                if jti and await self.redis_client.get(f"revoked_token:{jti}"):
                    raise AuthenticationError("Token has been revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.JWTError:
            raise AuthenticationError("Invalid token")
    
    async def revoke_token(self, token: str):
        """Revoke a JWT token"""
        if not self.redis_client:
            return
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
            jti = payload.get("jti")
            exp = payload.get("exp")
            
            if jti and exp:
                # Store revoked token until expiration
                ttl = exp - datetime.utcnow().timestamp()
                if ttl > 0:
                    await self.redis_client.setex(f"revoked_token:{jti}", int(ttl), "1")
                    
        except jwt.JWTError:
            pass  # Invalid token, ignore
    
    async def authenticate_user(self, email: str, password: str, db: Session) -> Optional[User]:
        """Authenticate user with email and password"""
        user = db.query(User).filter(User.email == email).first()
        
        if not user or not self.verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
    
    async def get_current_user(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
        db: Session = Depends(get_db)
    ) -> User:
        """Get current authenticated user"""
        
        payload = await self.verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if not user_id:
            raise AuthenticationError("Invalid token payload")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise AuthenticationError("User not found")
        
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        
        return user
    
    def check_permission(self, user: User, permission: Permission) -> bool:
        """Check if user has specific permission"""
        user_permissions = ROLE_PERMISSIONS.get(UserRole(user.role), [])
        return permission in user_permissions
    
    def require_permission(self, permission: Permission):
        """Decorator to require specific permission"""
        def permission_checker(current_user: User = Depends(self.get_current_user)) -> User:
            if not self.check_permission(current_user, permission):
                raise AuthorizationError(f"Permission '{permission}' required")
            return current_user
        return permission_checker
    
    def require_role(self, required_role: UserRole):
        """Decorator to require specific role"""
        def role_checker(current_user: User = Depends(self.get_current_user)) -> User:
            if UserRole(current_user.role) != required_role:
                raise AuthorizationError(f"Role '{required_role}' required")
            return current_user
        return role_checker

class RateLimiter:
    """Rate limiting service"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
    
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window: int,
        identifier: str = None
    ) -> bool:
        """Check if request is within rate limit"""
        if not self.redis_client:
            return True  # No rate limiting without Redis
        
        current_time = datetime.utcnow().timestamp()
        window_start = current_time - window
        
        # Use sliding window rate limiting
        pipe = self.redis_client.pipeline()
        
        # Remove old entries
        await pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        current_count = await pipe.zcard(key)
        
        if current_count >= limit:
            return False
        
        # Add current request
        await pipe.zadd(key, {identifier or str(uuid.uuid4()): current_time})
        await pipe.expire(key, window)
        await pipe.execute()
        
        return True
    
    def rate_limit(self, limit: int = 60, window: int = 60):
        """Rate limiting decorator"""
        async def rate_limit_checker(request: Request):
            client_ip = request.client.host
            user_agent = request.headers.get("user-agent", "unknown")
            key = f"rate_limit:{client_ip}:{user_agent}"
            
            if not await self.check_rate_limit(key, limit, window, f"{client_ip}_{datetime.utcnow().timestamp()}"):
                raise RateLimitError(f"Rate limit exceeded: {limit} requests per {window} seconds")
            
        return rate_limit_checker

class SessionManager:
    """User session management"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
    
    async def create_session(self, user_id: str, device_info: Dict[str, Any]) -> str:
        """Create user session"""
        session_id = str(uuid.uuid4())
        
        session_data = {
            "user_id": user_id,
            "device_info": device_info,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat()
        }
        
        if self.redis_client:
            await self.redis_client.setex(
                f"session:{session_id}",
                timedelta(days=7).total_seconds(),
                jwt.encode(session_data, settings.SECRET_KEY, algorithm=ALGORITHM)
            )
        
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        if not self.redis_client:
            return None
        
        session_data = await self.redis_client.get(f"session:{session_id}")
        if not session_data:
            return None
        
        try:
            return jwt.decode(session_data, settings.SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.JWTError:
            return None
    
    async def update_session_activity(self, session_id: str):
        """Update session last activity"""
        session_data = await self.get_session(session_id)
        if session_data:
            session_data["last_activity"] = datetime.utcnow().isoformat()
            
            if self.redis_client:
                await self.redis_client.setex(
                    f"session:{session_id}",
                    timedelta(days=7).total_seconds(),
                    jwt.encode(session_data, settings.SECRET_KEY, algorithm=ALGORITHM)
                )
    
    async def revoke_session(self, session_id: str):
        """Revoke user session"""
        if self.redis_client:
            await self.redis_client.delete(f"session:{session_id}")
    
    async def revoke_all_user_sessions(self, user_id: str):
        """Revoke all sessions for a user"""
        if not self.redis_client:
            return
        
        # Find all sessions for user (this is a simplified implementation)
        # In production, you might want to maintain a separate index
        async for key in self.redis_client.scan_iter(match="session:*"):
            session_data = await self.get_session(key.split(":")[1])
            if session_data and session_data.get("user_id") == user_id:
                await self.redis_client.delete(key)

class MultiFactorAuth:
    """Multi-factor authentication service"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
    
    async def generate_mfa_code(self, user_id: str) -> str:
        """Generate MFA code"""
        code = str(secrets.randbelow(1000000)).zfill(6)
        
        if self.redis_client:
            await self.redis_client.setex(
                f"mfa_code:{user_id}",
                300,  # 5 minutes
                code
            )
        
        return code
    
    async def verify_mfa_code(self, user_id: str, code: str) -> bool:
        """Verify MFA code"""
        if not self.redis_client:
            return True  # Skip MFA if Redis not available
        
        stored_code = await self.redis_client.get(f"mfa_code:{user_id}")
        if stored_code and stored_code.decode() == code:
            await self.redis_client.delete(f"mfa_code:{user_id}")
            return True
        
        return False

# Global instances
auth_service = AuthService()
rate_limiter = RateLimiter()
session_manager = SessionManager()
mfa_service = MultiFactorAuth()

# Dependency functions
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    return await auth_service.get_current_user(credentials, db)

def require_permission(permission: Permission):
    """Require specific permission"""
    return auth_service.require_permission(permission)

def require_role(role: UserRole):
    """Require specific role"""
    return auth_service.require_role(role)

def require_rate_limit(limit: int = 60, window: int = 60):
    """Require rate limiting"""
    return rate_limiter.rate_limit(limit, window)

# Enhanced user model methods
async def create_user_with_verification(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    role: UserRole = UserRole.VIEWER
) -> User:
    """Create user with email verification"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise AuthenticationError("User already exists")
    
    # Create user
    hashed_password = auth_service.get_password_hash(password)
    verification_token = str(uuid.uuid4())
    
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        role=role.value,
        is_active=False,  # Require verification
        verification_token=verification_token,
        created_at=datetime.utcnow()
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # TODO: Send verification email
    
    return user

async def verify_email(db: Session, verification_token: str) -> bool:
    """Verify user email"""
    user = db.query(User).filter(User.verification_token == verification_token).first()
    
    if not user:
        return False
    
    user.is_active = True
    user.verification_token = None
    user.email_verified_at = datetime.utcnow()
    
    db.commit()
    return True