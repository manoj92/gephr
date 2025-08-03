import pytest
from httpx import AsyncClient
from app.models.user import User


class TestAuth:
    """Test authentication endpoints."""

    async def test_register_user(self, client: AsyncClient):
        """Test user registration."""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "StrongPassword123",
            "full_name": "New User"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["full_name"] == user_data["full_name"]
        assert "id" in data
        assert data["is_active"] is True

    async def test_register_duplicate_email(self, client: AsyncClient, test_user: User):
        """Test registration with duplicate email."""
        user_data = {
            "email": test_user.email,
            "username": "differentuser",
            "password": "StrongPassword123"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    async def test_register_duplicate_username(self, client: AsyncClient, test_user: User):
        """Test registration with duplicate username."""
        user_data = {
            "email": "different@example.com",
            "username": test_user.username,
            "password": "StrongPassword123"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "Username already taken" in response.json()["detail"]

    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password."""
        user_data = {
            "email": "weakpass@example.com",
            "username": "weakpass",
            "password": "weak"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 422

    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login."""
        login_data = {
            "username": test_user.username,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/v1/auth/login", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_id"] == test_user.id

    async def test_login_with_email(self, client: AsyncClient, test_user: User):
        """Test login with email instead of username."""
        login_data = {
            "username": test_user.email,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/v1/auth/login", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password."""
        login_data = {
            "username": test_user.username,
            "password": "wrongpassword"
        }
        
        response = await client.post("/api/v1/auth/login", data=login_data)
        
        assert response.status_code == 401
        assert "Incorrect username/email or password" in response.json()["detail"]

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with nonexistent user."""
        login_data = {
            "username": "nonexistent",
            "password": "password123"
        }
        
        response = await client.post("/api/v1/auth/login", data=login_data)
        
        assert response.status_code == 401

    async def test_get_current_user(self, client: AsyncClient, auth_headers: dict, test_user: User):
        """Test getting current user info."""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username

    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without auth."""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 401

    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401

    async def test_refresh_token(self, client: AsyncClient, auth_headers: dict):
        """Test token refresh."""
        response = await client.post("/api/v1/auth/refresh", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_logout(self, client: AsyncClient, auth_headers: dict):
        """Test logout."""
        response = await client.post("/api/v1/auth/logout", headers=auth_headers)
        
        assert response.status_code == 200
        assert "message" in response.json()