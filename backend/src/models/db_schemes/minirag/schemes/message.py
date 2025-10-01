from .minirag_base import SQLAlchemyBase
from sqlalchemy import Column, Integer, DateTime, func, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Index
import uuid
from sqlalchemy.orm import relationship

class Message(SQLAlchemyBase):

    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, autoincrement=True)
    message_uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    
    message_content = Column(String,nullable=False)
    message_sender = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    message_conversation_id = Column(Integer, ForeignKey("conversations.conversation_id"), nullable=False)
    message_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
        
    conversation = relationship("Conversation", back_populates="messages")
    user = relationship("User", back_populates="messages")

    __table_args__ = (
        Index('ix_message_conversation_id', message_conversation_id),
        Index('ix_message_user_id', message_user_id),
    )

