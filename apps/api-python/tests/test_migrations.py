import asyncio
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from conftest import DisposableDatabase
from psycopg.errors import UndefinedTable

from skeleton_api.database import Database, run_migrations


@pytest.fixture
async def app_database(database: DisposableDatabase, tmp_path: Path) -> AsyncIterator[Database]:
    app_database = Database(database.url)
    try:
        await app_database.open(tmp_path / "missing")
        yield app_database
    finally:
        await app_database.close()


async def versions(database: Database) -> list[str]:
    return [row[0] for row in await database.query("SELECT version FROM schema_migrations ORDER BY version")]


async def test_missing_directory(app_database: Database, tmp_path: Path) -> None:
    await run_migrations(app_database.pool, tmp_path / "missing")
    assert await versions(app_database) == []


async def test_sorted_sql_files_and_repeat(app_database: Database, tmp_path: Path) -> None:
    (tmp_path / "002_add_column.sql").write_text(
        "ALTER TABLE sample ADD COLUMN label text;", encoding="utf-8"
    )
    (tmp_path / "001_create.sql").write_text("CREATE TABLE sample (id int PRIMARY KEY);", encoding="utf-8")
    (tmp_path / "README.md").write_text("SQL migration이 아님", encoding="utf-8")
    await run_migrations(app_database.pool, tmp_path)
    await run_migrations(app_database.pool, tmp_path)
    assert await versions(app_database) == ["001_create", "002_add_column"]
    columns = await app_database.query(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='sample' ORDER BY ordinal_position"
    )
    assert columns == [("id",), ("label",)]


async def test_failure_rolls_back_and_releases_lock(app_database: Database, tmp_path: Path) -> None:
    (tmp_path / "001_create.sql").write_text("CREATE TABLE sample (id int PRIMARY KEY);", encoding="utf-8")
    broken = tmp_path / "002_broken.sql"
    broken.write_text("CREATE TABLE partial (id int); SELECT * FROM missing_table;", encoding="utf-8")
    with pytest.raises(UndefinedTable):
        await run_migrations(app_database.pool, tmp_path)
    assert await versions(app_database) == ["001_create"]
    assert await app_database.query("SELECT to_regclass('public.partial')") == [(None,)]
    broken.write_text("CREATE TABLE partial (id int);", encoding="utf-8")
    async with asyncio.timeout(5):
        await run_migrations(app_database.pool, tmp_path)
    assert await versions(app_database) == ["001_create", "002_broken"]


async def test_concurrent_migrations_run_once(app_database: Database, tmp_path: Path) -> None:
    (tmp_path / "001_create.sql").write_text(
        "CREATE TABLE sample (id int PRIMARY KEY); SELECT pg_sleep(0.05);", encoding="utf-8"
    )
    async with asyncio.timeout(5):
        await asyncio.gather(
            run_migrations(app_database.pool, tmp_path), run_migrations(app_database.pool, tmp_path)
        )
    assert await versions(app_database) == ["001_create"]


async def test_transaction_commits_and_rolls_back(app_database: Database) -> None:
    await app_database.query("CREATE TABLE sample (id int PRIMARY KEY)")
    async with app_database.transaction() as connection:
        await connection.execute("INSERT INTO sample VALUES (%s)", (1,))
    with pytest.raises(UndefinedTable):
        async with app_database.transaction() as connection:
            await connection.execute("INSERT INTO sample VALUES (%s)", (2,))
            await connection.execute("SELECT * FROM missing_table")
    assert await app_database.query("SELECT id FROM sample") == [(1,)]
