import enum
from .minirag_base import SQLAlchemyBase
from sqlalchemy import Column, Integer, DateTime, func, String, Enum
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.orm import relationship

# Définition de l'énum Python
class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"

class User(SQLAlchemyBase):

    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    user_uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    
    # Enum SQLAlchemy basé sur l'énum Python
    user_role = Column(Enum(UserRole, name="user_role_enum"), nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    conversations = relationship("Conversation", back_populates="user")
    projects = relationship("Project", back_populates="user")
    messages = relationship("Message", back_populates="user")
