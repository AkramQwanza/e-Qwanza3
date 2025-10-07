from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict

from passlib.context import CryptContext
import jwt

from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None, *, refresh: bool = False) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(tz=timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else (timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES) if not refresh else timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS))
    )
    to_encode.update({"exp": expire, "type": "refresh" if refresh else "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


