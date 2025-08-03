import pytest
from httpx import AsyncClient
from app.models.user import User


class TestMarketplace:
    """Test marketplace endpoints."""

    async def test_create_skill(self, client: AsyncClient, auth_headers: dict):
        """Test creating a skill."""
        skill_data = {
            "name": "Pick and Place Mastery",
            "description": "Advanced pick and place skills for robotic manipulation",
            "category": "manipulation",
            "difficulty_level": 5,
            "robot_types": ["unitree_g1", "boston_dynamics"],
            "price": 29.99,
            "tags": ["manipulation", "picking", "placing"],
            "required_capabilities": ["manipulation", "vision"],
            "is_free": False,
            "is_public": True
        }
        
        response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == skill_data["name"]
        assert data["description"] == skill_data["description"]
        assert data["category"] == skill_data["category"]
        assert data["difficulty_level"] == skill_data["difficulty_level"]
        assert data["price"] == skill_data["price"]
        assert data["status"] == "draft"
        assert "id" in data

    async def test_search_skills(self, client: AsyncClient, auth_headers: dict):
        """Test searching for skills."""
        # First create a skill
        skill_data = {
            "name": "Navigation Expert",
            "description": "Expert navigation skills",
            "category": "navigation", 
            "difficulty_level": 3,
            "robot_types": ["unitree_g1"],
            "price": 19.99
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Update to published status (simulate admin approval)
        # Note: In real implementation, this would require admin privileges
        
        # Search for skills
        response = await client.get("/api/v1/marketplace/skills")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_search_skills_with_filters(self, client: AsyncClient):
        """Test searching skills with filters."""
        response = await client.get(
            "/api/v1/marketplace/skills",
            params={
                "category": "manipulation",
                "min_price": 10.0,
                "max_price": 50.0,
                "difficulty_min": 3,
                "difficulty_max": 7,
                "robot_type": "unitree_g1"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_get_skill_by_id(self, client: AsyncClient, auth_headers: dict):
        """Test getting a specific skill."""
        # Create skill
        skill_data = {
            "name": "Specific Skill",
            "description": "A specific skill",
            "category": "manipulation",
            "difficulty_level": 4,
            "robot_types": ["unitree_g1"],
            "price": 15.99
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Get skill
        response = await client.get(f"/api/v1/marketplace/skills/{skill_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == skill_id
        assert data["name"] == skill_data["name"]

    async def test_get_nonexistent_skill(self, client: AsyncClient):
        """Test getting a nonexistent skill."""
        response = await client.get("/api/v1/marketplace/skills/nonexistent-id")
        assert response.status_code == 404

    async def test_update_skill(self, client: AsyncClient, auth_headers: dict):
        """Test updating a skill."""
        # Create skill
        skill_data = {
            "name": "Original Skill",
            "description": "Original description",
            "category": "manipulation",
            "difficulty_level": 3,
            "robot_types": ["unitree_g1"],
            "price": 20.0
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Update skill
        update_data = {
            "name": "Updated Skill",
            "description": "Updated description",
            "price": 25.0
        }
        
        response = await client.put(
            f"/api/v1/marketplace/skills/{skill_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        assert data["price"] == update_data["price"]

    async def test_delete_skill(self, client: AsyncClient, auth_headers: dict):
        """Test deleting a skill."""
        # Create skill
        skill_data = {
            "name": "To Delete",
            "description": "Will be deleted",
            "category": "manipulation",
            "difficulty_level": 2,
            "robot_types": ["unitree_g1"],
            "price": 10.0
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Delete skill
        response = await client.delete(
            f"/api/v1/marketplace/skills/{skill_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204

    async def test_purchase_skill(self, client: AsyncClient, auth_headers: dict, premium_auth_headers: dict):
        """Test purchasing a skill."""
        # Create skill with first user
        skill_data = {
            "name": "Purchasable Skill",
            "description": "A skill to purchase",
            "category": "manipulation",
            "difficulty_level": 3,
            "robot_types": ["unitree_g1"],
            "price": 30.0
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Purchase with different user
        purchase_data = {
            "skill_id": skill_id,
            "payment_method": "credit_card",
            "license_type": "standard"
        }
        
        response = await client.post(
            f"/api/v1/marketplace/skills/{skill_id}/purchase",
            json=purchase_data,
            headers=premium_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["skill_id"] == skill_id
        assert data["purchase_price"] == skill_data["price"]
        assert data["payment_status"] == "completed"

    async def test_purchase_own_skill(self, client: AsyncClient, auth_headers: dict):
        """Test purchasing own skill (should fail)."""
        # Create skill
        skill_data = {
            "name": "Own Skill",
            "description": "Own skill",
            "category": "manipulation",
            "difficulty_level": 3,
            "robot_types": ["unitree_g1"],
            "price": 20.0
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Try to purchase own skill
        purchase_data = {
            "skill_id": skill_id,
            "payment_method": "credit_card"
        }
        
        response = await client.post(
            f"/api/v1/marketplace/skills/{skill_id}/purchase",
            json=purchase_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Cannot purchase your own skill" in response.json()["detail"]

    async def test_get_user_purchases(self, client: AsyncClient, premium_auth_headers: dict):
        """Test getting user's purchases."""
        response = await client.get(
            "/api/v1/marketplace/purchases",
            headers=premium_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_rate_skill(self, client: AsyncClient, auth_headers: dict, premium_auth_headers: dict):
        """Test rating a skill."""
        # Create and purchase skill
        skill_data = {
            "name": "Rateable Skill",
            "description": "A skill to rate",
            "category": "manipulation", 
            "difficulty_level": 4,
            "robot_types": ["unitree_g1"],
            "price": 25.0
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Purchase skill
        purchase_data = {"skill_id": skill_id, "payment_method": "credit_card"}
        await client.post(
            f"/api/v1/marketplace/skills/{skill_id}/purchase",
            json=purchase_data,
            headers=premium_auth_headers
        )
        
        # Rate skill
        rating_data = {
            "skill_id": skill_id,
            "rating": 5,
            "review_title": "Excellent skill!",
            "review_text": "This skill works perfectly for my robot.",
            "ease_of_use": 5,
            "performance": 5,
            "documentation": 4,
            "value_for_money": 5
        }
        
        response = await client.post(
            f"/api/v1/marketplace/skills/{skill_id}/rate",
            json=rating_data,
            headers=premium_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["skill_id"] == skill_id
        assert data["rating"] == rating_data["rating"]
        assert data["review_title"] == rating_data["review_title"]

    async def test_get_skill_ratings(self, client: AsyncClient, auth_headers: dict):
        """Test getting ratings for a skill."""
        # Create skill
        skill_data = {
            "name": "Rated Skill",
            "description": "A skill with ratings",
            "category": "manipulation",
            "difficulty_level": 3,
            "robot_types": ["unitree_g1"],
            "price": 20.0
        }
        
        create_response = await client.post(
            "/api/v1/marketplace/skills",
            json=skill_data,
            headers=auth_headers
        )
        skill_id = create_response.json()["id"]
        
        # Get ratings
        response = await client.get(f"/api/v1/marketplace/skills/{skill_id}/ratings")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_invalid_skill_data(self, client: AsyncClient, auth_headers: dict):
        """Test creating skill with invalid data."""
        invalid_skill_data = {
            "name": "Invalid Skill",
            "description": "Invalid skill",
            "category": "manipulation",
            "difficulty_level": 15,  # Invalid: > 10
            "robot_types": ["unitree_g1"],
            "price": -10.0  # Invalid: negative price
        }
        
        response = await client.post(
            "/api/v1/marketplace/skills",
            json=invalid_skill_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422

    async def test_marketplace_unauthorized(self, client: AsyncClient):
        """Test marketplace endpoints without authentication."""
        # Creating skills requires auth
        response = await client.post(
            "/api/v1/marketplace/skills",
            json={"name": "Test", "description": "Test", "category": "test", 
                  "difficulty_level": 1, "robot_types": ["test"], "price": 10.0}
        )
        assert response.status_code == 401
        
        # But viewing skills should work without auth
        response = await client.get("/api/v1/marketplace/skills")
        assert response.status_code == 200