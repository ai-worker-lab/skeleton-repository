from pathlib import Path

import pytest
from conftest import DisposableDatabase
from httpx import ASGITransport, AsyncClient
from psycopg import AsyncConnection
from psycopg.errors import UndefinedTable

from skeleton_api import main
from skeleton_api.config import Settings
from skeleton_api.main import create_app


async def test_health_startup_and_shutdown(database: DisposableDatabase) -> None:
    app = create_app(Settings(database.url, 3000))
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            live = await client.get("/api/health")
            assert live.status_code == 200
            assert live.json() == {"status": "ok"}
            assert (await client.get("/health")).status_code == 404
            ready = await client.get("/api/health/ready")
            assert ready.status_code == 200
            assert ready.json() == {"status": "ready"}

        async with await AsyncConnection.connect(database.url) as connection:
            cursor = await connection.execute("SELECT to_regclass('public.schema_migrations')")
            assert await cursor.fetchone() == ("schema_migrations",)
    assert app.state.database.pool.closed


async def test_startup_failure_closes_pool(
    database: DisposableDatabase, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    migrations = tmp_path / "migrations"
    migrations.mkdir()
    (migrations / "001_broken.sql").write_text("SELECT * FROM missing_table;", encoding="utf-8")
    monkeypatch.setattr(main, "API_DIRECTORY", tmp_path)
    app = create_app(Settings(database.url, 3000))
    with pytest.raises(UndefinedTable):
        async with app.router.lifespan_context(app):
            pytest.fail("migration이 실패한 앱이 요청을 받아서는 안 됩니다.")
    assert app.state.database.pool.closed


async def test_database_loss_keeps_liveness(database: DisposableDatabase) -> None:
    app = create_app(Settings(database.url, 3000))
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await database.drop()
            ready = await client.get("/api/health/ready")
            assert ready.status_code == 503
            assert ready.json() == {
                "code": "database_unavailable",
                "message": "데이터베이스에 연결할 수 없습니다.",
            }
            live = await client.get("/api/health")
            assert live.status_code == 200
            assert live.json() == {"status": "ok"}
            # 잘못된 연결을 반환한 뒤 새 연결도 만들 수 없어도 요청이 끝나야 합니다.
            retry = await client.get("/api/health/ready")
            assert retry.status_code == 503
