from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from app.services.training_pipeline_service import training_pipeline_service, TrainingPipelineConfig
from app.core.deps import get_current_user
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class StartPipelineRequest(BaseModel):
    session_ids: List[str] = Field(..., description="Training session IDs to include")
    robot_type: str = Field(default="unitree_g1", description="Target robot type")
    training_config: Optional[Dict[str, Any]] = Field(None, description="Training configuration")
    simulation_environments: Optional[List[str]] = Field(None, description="Simulation environments to test")
    test_scenarios: Optional[List[str]] = Field(None, description="Test scenarios to run")
    validation_threshold: Optional[float] = Field(0.7, description="Validation threshold")
    auto_deploy_threshold: Optional[float] = Field(0.8, description="Auto-deployment threshold")
    notification_channels: Optional[List[str]] = Field(["websocket"], description="Notification channels")

@router.post("/start")
async def start_training_pipeline(
    request: StartPipelineRequest,
    current_user: User = Depends(get_current_user)
):
    """Start a complete training pipeline"""
    try:
        # Create pipeline configuration
        config = TrainingPipelineConfig(
            robot_type=request.robot_type,
            session_ids=request.session_ids,
            training_config=request.training_config,
            simulation_environments=request.simulation_environments,
            test_scenarios=request.test_scenarios,
            validation_threshold=request.validation_threshold,
            auto_deploy_threshold=request.auto_deploy_threshold,
            notification_channels=request.notification_channels
        )
        
        # Start pipeline
        result = await training_pipeline_service.start_training_pipeline(
            user_id=current_user.id,
            session_ids=request.session_ids,
            config=config
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to start training pipeline")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting training pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{pipeline_id}/status")
async def get_pipeline_status(
    pipeline_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get status of a training pipeline"""
    try:
        status = await training_pipeline_service.get_pipeline_status(pipeline_id)
        
        # Check if user owns this pipeline
        if status.get("user_id") != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this pipeline"
            )
        
        return status
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pipeline status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{pipeline_id}/cancel")
async def cancel_pipeline(
    pipeline_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a running training pipeline"""
    try:
        # Check pipeline ownership
        status = await training_pipeline_service.get_pipeline_status(pipeline_id)
        if status.get("user_id") != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this pipeline"
            )
        
        result = await training_pipeline_service.cancel_pipeline(pipeline_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to cancel pipeline")
            )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/pipelines")
async def list_user_pipelines(
    current_user: User = Depends(get_current_user),
    limit: int = 10,
    include_completed: bool = True
):
    """List training pipelines for the current user"""
    try:
        result = await training_pipeline_service.list_user_pipelines(
            user_id=current_user.id,
            limit=limit,
            include_completed=include_completed
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error listing user pipelines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_pipeline_templates():
    """Get predefined pipeline templates for different robot types"""
    templates = {
        "unitree_g1": {
            "basic_training": {
                "description": "Basic training pipeline for Unitree G1",
                "robot_type": "unitree_g1",
                "simulation_environments": ["warehouse_navigation", "balance_challenge"],
                "test_scenarios": ["basic_walking", "dynamic_balance"],
                "validation_threshold": 0.75,
                "auto_deploy_threshold": 0.85,
                "estimated_duration": "2-3 hours"
            },
            "advanced_training": {
                "description": "Advanced training pipeline with comprehensive testing",
                "robot_type": "unitree_g1",
                "simulation_environments": ["warehouse_navigation", "balance_challenge", "outdoor_terrain"],
                "test_scenarios": ["basic_walking", "dynamic_balance", "terrain_traversal"],
                "validation_threshold": 0.8,
                "auto_deploy_threshold": 0.9,
                "estimated_duration": "3-4 hours"
            }
        },
        "custom_humanoid": {
            "basic_training": {
                "description": "Basic training pipeline for custom humanoid",
                "robot_type": "custom_humanoid",
                "simulation_environments": ["manipulation_lab", "warehouse_navigation"],
                "test_scenarios": ["advanced_walking", "precision_manipulation"],
                "validation_threshold": 0.7,
                "auto_deploy_threshold": 0.8,
                "estimated_duration": "2.5-3.5 hours"
            },
            "advanced_training": {
                "description": "Advanced training with all capabilities",
                "robot_type": "custom_humanoid",
                "simulation_environments": ["manipulation_lab", "outdoor_terrain", "balance_challenge"],
                "test_scenarios": ["advanced_walking", "precision_manipulation", "adaptive_locomotion", "complex_balance"],
                "validation_threshold": 0.75,
                "auto_deploy_threshold": 0.85,
                "estimated_duration": "4-5 hours"
            }
        }
    }
    
    return {
        "templates": templates,
        "supported_robot_types": list(templates.keys())
    }

@router.post("/from-template")
async def start_pipeline_from_template(
    template_name: str,
    robot_type: str,
    session_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Start a training pipeline using a predefined template"""
    try:
        # Get templates
        templates_response = await get_pipeline_templates()
        templates = templates_response["templates"]
        
        if robot_type not in templates:
            raise HTTPException(
                status_code=400,
                detail=f"No templates available for robot type: {robot_type}"
            )
        
        if template_name not in templates[robot_type]:
            raise HTTPException(
                status_code=400,
                detail=f"Template '{template_name}' not found for {robot_type}"
            )
        
        template = templates[robot_type][template_name]
        
        # Create configuration from template
        config = TrainingPipelineConfig(
            robot_type=template["robot_type"],
            session_ids=session_ids,
            simulation_environments=template["simulation_environments"],
            test_scenarios=template["test_scenarios"],
            validation_threshold=template["validation_threshold"],
            auto_deploy_threshold=template["auto_deploy_threshold"],
            notification_channels=["websocket", "push"]
        )
        
        # Start pipeline
        result = await training_pipeline_service.start_training_pipeline(
            user_id=current_user.id,
            session_ids=session_ids,
            config=config
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to start training pipeline")
            )
        
        return {
            **result,
            "template_used": template_name,
            "template_description": template["description"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting pipeline from template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/summary")
async def get_pipeline_metrics_summary(
    current_user: User = Depends(get_current_user),
    days: int = 30
):
    """Get summary metrics for user's training pipelines"""
    try:
        # Get user pipelines
        pipelines_result = await training_pipeline_service.list_user_pipelines(
            user_id=current_user.id,
            limit=100,
            include_completed=True
        )
        
        pipelines = pipelines_result["pipelines"]
        
        # Filter by date range
        from datetime import datetime, timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent_pipelines = [
            p for p in pipelines 
            if p["created_at"] >= cutoff_date
        ]
        
        # Calculate metrics
        total_pipelines = len(recent_pipelines)
        completed_pipelines = len([p for p in recent_pipelines if p["status"] == "completed"])
        failed_pipelines = len([p for p in recent_pipelines if p["status"] == "failed"])
        running_pipelines = len([p for p in recent_pipelines if p["status"] == "running"])
        
        success_rate = (completed_pipelines / total_pipelines) if total_pipelines > 0 else 0
        
        # Robot type breakdown
        robot_types = {}
        for pipeline in recent_pipelines:
            robot_type = pipeline["robot_type"]
            if robot_type not in robot_types:
                robot_types[robot_type] = {"total": 0, "completed": 0}
            robot_types[robot_type]["total"] += 1
            if pipeline["status"] == "completed":
                robot_types[robot_type]["completed"] += 1
        
        return {
            "summary": {
                "total_pipelines": total_pipelines,
                "completed_pipelines": completed_pipelines,
                "failed_pipelines": failed_pipelines,
                "running_pipelines": running_pipelines,
                "success_rate": success_rate,
                "days_analyzed": days
            },
            "robot_type_breakdown": robot_types,
            "recent_activity": recent_pipelines[:5]  # Last 5 pipelines
        }
        
    except Exception as e:
        logger.error(f"Error getting pipeline metrics summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{pipeline_id}/download-results")
async def download_pipeline_results(
    pipeline_id: str,
    current_user: User = Depends(get_current_user)
):
    """Download comprehensive results from a completed pipeline"""
    try:
        # Get pipeline status
        status = await training_pipeline_service.get_pipeline_status(pipeline_id)
        
        # Check ownership
        if status.get("user_id") != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this pipeline"
            )
        
        # Check if pipeline is completed
        if status["status"] != "completed":
            raise HTTPException(
                status_code=400,
                detail="Pipeline must be completed to download results"
            )
        
        # Return downloadable results
        return {
            "pipeline_id": pipeline_id,
            "download_ready": True,
            "results": status.get("final_results", {}),
            "artifacts": {
                "model_path": status.get("final_results", {}).get("model_artifacts", {}).get("model_path"),
                "dataset_path": status.get("final_results", {}).get("model_artifacts", {}).get("dataset_path"),
                "simulation_id": status.get("final_results", {}).get("model_artifacts", {}).get("simulation_id")
            },
            "export_formats": ["json", "csv", "pdf_report"]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparing pipeline results download: {e}")
        raise HTTPException(status_code=500, detail=str(e))