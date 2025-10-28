.PHONY: help install dev build test clean docker-build docker-push deploy db-migrate db-rollback

help:
	@echo "OmniTrackr - Available commands:"
	@echo ""
	@echo "  Installation & Setup:"
	@echo "    make install           - Install all dependencies"
	@echo ""
	@echo "  Development:"
	@echo "    make dev               - Start all services in dev mode"
	@echo "    make dev-api           - Start API only"
	@echo "    make dev-worker        - Start worker only"
	@echo "    make dev-notification  - Start notification manager only"
	@echo ""
	@echo "  Building:"
	@echo "    make build             - Build all packages"
	@echo "    make build-api         - Build API only"
	@echo "    make build-worker      - Build worker only"
	@echo "    make build-notification - Build notification manager only"
	@echo ""
	@echo "  Testing:"
	@echo "    make test              - Run all tests"
	@echo "    make test-api          - Run API tests"
	@echo ""
	@echo "  Docker:"
	@echo "    make docker-build      - Build all Docker images"
	@echo "    make docker-build-api  - Build API Docker image"
	@echo "    make docker-up         - Start all services with Docker Compose"
	@echo "    make docker-down       - Stop all Docker services"
	@echo "    make docker-logs       - View Docker logs"
	@echo ""
	@echo "  Database:"
	@echo "    make db-up             - Start database containers"
	@echo "    make db-down           - Stop database containers"
	@echo "    make db-logs           - View database logs"
	@echo "    make db-status         - Check database status"
	@echo "    make db-migrate        - Run database migrations"
	@echo "    make db-rollback       - Rollback last migration"
	@echo "    make db-migrate-make   - Create new migration"
	@echo "    make db-connect        - Connect to dev database via psql"
	@echo "    make db-reset          - Reset dev database (⚠️ destroys data)"
	@echo ""
	@echo "  Utilities:"
	@echo "    make clean             - Clean build artifacts"
	@echo "    make lint              - Run linters"

install:
	npm ci

dev:
	npm run dev

dev-api:
	npm run dev:api

dev-worker:
	npm run dev:worker

dev-notification:
	npm run dev:notification

build:
	npm run build

build-api:
	npm run build:api

build-worker:
	npm run build:worker

build-notification:
	npm run build:notification

test:
	npm run test

test-api:
	npm run test --workspace=packages/api

lint:
	npm run lint

clean:
	rm -rf packages/*/dist
	rm -rf packages/*/node_modules
	rm -rf node_modules
	rm -rf .turbo

docker-build:
	npm run docker:build

docker-build-api:
	npm run docker:build:api

docker-build-worker:
	npm run docker:build:worker

docker-build-notification:
	npm run docker:build:notification

docker-up:
	cd infrastructure/docker && docker-compose up -d

docker-down:
	cd infrastructure/docker && docker-compose down

docker-logs:
	cd infrastructure/docker && docker-compose logs -f

db-up:
	docker-compose up -d postgres-dev postgres-test
	@echo "✅ Database containers started"
	@echo "   Dev DB:  localhost:5432"
	@echo "   Test DB: localhost:5433"

db-down:
	docker-compose down
	@echo "✅ Database containers stopped"

db-logs:
	docker-compose logs -f postgres-dev

db-status:
	@echo "Checking database status..."
	@docker ps --filter "name=omnitrackr-db" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@docker exec omnitrackr-db-dev psql -U omnitrackr_user -d omnitrackr_dev -c "SELECT version();" 2>/dev/null && echo "✅ Dev database is ready" || echo "❌ Dev database not ready"

db-migrate:
	cd packages/api && npm run migrate

db-rollback:
	cd packages/api && npm run migrate:rollback

db-migrate-make:
	@read -p "Migration name: " name; \
	cd packages/api && npm run migrate:make -- $$name

db-connect:
	docker exec -it omnitrackr-db-dev psql -U omnitrackr_user -d omnitrackr_dev

db-reset:
	@echo "⚠️  WARNING: This will destroy all data in the development database!"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker-compose down -v postgres-dev; \
		docker-compose up -d postgres-dev; \
		sleep 3; \
		cd packages/api && npm run migrate; \
		echo "✅ Database reset complete"; \
	else \
		echo "❌ Reset cancelled"; \
	fi
