"""설정 검증 후 Uvicorn을 실행합니다."""

import argparse

import uvicorn

from skeleton_api.config import API_DIRECTORY, Settings


def main() -> None:
    parser = argparse.ArgumentParser(description="FastAPI API 실행")
    parser.add_argument("--reload", action="store_true", help="소스 변경 시 다시 시작")
    args = parser.parse_args()
    settings = Settings.from_environment()
    uvicorn.run(
        "skeleton_api.main:create_app",
        factory=True,
        host="0.0.0.0",
        port=settings.port,
        reload=args.reload,
        reload_dirs=[str(API_DIRECTORY / "src")] if args.reload else None,
    )


if __name__ == "__main__":
    main()
