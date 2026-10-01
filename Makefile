SHELL := /bin/sh
.DEFAULT_GOAL := help
.NOTPARALLEL:

export PM2_HOME := $(CURDIR)/.local/pm2
PM2 := pnpm exec pm2
COMPOSE := docker compose --project-name app-skeleton --project-directory "$(CURDIR)/infra/local" --env-file "$(CURDIR)/infra/local/.env" -f "$(CURDIR)/infra/local/compose.yaml"

.PHONY: help up down restart status infra-up infra-down infra-restart infra-status infra-logs api-up api-down api-restart web-up web-down web-restart app-up app-down app-restart

help:
	@printf '%s\n' '사용법: make <대상>' '' \
	  '  up / down / restart / status       전체 로컬 서비스' \
	  '  infra-up / infra-down / infra-restart  로컬 PostgreSQL + Valkey' \
	  '  infra-status / infra-logs              로컬 인프라 상태와 로그' \
	  '  api-up / api-down / api-restart       NestJS 개발 서버' \
	  '  web-up / web-down / web-restart       Next.js 개발 서버' \
	  '  app-up / app-down / app-restart       Expo 개발 서버'

up: infra-up api-up web-up app-up

down: app-down web-down api-down infra-down
	@$(PM2) kill >/dev/null 2>&1 || true

restart: down up

status:
	$(COMPOSE) ps
	@$(PM2) ls

infra-up:
	$(COMPOSE) up -d --wait postgres valkey

infra-down:
	$(COMPOSE) down

infra-restart: infra-down infra-up

infra-status:
	$(COMPOSE) ps

infra-logs:
	$(COMPOSE) logs -f postgres valkey

api-up:
	pnpm --filter @app-skeleton/shared build
	@if $(PM2) describe app-skeleton-api >/dev/null 2>&1; then \
	  $(PM2) restart app-skeleton-api; \
	else \
	  $(PM2) start ecosystem.config.cjs --only app-skeleton-api; \
	fi

api-down:
	@if $(PM2) describe app-skeleton-api >/dev/null 2>&1; then $(PM2) delete app-skeleton-api; fi

api-restart: api-down api-up

web-up:
	pnpm --filter @app-skeleton/shared build
	@if $(PM2) describe app-skeleton-web >/dev/null 2>&1; then \
	  $(PM2) restart app-skeleton-web; \
	else \
	  $(PM2) start ecosystem.config.cjs --only app-skeleton-web; \
	fi

web-down:
	@if $(PM2) describe app-skeleton-web >/dev/null 2>&1; then $(PM2) delete app-skeleton-web; fi

web-restart: web-down web-up

app-up:
	pnpm --filter @app-skeleton/shared build
	@if $(PM2) describe app-skeleton-app >/dev/null 2>&1; then \
	  $(PM2) restart app-skeleton-app; \
	else \
	  $(PM2) start ecosystem.config.cjs --only app-skeleton-app; \
	fi

app-down:
	@if $(PM2) describe app-skeleton-app >/dev/null 2>&1; then $(PM2) delete app-skeleton-app; fi

app-restart: app-down app-up
