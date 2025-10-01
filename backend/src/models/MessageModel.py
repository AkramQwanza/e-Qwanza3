from .BaseDataModel import BaseDataModel
from .db_schemes import Message
from sqlalchemy.future import select
from sqlalchemy import delete


class MessageModel(BaseDataModel):

    def __init__(self, db_client: object):
        super().__init__(db_client=db_client)
        self.db_client = db_client

    @classmethod
    async def create_instance(cls, db_client: object):
        instance = cls(db_client)
        return instance

    async def create_message(self, message: Message):
        async with self.db_client() as session:
            async with session.begin():
                session.add(message)
            await session.commit()
            await session.refresh(message)
        return message

    async def get_message(self, message_id: int):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Message).where(Message.message_id == message_id)
                result = await session.execute(query)
                return result.scalar_one_or_none()

    async def list_messages(self, page: int = 1, page_size: int = 20):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Message).offset((page - 1) * page_size).limit(page_size)
                result = await session.execute(query)
                return result.scalars().all()

    async def list_messages_by_conversation(self, conversation_id: int, page: int = 1, page_size: int = 50):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Message).where(Message.message_conversation_id == conversation_id) \
                    .offset((page - 1) * page_size).limit(page_size)
                result = await session.execute(query)
                return result.scalars().all()

    async def update_message(self, message_id: int, **fields):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Message).where(Message.message_id == message_id)
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

    async def delete_message(self, message_id: int) -> bool:
        async with self.db_client() as session:
            async with session.begin():
                result = await session.execute(select(Message).where(Message.message_id == message_id))
                record = result.scalar_one_or_none()
                if record is None:
                    return False
                await session.delete(record)
            await session.commit()
            return True


