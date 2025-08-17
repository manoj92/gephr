"""
Comprehensive validation middleware for API endpoints
"""

import json
import logging
from typing import Any, Dict, Optional, List, Callable
from functools import wraps
from datetime import datetime

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.exceptions import DataValidationError
from app.schemas.validation import StandardResponseSchema, ErrorResponseSchema

logger = logging.getLogger(__name__)

# ==================== VALIDATION MIDDLEWARE ====================

class ValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive request/response validation"""
    
    def __init__(self, app, enable_request_logging: bool = True, enable_response_validation: bool = True):
        super().__init__(app)
        self.enable_request_logging = enable_request_logging
        self.enable_response_validation = enable_response_validation
        
    async def dispatch(self, request: Request, call_next):
        """Process request and response with validation"""
        
        # Log incoming request
        if self.enable_request_logging:
            await self._log_request(request)
        
        # Validate request content type and size
        validation_error = await self._validate_request(request)
        if validation_error:
            return validation_error
        
        # Process request
        try:
            response = await call_next(request)
            
            # Validate response if enabled
            if self.enable_response_validation:
                response = await self._validate_response(response)
            
            return response
            
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            return self._create_validation_error_response(e)
        except Exception as e:
            logger.error(f"Unexpected error in validation middleware: {e}")
            return self._create_generic_error_response(str(e))
    
    async def _log_request(self, request: Request):
        """Log incoming request details"""
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {client_ip} using {user_agent}"
        )
        
        # Log request body for POST/PUT/PATCH (be careful with sensitive data)
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    body = await self._get_request_body(request)
                    # Remove sensitive fields from logging
                    sanitized_body = self._sanitize_log_data(body)
                    logger.debug(f"Request body: {sanitized_body}")
                except Exception as e:
                    logger.warning(f"Failed to log request body: {e}")
    
    async def _validate_request(self, request: Request) -> Optional[JSONResponse]:
        """Validate incoming request"""
        
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                max_size = 100 * 1024 * 1024  # 100MB
                if length > max_size:
                    return self._create_error_response(
                        "Request too large",
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        {"max_size": f"{max_size // (1024*1024)}MB"}
                    )
            except ValueError:
                return self._create_error_response(
                    "Invalid content-length header",
                    status.HTTP_400_BAD_REQUEST
                )
        
        # Validate content type for POST/PUT/PATCH requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            if not content_type:
                return self._create_error_response(
                    "Content-Type header is required",
                    status.HTTP_400_BAD_REQUEST
                )
            
            allowed_types = [
                "application/json",
                "multipart/form-data",
                "application/x-www-form-urlencoded"
            ]
            
            if not any(allowed_type in content_type for allowed_type in allowed_types):
                return self._create_error_response(
                    f"Unsupported content type: {content_type}",
                    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    {"allowed_types": allowed_types}
                )
        
        # Validate JSON structure for JSON requests
        if request.headers.get("content-type", "").startswith("application/json"):
            try:
                body = await self._get_request_body(request)
                if body is not None:
                    # Basic JSON structure validation
                    if not isinstance(body, (dict, list)):
                        return self._create_error_response(
                            "Invalid JSON structure",
                            status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Check for deeply nested objects (potential DoS)
                    if self._get_max_depth(body) > 10:
                        return self._create_error_response(
                            "JSON structure too deeply nested",
                            status.HTTP_400_BAD_REQUEST
                        )
                        
            except json.JSONDecodeError as e:
                return self._create_error_response(
                    f"Invalid JSON: {str(e)}",
                    status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Error validating JSON request: {e}")
                return self._create_error_response(
                    "Invalid request format",
                    status.HTTP_400_BAD_REQUEST
                )
        
        return None
    
    async def _validate_response(self, response: Response) -> Response:
        """Validate outgoing response"""
        try:
            # Only validate JSON responses
            content_type = response.headers.get("content-type", "")
            if "application/json" not in content_type:
                return response
            
            # Validate response structure
            if hasattr(response, 'body'):
                try:
                    body = json.loads(response.body)
                    
                    # Ensure response follows standard format
                    if isinstance(body, dict) and 'success' not in body:
                        # Wrap response in standard format
                        wrapped_body = {
                            "success": 200 <= response.status_code < 300,
                            "data": body,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        
                        new_body = json.dumps(wrapped_body)
                        response.headers["content-length"] = str(len(new_body))
                        response.body = new_body.encode()
                        
                except json.JSONDecodeError:
                    # Response is not valid JSON, log warning
                    logger.warning(f"Response is not valid JSON: {response.body}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error validating response: {e}")
            return response
    
    async def _get_request_body(self, request: Request) -> Any:
        """Safely get request body"""
        try:
            # Create a new request body reader to avoid consuming the stream
            body_bytes = await request.body()
            if not body_bytes:
                return None
            
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                return json.loads(body_bytes.decode())
            
            return body_bytes
        except Exception as e:
            logger.error(f"Error reading request body: {e}")
            return None
    
    def _sanitize_log_data(self, data: Any) -> Any:
        """Remove sensitive information from log data"""
        if isinstance(data, dict):
            sanitized = {}
            sensitive_keys = ['password', 'token', 'secret', 'key', 'auth', 'credential']
            
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in sensitive_keys):
                    sanitized[key] = "[REDACTED]"
                elif isinstance(value, (dict, list)):
                    sanitized[key] = self._sanitize_log_data(value)
                else:
                    sanitized[key] = value
            
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_log_data(item) for item in data]
        else:
            return data
    
    def _get_max_depth(self, data: Any, current_depth: int = 0) -> int:
        """Calculate maximum nesting depth of data structure"""
        if current_depth > 20:  # Prevent infinite recursion
            return current_depth
        
        if isinstance(data, dict):
            if not data:
                return current_depth
            return max(
                self._get_max_depth(value, current_depth + 1) 
                for value in data.values()
            )
        elif isinstance(data, list):
            if not data:
                return current_depth
            return max(
                self._get_max_depth(item, current_depth + 1) 
                for item in data
            )
        else:
            return current_depth
    
    def _create_validation_error_response(self, error: ValidationError) -> JSONResponse:
        """Create standardized validation error response"""
        errors = []
        for err in error.errors():
            field_path = " -> ".join(str(loc) for loc in err["loc"])
            errors.append({
                "field": field_path,
                "message": err["msg"],
                "type": err["type"]
            })
        
        response_data = ErrorResponseSchema(
            error={
                "error_code": "VALIDATION_ERROR",
                "message": "Validation failed",
                "details": {"validation_errors": errors}
            }
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response_data.dict()
        )
    
    def _create_error_response(
        self, 
        message: str, 
        status_code: int, 
        details: Optional[Dict] = None
    ) -> JSONResponse:
        """Create standardized error response"""
        response_data = ErrorResponseSchema(
            error={
                "error_code": "REQUEST_ERROR",
                "message": message,
                "details": details or {}
            }
        )
        
        return JSONResponse(
            status_code=status_code,
            content=response_data.dict()
        )
    
    def _create_generic_error_response(self, message: str) -> JSONResponse:
        """Create generic error response"""
        return self._create_error_response(
            "Internal server error",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            {"original_error": message}
        )

# ==================== VALIDATION DECORATORS ====================

def validate_request_body(schema_class: BaseModel):
    """Decorator to validate request body against Pydantic schema"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object in args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for value in kwargs.values():
                    if isinstance(value, Request):
                        request = value
                        break
            
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Request object not found"
                )
            
            try:
                # Parse and validate request body
                body = await request.json()
                validated_data = schema_class(**body)
                
                # Add validated data to kwargs
                kwargs['validated_data'] = validated_data
                
                return await func(*args, **kwargs)
                
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON: {str(e)}"
                )
            except ValidationError as e:
                raise DataValidationError(
                    message="Request validation failed",
                    details={"validation_errors": e.errors()}
                )
        
        return wrapper
    return decorator

def validate_query_params(**param_schemas):
    """Decorator to validate query parameters"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Request object not found"
                )
            
            try:
                validated_params = {}
                
                for param_name, schema_class in param_schemas.items():
                    param_value = request.query_params.get(param_name)
                    
                    if param_value is not None:
                        # Convert string to appropriate type
                        if hasattr(schema_class, '__annotations__'):
                            param_type = schema_class.__annotations__.get(param_name, str)
                            if param_type == int:
                                param_value = int(param_value)
                            elif param_type == float:
                                param_value = float(param_value)
                            elif param_type == bool:
                                param_value = param_value.lower() in ('true', '1', 'yes')
                        
                        validated_params[param_name] = param_value
                
                # Add validated params to kwargs
                kwargs['validated_params'] = validated_params
                
                return await func(*args, **kwargs)
                
            except (ValueError, TypeError) as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid query parameter: {str(e)}"
                )
        
        return wrapper
    return decorator

def validate_file_upload(
    max_size: int = 10 * 1024 * 1024,  # 10MB default
    allowed_types: List[str] = None,
    required: bool = True
):
    """Decorator to validate file uploads"""
    if allowed_types is None:
        allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
    
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Request object not found"
                )
            
            try:
                form = await request.form()
                files = []
                
                for field_name, field_value in form.items():
                    if hasattr(field_value, 'content_type'):  # It's a file
                        # Validate file size
                        file_content = await field_value.read()
                        if len(file_content) > max_size:
                            raise HTTPException(
                                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
                            )
                        
                        # Validate file type
                        if field_value.content_type not in allowed_types:
                            raise HTTPException(
                                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                                detail=f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
                            )
                        
                        # Reset file pointer
                        field_value.file.seek(0)
                        files.append({
                            'field_name': field_name,
                            'filename': field_value.filename,
                            'content_type': field_value.content_type,
                            'size': len(file_content),
                            'file': field_value
                        })
                
                if required and not files:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="At least one file is required"
                    )
                
                # Add validated files to kwargs
                kwargs['validated_files'] = files
                
                return await func(*args, **kwargs)
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error validating file upload: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid file upload"
                )
        
        return wrapper
    return decorator

# ==================== RATE LIMITING VALIDATION ====================

class RateLimitValidator:
    """Validate and enforce rate limits"""
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_store = {}  # Fallback to memory if Redis unavailable
    
    async def validate_rate_limit(
        self,
        key: str,
        limit: int,
        window: int,
        request: Request
    ) -> bool:
        """Validate rate limit for given key"""
        current_time = datetime.utcnow().timestamp()
        window_start = current_time - window
        
        if self.redis_client:
            return await self._validate_redis_rate_limit(key, limit, window_start, current_time)
        else:
            return await self._validate_memory_rate_limit(key, limit, window_start, current_time)
    
    async def _validate_redis_rate_limit(
        self,
        key: str,
        limit: int,
        window_start: float,
        current_time: float
    ) -> bool:
        """Validate rate limit using Redis"""
        try:
            pipe = self.redis_client.pipeline()
            
            # Remove old entries
            await pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            current_count = await pipe.zcard(key)
            
            if current_count >= limit:
                return False
            
            # Add current request
            await pipe.zadd(key, {str(current_time): current_time})
            await pipe.expire(key, 3600)  # Expire after 1 hour
            await pipe.execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Redis rate limit validation error: {e}")
            # Fallback to memory store
            return await self._validate_memory_rate_limit(key, limit, window_start, current_time)
    
    async def _validate_memory_rate_limit(
        self,
        key: str,
        limit: int,
        window_start: float,
        current_time: float
    ) -> bool:
        """Validate rate limit using memory store"""
        if key not in self.memory_store:
            self.memory_store[key] = []
        
        # Remove old entries
        self.memory_store[key] = [
            timestamp for timestamp in self.memory_store[key]
            if timestamp > window_start
        ]
        
        # Check limit
        if len(self.memory_store[key]) >= limit:
            return False
        
        # Add current request
        self.memory_store[key].append(current_time)
        
        return True

# Global rate limit validator instance
rate_limit_validator = RateLimitValidator()

def rate_limit(limit: int = 60, window: int = 60):
    """Decorator to enforce rate limiting"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Request object not found"
                )
            
            # Create rate limit key
            client_ip = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "unknown")
            rate_limit_key = f"rate_limit:{client_ip}:{hash(user_agent)}"
            
            # Validate rate limit
            if not await rate_limit_validator.validate_rate_limit(
                rate_limit_key, limit, window, request
            ):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: {limit} requests per {window} seconds",
                    headers={"Retry-After": str(window)}
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# Export middleware and decorators
__all__ = [
    'ValidationMiddleware',
    'validate_request_body',
    'validate_query_params',
    'validate_file_upload',
    'rate_limit',
    'RateLimitValidator',
    'rate_limit_validator'
]