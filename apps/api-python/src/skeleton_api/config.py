"""checkout의 API 설정을 읽고 프로세스 환경변수를 우선합니다."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

API_DIRECTORY = Path(__file__).resolve().parents[2]


def load_local_environment(path: Path | None = None) -> None:
    load_dotenv(path or API_DIRECTORY / ".env", override=False, interpolate=False)


@dataclass(frozen=True)
class Settings:
    database_url: str
    port: int

    @classmethod
    def from_environment(cls) -> "Settings":
        load_local_environment()
        database_url = os.environ.get("DATABASE_URL", "")
        if not database_url:
            raise ValueError("DATABASE_URL is required")
        raw_port = os.environ.get("PORT", "")
        if not raw_port:
            raise ValueError("PORT is required: pnpm instance로 로컬 API 설정을 준비하세요.")
        try:
            port = int(raw_port)
        except ValueError:
            raise ValueError("PORT는 1~65535 범위의 정수여야 합니다.") from None
        if not 1 <= port <= 65535:
            raise ValueError("PORT는 1~65535 범위의 정수여야 합니다.")
        return cls(database_url=database_url, port=port)
