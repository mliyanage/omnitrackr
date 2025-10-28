# Environment Configuration Guide

**Version:** 1.0
**Date:** October 26, 2025
**Purpose:** Multi-environment setup (dev, test, production) with separate databases

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Strategy](#environment-strategy)
3. [Database Separation](#database-separation)
4. [Configuration Files Structure](#configuration-files-structure)
5. [Knex.js Multi-Environment Setup](#knexjs-multi-environment-setup)
6. [Environment Variables](#environment-variables)
7. [Docker Compose for Local Development](#docker-compose-for-local-development)
8. [CI/CD Pipeline Configuration](#cicd-pipeline-configuration)
9. [Best Practices](#best-practices)

---

## Overview

### Supported Environments

OmniTrackr supports the following environments:

| Environment | Purpose | Database | Secrets Storage |
|-------------|---------|----------|-----------------|
| **development** | Local development | Local PostgreSQL | Local encrypted DB |
| **test** | Automated testing | Separate test DB | Mock/test credentials |
| **staging** | Pre-production testing | Staging database | Cloud secrets manager |
| **production** | Live production | Production database | Cloud secrets manager |

### Environment Isolation

✅ **Separate databases** for each environment
✅ **Separate credentials** for each environment
✅ **Separate configuration files** (`.env.development`, `.env.test`, `.env.production`)
✅ **Environment-specific behavior** (logging, caching, etc.)

---

## Environment Strategy

### NODE_ENV Variable

The `NODE_ENV` variable is the primary way to distinguish environments:

```bash
# Development
NODE_ENV=development

# Test
NODE_ENV=test

# Staging
NODE_ENV=staging

# Production
NODE_ENV=production
```

### Additional Environment Variables

For more granular control, use additional variables:

```bash
# Application environment
NODE_ENV=production

# Deployment stage (for multiple production environments)
APP_ENV=staging  # or production, or uat

# Database environment (can be different from NODE_ENV)
DB_ENV=staging
```

---

## Database Separation

### Option 1: Separate Database Servers (Recommended for Production)

**Best for:** Production, Staging

```
┌─────────────────────────────────────────────────────────────┐
│ Development Environment                                      │
│ ┌─────────────────────────────┐                             │
│ │ PostgreSQL (localhost:5432) │                             │
│ │ Database: omnitrackr_dev    │                             │
│ └─────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Test Environment                                             │
│ ┌─────────────────────────────┐                             │
│ │ PostgreSQL (localhost:5433) │ OR Separate server          │
│ │ Database: omnitrackr_test   │                             │
│ └─────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Staging Environment (Cloud)                                  │
│ ┌───────────────────────────────────────┐                   │
│ │ AWS RDS / Azure DB / GCP Cloud SQL    │                   │
│ │ Host: staging-db.example.com:5432     │                   │
│ │ Database: omnitrackr_staging          │                   │
│ └───────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Production Environment (Cloud)                               │
│ ┌───────────────────────────────────────┐                   │
│ │ AWS RDS / Azure DB / GCP Cloud SQL    │                   │
│ │ Host: prod-db.example.com:5432        │                   │
│ │ Database: omnitrackr_production       │                   │
│ │ Multi-AZ, Read Replicas, Backups      │                   │
│ └───────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**Advantages:**
- ✅ Complete isolation (no risk of data leakage)
- ✅ Different resource allocations per environment
- ✅ Environment-specific security policies
- ✅ Independent scaling

**Disadvantages:**
- ❌ Higher infrastructure costs
- ❌ More complex setup

---

### Option 2: Separate Databases on Same Server (For Dev/Test)

**Best for:** Development, Local Testing

```
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Server (localhost:5432)                          │
│                                                              │
│ ┌──────────────────────┐                                    │
│ │ omnitrackr_dev       │  ← Development database            │
│ │ User: dev_user       │                                    │
│ └──────────────────────┘                                    │
│                                                              │
│ ┌──────────────────────┐                                    │
│ │ omnitrackr_test      │  ← Test database                   │
│ │ User: test_user      │                                    │
│ └──────────────────────┘                                    │
│                                                              │
│ ┌──────────────────────┐                                    │
│ │ omnitrackr_staging   │  ← Staging database (optional)     │
│ │ User: staging_user   │                                    │
│ └──────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

**Setup Script:**
```bash
#!/bin/bash
# scripts/setup-local-databases.sh

# Create development database
psql -U postgres -c "CREATE DATABASE omnitrackr_dev;"
psql -U postgres -c "CREATE USER dev_user WITH PASSWORD 'dev_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE omnitrackr_dev TO dev_user;"

# Create test database
psql -U postgres -c "CREATE DATABASE omnitrackr_test;"
psql -U postgres -c "CREATE USER test_user WITH PASSWORD 'test_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE omnitrackr_test TO test_user;"

echo "✅ Local databases created successfully!"
```

**Advantages:**
- ✅ Easy local setup
- ✅ Lower resource usage
- ✅ Fast to set up and tear down

**Disadvantages:**
- ❌ Less realistic for production testing
- ❌ Shared server resources

---

### Option 3: Separate PostgreSQL Schemas (Not Recommended)

**Using schemas within the same database:**

```sql
-- Same database, different schemas
omnitrackr_db
  ├── schema: dev
  ├── schema: test
  └── schema: staging
```

**Why NOT recommended:**
- ❌ Risk of cross-schema data leakage
- ❌ More complex permission management
- ❌ Harder to backup/restore independently
- ❌ Not true isolation

---

## Configuration Files Structure

### Project Structure

```
omnitrackr/
├── .env.example                    # Template (committed to git)
├── .env.development.local          # Local dev overrides (gitignored)
├── .env.test.local                 # Local test overrides (gitignored)
├── .env                            # Never commit! (gitignored)
│
├── packages/
│   └── api/
│       ├── .env.example            # API-specific template
│       ├── .env.development        # Dev defaults (can commit)
│       ├── .env.test               # Test defaults (can commit)
│       ├── .env.staging            # Staging defaults (can commit)
│       ├── .env.production         # Prod defaults (NO SECRETS!)
│       ├── .env.local              # Local overrides (gitignored)
│       │
│       ├── knexfile.ts             # Knex configuration
│       └── src/
│           └── config/
│               ├── database.ts     # Database config loader
│               └── app.ts          # App config loader
│
└── .gitignore
```

### .gitignore Configuration

```bash
# Environment variables (NEVER commit!)
.env
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local

# Can commit these (no secrets):
# .env.example
# .env.development
# .env.test
# .env.staging
# .env.production (without secrets!)
```

---

## Knex.js Multi-Environment Setup

### knexfile.ts

```typescript
// packages/api/knexfile.ts
import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, `.env.${nodeEnv}`) });

// Base configuration shared by all environments
const baseConfig: Knex.Config = {
  client: 'pg',
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'knex_migrations',
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds', nodeEnv),
    extension: 'ts',
  },
  pool: {
    afterCreate: (conn: any, done: any) => {
      // Set timezone for all connections
      conn.query('SET timezone="UTC";', (err: any) => {
        done(err, conn);
      });
    },
  },
};

// Environment-specific configurations
const config: { [key: string]: Knex.Config } = {
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'omnitrackr_dev',
      user: process.env.DB_USER || 'dev_user',
      password: process.env.DB_PASSWORD || 'dev_password',
    },
    pool: {
      ...baseConfig.pool,
      min: 2,
      max: 10,
    },
    debug: true, // Enable SQL query logging
  },

  test: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'omnitrackr_test',
      user: process.env.DB_USER || 'test_user',
      password: process.env.DB_PASSWORD || 'test_password',
    },
    pool: {
      ...baseConfig.pool,
      min: 1,
      max: 5, // Lower pool size for testing
    },
    debug: false,
    // Useful for tests: clean database between tests
    seeds: {
      directory: path.join(__dirname, 'seeds', 'test'),
    },
  },

  staging: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: true, // Enforce SSL in staging
      },
    },
    pool: {
      ...baseConfig.pool,
      min: 2,
      max: 20,
    },
    debug: false,
  },

  production: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: true, // Always use SSL in production
      },
      // Connection timeout
      connectionTimeoutMillis: 5000,
      // Statement timeout (30 seconds)
      statement_timeout: 30000,
    },
    pool: {
      ...baseConfig.pool,
      min: 5,
      max: 50, // Higher pool for production
      // Pool timeout
      acquireTimeoutMillis: 60000,
      // Idle timeout (close idle connections after 30s)
      idleTimeoutMillis: 30000,
      // Check for dead connections
      reapIntervalMillis: 1000,
    },
    debug: false,
    // Production-specific settings
    acquireConnectionTimeout: 60000,
  },
};

// Export the configuration for the current environment
export default config;

// Also export specific environment config for direct access
module.exports = config;
```

### Database Configuration Service

```typescript
// packages/api/src/config/database.ts
import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';

// Validate that we have configuration for this environment
if (!knexConfig[environment]) {
  throw new Error(
    `No database configuration found for environment: ${environment}`
  );
}

// Create and export the knex instance
export const db: Knex = knex(knexConfig[environment]);

// Helper to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log(`✅ Database connected (${environment})`);
    return true;
  } catch (error) {
    console.error(`❌ Database connection failed (${environment}):`, error);
    return false;
  }
}

// Helper to close database connection (for graceful shutdown)
export async function closeDatabaseConnection(): Promise<void> {
  await db.destroy();
  console.log(`🔌 Database connection closed (${environment})`);
}

// Export configuration for reference
export const dbConfig = knexConfig[environment];
export const dbEnvironment = environment;
```

---

## Environment Variables

### .env.example (Template)

```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Secrets Management
SECRETS_PROVIDER=encrypted_db  # Options: aws, gcp, azure, encrypted_db
ENCRYPTION_MASTER_KEY=  # 64-char hex key for encrypted_db mode

# AWS (if using AWS secrets manager)
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_PREFIX=omnitrackr/dev/

# Authentication
JWT_SECRET=your-dev-secret-key-here-change-in-production
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:3001

# Feature Flags
ENABLE_SWAGGER=true
ENABLE_METRICS=true
```

### .env.development

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
LOG_FORMAT=pretty

DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr_dev
DB_USER=dev_user
DB_PASSWORD=dev_password

SECRETS_PROVIDER=encrypted_db
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

JWT_SECRET=dev-secret-key-do-not-use-in-production
JWT_EXPIRY=24h

CORS_ORIGIN=http://localhost:3001

ENABLE_SWAGGER=true
ENABLE_METRICS=true
```

### .env.test

```bash
NODE_ENV=test
PORT=3002
LOG_LEVEL=error  # Minimal logging during tests
LOG_FORMAT=json

DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr_test
DB_USER=test_user
DB_PASSWORD=test_password

SECRETS_PROVIDER=encrypted_db
ENCRYPTION_MASTER_KEY=test0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab

JWT_SECRET=test-secret-key
JWT_EXPIRY=1h

CORS_ORIGIN=http://localhost:3003

ENABLE_SWAGGER=false
ENABLE_METRICS=false
```

### .env.staging

```bash
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info
LOG_FORMAT=json

# Database (use environment variables in cloud)
DB_HOST=${STAGING_DB_HOST}
DB_PORT=5432
DB_NAME=${STAGING_DB_NAME}
DB_USER=${STAGING_DB_USER}
DB_PASSWORD=${STAGING_DB_PASSWORD}

# Use cloud secrets manager
SECRETS_PROVIDER=aws
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_PREFIX=omnitrackr/staging/

JWT_SECRET=${STAGING_JWT_SECRET}
JWT_EXPIRY=8h

CORS_ORIGIN=https://staging.omnitrackr.com

ENABLE_SWAGGER=true
ENABLE_METRICS=true
```

### .env.production

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
LOG_FORMAT=json

# Database (NEVER hardcode credentials!)
DB_HOST=${PROD_DB_HOST}
DB_PORT=5432
DB_NAME=${PROD_DB_NAME}
DB_USER=${PROD_DB_USER}
DB_PASSWORD=${PROD_DB_PASSWORD}

# Use cloud secrets manager
SECRETS_PROVIDER=aws
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_PREFIX=omnitrackr/production/

JWT_SECRET=${PROD_JWT_SECRET}
JWT_EXPIRY=4h

CORS_ORIGIN=https://app.omnitrackr.com

ENABLE_SWAGGER=false  # Disable in production
ENABLE_METRICS=true
```

---

## Docker Compose for Local Development

### docker-compose.yml

```yaml
# infrastructure/docker/docker-compose.yml
version: '3.8'

services:
  # PostgreSQL for Development
  postgres-dev:
    image: postgres:15-alpine
    container_name: omnitrackr-postgres-dev
    environment:
      POSTGRES_DB: omnitrackr_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres-dev-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev_user -d omnitrackr_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PostgreSQL for Testing (separate port)
  postgres-test:
    image: postgres:15-alpine
    container_name: omnitrackr-postgres-test
    environment:
      POSTGRES_DB: omnitrackr_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d omnitrackr_test"]
      interval: 10s
      timeout: 5s
      retries: 5
    # Test database: don't persist data between restarts
    tmpfs:
      - /var/lib/postgresql/data

  # API Service (Development)
  api-dev:
    build:
      context: ../../packages/api
      dockerfile: Dockerfile.dev
    container_name: omnitrackr-api-dev
    environment:
      NODE_ENV: development
      DB_HOST: postgres-dev
      DB_PORT: 5432
      DB_NAME: omnitrackr_dev
      DB_USER: dev_user
      DB_PASSWORD: dev_password
    ports:
      - "3000:3000"
    volumes:
      - ../../packages/api:/app
      - /app/node_modules  # Don't override node_modules
    depends_on:
      postgres-dev:
        condition: service_healthy
    command: npm run dev

volumes:
  postgres-dev-data:
  postgres-test-data:
```

### Database Initialization Script

```bash
# infrastructure/docker/init-scripts/01-create-databases.sh
#!/bin/bash
set -e

# This script runs inside the postgres container on first startup

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};
EOSQL

echo "✅ Database initialized successfully"
```

---

## CI/CD Pipeline Configuration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: omnitrackr_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: omnitrackr_test
          DB_USER: test_user
          DB_PASSWORD: test_password
        run: npm run db:migrate --workspace=packages/api

      - name: Run tests
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: omnitrackr_test
          DB_USER: test_user
          DB_PASSWORD: test_password
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Best Practices

### ✅ Do's

1. **Use separate physical databases** for staging and production
2. **Use environment variables** for all configuration
3. **Never commit secrets** to version control
4. **Use cloud secrets managers** for staging/production
5. **Test database migrations** on staging before production
6. **Automate database backups** for all environments
7. **Use SSL/TLS connections** for staging and production databases
8. **Implement connection pooling** appropriately per environment
9. **Monitor database performance** in all environments
10. **Use database users with minimal privileges** (principle of least privilege)

### ❌ Don'ts

1. **Don't use production database** for testing
2. **Don't hardcode credentials** in code or config files
3. **Don't share the same database** between environments
4. **Don't use weak passwords** even in development
5. **Don't skip SSL verification** in production
6. **Don't forget to rotate credentials** regularly
7. **Don't expose database ports** publicly
8. **Don't use `root` or `postgres` user** for application connections

### Environment-Specific Settings

| Setting | Development | Test | Staging | Production |
|---------|------------|------|---------|------------|
| **SQL Logging** | ✅ Enabled | ❌ Disabled | ⚠️ Errors only | ❌ Disabled |
| **Debug Mode** | ✅ Enabled | ❌ Disabled | ❌ Disabled | ❌ Disabled |
| **SSL Required** | ❌ Optional | ❌ Optional | ✅ Required | ✅ Required |
| **Connection Pool** | Small (2-10) | Tiny (1-5) | Medium (5-20) | Large (10-50) |
| **Backups** | ❌ Optional | ❌ Not needed | ✅ Daily | ✅ Hourly + PITR |
| **High Availability** | ❌ No | ❌ No | ⚠️ Optional | ✅ Required |
| **Read Replicas** | ❌ No | ❌ No | ❌ Optional | ✅ Recommended |

### Security Checklist

- [ ] All databases use strong, unique passwords
- [ ] Production database not accessible from dev machines
- [ ] SSL/TLS enabled for remote connections
- [ ] Database users have minimal required privileges
- [ ] Firewall rules restrict database access
- [ ] Regular security patches applied
- [ ] Audit logging enabled in production
- [ ] Backup encryption enabled
- [ ] Connection strings stored in secrets manager
- [ ] No database credentials in code or logs

### Testing Best Practices

```typescript
// Example: Clean database between tests
import { db } from '../src/config/database';

beforeEach(async () => {
  // Rollback to clean state
  await db.migrate.rollback(null, true);
  // Run migrations
  await db.migrate.latest();
  // Optionally seed test data
  await db.seed.run();
});

afterAll(async () => {
  // Clean up and close connection
  await db.destroy();
});
```

---

## Quick Start Commands

### Local Development Setup

```bash
# 1. Start local databases with Docker
cd infrastructure/docker
docker-compose up -d postgres-dev postgres-test

# 2. Copy environment template
cp packages/api/.env.example packages/api/.env.development.local

# 3. Edit .env.development.local with your settings

# 4. Run migrations for development
NODE_ENV=development npm run db:migrate --workspace=packages/api

# 5. Run migrations for test
NODE_ENV=test npm run db:migrate --workspace=packages/api

# 6. Start development server
npm run dev:api
```

### Running Tests

```bash
# Run tests (automatically uses test database)
NODE_ENV=test npm test --workspace=packages/api

# Run tests with coverage
NODE_ENV=test npm run test:coverage --workspace=packages/api
```

### Database Migrations

```bash
# Create new migration
npm run db:migrate:make create_new_table --workspace=packages/api

# Run migrations (development)
NODE_ENV=development npm run db:migrate --workspace=packages/api

# Run migrations (test)
NODE_ENV=test npm run db:migrate --workspace=packages/api

# Run migrations (production) - use with caution!
NODE_ENV=production npm run db:migrate --workspace=packages/api

# Rollback last migration
NODE_ENV=development npm run db:rollback --workspace=packages/api
```

---

## Summary

This environment configuration provides:

✅ **Complete isolation** between dev, test, and production
✅ **Flexible configuration** using environment variables
✅ **Secure credential management** with cloud secrets managers
✅ **Easy local development** with Docker Compose
✅ **Automated testing** with separate test database
✅ **Production-ready** SSL, pooling, and monitoring

**Next Steps:**
1. Set up local databases using Docker Compose
2. Create environment-specific `.env` files
3. Run database migrations for each environment
4. Configure cloud databases for staging/production
5. Set up cloud secrets manager (AWS/GCP/Azure)

---

**Ready for multi-environment deployment!** 🚀
