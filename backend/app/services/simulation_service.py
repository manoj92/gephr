import asyncio
import json
import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import subprocess
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from app.core.config import settings
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)

@dataclass
class SimulationEnvironment:
    name: str
    description: str
    scene_file: str
    physics_config: Dict[str, Any]
    lighting_config: Dict[str, Any]
    camera_positions: List[Dict[str, Any]]
    test_objects: List[Dict[str, Any]]

@dataclass
class SimulationResult:
    test_name: str
    success: bool
    score: float
    duration: float
    metrics: Dict[str, Any]
    error_message: Optional[str] = None

class SimulationService:
    """
    Advanced simulation service for testing GR00T N1 models with Unitree robots.
    Provides comprehensive physics simulation, environment setup, and performance testing.
    """
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.active_simulations = {}
        
        # Simulation environments
        self.environments = {
            "warehouse_navigation": SimulationEnvironment(
                name="Warehouse Navigation",
                description="Navigate through a warehouse environment with obstacles",
                scene_file="environments/warehouse.usd",
                physics_config={
                    "gravity": [0, 0, -9.81],
                    "time_step": 1/240,
                    "solver_iterations": 10,
                    "friction_coefficient": 0.7
                },
                lighting_config={
                    "ambient_light": 0.3,
                    "directional_light": {
                        "intensity": 1.0,
                        "direction": [-0.5, -1, -0.5]
                    }
                },
                camera_positions=[
                    {"name": "overhead", "position": [0, 0, 5], "target": [0, 0, 0]},
                    {"name": "side", "position": [3, 0, 1.5], "target": [0, 0, 1]},
                    {"name": "front", "position": [0, 3, 1.5], "target": [0, 0, 1]}
                ],
                test_objects=[
                    {"type": "box", "size": [0.5, 0.5, 0.5], "position": [1, 0, 0.25]},
                    {"type": "cylinder", "radius": 0.2, "height": 0.8, "position": [-1, 1, 0.4]},
                    {"type": "sphere", "radius": 0.15, "position": [0.5, -0.5, 0.15]}
                ]
            ),
            "manipulation_lab": SimulationEnvironment(
                name="Manipulation Laboratory",
                description="Precision manipulation tasks with various objects",
                scene_file="environments/manipulation_lab.usd",
                physics_config={
                    "gravity": [0, 0, -9.81],
                    "time_step": 1/500,
                    "solver_iterations": 15,
                    "friction_coefficient": 0.8
                },
                lighting_config={
                    "ambient_light": 0.4,
                    "spot_lights": [
                        {"position": [1, 1, 2], "target": [0, 0, 0.8], "intensity": 0.8},
                        {"position": [-1, 1, 2], "target": [0, 0, 0.8], "intensity": 0.8}
                    ]
                },
                camera_positions=[
                    {"name": "close_front", "position": [0, 0.8, 1.2], "target": [0, 0, 0.8]},
                    {"name": "side_detail", "position": [0.8, 0, 1], "target": [0, 0, 0.8]},
                    {"name": "top_down", "position": [0, 0, 2], "target": [0, 0, 0.8]}
                ],
                test_objects=[
                    {"type": "small_box", "size": [0.05, 0.05, 0.05], "position": [0.3, 0, 0.8]},
                    {"type": "tool", "mesh": "screwdriver.obj", "position": [0.2, 0.1, 0.8]},
                    {"type": "fragile", "mesh": "glass.obj", "position": [-0.2, 0, 0.8]}
                ]
            ),
            "outdoor_terrain": SimulationEnvironment(
                name="Outdoor Terrain",
                description="Outdoor environment with varied terrain and weather",
                scene_file="environments/outdoor_terrain.usd",
                physics_config={
                    "gravity": [0, 0, -9.81],
                    "time_step": 1/240,
                    "solver_iterations": 8,
                    "friction_coefficient": 0.5,  # Variable terrain
                    "terrain_compliance": True
                },
                lighting_config={
                    "sun_light": {
                        "intensity": 1.2,
                        "direction": [-0.3, -0.7, -0.6],
                        "color": [1.0, 0.95, 0.8]
                    },
                    "sky_dome": True
                },
                camera_positions=[
                    {"name": "following", "position": [-2, -2, 2], "target": [0, 0, 1]},
                    {"name": "wide_angle", "position": [-5, 0, 3], "target": [0, 0, 1]},
                    {"name": "first_person", "position": [0, 0, 1.6], "target": [1, 0, 1.6]}
                ],
                test_objects=[
                    {"type": "rock", "mesh": "rock_cluster.obj", "position": [2, 1, 0]},
                    {"type": "log", "mesh": "fallen_log.obj", "position": [1, -1, 0]},
                    {"type": "slope", "mesh": "hill_section.obj", "position": [3, 0, 0]}
                ]
            ),
            "balance_challenge": SimulationEnvironment(
                name="Balance Challenge",
                description="Dynamic balance testing with perturbations",
                scene_file="environments/balance_platform.usd",
                physics_config={
                    "gravity": [0, 0, -9.81],
                    "time_step": 1/1000,  # High frequency for balance
                    "solver_iterations": 20,
                    "friction_coefficient": 0.9
                },
                lighting_config={
                    "ambient_light": 0.5,
                    "directional_light": {
                        "intensity": 0.8,
                        "direction": [0, -1, -0.5]
                    }
                },
                camera_positions=[
                    {"name": "stability_cam", "position": [0, 2, 1], "target": [0, 0, 1]},
                    {"name": "detail_cam", "position": [1, 1, 0.5], "target": [0, 0, 0.5]}
                ],
                test_objects=[
                    {"type": "moving_platform", "size": [1, 1, 0.1], "position": [0, 0, 0]},
                    {"type": "pendulum", "length": 0.5, "position": [0.5, 0, 1.5]}
                ]
            )
        }
        
        # Test scenarios for each robot type
        self.test_scenarios = {
            "unitree_g1": {
                "basic_walking": {
                    "environment": "warehouse_navigation",
                    "duration": 60,
                    "objectives": ["walk_forward_2m", "turn_90_degrees", "walk_back"],
                    "success_criteria": {"completion_rate": 0.8, "stability": 0.9}
                },
                "object_manipulation": {
                    "environment": "manipulation_lab",
                    "duration": 90,
                    "objectives": ["pick_small_object", "place_precisely", "pick_tool"],
                    "success_criteria": {"precision": 0.85, "success_rate": 0.7}
                },
                "terrain_traversal": {
                    "environment": "outdoor_terrain",
                    "duration": 120,
                    "objectives": ["climb_slope", "step_over_log", "navigate_rocks"],
                    "success_criteria": {"completion_rate": 0.6, "energy_efficiency": 0.7}
                },
                "dynamic_balance": {
                    "environment": "balance_challenge",
                    "duration": 45,
                    "objectives": ["maintain_balance", "recover_from_push", "walk_on_moving_platform"],
                    "success_criteria": {"balance_time": 0.9, "recovery_speed": 0.8}
                }
            },
            "custom_humanoid": {
                "advanced_walking": {
                    "environment": "warehouse_navigation",
                    "duration": 60,
                    "objectives": ["dynamic_gait", "obstacle_avoidance", "path_planning"],
                    "success_criteria": {"completion_rate": 0.85, "efficiency": 0.8}
                },
                "precision_manipulation": {
                    "environment": "manipulation_lab",
                    "duration": 120,
                    "objectives": ["fine_motor_control", "bimanual_tasks", "tool_use"],
                    "success_criteria": {"precision": 0.9, "coordination": 0.85}
                },
                "adaptive_locomotion": {
                    "environment": "outdoor_terrain",
                    "duration": 150,
                    "objectives": ["adaptive_gait", "terrain_analysis", "energy_optimization"],
                    "success_criteria": {"adaptability": 0.8, "energy_efficiency": 0.75}
                },
                "complex_balance": {
                    "environment": "balance_challenge",
                    "duration": 60,
                    "objectives": ["active_balance", "predictive_control", "multi_disturbance"],
                    "success_criteria": {"stability": 0.9, "response_time": 0.85}
                }
            }
        }
    
    async def create_simulation(
        self,
        model_path: str,
        robot_type: str,
        environment_name: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new simulation instance"""
        try:
            if environment_name not in self.environments:
                raise ValueError(f"Environment '{environment_name}' not available")
            
            if robot_type not in ["unitree_g1", "custom_humanoid"]:
                raise ValueError(f"Robot type '{robot_type}' not supported")
            
            environment = self.environments[environment_name]
            simulation_id = f"sim_{int(datetime.utcnow().timestamp())}"
            
            # Default simulation configuration
            default_config = {
                "physics_frequency": 240,
                "control_frequency": 500 if robot_type == "unitree_g1" else 1000,
                "real_time_factor": 1.0,
                "headless": False,
                "record_video": True,
                "save_telemetry": True,
                "max_duration": 300  # 5 minutes max
            }
            
            final_config = {**default_config, **(config or {})}
            
            # Create simulation workspace
            workspace_dir = Path(tempfile.mkdtemp(prefix=f"simulation_{simulation_id}_"))
            
            simulation_info = {
                "id": simulation_id,
                "model_path": model_path,
                "robot_type": robot_type,
                "environment": environment,
                "config": final_config,
                "workspace_dir": str(workspace_dir),
                "status": "initializing",
                "created_at": datetime.utcnow(),
                "start_time": None,
                "end_time": None,
                "results": None
            }
            
            self.active_simulations[simulation_id] = simulation_info
            
            # Initialize simulation environment
            await self._initialize_simulation(simulation_id)
            
            return {
                "simulation_id": simulation_id,
                "status": "ready",
                "environment": environment_name,
                "robot_type": robot_type,
                "config": final_config,
                "workspace": str(workspace_dir)
            }
            
        except Exception as e:
            logger.error(f"Error creating simulation: {e}")
            raise
    
    async def _initialize_simulation(self, simulation_id: str):
        """Initialize the simulation environment"""
        sim_info = self.active_simulations[simulation_id]
        
        try:
            # Create simulation files
            workspace = Path(sim_info["workspace_dir"])
            
            # Generate USD scene file
            scene_config = await self._generate_scene_config(sim_info)
            scene_file = workspace / "scene.usd"
            
            with open(scene_file, 'w') as f:
                json.dump(scene_config, f, indent=2)
            
            # Generate robot configuration
            robot_config = await self._generate_robot_config(sim_info)
            robot_file = workspace / "robot_config.json"
            
            with open(robot_file, 'w') as f:
                json.dump(robot_config, f, indent=2)
            
            # Generate physics configuration
            physics_config = sim_info["environment"].physics_config
            physics_file = workspace / "physics_config.json"
            
            with open(physics_file, 'w') as f:
                json.dump(physics_config, f, indent=2)
            
            sim_info["status"] = "ready"
            logger.info(f"Simulation {simulation_id} initialized successfully")
            
        except Exception as e:
            sim_info["status"] = "error"
            sim_info["error"] = str(e)
            logger.error(f"Error initializing simulation {simulation_id}: {e}")
            raise
    
    async def _generate_scene_config(self, sim_info: Dict) -> Dict[str, Any]:
        """Generate scene configuration for the simulation"""
        environment = sim_info["environment"]
        
        return {
            "scene_name": environment.name,
            "description": environment.description,
            "lighting": environment.lighting_config,
            "cameras": environment.camera_positions,
            "objects": environment.test_objects,
            "ground_plane": {
                "size": [10, 10, 0.1],
                "material": "concrete",
                "friction": environment.physics_config.get("friction_coefficient", 0.7)
            },
            "boundaries": {
                "min": [-5, -5, 0],
                "max": [5, 5, 3]
            }
        }
    
    async def _generate_robot_config(self, sim_info: Dict) -> Dict[str, Any]:
        """Generate robot configuration for the simulation"""
        robot_type = sim_info["robot_type"]
        
        if robot_type == "unitree_g1":
            return {
                "model_name": "Unitree G1",
                "urdf_path": "robots/unitree_g1/urdf/g1.urdf",
                "initial_position": [0, 0, 0.4],
                "initial_orientation": [0, 0, 0, 1],
                "joint_limits": {
                    "position": [-3.14, 3.14],
                    "velocity": [-10, 10],
                    "torque": [-50, 50]
                },
                "control_config": {
                    "mode": "position_control",
                    "gains": {"kp": 100, "kd": 10, "ki": 1}
                },
                "sensors": {
                    "imu": {"frequency": 1000, "noise": 0.01},
                    "joint_encoders": {"frequency": 1000, "noise": 0.001},
                    "cameras": {"frequency": 30, "resolution": [640, 480]}
                }
            }
        else:  # custom_humanoid
            return {
                "model_name": "Custom Humanoid",
                "urdf_path": "robots/custom/urdf/humanoid.urdf",
                "initial_position": [0, 0, 0.5],
                "initial_orientation": [0, 0, 0, 1],
                "joint_limits": {
                    "position": [-3.14, 3.14],
                    "velocity": [-15, 15],
                    "torque": [-80, 80]
                },
                "control_config": {
                    "mode": "hybrid_control",
                    "gains": {"kp": 150, "kd": 15, "ki": 2}
                },
                "sensors": {
                    "imu": {"frequency": 1000, "noise": 0.005},
                    "joint_encoders": {"frequency": 1000, "noise": 0.0005},
                    "cameras": {"frequency": 60, "resolution": [1280, 720]},
                    "force_sensors": {"frequency": 1000, "noise": 0.1}
                }
            }
    
    async def run_test_scenario(
        self,
        simulation_id: str,
        scenario_name: str
    ) -> Dict[str, Any]:
        """Run a specific test scenario in the simulation"""
        try:
            if simulation_id not in self.active_simulations:
                raise ValueError(f"Simulation {simulation_id} not found")
            
            sim_info = self.active_simulations[simulation_id]
            robot_type = sim_info["robot_type"]
            
            if scenario_name not in self.test_scenarios.get(robot_type, {}):
                raise ValueError(f"Scenario '{scenario_name}' not available for {robot_type}")
            
            scenario = self.test_scenarios[robot_type][scenario_name]
            
            # Update simulation status
            sim_info["status"] = "running"
            sim_info["current_scenario"] = scenario_name
            sim_info["start_time"] = datetime.utcnow()
            
            # Run the scenario
            result = await self._execute_scenario(simulation_id, scenario)
            
            # Update simulation status
            sim_info["status"] = "completed"
            sim_info["end_time"] = datetime.utcnow()
            sim_info["results"] = result
            
            return {
                "simulation_id": simulation_id,
                "scenario": scenario_name,
                "result": result,
                "duration": (sim_info["end_time"] - sim_info["start_time"]).total_seconds()
            }
            
        except Exception as e:
            logger.error(f"Error running test scenario: {e}")
            if simulation_id in self.active_simulations:
                self.active_simulations[simulation_id]["status"] = "error"
                self.active_simulations[simulation_id]["error"] = str(e)
            raise
    
    async def _execute_scenario(
        self,
        simulation_id: str,
        scenario: Dict[str, Any]
    ) -> SimulationResult:
        """Execute a test scenario and return results"""
        sim_info = self.active_simulations[simulation_id]
        
        try:
            # Mock scenario execution - in reality this would interface with
            # simulation engines like Isaac Sim, Gazebo, or MuJoCo
            
            scenario_duration = scenario["duration"]
            objectives = scenario["objectives"]
            success_criteria = scenario["success_criteria"]
            
            # Simulate test execution
            await asyncio.sleep(min(2.0, scenario_duration / 30))  # Accelerated for demo
            
            # Generate realistic test metrics
            metrics = await self._generate_test_metrics(sim_info, scenario)
            
            # Evaluate success based on criteria
            success = self._evaluate_success(metrics, success_criteria)
            score = self._calculate_score(metrics, success_criteria)
            
            return SimulationResult(
                test_name=sim_info["current_scenario"],
                success=success,
                score=score,
                duration=scenario_duration,
                metrics=metrics
            )
            
        except Exception as e:
            return SimulationResult(
                test_name=sim_info.get("current_scenario", "unknown"),
                success=False,
                score=0.0,
                duration=0.0,
                metrics={},
                error_message=str(e)
            )
    
    async def _generate_test_metrics(
        self,
        sim_info: Dict,
        scenario: Dict
    ) -> Dict[str, Any]:
        """Generate realistic test metrics based on robot type and scenario"""
        robot_type = sim_info["robot_type"]
        environment = sim_info["environment"].name
        
        # Base performance varies by robot type
        base_performance = 0.85 if robot_type == "unitree_g1" else 0.80
        
        # Environment difficulty modifiers
        env_modifiers = {
            "warehouse_navigation": 1.0,
            "manipulation_lab": 0.9,
            "outdoor_terrain": 0.8,
            "balance_challenge": 0.75
        }
        
        env_modifier = env_modifiers.get(environment, 0.8)
        adjusted_performance = base_performance * env_modifier
        
        # Add some realistic noise
        noise = np.random.normal(0, 0.05)
        final_performance = np.clip(adjusted_performance + noise, 0.0, 1.0)
        
        return {
            "completion_rate": final_performance,
            "average_speed": np.random.uniform(0.3, 1.2),
            "energy_consumption": np.random.uniform(50, 200),  # Watts
            "stability_score": np.random.uniform(0.7, 0.95),
            "precision_score": np.random.uniform(0.6, 0.9),
            "response_time": np.random.uniform(0.1, 0.5),  # seconds
            "collision_count": np.random.randint(0, 3),
            "joint_smoothness": np.random.uniform(0.8, 0.98),
            "trajectory_efficiency": np.random.uniform(0.7, 0.95),
            "task_specific_metrics": self._get_task_specific_metrics(scenario)
        }
    
    def _get_task_specific_metrics(self, scenario: Dict) -> Dict[str, Any]:
        """Get metrics specific to the task type"""
        objectives = scenario.get("objectives", [])
        
        if any("walk" in obj for obj in objectives):
            return {
                "step_frequency": np.random.uniform(1.5, 2.5),  # Hz
                "step_length": np.random.uniform(0.3, 0.6),     # meters
                "lateral_drift": np.random.uniform(0.0, 0.1)    # meters
            }
        elif any("pick" in obj or "place" in obj for obj in objectives):
            return {
                "grasp_success_rate": np.random.uniform(0.7, 0.95),
                "placement_accuracy": np.random.uniform(0.8, 0.98),  # mm
                "approach_smoothness": np.random.uniform(0.75, 0.95)
            }
        elif any("balance" in obj for obj in objectives):
            return {
                "recovery_time": np.random.uniform(0.5, 2.0),   # seconds
                "max_deviation": np.random.uniform(0.05, 0.2),  # meters
                "stabilization_time": np.random.uniform(1.0, 3.0)  # seconds
            }
        else:
            return {}
    
    def _evaluate_success(
        self,
        metrics: Dict[str, Any],
        criteria: Dict[str, float]
    ) -> bool:
        """Evaluate if the test meets success criteria"""
        for criterion, threshold in criteria.items():
            if criterion in metrics:
                if metrics[criterion] < threshold:
                    return False
        return True
    
    def _calculate_score(
        self,
        metrics: Dict[str, Any],
        criteria: Dict[str, float]
    ) -> float:
        """Calculate overall performance score"""
        scores = []
        
        for criterion, threshold in criteria.items():
            if criterion in metrics:
                # Normalize score relative to threshold
                score = min(1.0, metrics[criterion] / threshold)
                scores.append(score)
        
        # Additional metrics contribute to overall score
        if "stability_score" in metrics:
            scores.append(metrics["stability_score"])
        if "precision_score" in metrics:
            scores.append(metrics["precision_score"])
        if "trajectory_efficiency" in metrics:
            scores.append(metrics["trajectory_efficiency"])
        
        return np.mean(scores) if scores else 0.0
    
    async def run_comprehensive_test_suite(
        self,
        simulation_id: str,
        test_scenarios: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Run a comprehensive test suite for the robot"""
        try:
            if simulation_id not in self.active_simulations:
                raise ValueError(f"Simulation {simulation_id} not found")
            
            sim_info = self.active_simulations[simulation_id]
            robot_type = sim_info["robot_type"]
            
            # Use all scenarios if none specified
            if test_scenarios is None:
                test_scenarios = list(self.test_scenarios[robot_type].keys())
            
            results = []
            overall_start = datetime.utcnow()
            
            for scenario_name in test_scenarios:
                try:
                    result = await self.run_test_scenario(simulation_id, scenario_name)
                    results.append(result)
                    
                    logger.info(f"Completed scenario {scenario_name}: {result['result'].success}")
                    
                except Exception as e:
                    logger.error(f"Error in scenario {scenario_name}: {e}")
                    results.append({
                        "simulation_id": simulation_id,
                        "scenario": scenario_name,
                        "result": SimulationResult(
                            test_name=scenario_name,
                            success=False,
                            score=0.0,
                            duration=0.0,
                            metrics={},
                            error_message=str(e)
                        ),
                        "duration": 0.0
                    })
            
            overall_end = datetime.utcnow()
            
            # Calculate summary statistics
            total_tests = len(results)
            passed_tests = sum(1 for r in results if r["result"].success)
            average_score = np.mean([r["result"].score for r in results])
            total_duration = sum(r["duration"] for r in results)
            
            return {
                "simulation_id": simulation_id,
                "robot_type": robot_type,
                "test_suite_results": {
                    "total_tests": total_tests,
                    "passed_tests": passed_tests,
                    "success_rate": passed_tests / total_tests if total_tests > 0 else 0,
                    "average_score": average_score,
                    "total_duration": total_duration,
                    "overall_duration": (overall_end - overall_start).total_seconds()
                },
                "individual_results": results,
                "summary": {
                    "performance_grade": self._calculate_performance_grade(average_score),
                    "strengths": self._identify_strengths(results),
                    "weaknesses": self._identify_weaknesses(results),
                    "recommendations": self._generate_recommendations(results)
                }
            }
            
        except Exception as e:
            logger.error(f"Error running comprehensive test suite: {e}")
            raise
    
    def _calculate_performance_grade(self, average_score: float) -> str:
        """Calculate performance grade based on average score"""
        if average_score >= 0.9:
            return "A"
        elif average_score >= 0.8:
            return "B"
        elif average_score >= 0.7:
            return "C"
        elif average_score >= 0.6:
            return "D"
        else:
            return "F"
    
    def _identify_strengths(self, results: List[Dict]) -> List[str]:
        """Identify strengths based on test results"""
        strengths = []
        
        # Check for high-performing scenarios
        for result in results:
            if result["result"].success and result["result"].score > 0.85:
                scenario = result["scenario"]
                if "walking" in scenario or "navigation" in scenario:
                    strengths.append("Excellent locomotion capabilities")
                elif "manipulation" in scenario:
                    strengths.append("Strong manipulation skills")
                elif "balance" in scenario:
                    strengths.append("Superior balance control")
        
        # Remove duplicates
        return list(set(strengths))
    
    def _identify_weaknesses(self, results: List[Dict]) -> List[str]:
        """Identify weaknesses based on test results"""
        weaknesses = []
        
        # Check for poor-performing scenarios
        for result in results:
            if not result["result"].success or result["result"].score < 0.6:
                scenario = result["scenario"]
                if "walking" in scenario or "navigation" in scenario:
                    weaknesses.append("Locomotion needs improvement")
                elif "manipulation" in scenario:
                    weaknesses.append("Manipulation accuracy below target")
                elif "balance" in scenario:
                    weaknesses.append("Balance recovery needs work")
        
        # Remove duplicates
        return list(set(weaknesses))
    
    def _generate_recommendations(self, results: List[Dict]) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Analyze overall performance patterns
        scores = [r["result"].score for r in results]
        avg_score = np.mean(scores)
        
        if avg_score < 0.7:
            recommendations.append("Consider additional training with more diverse datasets")
        
        # Check for specific issues
        failed_scenarios = [r for r in results if not r["result"].success]
        
        if len(failed_scenarios) > 0:
            recommendations.append("Focus training on failed scenarios")
        
        # Check for consistency
        score_std = np.std(scores)
        if score_std > 0.2:
            recommendations.append("Improve model consistency across different tasks")
        
        return recommendations
    
    async def get_simulation_status(self, simulation_id: str) -> Dict[str, Any]:
        """Get current status of a simulation"""
        if simulation_id not in self.active_simulations:
            raise ValueError(f"Simulation {simulation_id} not found")
        
        sim_info = self.active_simulations[simulation_id]
        
        return {
            "simulation_id": simulation_id,
            "status": sim_info["status"],
            "robot_type": sim_info["robot_type"],
            "environment": sim_info["environment"].name,
            "created_at": sim_info["created_at"],
            "start_time": sim_info.get("start_time"),
            "end_time": sim_info.get("end_time"),
            "current_scenario": sim_info.get("current_scenario"),
            "error": sim_info.get("error"),
            "results": sim_info.get("results")
        }
    
    async def cleanup_simulation(self, simulation_id: str):
        """Clean up simulation resources"""
        try:
            if simulation_id in self.active_simulations:
                sim_info = self.active_simulations[simulation_id]
                
                # Clean up workspace directory
                workspace_dir = Path(sim_info["workspace_dir"])
                if workspace_dir.exists():
                    import shutil
                    shutil.rmtree(workspace_dir)
                
                # Remove from active simulations
                del self.active_simulations[simulation_id]
                
                logger.info(f"Cleaned up simulation {simulation_id}")
        
        except Exception as e:
            logger.error(f"Error cleaning up simulation {simulation_id}: {e}")
    
    async def get_available_environments(self) -> Dict[str, Any]:
        """Get list of available simulation environments"""
        return {
            "environments": {
                name: {
                    "name": env.name,
                    "description": env.description,
                    "suitable_for": self._get_suitable_robots(name)
                }
                for name, env in self.environments.items()
            }
        }
    
    def _get_suitable_robots(self, environment_name: str) -> List[str]:
        """Get robot types suitable for an environment"""
        suitable = []
        for robot_type, scenarios in self.test_scenarios.items():
            if any(scenario["environment"] == environment_name 
                   for scenario in scenarios.values()):
                suitable.append(robot_type)
        return suitable
    
    async def cleanup(self):
        """Cleanup all simulation resources"""
        try:
            # Clean up all active simulations
            for simulation_id in list(self.active_simulations.keys()):
                await self.cleanup_simulation(simulation_id)
            
            # Shutdown executor
            self.executor.shutdown(wait=True)
            
        except Exception as e:
            logger.error(f"Error during simulation service cleanup: {e}")

# Global simulation service instance
simulation_service = SimulationService()