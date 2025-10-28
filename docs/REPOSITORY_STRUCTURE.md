# OmniTrackr Repository Structure

## Overview

This document describes the monorepo structure for OmniTrackr, designed to allow independent builds and deployments of each component while sharing common code.

## Repository Structure

```
omnitrackr/
├── .github/
│   └── workflows/
│       ├── frontend.yml              # CI/CD for frontend
│       ├── api.yml                   # CI/CD for API
│       ├── worker.yml                # CI/CD for worker
│       ├── notification-manager.yml  # CI/CD for notification manager
│       └── deploy.yml                # Optional: Deploy all
│
├── packages/
│   ├── frontend/                     # React Frontend
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── api/                          # Backend API (Express)
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── routes/
│   │   │   │   │   ├── fileSource.routes.ts
│   │   │   │   │   ├── inwardFile.routes.ts
│   │   │   │   │   ├── notification.routes.ts
│   │   │   │   │   └── health.routes.ts
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── fileSource.controller.ts
│   │   │   │   │   ├── inwardFile.controller.ts
│   │   │   │   │   └── notification.controller.ts
│   │   │   │   └── middleware/
│   │   │   │       ├── auth.middleware.ts
│   │   │   │       ├── errorHandler.middleware.ts
│   │   │   │       ├── validation.middleware.ts
│   │   │   │       └── metrics.middleware.ts
│   │   │   ├── services/
│   │   │   │   ├── fileSource.service.ts
│   │   │   │   ├── s3Connection.service.ts
│   │   │   │   ├── inwardFile.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   └── encryption.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── fileSource.repository.ts
│   │   │   │   ├── inwardFile.repository.ts
│   │   │   │   ├── fileTracking.repository.ts
│   │   │   │   └── notification.repository.ts
│   │   │   ├── config/
│   │   │   │   ├── database.ts
│   │   │   │   ├── secrets.ts
│   │   │   │   └── app.ts
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   │   ├── 001_create_file_sources.ts
│   │   │   ├── 002_create_s3_credentials.ts
│   │   │   ├── 003_create_inward_files.ts
│   │   │   ├── 004_create_file_tracking.ts
│   │   │   ├── 005_create_notification_config.ts
│   │   │   └── 006_create_notification_data.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── services/
│   │   │   │   └── repositories/
│   │   │   └── integration/
│   │   │       └── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── knexfile.ts
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── worker/                       # File Source Polling Worker
│   │   ├── src/
│   │   │   ├── pollers/
│   │   │   │   ├── basePoll.ts
│   │   │   │   ├── s3Poller.ts
│   │   │   │   ├── sftpPoller.ts
│   │   │   │   ├── ftpPoller.ts
│   │   │   │   └── apiPoller.ts
│   │   │   ├── services/
│   │   │   │   ├── pollScheduler.ts
│   │   │   │   ├── pollOrchestrator.ts
│   │   │   │   ├── fileProcessor.ts
│   │   │   │   ├── fileTracking.service.ts
│   │   │   │   └── notification.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── fileSource.repository.ts
│   │   │   │   ├── inwardFile.repository.ts
│   │   │   │   ├── fileTracking.repository.ts
│   │   │   │   └── notification.repository.ts
│   │   │   ├── config/
│   │   │   │   ├── database.ts
│   │   │   │   └── secrets.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── notification-manager/         # Notification Manager Service
│   │   ├── src/
│   │   │   ├── processor/
│   │   │   │   ├── notificationProcessor.ts
│   │   │   │   ├── notificationScheduler.ts
│   │   │   │   ├── channelRouter.ts
│   │   │   │   └── deliveryStatusUpdater.ts
│   │   │   ├── channels/
│   │   │   │   ├── interface.ts
│   │   │   │   ├── baseHandler.ts
│   │   │   │   ├── emailHandler.ts
│   │   │   │   ├── slackHandler.ts
│   │   │   │   ├── msteamsHandler.ts
│   │   │   │   ├── jiraHandler.ts
│   │   │   │   ├── smsHandler.ts
│   │   │   │   ├── servicenowHandler.ts
│   │   │   │   └── webhookHandler.ts
│   │   │   ├── repositories/
│   │   │   │   ├── notification.repository.ts
│   │   │   │   └── notificationConfig.repository.ts
│   │   │   ├── config/
│   │   │   │   ├── database.ts
│   │   │   │   └── channels.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── shared/                       # Shared types, utilities, constants
│       ├── src/
│       │   ├── types/
│       │   │   ├── fileSource.types.ts
│       │   │   ├── inwardFile.types.ts
│       │   │   ├── notification.types.ts
│       │   │   ├── user.types.ts
│       │   │   └── index.ts
│       │   ├── utils/
│       │   │   ├── dateUtils.ts
│       │   │   ├── patternMatcher.ts
│       │   │   ├── validator.ts
│       │   │   └── logger.ts
│       │   └── constants/
│       │       ├── eventTypes.ts
│       │       ├── statusCodes.ts
│       │       └── errorCodes.ts
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml           # Local development
│   │   ├── docker-compose.prod.yml      # Production
│   │   ├── docker-compose.monitoring.yml
│   │   └── .env.example
│   ├── kubernetes/                      # K8s manifests (optional - Phase 5)
│   │   ├── frontend/
│   │   ├── api/
│   │   ├── worker/
│   │   ├── notification-manager/
│   │   └── database/
│   ├── terraform/                       # Infrastructure as Code (optional)
│   │   ├── aws/
│   │   ├── gcp/
│   │   └── azure/
│   └── scripts/
│       ├── deploy-frontend.sh
│       ├── deploy-api.sh
│       ├── deploy-worker.sh
│       ├── deploy-notification-manager.sh
│       ├── backup-db.sh
│       ├── restore-db.sh
│       └── migrate-db.sh
│
├── docs/
│   ├── S3_FILE_SOURCE_DESIGN.md
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── CUSTOMER_ONBOARDING.md
│   ├── ARCHITECTURE.md
│   └── REPOSITORY_STRUCTURE.md (this file)
│
├── .github/
├── .gitignore
├── .dockerignore
├── package.json                         # Root package.json (workspaces)
├── turbo.json                           # Turborepo config (optional)
├── Makefile                             # Common commands
├── README.md
└── LICENSE
```

---

## Phase 1: Backend Foundation - Initial Structure

For Phase 1, we'll focus on creating these components:

```
omnitrackr/
├── packages/
│   ├── api/                          # Backend API
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── routes/
│   │   │   │   ├── controllers/
│   │   │   │   └── middleware/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── config/
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── knexfile.ts
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── shared/                       # Shared types
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── constants/
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── .env.example
│   └── scripts/
│       └── migrate-db.sh
│
├── docs/
│   ├── S3_FILE_SOURCE_DESIGN.md
│   └── REPOSITORY_STRUCTURE.md
│
├── .gitignore
├── package.json
├── Makefile
└── README.md
```

---

## Workspace Configuration

### Root `package.json`

```json
{
  "name": "omnitrackr",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",

    "dev:api": "npm run dev --workspace=packages/api",
    "build:api": "npm run build --workspace=packages/api",
    "build:shared": "npm run build --workspace=packages/shared",

    "docker:build:api": "docker build -t omnitrackr/api:latest -f packages/api/Dockerfile packages/api",

    "db:migrate": "npm run migrate --workspace=packages/api",
    "db:rollback": "npm run migrate:rollback --workspace=packages/api"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### API `package.json`

```json
{
  "name": "@omnitrackr/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "migrate": "knex migrate:latest",
    "migrate:make": "knex migrate:make",
    "migrate:rollback": "knex migrate:rollback",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@omnitrackr/shared": "*",
    "express": "^4.18.0",
    "knex": "^3.0.0",
    "pg": "^8.11.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/client-secrets-manager": "^3.0.0",
    "jsonwebtoken": "^9.0.0",
    "joi": "^17.0.0",
    "winston": "^3.0.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/jest": "^29.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

### Shared `package.json`

```json
{
  "name": "@omnitrackr/shared",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src --ext .ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

---

## Independent Build & Deploy

### Building Components Independently

```bash
# Build only API
npm run build:api

# Build only shared package
npm run build:shared

# Build all
npm run build
```

### Docker Build Independently

```bash
# Build API Docker image
npm run docker:build:api

# Or manually
docker build -t omnitrackr/api:latest -f packages/api/Dockerfile packages/api
```

### Deploy Independently

Each component has its own GitHub Actions workflow that triggers only when files in that package change:

```yaml
# .github/workflows/api.yml
on:
  push:
    branches: [main, develop]
    paths:
      - 'packages/api/**'
      - 'packages/shared/**'
```

---

## Shared Code Usage

Components can import shared types and utilities:

```typescript
// In packages/api/src/services/fileSource.service.ts
import { FileSource, FileSourceStatus } from '@omnitrackr/shared';

// In packages/worker/src/pollers/s3Poller.ts
import { FileSource, S3Config } from '@omnitrackr/shared';

// In packages/notification-manager/src/processor/notificationProcessor.ts
import { NotificationEvent, EventType } from '@omnitrackr/shared';
```

---

## Environment Variables

Each component has its own `.env.example` file:

### API `.env.example`

```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MIN=2
DB_POOL_MAX=10

# Secrets Management
SECRETS_PROVIDER=encrypted_db  # Options: aws, gcp, azure, encrypted_db
ENCRYPTION_MASTER_KEY=  # 64-char hex key for encrypted_db mode

# AWS (if using AWS secrets manager)
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_PREFIX=omnitrackr/

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Worker `.env.example`

```bash
# Application
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=postgres
DB_PASSWORD=postgres

# Secrets Management
SECRETS_PROVIDER=encrypted_db
ENCRYPTION_MASTER_KEY=

# AWS
AWS_REGION=us-east-1
```

### Notification Manager `.env.example`

```bash
# Application
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=postgres
DB_PASSWORD=postgres

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@omnitrackr.com

# Slack
SLACK_WEBHOOK_URL=

# MS Teams
MSTEAMS_WEBHOOK_URL=

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Jira
JIRA_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=

# ServiceNow
SERVICENOW_INSTANCE=
SERVICENOW_USERNAME=
SERVICENOW_PASSWORD=
```

---

## Makefile Commands

```makefile
.PHONY: help install dev build test clean docker-build deploy

help:
	@echo "OmniTrackr - Available commands:"
	@echo "  make install           - Install all dependencies"
	@echo "  make dev               - Start all services in dev mode"
	@echo "  make dev-api           - Start API only"
	@echo "  make build             - Build all packages"
	@echo "  make build-api         - Build API only"
	@echo "  make test              - Run all tests"
	@echo "  make docker-build      - Build all Docker images"
	@echo "  make db-migrate        - Run database migrations"
	@echo "  make db-rollback       - Rollback last migration"

install:
	npm ci

dev:
	npm run dev

dev-api:
	npm run dev:api

build:
	npm run build

build-api:
	npm run build:api

test:
	npm run test

clean:
	rm -rf packages/*/dist
	rm -rf packages/*/node_modules
	rm -rf node_modules

docker-build:
	npm run docker:build

docker-build-api:
	npm run docker:build:api

db-migrate:
	npm run db:migrate

db-rollback:
	npm run db:rollback
```

---

## Git Workflow

### Branch Strategy

```
main            - Production-ready code
  └── develop   - Integration branch
       ├── feature/s3-integration
       ├── feature/notification-manager
       └── fix/api-bug
```

### Commit Message Convention

```
feat: Add S3 file source API endpoints
fix: Resolve database connection pooling issue
docs: Update API documentation
chore: Update dependencies
test: Add unit tests for S3 poller
```

### Triggering Specific Workflows

When you commit to specific packages, only those workflows run:

```bash
# Only triggers api.yml workflow
git add packages/api/
git commit -m "feat: Add S3 file source endpoints"
git push

# Only triggers worker.yml workflow
git add packages/worker/
git commit -m "feat: Implement S3 polling logic"
git push

# Triggers both api.yml and worker.yml (because shared changed)
git add packages/shared/
git commit -m "feat: Add new shared types"
git push
```

---

## Migration Path

### From Prototype to Production Structure

1. **Keep your prototype** (`trackr-exchange/`) as-is
2. **Create new monorepo** (`omnitrackr/`) for production code
3. **Gradually migrate UI components** from prototype to `packages/frontend/`
4. **Build backend** fresh in `packages/api/`
5. **Reference prototype** for UI/UX patterns

```bash
dev/
├── trackr-exchange/      # UI prototype (keep as reference)
└── omnitrackr/           # Production monorepo
    └── packages/
        ├── frontend/     # Migrate UI here gradually
        ├── api/          # Build from scratch
        ├── worker/       # Phase 3
        └── notification-manager/  # Phase 4
```

---

## Next Steps for Phase 1

1. **Initialize repository:**
   ```bash
   cd /Users/manjulaliyanage/dev/omnitrackr
   git init
   npm init -y
   # Configure workspaces in package.json
   ```

2. **Create packages:**
   ```bash
   mkdir -p packages/{api,shared}
   # Create package.json for each
   ```

3. **Set up API structure:**
   ```bash
   cd packages/api
   mkdir -p src/{api/{routes,controllers,middleware},services,repositories,config}
   mkdir -p migrations tests
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Create database migrations**

6. **Build API endpoints**

7. **Set up Docker Compose for local development**

---

## Questions?

This structure allows you to:
- ✅ Build each component independently
- ✅ Deploy each component separately
- ✅ Share code via `@omnitrackr/shared`
- ✅ Scale from monorepo to microservices later
- ✅ Work on different components simultaneously
- ✅ Have separate CI/CD pipelines per component
