from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

from helpers.security import hash_password, verify_password, create_token, decode_token
from models.UserModel import UserModel
from models.db_schemes import User, UserRole

auth_router = APIRouter(
    prefix="/api/v1/auth",
    tags=["api_v1", "auth"],
)


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, payload: RegisterRequest):
    user_model = await UserModel.create_instance(db_client=request.app.db_client)

    existing = await user_model.get_user_by_email(payload.email)
    if existing is not None:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "email_already_exists"})

    try:
        role = UserRole(payload.role) if payload.role in [r.value for r in UserRole] else (UserRole[payload.role.upper()] if payload.role else UserRole.USER)
    except Exception:
        role = UserRole.USER

    record = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        user_role=role,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    created = await user_model.create_user(record)

    access = create_token({"sub": str(created.user_id), "email": created.email, "role": created.user_role.value})
    refresh = create_token({"sub": str(created.user_id)}, refresh=True)
    return {"user_id": created.user_id, "email": created.email, "access_token": access, "refresh_token": refresh}


@auth_router.post("/login")
async def login(request: Request, payload: LoginRequest):
    user_model = await UserModel.create_instance(db_client=request.app.db_client)
    user = await user_model.get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"signal": "invalid_credentials"})
    access = create_token({"sub": str(user.user_id), "email": user.email, "role": user.user_role.value})
    refresh = create_token({"sub": str(user.user_id)}, refresh=True)
    return {"access_token": access, "refresh_token": refresh}


class RefreshRequest(BaseModel):
    refresh_token: str


@auth_router.post("/refresh")
async def refresh_token(payload: RefreshRequest):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"signal": "invalid_token_type"})
        user_id = data.get("sub")
        access = create_token({"sub": str(user_id)})
        return {"access_token": access}
    except Exception:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"signal": "invalid_token"})


