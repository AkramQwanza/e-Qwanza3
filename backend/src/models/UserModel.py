from .BaseDataModel import BaseDataModel
from .db_schemes import User
from sqlalchemy.future import select
from sqlalchemy import delete


class UserModel(BaseDataModel):

    def __init__(self, db_client: object):
        super().__init__(db_client=db_client)
        self.db_client = db_client

    @classmethod
    async def create_instance(cls, db_client: object):
        instance = cls(db_client)
        return instance

    async def create_user(self, user: User):
        async with self.db_client() as session:
            async with session.begin():
                session.add(user)
            await session.commit()
            await session.refresh(user)
        return user

    async def get_user_by_id(self, user_id: int):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).where(User.user_id == user_id)
                result = await session.execute(query)
                return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).where(User.email == email)
                result = await session.execute(query)
                return result.scalar_one_or_none()

    async def list_users(self, page: int = 1, page_size: int = 20):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).offset((page - 1) * page_size).limit(page_size)
                result = await session.execute(query)
                return result.scalars().all()

    async def update_user(self, user_id: int, **fields):
        async with self.db_client() as session:
            async with session.begin():
                query = select(User).where(User.user_id == user_id)
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

    async def delete_user(self, user_id: int) -> bool:
        async with self.db_client() as session:
            async with session.begin():
                result = await session.execute(select(User).where(User.user_id == user_id))
                record = result.scalar_one_or_none()
                if record is None:
                    return False
                await session.delete(record)
            await session.commit()
            return True
