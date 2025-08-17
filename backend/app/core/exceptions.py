"""
Comprehensive exception handling system for the Humanoid Training Platform
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
import logging
import traceback
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class BaseCustomException(Exception):
    """Base exception class for custom exceptions"""
    
    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.timestamp = datetime.utcnow()
        self.error_id = str(uuid.uuid4())
        super().__init__(self.message)

class RobotConnectionError(BaseCustomException):
    """Robot connection related errors"""
    
    def __init__(self, message: str, robot_id: str = None, details: Dict = None):
        super().__init__(
            message=message,
            error_code="ROBOT_CONNECTION_ERROR",
            status_code=503,
            details={"robot_id": robot_id, **(details or {})}
        )

class RobotCommandError(BaseCustomException):
    """Robot command execution errors"""
    
    def __init__(self, message: str, command_type: str = None, robot_id: str = None):
        super().__init__(
            message=message,
            error_code="ROBOT_COMMAND_ERROR",
            status_code=400,
            details={"command_type": command_type, "robot_id": robot_id}
        )

class TrainingPipelineError(BaseCustomException):
    """Training pipeline related errors"""
    
    def __init__(self, message: str, pipeline_id: str = None, stage: str = None):
        super().__init__(
            message=message,
            error_code="TRAINING_PIPELINE_ERROR",
            status_code=500,
            details={"pipeline_id": pipeline_id, "stage": stage}
        )

class GR00TTrainingError(BaseCustomException):
    """GR00T model training errors"""
    
    def __init__(self, message: str, job_id: str = None, model_path: str = None):
        super().__init__(
            message=message,
            error_code="GROOT_TRAINING_ERROR",
            status_code=500,
            details={"job_id": job_id, "model_path": model_path}
        )

class SimulationError(BaseCustomException):
    """Simulation environment errors"""
    
    def __init__(self, message: str, simulation_id: str = None, environment: str = None):
        super().__init__(
            message=message,
            error_code="SIMULATION_ERROR",
            status_code=500,
            details={"simulation_id": simulation_id, "environment": environment}
        )

class DataValidationError(BaseCustomException):
    """Data validation errors"""
    
    def __init__(self, message: str, field: str = None, value: Any = None):
        super().__init__(
            message=message,
            error_code="DATA_VALIDATION_ERROR",
            status_code=422,
            details={"field": field, "value": str(value) if value is not None else None}
        )

class AuthenticationError(BaseCustomException):
    """Authentication related errors"""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401
        )

class AuthorizationError(BaseCustomException):
    """Authorization related errors"""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403
        )

class RateLimitError(BaseCustomException):
    """Rate limiting errors"""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_ERROR",
            status_code=429,
            details={"retry_after": retry_after}
        )

class ResourceNotFoundError(BaseCustomException):
    """Resource not found errors"""
    
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} with ID '{resource_id}' not found",
            error_code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={"resource_type": resource_type, "resource_id": resource_id}
        )

class ExternalServiceError(BaseCustomException):
    """External service integration errors"""
    
    def __init__(self, service_name: str, message: str, status_code: int = None):
        super().__init__(
            message=f"{service_name}: {message}",
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=status_code or 503,
            details={"service_name": service_name}
        )

class FileProcessingError(BaseCustomException):
    """File processing errors"""
    
    def __init__(self, message: str, filename: str = None, file_type: str = None):
        super().__init__(
            message=message,
            error_code="FILE_PROCESSING_ERROR",
            status_code=400,
            details={"filename": filename, "file_type": file_type}
        )

# Exception handlers

async def custom_exception_handler(request: Request, exc: BaseCustomException):
    """Handle custom exceptions with detailed error responses"""
    
    # Log the error
    logger.error(
        f"Custom exception {exc.error_code}: {exc.message}",
        extra={
            "error_id": exc.error_id,
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "details": exc.details,
            "path": request.url.path,
            "method": request.method,
            "user_agent": request.headers.get("user-agent"),
            "timestamp": exc.timestamp.isoformat()
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "error_id": exc.error_id,
                "error_code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": exc.timestamp.isoformat()
            },
            "success": False
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions"""
    
    error_id = str(uuid.uuid4())
    
    logger.warning(
        f"HTTP exception {exc.status_code}: {exc.detail}",
        extra={
            "error_id": error_id,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "error_id": error_id,
                "error_code": "HTTP_ERROR",
                "message": exc.detail,
                "timestamp": datetime.utcnow().isoformat()
            },
            "success": False
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    
    error_id = str(uuid.uuid4())
    
    # Log the full traceback for debugging
    logger.error(
        f"Unexpected exception: {str(exc)}",
        extra={
            "error_id": error_id,
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc()
        }
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "error_id": error_id,
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "timestamp": datetime.utcnow().isoformat()
            },
            "success": False
        }
    )

# Recovery mechanisms

class RetryMechanism:
    """Retry mechanism for failed operations"""
    
    def __init__(self, max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0):
        self.max_attempts = max_attempts
        self.delay = delay
        self.backoff = backoff
    
    async def execute(self, func, *args, **kwargs):
        """Execute function with retry logic"""
        import asyncio
        
        last_exception = None
        current_delay = self.delay
        
        for attempt in range(self.max_attempts):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                if attempt < self.max_attempts - 1:
                    logger.warning(
                        f"Attempt {attempt + 1} failed, retrying in {current_delay}s: {str(e)}"
                    )
                    await asyncio.sleep(current_delay)
                    current_delay *= self.backoff
                else:
                    logger.error(f"All {self.max_attempts} attempts failed: {str(e)}")
        
        # Re-raise the last exception if all attempts failed
        raise last_exception

class CircuitBreaker:
    """Circuit breaker pattern for external service calls"""
    
    def __init__(self, failure_threshold: int = 5, reset_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        import asyncio
        from datetime import datetime, timedelta
        
        if self.state == "OPEN":
            if (self.last_failure_time and 
                datetime.utcnow() - self.last_failure_time > timedelta(seconds=self.reset_timeout)):
                self.state = "HALF_OPEN"
            else:
                raise ExternalServiceError(
                    service_name="Circuit Breaker",
                    message="Service is currently unavailable",
                    status_code=503
                )
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Success - reset failure count
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
            self.failure_count = 0
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logger.error(f"Circuit breaker opened after {self.failure_count} failures")
            
            raise e

# Global instances
retry_mechanism = RetryMechanism()
circuit_breaker = CircuitBreaker()

# Health check utilities

async def check_service_health(service_name: str, health_check_func) -> Dict[str, Any]:
    """Check health of a service"""
    try:
        start_time = datetime.utcnow()
        
        if asyncio.iscoroutinefunction(health_check_func):
            await health_check_func()
        else:
            health_check_func()
        
        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        return {
            "service": service_name,
            "status": "healthy",
            "response_time_ms": response_time,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "service": service_name,
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }