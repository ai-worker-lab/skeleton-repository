"""PostgreSQL 연결과 파일별 원자적 SQL migration 실행."""

import asyncio
from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from psycopg import AsyncConnection, sql
from psycopg_pool import AsyncConnectionPool

MIGRATION_LOCK = 931475210


async def run_migrations(pool: AsyncConnectionPool[AsyncConnection[Any]], directory: Path) -> None:
    """NestJS와 같은 기록 테이블과 잠금으로 SQL 파일을 이름 순서대로 한 번씩 적용합니다."""
    async with pool.connection() as connection:
        await connection.execute("SELECT pg_advisory_lock(%s)", (MIGRATION_LOCK,))
        try:
            await connection.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations "
                "(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
            )
            migrations = await asyncio.to_thread(lambda: sorted(directory.glob("*.sql")))
            for migration in migrations:
                async with connection.transaction():
                    cursor = await connection.execute(
                        "SELECT 1 FROM schema_migrations WHERE version=%s", (migration.stem,)
                    )
                    if await cursor.fetchone() is None:
                        contents = await asyncio.to_thread(migration.read_text, encoding="utf-8")
                        await connection.execute(sql.SQL(contents))
                        await connection.execute(
                            "INSERT INTO schema_migrations(version) VALUES (%s)", (migration.stem,)
                        )
        finally:
            await connection.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK,))


class Database:
    def __init__(self, database_url: str) -> None:
        self.pool: AsyncConnectionPool[AsyncConnection[Any]] = AsyncConnectionPool(
            database_url,
            open=False,
            min_size=1,
            max_size=15,
            timeout=5,
            kwargs={"autocommit": True, "connect_timeout": 5, "application_name": "app-skeleton-api-python"},
        )

    async def open(self, migrations: Path) -> None:
        await self.pool.open(wait=True, timeout=5)
        await self.query("SELECT 1")
        await run_migrations(self.pool, migrations)

    async def close(self) -> None:
        await self.pool.close()

    async def query(self, statement: str | sql.SQL | sql.Composed, values: Sequence[Any] = ()) -> list[Any]:
        async with self.pool.connection() as connection:
            cursor = await connection.execute(statement, values)
            return await cursor.fetchall() if cursor.description is not None else []

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[AsyncConnection[Any]]:
        async with self.pool.connection() as connection, connection.transaction():
            yield connection
