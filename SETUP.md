# OmniTrackr - Local Development Setup

Welcome to OmniTrackr! This guide will help you set up your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ and npm 10+
- **Docker Desktop** (for local databases)
- **Git**

## Quick Start (Automated Setup)

The fastest way to get started is to run our automated setup script:

```bash
# Clone the repository (if you haven't already)
git clone <repository-url>
cd omnitrackr

# Run the automated setup
npm run setup
```

This script will:
1. ✅ Generate secure environment files with random secrets
2. ✅ Start PostgreSQL databases in Docker (dev + test)
3. ✅ Install all npm dependencies
4. ✅ Run database migrations

**That's it! You're ready to develop.**

---

## Manual Setup (Step by Step)

If you prefer to set things up manually or the automated script fails:

### Step 1: Start Docker Databases

```bash
cd infrastructure/docker

# Create .env file from example
cp .env.example .env

# Edit .env and set your database passwords
nano .env  # or use your preferred editor

# Start databases
docker compose up -d postgres-dev postgres-test

# Verify they're running
docker compose ps
```

### Step 2: Create API Environment Files

Create `.env.development.local` in `packages/api/`:

```bash
# Database Credentials (must match Docker .env)
DB_USER=dev_user
DB_PASSWORD=your_dev_password

# Encryption Master Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_MASTER_KEY=your_generated_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_here
```

Create `.env.test.local` in `packages/api/`:

```bash
# Database Credentials (must match Docker .env)
DB_USER=test_user
DB_PASSWORD=your_test_password

# Encryption Master Key
ENCRYPTION_MASTER_KEY=your_generated_test_key_here

# JWT Secret
JWT_SECRET=your_test_jwt_secret_here
```

### Step 3: Install Dependencies

```bash
# From project root
npm install
```

### Step 4: Run Database Migrations

```bash
# Development database
npm run db:migrate:dev

# Test database
npm run db:migrate:test
```

---

## Development Workflow

### Start the API Server

```bash
# Development mode (with hot-reload)
npm run dev:api
```

The API will be available at `http://localhost:3000`

### Run Tests

```bash
# Run all tests
npm test --workspace=packages/api

# Run tests in watch mode
npm run test:watch --workspace=packages/api

# Run with coverage
npm run test:coverage --workspace=packages/api
```

### Database Operations

```bash
# Create a new migration
npm run db:migrate:make create_my_table --workspace=packages/api

# Run migrations (development)
npm run db:migrate:dev

# Run migrations (test)
npm run db:migrate:test

# Rollback last migration
npm run db:rollback --workspace=packages/api
```

### View Database

**Option 1: PgAdmin (Web UI)**

```bash
cd infrastructure/docker
docker compose --profile tools up -d pgadmin

# Open http://localhost:5050
# Login: admin@omnitrackr.local / admin (from .env file)
```

**Option 2: psql (Command Line)**

```bash
# Development database
psql -h localhost -p 5432 -U dev_user -d omnitrackr_dev

# Test database
psql -h localhost -p 5433 -U test_user -d omnitrackr_test
```

### Docker Commands

```bash
cd infrastructure/docker

# View logs
docker compose logs -f postgres-dev

# Stop databases
docker compose down

# Stop and remove volumes (CAREFUL: deletes data!)
docker compose down -v

# Restart databases
docker compose restart postgres-dev postgres-test
```

---

## Project Structure

```
omnitrackr/
├── packages/
│   ├── api/                      # Backend REST API
│   │   ├── src/
│   │   │   ├── config/           # Database config
│   │   │   ├── api/              # Routes, controllers
│   │   │   ├── services/         # Business logic
│   │   │   └── index.ts
│   │   ├── migrations/           # Database migrations
│   │   ├── knexfile.ts           # Knex configuration
│   │   ├── .env.development      # Dev config (NO SECRETS)
│   │   ├── .env.test             # Test config (NO SECRETS)
│   │   ├── .env.development.local # Dev secrets (gitignored)
│   │   └── .env.test.local       # Test secrets (gitignored)
│   │
│   └── shared/                   # Shared code (types, repositories)
│       └── src/
│           ├── types/            # TypeScript interfaces
│           ├── repositories/     # Database access layer
│           └── index.ts
│
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml    # Local databases
│       ├── .env.example          # Docker env template
│       └── .env                  # Docker env (gitignored)
│
├── scripts/
│   └── setup-dev-env.sh          # Automated setup script
│
├── docs/                         # Documentation
└── package.json                  # Root package.json
```

---

## Environment Files Explained

### Committed Files (Safe to commit)
- `.env.example` - Template with placeholder values
- `.env.development` - Development defaults (NO secrets!)
- `.env.test` - Test defaults (NO secrets!)

### Gitignored Files (NEVER commit)
- `.env` - Generic env file
- `.env.*.local` - Environment-specific secrets
- `infrastructure/docker/.env` - Docker database passwords

**Rule:** If it contains a real password, key, or secret → it's gitignored!

---

## Common Issues & Solutions

### Issue: "Missing required environment variables"

**Solution:** You haven't created the `.env.*.local` files.

```bash
# Run the setup script
npm run setup

# Or create them manually
cp packages/api/.env.example packages/api/.env.development.local
# Edit and add your secrets
```

### Issue: "Database connection failed"

**Solution:** Docker databases aren't running.

```bash
cd infrastructure/docker
docker compose ps  # Check status
docker compose up -d postgres-dev postgres-test  # Start them
```

### Issue: "Docker containers won't start"

**Solution:** Port conflict (something else using port 5432).

```bash
# Check what's using the port
lsof -i :5432

# Either stop the conflicting service or change the port in docker-compose.yml
```

### Issue: "node_modules errors after pulling changes"

**Solution:** Dependencies out of sync.

```bash
# Clean and reinstall
rm -rf node_modules packages/*/node_modules
npm install
```

---

## Architecture Overview

### Shared Repository Pattern

OmniTrackr uses a **monorepo with shared data access layer**:

```
@omnitrackr/shared
  ├── types/          ← Shared TypeScript interfaces
  └── repositories/   ← Shared database access (used by API & Worker)

@omnitrackr/api       ← Uses shared repositories
@omnitrackr/worker    ← Uses shared repositories (future)
```

**Why?**
- ✅ Single source of truth for database operations
- ✅ No code duplication
- ✅ Consistent across all services
- ✅ Easy to maintain and test

See `docs/DATA_ACCESS_LAYER_STRATEGY.md` for details.

---

## Next Steps

1. **Read the documentation:**
   - `docs/DATA_MODEL_AND_API_PLAN.md` - Database schema and API design
   - `docs/FILE_SOURCES_SCHEMA_DESIGN.md` - Extensible file source schema
   - `docs/ENVIRONMENT_CONFIGURATION.md` - Multi-environment setup

2. **Create your first migration:**
   ```bash
   npm run db:migrate:make create_file_sources --workspace=packages/api
   ```

3. **Start building the API:**
   - Implement repositories in `packages/shared/src/repositories/`
   - Create services in `packages/api/src/services/`
   - Add API routes in `packages/api/src/api/routes/`

---

## Helpful Commands Reference

```bash
# Setup
npm run setup                          # One-time setup

# Development
npm run dev:api                        # Start API server
npm test --workspace=packages/api      # Run tests

# Database
npm run db:migrate:dev                 # Run migrations (dev)
npm run db:migrate:test                # Run migrations (test)
npm run db:migrate:make <name>         # Create new migration
npm run db:rollback                    # Rollback last migration

# Docker
cd infrastructure/docker
docker compose up -d                   # Start databases
docker compose down                    # Stop databases
docker compose logs -f postgres-dev    # View logs
docker compose ps                      # Check status

# Build
npm run build                          # Build all packages
npm run build:shared                   # Build shared package only
npm run clean                          # Clean build artifacts
```

---

## Getting Help

- **Documentation:** Check `/docs` folder
- **Issues:** Create an issue in the repository
- **Questions:** Ask the team on Slack/Teams

---

**Happy coding!** 🚀
