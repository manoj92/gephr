from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str


class TokenData(BaseModel):
    user_id: Optional[str] = None


class RefreshToken(BaseModel):
    refresh_token: str