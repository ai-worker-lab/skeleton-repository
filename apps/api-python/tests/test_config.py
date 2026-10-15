from pathlib import Path

import pytest

from skeleton_api import config
from skeleton_api.config import Settings, load_local_environment


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(config, "API_DIRECTORY", tmp_path)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("PORT", raising=False)


def test_local_environment_preserves_process_values(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    path = tmp_path / ".env"
    path.write_text('DATABASE_URL="postgresql://local/db"\nPORT=3000\n', encoding="utf-8")
    monkeypatch.setenv("DATABASE_URL", "postgresql://injected/db")
    load_local_environment(path)
    assert Settings.from_environment() == Settings(database_url="postgresql://injected/db", port=3000)


def test_missing_database_url_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PORT", "3000")
    with pytest.raises(ValueError, match="DATABASE_URL is required"):
        Settings.from_environment()


def test_missing_port_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://local/db")
    with pytest.raises(ValueError, match="PORT is required"):
        Settings.from_environment()


@pytest.mark.parametrize("port", ["0", "-1", "65536", "NaN", "3000.5"])
def test_invalid_port_fails(monkeypatch: pytest.MonkeyPatch, port: str) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://local/db")
    monkeypatch.setenv("PORT", port)
    with pytest.raises(ValueError, match="PORT"):
        Settings.from_environment()
