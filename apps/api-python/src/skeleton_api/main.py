"""NestJS와 동일한 health/readiness HTTP 계약을 제공하는 앱 팩토리."""

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from psycopg import Error as DatabaseError
from psycopg_pool import PoolTimeout
from pydantic import BaseModel

from skeleton_api.config import API_DIRECTORY, Settings
from skeleton_api.database import Database


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class ReadinessResponse(BaseModel):
    status: Literal["ready"] = "ready"


class ApiError(BaseModel):
    code: str
    message: str


def create_app(settings: Settings | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configured = settings or Settings.from_environment()
        database = Database(configured.database_url)
        app.state.database = database
        try:
            await database.open(API_DIRECTORY / "migrations")
            yield
        finally:
            await database.close()

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/api/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse()

    @app.get("/api/health/ready", response_model=ReadinessResponse, responses={503: {"model": ApiError}})
    async def ready() -> ReadinessResponse | JSONResponse:
        try:
            async with asyncio.timeout(5):
                await app.state.database.query("SELECT 1")
        except (DatabaseError, PoolTimeout, TimeoutError):
            return JSONResponse(
                status_code=503,
                content=ApiError(
                    code="database_unavailable", message="데이터베이스에 연결할 수 없습니다."
                ).model_dump(),
            )
        return ReadinessResponse()

    return app
