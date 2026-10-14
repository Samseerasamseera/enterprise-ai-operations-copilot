
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()

ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30
REFRESH_TOKEN_DAYS = 7


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def get_jwt_secret() -> str:
    secret = get_settings().jwt_secret_key

    if not secret:
        raise RuntimeError("JWT secret key is not configured.")

    return secret


def create_access_token(
    subject: str,
    expires_minutes: int = ACCESS_TOKEN_MINUTES,
) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": subject,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }

    return jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm=ALGORITHM,
    )


def create_refresh_token(subject: str) -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    token_id = str(uuid4())

    payload = {
        "sub": subject,
        "jti": token_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=REFRESH_TOKEN_DAYS),
    }

    token = jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm=ALGORITHM,
    )

    return token, token_id


def decode_access_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        get_jwt_secret(),
        algorithms=[ALGORITHM],
    )

    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Invalid access token type.")

    return payload


def decode_refresh_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        get_jwt_secret(),
        algorithms=[ALGORITHM],
    )

    if payload.get("type") != "refresh":
        raise jwt.InvalidTokenError("Invalid refresh token type.")

    if not payload.get("sub") or not payload.get("jti"):
        raise jwt.InvalidTokenError("Invalid refresh token claims.")

    return payload
