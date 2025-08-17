from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from app.services.groot_training_service import groot_service
from app.core.deps import get_current_user
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class TrainingDataRequest(BaseModel):
    session_ids: List[str] = Field(..., description="List of training session IDs to include")
    robot_type: str = Field(default="unitree_g1", description="Target robot type for training")

class TrainingJobRequest(BaseModel):
    dataset_path: str = Field(..., description="Path to prepared training dataset")
    robot_type: str = Field(..., description="Target robot type")
    training_config: Optional[Dict[str, Any]] = Field(None, description="Optional training hyperparameters")

class SimulationDeploymentRequest(BaseModel):
    model_path: str = Field(..., description="Path to trained model")
    robot_type: str = Field(..., description="Target robot type for simulation")
    simulation_config: Optional[Dict[str, Any]] = Field(None, description="Optional simulation parameters")

class SimulationTestRequest(BaseModel):
    deployment_id: str = Field(..., description="Simulation deployment ID")
    test_scenarios: List[str] = Field(..., description="List of test scenarios to run")

@router.get("/robots/supported")
async def get_supported_robots():
    """Get list of supported robot types for GR00T training"""
    try:
        result = await groot_service.get_supported_robots()
        return result
    except Exception as e:
        logger.error(f"Error getting supported robots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data/prepare")
async def prepare_training_data(
    request: TrainingDataRequest,
    current_user: User = Depends(get_current_user)
):
    """Prepare collected training data for GR00T N1 finetuning"""
    try:
        result = await groot_service.prepare_training_data(
            session_ids=request.session_ids,
            robot_type=request.robot_type
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400, 
                detail=result.get("error", "Failed to prepare training data")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparing training data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/start")
async def start_training_job(
    request: TrainingJobRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Start GR00T N1 finetuning job on NVIDIA cloud infrastructure"""
    try:
        result = await groot_service.start_groot_training(
            dataset_path=request.dataset_path,
            robot_type=request.robot_type,
            training_config=request.training_config
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to start training job")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting training job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}/status")
async def get_training_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get status of a GR00T training job"""
    try:
        result = await groot_service.get_training_status(job_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("error", "Job not found")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulation/deploy")
async def deploy_to_simulation(
    request: SimulationDeploymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Deploy trained GR00T model to simulation environment"""
    try:
        result = await groot_service.deploy_to_simulation(
            model_path=request.model_path,
            robot_type=request.robot_type,
            simulation_config=request.simulation_config
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to deploy to simulation")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deploying to simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulation/test")
async def run_simulation_test(
    request: SimulationTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Run test scenarios in simulation"""
    try:
        result = await groot_service.run_simulation_test(
            deployment_id=request.deployment_id,
            test_scenarios=request.test_scenarios
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to run simulation tests")
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running simulation test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Pre-defined test scenarios
@router.get("/simulation/scenarios")
async def get_test_scenarios():
    """Get available test scenarios for simulation"""
    scenarios = [
        {
            "name": "pick_and_place",
            "description": "Pick up objects and place them in target locations",
            "duration": 60,
            "difficulty": "medium"
        },
        {
            "name": "navigation",
            "description": "Navigate through environment avoiding obstacles",
            "duration": 120,
            "difficulty": "easy"
        },
        {
            "name": "manipulation",
            "description": "Perform complex hand manipulations",
            "duration": 90,
            "difficulty": "hard"
        },
        {
            "name": "balance_recovery",
            "description": "Recover balance after external disturbances",
            "duration": 45,
            "difficulty": "medium"
        },
        {
            "name": "object_recognition",
            "description": "Identify and interact with different objects",
            "duration": 75,
            "difficulty": "medium"
        },
        {
            "name": "multi_step_task",
            "description": "Complete complex multi-step tasks",
            "duration": 180,
            "difficulty": "hard"
        }
    ]
    
    return {
        "scenarios": scenarios,
        "total_count": len(scenarios)
    }

# Training pipeline endpoints
@router.post("/pipeline/full")
async def run_full_training_pipeline(
    request: TrainingDataRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Run the complete training pipeline: prepare data -> train -> deploy -> test"""
    try:
        # Step 1: Prepare training data
        logger.info(f"Starting full training pipeline for user {current_user.id}")
        
        prep_result = await groot_service.prepare_training_data(
            session_ids=request.session_ids,
            robot_type=request.robot_type
        )
        
        if not prep_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Data preparation failed: {prep_result.get('error')}"
            )
        
        # Step 2: Start training job
        training_result = await groot_service.start_groot_training(
            dataset_path=prep_result["cloud_path"],
            robot_type=request.robot_type
        )
        
        if not training_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Training job failed to start: {training_result.get('error')}"
            )
        
        return {
            "success": True,
            "pipeline_started": True,
            "job_id": training_result["job_id"],
            "data_preparation": prep_result,
            "training_job": training_result,
            "message": "Full training pipeline started. Monitor job status for completion.",
            "next_steps": [
                f"Monitor training job {training_result['job_id']} for completion",
                "Once training completes, deploy model to simulation",
                "Run test scenarios to validate performance"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running full training pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pipeline/{job_id}/status")
async def get_pipeline_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive status of training pipeline"""
    try:
        # Get training job status
        training_status = await groot_service.get_training_status(job_id)
        
        if not training_status.get("success"):
            raise HTTPException(
                status_code=404,
                detail="Training job not found"
            )
        
        job_info = training_status["job_info"]
        status = job_info["status"]
        
        pipeline_status = {
            "job_id": job_id,
            "current_stage": status,
            "training_status": training_status,
            "overall_progress": 0,
            "next_action": None
        }
        
        # Determine progress and next actions based on status
        if status == "queued":
            pipeline_status["overall_progress"] = 10
            pipeline_status["next_action"] = "Waiting for training resources"
        elif status == "running":
            progress = job_info.get("progress", 0)
            pipeline_status["overall_progress"] = 10 + (progress * 0.6)  # 10-70%
            pipeline_status["next_action"] = "Training in progress"
        elif status == "completed":
            pipeline_status["overall_progress"] = 70
            pipeline_status["next_action"] = "Ready for simulation deployment"
            pipeline_status["model_path"] = job_info.get("model_path")
        elif status == "failed":
            pipeline_status["overall_progress"] = 0
            pipeline_status["next_action"] = "Training failed - check logs and retry"
        
        return pipeline_status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pipeline status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/validate")
async def validate_trained_model(
    model_path: str,
    robot_type: str,
    current_user: User = Depends(get_current_user)
):
    """Validate a trained GR00T model"""
    try:
        # Deploy to simulation for validation
        deploy_result = await groot_service.deploy_to_simulation(
            model_path=model_path,
            robot_type=robot_type,
            simulation_config={"headless": True, "validation_mode": True}
        )
        
        if not deploy_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Failed to deploy for validation: {deploy_result.get('error')}"
            )
        
        # Run basic validation scenarios
        validation_scenarios = ["pick_and_place", "navigation", "balance_recovery"]
        
        test_result = await groot_service.run_simulation_test(
            deployment_id=deploy_result["deployment_id"],
            test_scenarios=validation_scenarios
        )
        
        if not test_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Validation tests failed: {test_result.get('error')}"
            )
        
        # Calculate validation score
        success_rate = test_result.get("success_rate", 0)
        validation_score = success_rate * 100
        
        validation_result = {
            "model_path": model_path,
            "robot_type": robot_type,
            "validation_score": validation_score,
            "success_rate": success_rate,
            "tests_passed": test_result.get("passed_scenarios", 0),
            "total_tests": test_result.get("total_scenarios", 0),
            "test_results": test_result.get("test_results", []),
            "deployment_id": deploy_result["deployment_id"],
            "validation_status": "passed" if validation_score >= 70 else "failed",
            "recommendations": []
        }
        
        # Add recommendations based on performance
        if validation_score < 70:
            validation_result["recommendations"].append(
                "Model performance below threshold (70%). Consider retraining with more data."
            )
        if success_rate < 0.5:
            validation_result["recommendations"].append(
                "Low success rate. Check training data quality and robot configuration."
            )
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))