from .BaseDataModel import BaseDataModel
from .db_schemes import Conversation
from sqlalchemy.future import select
from sqlalchemy import delete


class ConversationModel(BaseDataModel):

    def __init__(self, db_client: object):
        super().__init__(db_client=db_client)
        self.db_client = db_client

    @classmethod
    async def create_instance(cls, db_client: object):
        instance = cls(db_client)
        return instance

    async def create_conversation(self, conversation: Conversation):
        async with self.db_client() as session:
            async with session.begin():
                session.add(conversation)
            await session.commit()
            await session.refresh(conversation)
        return conversation

    async def get_conversation(self, conversation_id: int):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Conversation).where(Conversation.conversation_id == conversation_id)
                result = await session.execute(query)
                return result.scalar_one_or_none()

    async def list_conversations(self, page: int = 1, page_size: int = 20):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Conversation).offset((page - 1) * page_size).limit(page_size)
                result = await session.execute(query)
                return result.scalars().all()

    async def list_conversations_by_project(self, project_id: int, page: int = 1, page_size: int = 20):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Conversation).where(Conversation.conversation_project_id == project_id) \
                    .offset((page - 1) * page_size).limit(page_size)
                result = await session.execute(query)
                return result.scalars().all()

    async def update_conversation(self, conversation_id: int, **fields):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Conversation).where(Conversation.conversation_id == conversation_id)
                result = await session.execute(query)
                record = result.scalar_one_or_none()
                if record is None:
                    return None
                for key, value in fields.items():
                    if hasattr(record, key) and value is not None:
                        setattr(record, key, value)
            await session.commit()
            await session.refresh(record)
            return record

    async def delete_conversation(self, conversation_id: int) -> bool:
        async with self.db_client() as session:
            async with session.begin():
                result = await session.execute(select(Conversation).where(Conversation.conversation_id == conversation_id))
                record = result.scalar_one_or_none()
                if record is None:
                    return False
                await session.delete(record)
            await session.commit()
            return True


