"""실제 PostgreSQL에서 테스트마다 일회용 DB를 만들고 정리합니다."""

import os
import secrets
from collections.abc import AsyncIterator
from dataclasses import dataclass

import pytest
from psycopg import AsyncConnection, sql
from psycopg.conninfo import make_conninfo

from skeleton_api.config import load_local_environment


@dataclass
class DisposableDatabase:
    url: str
    admin_url: str
    name: str

    async def drop(self) -> None:
        async with await AsyncConnection.connect(self.admin_url, autocommit=True) as connection:
            await connection.execute(
                sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(self.name))
            )


@pytest.fixture(scope="session")
def admin_url() -> str:
    load_local_environment()
    url = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        pytest.fail(
            "TEST_DATABASE_URL 또는 DATABASE_URL이 필요합니다. make infra-up 후 pnpm instance로 설정하세요."
        )
    return url


@pytest.fixture
async def database(admin_url: str) -> AsyncIterator[DisposableDatabase]:
    name = f"app_skeleton_test_{secrets.token_hex(6)}"
    async with await AsyncConnection.connect(admin_url, autocommit=True) as connection:
        await connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    database = DisposableDatabase(make_conninfo(admin_url, dbname=name), admin_url, name)
    try:
        yield database
    finally:
        await database.drop()
