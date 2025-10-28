# OmniTrackr Development Setup Guide

Complete guide for setting up and running the OmniTrackr project locally.

---

## 📋 Prerequisites

- **Node.js** 20.0.0 or higher
- **Docker Desktop** installed and running
- **Git** for version control
- **VS Code** (recommended) or any code editor

---

## 🚀 Quick Start

### 1. Start the Databases

#### Option A: Using Docker Compose (Recommended)

```bash
# From project root
cd /Users/manjulaliyanage/dev/omnitrackr

# Start both dev and test databases
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres-dev
docker-compose logs -f postgres-test
```

**What this does:**
- Starts PostgreSQL dev database on port **5432**
- Starts PostgreSQL test database on port **5433**
- Starts pgAdmin UI on port **5050** (optional)
- All databases are persistent (data survives restarts)

#### Option B: Manual Docker Commands

```bash
# Development Database
docker run -d \
  --name omnitrackr-db-dev \
  -p 5432:5432 \
  -e POSTGRES_DB=omnitrackr_dev \
  -e POSTGRES_USER=omnitrackr_user \
  -e POSTGRES_PASSWORD=omnitrackr_password_dev \
  -v omnitrackr-dev-data:/var/lib/postgresql/data \
  postgres:15-alpine

# Test Database
docker run -d \
  --name omnitrackr-db-test \
  -p 5433:5432 \
  -e POSTGRES_DB=omnitrackr_test \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=93W4tQcwoKaKi9c4dWKh \
  -v omnitrackr-test-data:/var/lib/postgresql/data \
  postgres:15-alpine
```

#### Verify Databases are Running

```bash
# Check if containers are running
docker ps

# Test dev database connection
docker exec -it omnitrackr-db-dev psql -U omnitrackr_user -d omnitrackr_dev -c "SELECT version();"

# Test test database connection
docker exec -it omnitrackr-db-test psql -U test_user -d omnitrackr_test -c "SELECT version();"
```

---

### 2. Install Dependencies

```bash
# From project root
npm install
```

This installs dependencies for all workspaces (api, shared, worker).

---

### 3. Set Up Environment Variables

The project already has `.env.development` and `.env.test` files configured. Verify they exist:

```bash
# Check dev environment file
cat packages/api/.env.development

# Check test environment file
cat packages/api/.env.test
```

**Expected values:**

**.env.development:**
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr_dev
DB_USER=omnitrackr_user
DB_PASSWORD=omnitrackr_password_dev
```

**.env.test:**
```env
NODE_ENV=test
PORT=3001
DB_HOST=localhost
DB_PORT=5433
DB_NAME=omnitrackr_test
DB_USER=test_user
DB_PASSWORD=93W4tQcwoKaKi9c4dWKh
```

---

### 4. Run Database Migrations

```bash
# Navigate to API package
cd packages/api

# Run migrations on development database
npm run migrate

# Check migration status
npm run migrate:status

# You should see:
# ✅ 20251026000001_create_file_sources.ts
# ✅ 20251026000002_create_file_source_credentials.ts
# ✅ 20251026000003_create_inward_files.ts
# ✅ 20251026000004_create_file_tracking.ts
# ✅ 20251026000005_create_notification_config.ts
# ✅ 20251026000006_create_notification_data.ts
```

---

### 5. Start the API Server

#### Option A: Using npm workspace (from project root)

```bash
cd /Users/manjulaliyanage/dev/omnitrackr
npm run dev --workspace=packages/api
```

#### Option B: Directly from API package

```bash
cd packages/api
npm run dev
```

**Expected output:**
```
🔌 Connecting to database...
✅ Database connection established
🚀 OmniTrackr API server running on port 3000
🔗 Health check: http://localhost:3000/api/health
🌍 Environment: development
```

#### Test the Server

```bash
# In a new terminal window
curl http://localhost:3000/api/health

# Expected response:
# {
#   "success": true,
#   "message": "OmniTrackr API is healthy",
#   "timestamp": "2025-10-27T...",
#   "environment": "development",
#   "database": "connected"
# }
```

---

## 🛠️ Development Workflow

### Terminal Setup in VS Code

Open **3 terminal tabs** in VS Code:

#### Terminal 1: API Server
```bash
cd /Users/manjulaliyanage/dev/omnitrackr
npm run dev --workspace=packages/api
```

#### Terminal 2: Tests (Watch Mode)
```bash
cd /Users/manjulaliyanage/dev/omnitrackr
npm test --workspace=packages/api -- --watch
```

#### Terminal 3: General Commands
```bash
cd /Users/manjulaliyanage/dev/omnitrackr
# Use for git, docker, migrations, etc.
```

---

## 🗄️ Database Management

### Using psql (PostgreSQL CLI)

```bash
# Connect to dev database
docker exec -it omnitrackr-db-dev psql -U omnitrackr_user -d omnitrackr_dev

# Once connected:
\dt                    # List all tables
\d file_sources        # Describe file_sources table
SELECT * FROM file_sources;
\q                     # Quit
```

### Using pgAdmin (Web UI)

1. Open browser: http://localhost:5050
2. Login:
   - Email: `admin@omnitrackr.local`
   - Password: `admin`
3. Add server connection:
   - Host: `postgres-dev` (if using docker-compose) or `host.docker.internal`
   - Port: `5432`
   - Username: `omnitrackr_user`
   - Password: `omnitrackr_password_dev`

### Common Database Commands

```bash
# View database logs
docker logs omnitrackr-db-dev -f

# Reset development database (⚠️ destroys all data)
docker-compose down -v postgres-dev
docker-compose up -d postgres-dev
cd packages/api && npm run migrate

# Backup database
docker exec omnitrackr-db-dev pg_dump -U omnitrackr_user omnitrackr_dev > backup.sql

# Restore database
docker exec -i omnitrackr-db-dev psql -U omnitrackr_user omnitrackr_dev < backup.sql
```

---

## 🧪 Running Tests

### All Tests
```bash
# API tests
npm test --workspace=packages/api

# Repository tests
npm test --workspace=packages/shared

# With coverage
npm test --workspace=packages/api -- --coverage
```

### Watch Mode (Development)
```bash
npm test --workspace=packages/api -- --watch
```

### Single Test File
```bash
npm test --workspace=packages/api -- fileSource.service.test.ts
```

---

## 📦 Project Structure

```
omnitrackr/
├── packages/
│   ├── api/              # REST API server
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── __tests__/
│   │   ├── migrations/   # Database migrations
│   │   └── .env.development
│   │
│   ├── shared/           # Shared code (types, repositories)
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── repositories/
│   │   │   └── __tests__/
│   │
│   └── worker/           # Background jobs (future)
│
├── docs/                 # Documentation
├── docker-compose.yml    # Database containers
└── package.json          # Root package.json
```

---

## 🔧 Troubleshooting

### Issue: Database connection failed

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check if Docker is running
docker ps

# Start databases
docker-compose up -d

# Check logs
docker-compose logs postgres-dev
```

### Issue: Port already in use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env.development
```

### Issue: Migration fails

**Error:** `relation "file_sources" already exists`

**Solution:**
```bash
# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Re-run migrations
npm run migrate
```

### Issue: TypeScript errors in VS Code

**Solution:**
```bash
# Rebuild TypeScript
npm run build --workspace=packages/api
npm run build --workspace=packages/shared

# Restart VS Code TypeScript server
# In VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 🎯 Common Tasks

### Create a New Migration

```bash
cd packages/api
npm run migrate:make create_new_table
```

### Add a New API Endpoint

1. Add route in `packages/api/src/routes/`
2. Add controller method in `packages/api/src/controllers/`
3. Add service method in `packages/api/src/services/`
4. Add validation schema in `packages/api/src/middleware/validation.ts`
5. Write tests in `packages/api/src/__tests__/services/`

### Test API with cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Get all file sources
curl http://localhost:3000/api/file-sources

# Get file source by ID
curl http://localhost:3000/api/file-sources/1

# Create S3 file source
curl -X POST http://localhost:3000/api/file-sources/s3 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My S3 Source",
    "department": "Finance",
    "awsAccessKeyId": "AKIATEST12345678901",
    "awsSecretAccessKey": "testSecretKey1234567890123456789012",
    "bucketName": "my-bucket",
    "bucketRegion": "us-east-1",
    "monitorPath": "/incoming/",
    "fileNamePattern": "*.csv",
    "matchRule": "partial",
    "schedule": "09:00",
    "timezone": "UTC",
    "slaThreshold": 120,
    "direction": "inward"
  }'
```

---

## 🐳 Docker Commands Reference

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Stop all services (keeps data)
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart postgres-dev
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres-dev

# Last 100 lines
docker-compose logs --tail=100 postgres-dev
```

### Execute Commands in Container

```bash
# PostgreSQL CLI
docker-compose exec postgres-dev psql -U omnitrackr_user -d omnitrackr_dev

# Bash shell
docker-compose exec postgres-dev sh
```

---

## 📚 Next Steps

1. **Import Postman Collection**: See `docs/postman/README.md`
2. **Read Testing Guide**: See `docs/TESTING_GUIDE.md`
3. **Review API Documentation**: See `docs/API_SUMMARY.md`
4. **Implement Worker Service**: For background file monitoring

---

## 🆘 Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Create GitHub issue
- **Logs**: Always check `docker-compose logs` first

---

_Last Updated: 2025-10-27_
