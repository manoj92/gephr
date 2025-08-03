import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import get_db, Base
from app.core.config import settings
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


# Test database URL (SQLite in-memory for testing)
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

TestingSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_session():
    """Create a test database session."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client():
    """Create test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def auth_headers(test_user):
    """Create authentication headers for test user."""
    access_token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
async def test_premium_user(db_session):
    """Create a premium test user."""
    user = User(
        email="premium@example.com",
        username="premiumuser",
        hashed_password=get_password_hash("premiumpass123"),
        full_name="Premium User",
        is_active=True,
        is_verified=True,
        is_premium=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def premium_auth_headers(test_premium_user):
    """Create authentication headers for premium test user."""
    access_token = create_access_token(subject=test_premium_user.id)
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def mock_file_upload():
    """Mock file upload for testing."""
    return {
        "filename": "test_video.mp4",
        "content_type": "video/mp4",
        "file": b"fake video content"
    }


class TestConfig:
    """Test configuration settings."""
    DATABASE_URL = SQLALCHEMY_DATABASE_URL
    TESTING = True
    SECRET_KEY = "test-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30