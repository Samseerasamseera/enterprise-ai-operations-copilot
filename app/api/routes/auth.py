
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import (
    ACCESS_TOKEN_MINUTES,
    REFRESH_TOKEN_DAYS,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_jwt_secret,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "refresh_token"


def set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    is_production = settings.environment.lower() == "production"

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        path="/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    is_production = settings.environment.lower() == "production"

    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/auth",
        httponly=True,
        secure=is_production,
        samesite="lax",
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    email = str(payload.email).strip().lower()

    existing_result = await db.execute(
        select(User).where(User.email == email)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)

    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        ) from None

    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    email = str(payload.email).strip().lower()

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(
        payload.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is inactive.")

    refresh_token, token_id = create_refresh_token(user.id)
    now = datetime.now(timezone.utc)

    db.add(
        RefreshToken(
            id=token_id,
            user_id=user.id,
            expires_at=now + timedelta(days=REFRESH_TOKEN_DAYS),
        )
    )

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to establish a session.",
        ) from None

    set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not raw_token:
        raise HTTPException(status_code=401, detail="Refresh session missing.")

    try:
        payload = decode_refresh_token(raw_token)
    except (jwt.InvalidTokenError, RuntimeError):
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=401,
            detail="Refresh session is invalid or expired.",
        ) from None

    token_id = payload["jti"]
    user_id = payload["sub"]
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(RefreshToken)
        .where(
            RefreshToken.id == token_id,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
        .with_for_update()
    )
    stored_token = result.scalar_one_or_none()

    if stored_token is None:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=401,
            detail="Refresh session is invalid, expired, or revoked.",
        )

    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()

    if user is None or not user.is_active:
        stored_token.revoked_at = now
        await db.commit()
        clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="User session is inactive.")

    # Rotate: revoke the old token and persist a new token ID.
    stored_token.revoked_at = now
    new_raw_token, new_token_id = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            id=new_token_id,
            user_id=user.id,
            expires_at=now + timedelta(days=REFRESH_TOKEN_DAYS),
        )
    )

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=401,
            detail="Unable to refresh session. Please log in again.",
        ) from None

    set_refresh_cookie(response, new_raw_token)

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if raw_token:
        try:
            payload = decode_refresh_token(raw_token)
            result = await db.execute(
                select(RefreshToken).where(
                    RefreshToken.id == payload["jti"],
                    RefreshToken.user_id == payload["sub"],
                    RefreshToken.revoked_at.is_(None),
                )
            )
            stored_token = result.scalar_one_or_none()

            if stored_token is not None:
                stored_token.revoked_at = datetime.now(timezone.utc)
                await db.commit()
        except (jwt.InvalidTokenError, RuntimeError):
            await db.rollback()

    clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user
