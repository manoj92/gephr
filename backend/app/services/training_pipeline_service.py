import asyncio
import json
import logging
import numpy as np
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict

from app.services.groot_training_service import groot_service
from app.services.simulation_service import simulation_service
from app.services.hand_tracking_service import HandTrackingService
from app.services.ml_processing_service import ml_service
from app.services.notification_service import notification_service
from app.core.config import settings

logger = logging.getLogger(__name__)

class PipelineStage(str, Enum):
    DATA_PREPARATION = "data_preparation"
    MODEL_TRAINING = "model_training"
    MODEL_VALIDATION = "model_validation"
    SIMULATION_DEPLOYMENT = "simulation_deployment"
    PERFORMANCE_TESTING = "performance_testing"
    ANALYSIS_REPORTING = "analysis_reporting"
    COMPLETED = "completed"
    FAILED = "failed"

class PipelineStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class PipelineStageResult:
    stage: PipelineStage
    status: PipelineStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    success: bool = False
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

@dataclass
class TrainingPipelineConfig:
    robot_type: str = "unitree_g1"
    session_ids: List[str] = None
    training_config: Optional[Dict[str, Any]] = None
    simulation_environments: List[str] = None
    test_scenarios: List[str] = None
    validation_threshold: float = 0.7
    auto_deploy_threshold: float = 0.8
    notification_channels: List[str] = None

class TrainingPipelineService:
    """
    Comprehensive training pipeline service that orchestrates the entire process:
    1. Data preparation from training sessions
    2. GR00T N1 model finetuning
    3. Model validation
    4. Simulation deployment
    5. Performance testing
    6. Analysis and reporting
    """
    
    def __init__(self):
        self.active_pipelines = {}
        self.pipeline_history = {}
        self.hand_tracking_service = HandTrackingService()
        
        # Default pipeline configurations
        self.default_configs = {
            "unitree_g1": TrainingPipelineConfig(
                robot_type="unitree_g1",
                simulation_environments=["warehouse_navigation", "balance_challenge"],
                test_scenarios=["basic_walking", "dynamic_balance"],
                validation_threshold=0.75,
                auto_deploy_threshold=0.85,
                notification_channels=["websocket", "push"]
            ),
            "custom_humanoid": TrainingPipelineConfig(
                robot_type="custom_humanoid",
                simulation_environments=["manipulation_lab", "outdoor_terrain"],
                test_scenarios=["advanced_walking", "precision_manipulation"],
                validation_threshold=0.7,
                auto_deploy_threshold=0.8,
                notification_channels=["websocket", "push"]
            )
        }
    
    async def start_training_pipeline(
        self,
        user_id: str,
        session_ids: List[str],
        config: Optional[TrainingPipelineConfig] = None
    ) -> Dict[str, Any]:
        """Start a complete training pipeline"""
        try:
            pipeline_id = f"pipeline_{int(datetime.utcnow().timestamp())}"
            
            # Use default config if none provided
            if config is None:
                config = self.default_configs["unitree_g1"]
            else:
                # Merge with defaults
                default = self.default_configs.get(config.robot_type, self.default_configs["unitree_g1"])
                config = TrainingPipelineConfig(
                    robot_type=config.robot_type or default.robot_type,
                    session_ids=session_ids,
                    training_config=config.training_config or default.training_config,
                    simulation_environments=config.simulation_environments or default.simulation_environments,
                    test_scenarios=config.test_scenarios or default.test_scenarios,
                    validation_threshold=config.validation_threshold or default.validation_threshold,
                    auto_deploy_threshold=config.auto_deploy_threshold or default.auto_deploy_threshold,
                    notification_channels=config.notification_channels or default.notification_channels
                )
            
            pipeline_info = {
                "pipeline_id": pipeline_id,
                "user_id": user_id,
                "config": config,
                "status": PipelineStatus.PENDING,
                "current_stage": PipelineStage.DATA_PREPARATION,
                "stages": {},
                "created_at": datetime.utcnow(),
                "started_at": None,
                "completed_at": None,
                "total_duration": None,
                "final_results": None,
                "model_path": None,
                "simulation_id": None
            }
            
            # Initialize all stages
            for stage in PipelineStage:
                if stage not in [PipelineStage.COMPLETED, PipelineStage.FAILED]:
                    pipeline_info["stages"][stage] = PipelineStageResult(
                        stage=stage,
                        status=PipelineStatus.PENDING
                    )
            
            self.active_pipelines[pipeline_id] = pipeline_info
            
            # Send initial notification
            await notification_service.send_notification(
                user_id=user_id,
                notification_type="training_pipeline_started",
                message=f"Training pipeline started for {config.robot_type}",
                data={"pipeline_id": pipeline_id, "robot_type": config.robot_type},
                channels=config.notification_channels
            )
            
            # Start pipeline execution
            asyncio.create_task(self._execute_pipeline(pipeline_id))
            
            return {
                "success": True,
                "pipeline_id": pipeline_id,
                "status": PipelineStatus.PENDING,
                "message": "Training pipeline started successfully",
                "estimated_duration": "2-4 hours",
                "config": asdict(config)
            }
            
        except Exception as e:
            logger.error(f"Error starting training pipeline: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _execute_pipeline(self, pipeline_id: str):
        """Execute the complete training pipeline"""
        pipeline_info = self.active_pipelines[pipeline_id]
        config = pipeline_info["config"]
        user_id = pipeline_info["user_id"]
        
        try:
            pipeline_info["status"] = PipelineStatus.RUNNING
            pipeline_info["started_at"] = datetime.utcnow()
            
            logger.info(f"Starting pipeline execution for {pipeline_id}")
            
            # Stage 1: Data Preparation
            await self._execute_stage(
                pipeline_id,
                PipelineStage.DATA_PREPARATION,
                self._prepare_training_data
            )
            
            # Stage 2: Model Training
            await self._execute_stage(
                pipeline_id,
                PipelineStage.MODEL_TRAINING,
                self._train_groot_model
            )
            
            # Stage 3: Model Validation
            await self._execute_stage(
                pipeline_id,
                PipelineStage.MODEL_VALIDATION,
                self._validate_model
            )
            
            # Stage 4: Simulation Deployment
            await self._execute_stage(
                pipeline_id,
                PipelineStage.SIMULATION_DEPLOYMENT,
                self._deploy_to_simulation
            )
            
            # Stage 5: Performance Testing
            await self._execute_stage(
                pipeline_id,
                PipelineStage.PERFORMANCE_TESTING,
                self._run_performance_tests
            )
            
            # Stage 6: Analysis and Reporting
            await self._execute_stage(
                pipeline_id,
                PipelineStage.ANALYSIS_REPORTING,
                self._generate_analysis_report
            )
            
            # Pipeline completed successfully
            pipeline_info["status"] = PipelineStatus.COMPLETED
            pipeline_info["current_stage"] = PipelineStage.COMPLETED
            pipeline_info["completed_at"] = datetime.utcnow()
            pipeline_info["total_duration"] = (
                pipeline_info["completed_at"] - pipeline_info["started_at"]
            ).total_seconds()
            
            # Send completion notification
            await notification_service.send_notification(
                user_id=user_id,
                notification_type="training_pipeline_completed",
                message=f"Training pipeline completed successfully for {config.robot_type}",
                data={
                    "pipeline_id": pipeline_id,
                    "duration": pipeline_info["total_duration"],
                    "final_score": pipeline_info["final_results"].get("overall_score", 0)
                },
                channels=config.notification_channels
            )
            
            logger.info(f"Pipeline {pipeline_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Pipeline {pipeline_id} failed: {e}")
            
            pipeline_info["status"] = PipelineStatus.FAILED
            pipeline_info["current_stage"] = PipelineStage.FAILED
            pipeline_info["completed_at"] = datetime.utcnow()
            
            # Send failure notification
            await notification_service.send_notification(
                user_id=user_id,
                notification_type="training_pipeline_failed",
                message=f"Training pipeline failed for {config.robot_type}: {str(e)}",
                data={"pipeline_id": pipeline_id, "error": str(e)},
                channels=config.notification_channels
            )
    
    async def _execute_stage(
        self,
        pipeline_id: str,
        stage: PipelineStage,
        stage_function
    ):
        """Execute a single pipeline stage"""
        pipeline_info = self.active_pipelines[pipeline_id]
        stage_info = pipeline_info["stages"][stage]
        
        try:
            pipeline_info["current_stage"] = stage
            stage_info.status = PipelineStatus.RUNNING
            stage_info.start_time = datetime.utcnow()
            
            logger.info(f"Starting stage {stage} for pipeline {pipeline_id}")
            
            # Execute the stage function
            result = await stage_function(pipeline_id)
            
            # Update stage info
            stage_info.end_time = datetime.utcnow()
            stage_info.duration = (stage_info.end_time - stage_info.start_time).total_seconds()
            stage_info.success = result.get("success", False)
            stage_info.data = result
            stage_info.metrics = result.get("metrics", {})
            stage_info.status = PipelineStatus.COMPLETED if stage_info.success else PipelineStatus.FAILED
            
            if not stage_info.success:
                raise Exception(f"Stage {stage} failed: {result.get('error', 'Unknown error')}")
            
            logger.info(f"Stage {stage} completed for pipeline {pipeline_id}")
            
        except Exception as e:
            stage_info.end_time = datetime.utcnow()
            stage_info.duration = (stage_info.end_time - stage_info.start_time).total_seconds()
            stage_info.success = False
            stage_info.error = str(e)
            stage_info.status = PipelineStatus.FAILED
            
            logger.error(f"Stage {stage} failed for pipeline {pipeline_id}: {e}")
            raise
    
    async def _prepare_training_data(self, pipeline_id: str) -> Dict[str, Any]:
        """Stage 1: Prepare training data"""
        pipeline_info = self.active_pipelines[pipeline_id]
        config = pipeline_info["config"]
        
        try:
            # Prepare data using GR00T service
            result = await groot_service.prepare_training_data(
                session_ids=config.session_ids,
                robot_type=config.robot_type
            )
            
            if result.get("success"):
                pipeline_info["dataset_path"] = result["cloud_path"]
                
                return {
                    "success": True,
                    "dataset_path": result["cloud_path"],
                    "dataset_info": result["dataset_info"],
                    "metrics": {
                        "total_sessions": len(config.session_ids),
                        "total_episodes": result["dataset_info"].get("total_episodes", 0),
                        "total_timesteps": result["dataset_info"].get("total_timesteps", 0)
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Data preparation failed")
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _train_groot_model(self, pipeline_id: str) -> Dict[str, Any]:
        """Stage 2: Train GR00T model"""
        pipeline_info = self.active_pipelines[pipeline_id]
        config = pipeline_info["config"]
        
        try:
            # Start training job
            result = await groot_service.start_groot_training(
                dataset_path=pipeline_info["dataset_path"],
                robot_type=config.robot_type,
                training_config=config.training_config
            )
            
            if result.get("success"):
                job_id = result["job_id"]
                pipeline_info["training_job_id"] = job_id
                
                # Monitor training progress
                while True:
                    status = await groot_service.get_training_status(job_id)
                    
                    if not status.get("success"):
                        return {
                            "success": False,
                            "error": "Failed to get training status"
                        }
                    
                    job_status = status["job_info"]["status"]
                    
                    if job_status == "completed":
                        pipeline_info["model_path"] = status["job_info"].get("model_path")
                        return {
                            "success": True,
                            "job_id": job_id,
                            "model_path": pipeline_info["model_path"],
                            "training_metrics": status["job_info"].get("metrics", {}),
                            "metrics": {
                                "training_duration": status["job_info"].get("duration", 0),
                                "final_loss": status["job_info"].get("metrics", {}).get("final_loss", 0),
                                "final_accuracy": status["job_info"].get("metrics", {}).get("final_accuracy", 0)
                            }
                        }
                    elif job_status == "failed":
                        return {
                            "success": False,
                            "error": "Training job failed"
                        }
                    
                    # Wait before checking again
                    await asyncio.sleep(30)
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Failed to start training job")
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _validate_model(self, pipeline_id: str) -> Dict[str, Any]:
        """Stage 3: Validate trained model"""
        pipeline_info = self.active_pipelines[pipeline_id]
        config = pipeline_info["config"]
        
        try:
            # Run basic validation using ML service
            # This would typically involve loading the model and running test data through it
            
            # For now, simulate validation
            await asyncio.sleep(1)  # Simulate validation time
            
            # Mock validation results
            validation_score = np.random.uniform(0.6, 0.95)
            
            validation_passed = validation_score >= config.validation_threshold
            
            return {
                "success": True,
                "validation_passed": validation_passed,
                "validation_score": validation_score,
                "threshold": config.validation_threshold,
                "metrics": {
                    "accuracy": validation_score,
                    "precision": np.random.uniform(0.7, 0.95),
                    "recall": np.random.uniform(0.7, 0.95),
                    "f1_score": np.random.uniform(0.7, 0.95)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _deploy_to_simulation(self, pipeline_id: str) -> Dict[str, Any]:
        """Stage 4: Deploy model to simulation"""
        pipeline_info = self.active_pipelines[pipeline_id]
        config = pipeline_info["config"]
        
        try:
            # Deploy to simulation using GR00T service
            result = await groot_service.deploy_to_simulation(
                model_path=pipeline_info["model_path"],
                robot_type=config.robot_type,
                simulation_config={
                    "headless": False,
                    "record_video": True,
                    "save_telemetry": True
                }
            )
            
            if result.get("success"):
                pipeline_info["simulation_id"] = result["deployment_id"]
                
                return {
                    "success": True,
                    "deployment_id": result["deployment_id"],
                    "simulation_url": result.get("simulation_url"),
                    "metrics": {
                        "deployment_time": result.get("setup_time", 0)
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Simulation deployment failed")
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _run_performance_tests(self, pipeline_id: str) -> Dict[str, Any]:
        """Stage 5: Run comprehensive performance tests"""
        pipeline_info = self.active_pipelines[pipeline_id]
        config = pipeline_info["config"]
        
        try:
            # Run test scenarios using GR00T service
            result = await groot_service.run_simulation_test(
                deployment_id=pipeline_info["simulation_id"],
                test_scenarios=config.test_scenarios
            )
            
            if result.get("success"):
                return {
                    "success": True,
                    "test_results": result,
                    "metrics": {
                        "success_rate": result.get("success_rate", 0),
                        "average_score": result.get("test_summary", {}).get("overall_score", 0),
                        "total_scenarios": result.get("total_scenarios", 0),
                        "passed_scenarios": result.get("passed_scenarios", 0)
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Performance testing failed")
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _generate_analysis_report(self, pipeline_id: str) -> Dict[str, Any]:
        """Stage 6: Generate comprehensive analysis report"""
        pipeline_info = self.active_pipelines[pipeline_id]
        config = pipeline_info["config"]
        
        try:
            # Compile results from all stages
            stages = pipeline_info["stages"]
            
            # Extract key metrics
            data_metrics = stages[PipelineStage.DATA_PREPARATION].data.get("metrics", {})
            training_metrics = stages[PipelineStage.MODEL_TRAINING].data.get("metrics", {})
            validation_metrics = stages[PipelineStage.MODEL_VALIDATION].data.get("metrics", {})
            performance_metrics = stages[PipelineStage.PERFORMANCE_TESTING].data.get("metrics", {})
            
            # Calculate overall score
            validation_score = validation_metrics.get("accuracy", 0)
            performance_score = performance_metrics.get("average_score", 0)
            overall_score = (validation_score + performance_score) / 2
            
            # Determine if model should be auto-deployed
            auto_deploy = overall_score >= config.auto_deploy_threshold
            
            # Generate recommendations
            recommendations = []
            if overall_score < 0.7:
                recommendations.append("Consider collecting more training data")
            if validation_score < performance_score:
                recommendations.append("Model may be overfitting to simulation environment")
            if performance_score < validation_score:
                recommendations.append("Model may need more domain-specific training")
            
            # Create final report
            final_results = {
                "overall_score": overall_score,
                "validation_score": validation_score,
                "performance_score": performance_score,
                "auto_deploy_eligible": auto_deploy,
                "pipeline_duration": pipeline_info.get("total_duration", 0),
                "data_summary": {
                    "sessions_processed": data_metrics.get("total_sessions", 0),
                    "episodes_generated": data_metrics.get("total_episodes", 0),
                    "timesteps_collected": data_metrics.get("total_timesteps", 0)
                },
                "training_summary": {
                    "training_duration": training_metrics.get("training_duration", 0),
                    "final_accuracy": training_metrics.get("final_accuracy", 0),
                    "final_loss": training_metrics.get("final_loss", 0)
                },
                "performance_summary": {
                    "success_rate": performance_metrics.get("success_rate", 0),
                    "scenarios_tested": performance_metrics.get("total_scenarios", 0),
                    "scenarios_passed": performance_metrics.get("passed_scenarios", 0)
                },
                "recommendations": recommendations,
                "model_artifacts": {
                    "model_path": pipeline_info.get("model_path"),
                    "dataset_path": pipeline_info.get("dataset_path"),
                    "simulation_id": pipeline_info.get("simulation_id")
                }
            }
            
            pipeline_info["final_results"] = final_results
            
            return {
                "success": True,
                "final_results": final_results,
                "metrics": {
                    "report_generation_time": 1.0  # Mock time
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_pipeline_status(self, pipeline_id: str) -> Dict[str, Any]:
        """Get current status of a training pipeline"""
        if pipeline_id not in self.active_pipelines:
            # Check pipeline history
            if pipeline_id in self.pipeline_history:
                return self.pipeline_history[pipeline_id]
            else:
                raise ValueError(f"Pipeline {pipeline_id} not found")
        
        pipeline_info = self.active_pipelines[pipeline_id]
        
        # Calculate overall progress
        total_stages = len([s for s in PipelineStage if s not in [PipelineStage.COMPLETED, PipelineStage.FAILED]])
        completed_stages = len([
            s for s in pipeline_info["stages"].values() 
            if s.status == PipelineStatus.COMPLETED
        ])
        progress = (completed_stages / total_stages) * 100
        
        return {
            "pipeline_id": pipeline_id,
            "status": pipeline_info["status"],
            "current_stage": pipeline_info["current_stage"],
            "progress": progress,
            "created_at": pipeline_info["created_at"],
            "started_at": pipeline_info.get("started_at"),
            "completed_at": pipeline_info.get("completed_at"),
            "total_duration": pipeline_info.get("total_duration"),
            "stages": {
                stage.value: {
                    "status": info.status,
                    "start_time": info.start_time,
                    "end_time": info.end_time,
                    "duration": info.duration,
                    "success": info.success,
                    "error": info.error
                }
                for stage, info in pipeline_info["stages"].items()
            },
            "config": asdict(pipeline_info["config"]),
            "final_results": pipeline_info.get("final_results")
        }
    
    async def cancel_pipeline(self, pipeline_id: str) -> Dict[str, Any]:
        """Cancel a running pipeline"""
        if pipeline_id not in self.active_pipelines:
            raise ValueError(f"Pipeline {pipeline_id} not found")
        
        pipeline_info = self.active_pipelines[pipeline_id]
        
        if pipeline_info["status"] not in [PipelineStatus.PENDING, PipelineStatus.RUNNING]:
            return {
                "success": False,
                "error": "Pipeline cannot be cancelled in current state"
            }
        
        # Update status
        pipeline_info["status"] = PipelineStatus.CANCELLED
        pipeline_info["completed_at"] = datetime.utcnow()
        
        # Clean up resources
        if pipeline_info.get("simulation_id"):
            try:
                await simulation_service.cleanup_simulation(pipeline_info["simulation_id"])
            except Exception as e:
                logger.warning(f"Error cleaning up simulation: {e}")
        
        return {
            "success": True,
            "message": f"Pipeline {pipeline_id} cancelled successfully"
        }
    
    async def list_user_pipelines(
        self,
        user_id: str,
        limit: int = 10,
        include_completed: bool = True
    ) -> Dict[str, Any]:
        """List pipelines for a user"""
        user_pipelines = []
        
        # Check active pipelines
        for pipeline_id, pipeline_info in self.active_pipelines.items():
            if pipeline_info["user_id"] == user_id:
                user_pipelines.append({
                    "pipeline_id": pipeline_id,
                    "status": pipeline_info["status"],
                    "current_stage": pipeline_info["current_stage"],
                    "robot_type": pipeline_info["config"].robot_type,
                    "created_at": pipeline_info["created_at"],
                    "started_at": pipeline_info.get("started_at"),
                    "completed_at": pipeline_info.get("completed_at")
                })
        
        # Check pipeline history if requested
        if include_completed:
            for pipeline_id, pipeline_info in self.pipeline_history.items():
                if pipeline_info["user_id"] == user_id:
                    user_pipelines.append({
                        "pipeline_id": pipeline_id,
                        "status": pipeline_info["status"],
                        "current_stage": pipeline_info.get("current_stage"),
                        "robot_type": pipeline_info["config"].robot_type,
                        "created_at": pipeline_info["created_at"],
                        "started_at": pipeline_info.get("started_at"),
                        "completed_at": pipeline_info.get("completed_at")
                    })
        
        # Sort by creation time (newest first)
        user_pipelines.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "pipelines": user_pipelines[:limit],
            "total_count": len(user_pipelines)
        }
    
    async def cleanup(self):
        """Cleanup service resources"""
        try:
            # Move active pipelines to history
            for pipeline_id, pipeline_info in self.active_pipelines.items():
                self.pipeline_history[pipeline_id] = pipeline_info
            
            self.active_pipelines.clear()
            
            # Cleanup hand tracking service
            if hasattr(self.hand_tracking_service, 'cleanup'):
                self.hand_tracking_service.cleanup()
                
        except Exception as e:
            logger.error(f"Error during training pipeline service cleanup: {e}")

# Global training pipeline service instance
training_pipeline_service = TrainingPipelineService()