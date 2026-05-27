import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from shipcomply_api.config import settings


def _asyncpg_engine_args(raw: str) -> tuple[str, dict]:
    """Normalize a postgres URL for asyncpg.

    Render/Neon supply URLs as postgres:// with ?sslmode=require.
    asyncpg requires postgresql+asyncpg:// and ssl as a connect_arg.
    """
    url = raw
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    connect_args: dict = {}
    m = re.search(r"[?&]sslmode=([^&]*)", url)
    if m:
        sslmode = m.group(1)
        url = re.sub(r"[?&]sslmode=[^&]*", "", url).rstrip("?&")
        if sslmode in ("require", "verify-ca", "verify-full"):
            connect_args["ssl"] = True

    return url, connect_args


_db_url, _connect_args = _asyncpg_engine_args(settings.database_url)
engine = create_async_engine(
    _db_url,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    from shipcomply_api.db import models as _models  # noqa: F401 — registers ORM models with Base
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS corpus_chunks (
                chunk_id           TEXT PRIMARY KEY,
                jurisdiction       TEXT NOT NULL,
                regulation_version TEXT NOT NULL,
                section            TEXT NOT NULL,
                content            TEXT NOT NULL,
                embedding          TEXT,
                metadata           JSONB DEFAULT '{}'
            )
        """))


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
