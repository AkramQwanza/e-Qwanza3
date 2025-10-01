from .minirag_base import SQLAlchemyBase
from sqlalchemy import Column, Integer, DateTime, func, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Index
import uuid
from sqlalchemy.orm import relationship

class Conversation(SQLAlchemyBase):

    __tablename__ = "conversations"

    conversation_id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    
    conversation_title = Column(String,nullable=False)
    conversation_description = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    conversation_project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    conversation_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    messages = relationship("Message", back_populates="conversation")
    project = relationship("Project", back_populates="conversations")
    user = relationship("User", back_populates="conversations")

    __table_args__ = (
        Index('ix_conversation_project_id', conversation_project_id),
        Index('ix_conversation_user_id', conversation_user_id),
    )
