from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sentry_sdk

from shipcomply_api.routes import scans, health
from shipcomply_api.db.session import init_db
from shipcomply_api.security.redactor import install_pii_log_filter
from shipcomply_api.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    install_pii_log_filter()
    await init_db()
    yield


if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)

app = FastAPI(
    title="ShipComply API",
    version="0.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scans.router, prefix="/api/v1")
