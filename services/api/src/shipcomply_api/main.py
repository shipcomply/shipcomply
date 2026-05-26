from contextlib import asynccontextmanager
import logging
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from shipcomply_api.routes import scans, health, webhooks
from shipcomply_api.db.session import init_db
from shipcomply_api.security.redactor import install_pii_log_filter
from shipcomply_api.middleware import RequestIdMiddleware
from shipcomply_api.observability import init_langfuse
from shipcomply_api.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    install_pii_log_filter()
    init_langfuse()
    try:
        await init_db()
    except Exception as exc:
        logger.warning("DB unavailable at startup (set DATABASE_URL): %s", exc)
    yield


if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1, environment="production" if not settings.debug else "development")

app = FastAPI(
    title="ShipComply API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
)

app.include_router(health.router)
app.include_router(webhooks.router)
app.include_router(scans.router, prefix="/api/v1")
