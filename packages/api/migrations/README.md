# Database Migrations

This directory contains all database migrations for OmniTrackr.

## Migration Files

| # | File | Table | Description |
|---|------|-------|-------------|
| 1 | `20251026000001_create_file_sources.ts` | `file_sources` | File source configurations (S3, SFTP, FTP, etc.) |
| 2 | `20251026000002_create_file_source_credentials.ts` | `file_source_credentials` | Encrypted credentials for all source types |
| 3 | `20251026000003_create_inward_files.ts` | `inward_files` | Detected inward files |
| 4 | `20251026000004_create_file_tracking.ts` | `file_tracking` | Expected file arrivals tracking |
| 5 | `20251026000005_create_notification_config.ts` | `notification_config` | User notification preferences |
| 6 | `20251026000006_create_notification_data.ts` | `notification_data` | Notification event queue |

## Running Migrations

### Development
```bash
# From project root
npm run db:migrate:dev

# Or from packages/api
NODE_ENV=development npm run migrate
```

### Test
```bash
# From project root
npm run db:migrate:test

# Or from packages/api
NODE_ENV=test npm run migrate
```

### Production
```bash
# From project root
NODE_ENV=production npm run db:migrate

# Or from packages/api
NODE_ENV=production npm run migrate
```

## Creating New Migrations

```bash
# From packages/api
npm run migrate:make your_migration_name
```

## Rollback Migrations

```bash
# Rollback last migration
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback -- --all
```

## Migration Status

```bash
# Check which migrations have run
npm run migrate:status
```

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     file_sources                             │
│  - All file source configurations                           │
│  - Extensible connection_config (JSONB)                     │
│  - Supports S3, SFTP, FTP, Azure, GCS, SharePoint, etc.     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ├── 1:1 ──────────┐
                           │                  ▼
                           │      ┌──────────────────────────────┐
                           │      │  file_source_credentials      │
                           │      │  - Encrypted credentials      │
                           │      │  - Cloud or DB storage        │
                           │      └──────────────────────────────┘
                           │
                           ├── 1:N ──────────┐
                           │                  ▼
                           │      ┌──────────────────────────────┐
                           │      │  inward_files                 │
                           │      │  - Detected files             │
                           │      │  - SLA tracking               │
                           │      └──────────────────────────────┘
                           │
                           ├── 1:N ──────────┐
                           │                  ▼
                           │      ┌──────────────────────────────┐
                           │      │  file_tracking                │
                           │      │  - Expected arrivals          │
                           │      │  - Missing file alerts        │
                           │      └──────────────────────────────┘
                           │
                           └── 1:N ──────────┐
                                              ▼
                                  ┌──────────────────────────────┐
                                  │  notification_data            │
                                  │  - Event queue                │
                                  │  - Delivery tracking          │
                                  └──────────────────────────────┘

                    ┌──────────────────────────────┐
                    │  notification_config          │
                    │  - User preferences           │
                    │  - Channel configurations     │
                    └──────────────────────────────┘
```

## Key Design Features

### 1. Extensible Schema
- `file_sources.connection_config` - JSONB field supports all source types
- No schema changes needed to add new source types
- Type-specific configuration in a single table

### 2. Secure Credential Storage
- `file_source_credentials` - Separate table for security
- Supports both cloud secrets managers and encrypted DB storage
- Never returned in API responses

### 3. SLA Tracking
- `inward_files.sla_status` - Real-time SLA compliance
- `file_tracking` - Tracks expected arrivals
- Automatic alerts for missing files

### 4. Notification System
- `notification_data` - Decoupled event queue
- Worker creates events, Notification Manager processes
- Retry logic with exponential backoff
- Multi-channel delivery tracking

### 5. Performance Optimizations
- GIN indexes on JSONB columns
- Partial indexes for common queries
- Proper foreign keys with CASCADE/SET NULL
- Strategic indexing on frequently queried columns

## Migration Best Practices

### ✅ Do's
1. Always include `up` and `down` functions
2. Add comments to tables and complex columns
3. Create indexes for foreign keys
4. Use ENUM types for fixed value sets
5. Include timestamps for audit trails
6. Test rollback functionality

### ❌ Don'ts
1. Don't modify existing migrations after they've run
2. Don't forget foreign key constraints
3. Don't skip index creation
4. Don't use SELECT * in migrations
5. Don't hardcode values that might change

## Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution:** The migration has already run. Check `knex_migrations` table.

### Issue: Migration fails with "column does not exist"
**Solution:** Ensure migrations run in order. Check `knex_migrations` for sequence.

### Issue: Cannot rollback migration
**Solution:** Check the `down` function. Ensure it properly reverses the `up` function.

### Issue: JSONB type not recognized
**Solution:** Ensure you're using PostgreSQL 9.4+. Check database version.

---

**For more information, see:**
- `docs/DATA_MODEL_AND_API_PLAN.md`
- `docs/FILE_SOURCES_SCHEMA_DESIGN.md`
