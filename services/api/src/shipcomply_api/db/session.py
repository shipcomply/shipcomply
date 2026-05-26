from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from shipcomply_api.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    async with engine.begin() as conn:
        # Alembic handles migrations; this just verifies connectivity
        await conn.run_sync(lambda _: None)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
