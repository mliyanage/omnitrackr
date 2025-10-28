# OmniTrackr - Data Model & API Design Plan

**Version:** 1.0
**Date:** October 26, 2025
**Purpose:** Consolidated planning document for Phase 1 development

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema Summary](#database-schema-summary)
3. [API Endpoints Summary](#api-endpoints-summary)
4. [Authentication & Authorization](#authentication--authorization)
5. [Technology Stack](#technology-stack)
6. [Development Phases](#development-phases)
7. [Next Steps](#next-steps)

---

## Overview

### System Architecture

OmniTrackr is a multi-tenant file exchange monitoring platform with three main services:

1. **Backend API** - Express.js REST API for CRUD operations
2. **Worker Service** - Polls file sources (S3, SFTP, FTP, API) on schedules
3. **Notification Manager** - Processes notification events and delivers to channels

### Phase 1 Scope

For Phase 1, we focus on:
- ✅ Backend API with database schema
- ✅ S3 file source support
- ✅ Database migrations
- ✅ Secrets management (cloud-native + encrypted DB fallback)
- ⏳ Worker Service (Phase 3)
- ⏳ Notification Manager (Phase 4)

---

## Database Schema Summary

> **📝 Important Update:** See [FILE_SOURCES_SCHEMA_DESIGN.md](./FILE_SOURCES_SCHEMA_DESIGN.md) for the extensible schema design supporting all file source types (S3, Azure Blob, GCS, SFTP, FTP/FTPS, SharePoint, REST API, etc.)

### Core Tables

#### 1. `file_sources`
Primary table for all file source configurations (S3, SFTP, FTP, API, Azure Blob, GCS, SharePoint, etc.)

**Key Columns:**
- `id` - Primary key
- `name` - File source name (must be unique per department)
- `type` - Enum: 'S3', 'AZURE_BLOB', 'GCS', 'SFTP', 'FTP', 'FTPS', 'SHAREPOINT', 'REST_API', 'DATABASE', 'FILE_SHARE'
- `status` - Enum: 'active', 'failed', 'pending', 'disabled'
- `enabled` - Boolean toggle
- `connection_config` - **JSONB for ALL source type configurations** (structure varies by type)
- `file_name_pattern` - Pattern to match files (e.g., "report_*.csv")
- `match_rule` - Enum: 'partial', 'exact', 'regex'
- `schedule` - Time in HH:MM format (24-hour)
- `timezone` - Timezone string (default: 'UTC')
- `poll_frequency_minutes` - Alternative: polling interval in minutes
- `sla_threshold` - Integer (minutes)
- `department` - Department/tenant identifier
- `last_sync` - Last successful poll timestamp
- `last_sync_status` - Enum: 'success', 'failed', 'in_progress'
- `last_sync_error` - Error message from last sync
- `success_rate` - Polling success percentage
- `files_processed` - Total files detected
- `last_poll_duration_ms` - Last poll duration in milliseconds
- `last_objects_scanned` - Objects scanned in last poll
- `last_objects_detected` - Objects detected in last poll

**Connection Config JSONB Structure (varies by type):**

*Example for S3:*
```json
{
  "sourceType": "S3",
  "bucketName": "customer-data-bucket",
  "bucketRegion": "us-east-1",
  "monitorPath": "/inbound/daily/",
  "credentialId": "uuid-reference",
  "advancedOptions": {
    "usePathStyle": false,
    "endpoint": null
  },
  "lastValidation": {
    "timestamp": "2025-10-26T10:00:00Z",
    "canAuthenticate": true,
    "canAccessBucket": true,
    "canListObjects": true,
    "errorMessage": null
  }
}
```

*Example for SFTP:*
```json
{
  "sourceType": "SFTP",
  "host": "sftp.example.com",
  "port": 22,
  "remotePath": "/inbound/files/",
  "credentialId": "uuid-reference",
  "advancedOptions": {
    "hostKeyFingerprint": "SHA256:abc123...",
    "timeout": 30000
  },
  "lastValidation": {
    "timestamp": "2025-10-26T10:00:00Z",
    "canConnect": true,
    "canAuthenticate": true,
    "canListFiles": true
  }
}
```

> See [FILE_SOURCES_SCHEMA_DESIGN.md](./FILE_SOURCES_SCHEMA_DESIGN.md) for complete configuration structures for all 9 source types.

**Indexes:**
- `idx_file_sources_type` on `type`
- `idx_file_sources_status` on `status`
- `idx_file_sources_department` on `department`
- `idx_file_sources_enabled` on `enabled`
- `idx_file_sources_schedule` on `schedule`

---

#### 2. `file_source_credentials`
Stores encrypted credentials for ALL file source types (renamed from `s3_credentials`)

**Key Columns:**
- `id` - UUID primary key
- `file_source_id` - FK to file_sources (CASCADE delete)
- `credential_type` - Enum: 'S3', 'AZURE_BLOB', 'GCS', 'SFTP', 'FTP', 'FTPS', 'SHAREPOINT', 'REST_API', 'DATABASE', 'FILE_SHARE'
- `storage_method` - Enum: 'secrets_manager', 'encrypted_db'
- `secret_id` - Cloud secrets manager reference (if storage_method = 'secrets_manager')
- `secret_version` - Secret version
- `encrypted_credentials` - JSONB with encrypted credential data (if storage_method = 'encrypted_db')
- `encryption_algorithm` - Default: 'AES-256-GCM'
- `encryption_key_version` - For key rotation
- `encryption_iv` - Initialization vector
- `encryption_auth_tag` - Authentication tag
- `last_used_at` - Timestamp
- `last_rotation_at` - Last credential rotation

**Encrypted Credentials JSONB Structure (varies by type):**

*S3:*
```json
{
  "accessKeyId": "encrypted-value",
  "secretAccessKey": "encrypted-value",
  "sessionToken": null
}
```

*SFTP:*
```json
{
  "authMethod": "private_key",
  "username": "encrypted-value",
  "privateKey": "encrypted-value",
  "privateKeyPassphrase": "encrypted-value"
}
```

*Azure Blob:*
```json
{
  "authMethod": "sas_token",
  "sasToken": "encrypted-value"
}
```

**Security:**
- ⚠️ NEVER log these fields
- ⚠️ NEVER return in API responses
- ⚠️ Only access through EncryptionService
- ⚠️ Support both cloud-native secrets managers and encrypted DB storage

---

#### 3. `inward_files`
Tracks detected files from file sources

**Key Columns:**
- `id` - Primary key
- `file_source_id` - FK to file_sources (CASCADE delete)
- `file_name` - File name only
- `file_path` - Full path/S3 key
- `file_size` - Bytes
- `file_hash` - Optional for deduplication
- `s3_metadata` - JSONB (ETag, StorageClass, LastModified)
- `detected_at` - When worker detected the file
- `s3_last_modified` - From S3 object metadata
- `sla_deadline` - Calculated deadline timestamp
- `sla_status` - Enum: 'on_time', 'at_risk', 'breached', 'not_applicable'
- `processing_status` - Enum: 'detected', 'processing', 'completed', 'failed'

**Unique Constraint:**
- `(file_source_id, file_path, s3_last_modified)` - Prevents duplicates

**Indexes:**
- `idx_inward_files_source` on `file_source_id`
- `idx_inward_files_detected_at` on `detected_at`
- `idx_inward_files_sla_status` on `sla_status`
- `idx_inward_files_processing_status` on `processing_status`

---

#### 4. `file_tracking`
Tracks expected file arrivals and missing files

**Key Columns:**
- `id` - Primary key
- `file_source_id` - FK to file_sources (CASCADE delete)
- `expected_pattern` - What pattern we expect
- `expected_at` - When we expect it
- `expected_schedule` - Schedule that created this expectation
- `actual_file_id` - FK to inward_files (SET NULL on delete)
- `arrived_at` - When file actually arrived
- `tracking_status` - Enum: 'pending', 'arrived', 'late', 'missing'
- `alert_triggered` - Boolean
- `alert_triggered_at` - Timestamp
- `sla_threshold` - Minutes (copied from file_source)
- `sla_deadline` - Calculated deadline

**Indexes:**
- `idx_file_tracking_source` on `file_source_id`
- `idx_file_tracking_status` on `tracking_status`
- `idx_file_tracking_expected_at` on `expected_at`
- `idx_file_tracking_sla_deadline` on `sla_deadline`

---

#### 5. `notification_config`
User notification preferences per event type

**Key Columns:**
- `id` - Primary key
- `user_id` - FK to users table
- `department` - Department filter
- `event_type` - Enum: 'file_detected', 'file_missing', 'sla_at_risk', 'sla_breached', 'connection_failed', 'source_disabled'
- `channels` - JSONB array of channel configurations
- `enabled` - Boolean

**Channels JSONB Structure:**
```json
[
  {
    "channel": "email",
    "enabled": true,
    "config": { "to": "user@example.com" }
  },
  {
    "channel": "slack",
    "enabled": true,
    "config": { "webhook_url": "https://hooks.slack.com/..." }
  },
  {
    "channel": "msteams",
    "enabled": true,
    "config": { "webhook_url": "https://outlook.office.com/webhook/..." }
  }
]
```

**Unique Constraint:**
- `(user_id, event_type, department)`

---

#### 6. `notification_data`
Queue of notification events to be processed

**Key Columns:**
- `id` - Primary key
- `event_type` - Type of event
- `event_source` - Enum: 's3_poller', 'sftp_poller', 'ftp_poller', 'api_poller', 'file_tracking'
- `file_source_id` - FK to file_sources (CASCADE delete)
- `inward_file_id` - FK to inward_files (CASCADE delete)
- `file_tracking_id` - FK to file_tracking (CASCADE delete)
- `target_user_id` - Who to notify
- `target_department` - Department filter
- `payload` - JSONB event details
- `processed` - Boolean (default: false)
- `processed_at` - Timestamp
- `delivery_status` - Enum: 'pending', 'processing', 'delivered', 'failed', 'partially_delivered'
- `delivery_attempts` - Counter
- `delivery_details` - JSONB (which channels succeeded/failed)
- `priority` - Integer (1=highest, 10=lowest)
- `retry_count` - Current retry count
- `max_retries` - Maximum retries (default: 3)
- `next_retry_at` - When to retry if failed

**Payload JSONB Examples:**

*File Detected:*
```json
{
  "eventType": "file_detected",
  "fileSourceName": "Production AWS Daily Reports",
  "fileName": "report_2025-10-26.csv",
  "fileSize": 2048576,
  "detectedAt": "2025-10-26T09:15:00Z",
  "department": "Finance"
}
```

*File Missing:*
```json
{
  "eventType": "file_missing",
  "fileSourceName": "Production AWS Daily Reports",
  "expectedPattern": "report_*.csv",
  "expectedAt": "2025-10-26T09:00:00Z",
  "slaDeadline": "2025-10-26T11:00:00Z",
  "department": "Finance"
}
```

**Indexes:**
- `idx_notification_data_processed` on `processed`
- `idx_notification_data_file_source` on `file_source_id`
- `idx_notification_data_event_type` on `event_type`
- `idx_notification_data_created_at` on `created_at`
- `idx_notification_data_next_retry` on `next_retry_at` WHERE `next_retry_at IS NOT NULL`
- `idx_notification_data_delivery_status` on `delivery_status`

---

## API Endpoints Summary

### Base URL
```
/api/v1
```

### Authentication
All endpoints require JWT Bearer token authentication.

---

### File Source Endpoints

#### 1. Create S3 File Source
```http
POST /api/v1/file-sources/s3
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Production AWS Daily Reports",
  "department": "Finance",
  "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "bucketName": "customer-production-data",
  "bucketRegion": "us-east-1",
  "monitorPath": "/daily-reports/",
  "fileNamePattern": "report_*.csv",
  "matchRule": "partial",
  "schedule": "09:00",
  "timezone": "EST",
  "slaThreshold": 120,
  "direction": "inward"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "Production AWS Daily Reports",
    "type": "S3",
    "status": "active",
    "s3Config": {
      "bucketName": "customer-production-data",
      "bucketRegion": "us-east-1",
      "monitorPath": "/daily-reports/",
      "credentialId": "abc-123-def",
      "credentialType": "secrets_manager",
      "lastValidation": { /* ... */ }
    }
    // ... other fields (NO credentials!)
  },
  "message": "S3 file source created successfully"
}
```

**Validations:**
- Test AWS credentials before saving
- Verify bucket access and list permissions
- Validate schedule format (HH:MM)
- Validate timezone
- Ensure name is unique per department

---

#### 2. Test S3 Connection
```http
POST /api/v1/file-sources/s3/test-connection
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "bucketName": "customer-production-data",
  "bucketRegion": "us-east-1",
  "monitorPath": "/daily-reports/"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "canAuthenticate": true,
    "canAccessBucket": true,
    "canListObjects": true,
    "sampleFiles": [
      "daily-reports/report_2025-10-24.csv",
      "daily-reports/report_2025-10-25.csv",
      "daily-reports/report_2025-10-26.csv"
    ]
  },
  "message": "Connection test successful"
}
```

**Test Steps:**
1. Authenticate with AWS credentials
2. Attempt to access bucket (HeadBucket)
3. Attempt to list objects with prefix (ListObjectsV2)
4. Return first 5 files as sample

---

#### 3. Get File Sources (List)
```http
GET /api/v1/file-sources?type=S3&department=Finance&status=active
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` - Filter by type (optional)
- `department` - Filter by department (required for non-admin)
- `status` - Filter by status (optional)
- `enabled` - Filter by enabled flag (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": [
    { /* FileSource object */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

#### 4. Get File Source by ID
```http
GET /api/v1/file-sources/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "Production AWS Daily Reports",
    // ... full FileSource object
    // NOTE: Credentials are NEVER returned
  }
}
```

**Authorization:**
- Users can only access file sources in their department
- Admins can access all file sources

---

#### 5. Update S3 File Source
```http
PUT /api/v1/file-sources/s3/:id
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body (partial update):**
```json
{
  "schedule": "10:00",
  "slaThreshold": 180,
  "fileNamePattern": "report_*.{csv,xlsx}",
  "awsAccessKeyId": "NEW_ACCESS_KEY",  // Optional: to update credentials
  "awsSecretAccessKey": "NEW_SECRET"   // Optional: to update credentials
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* Updated FileSource object */ },
  "message": "File source updated successfully"
}
```

**Validations:**
- If credentials are updated, test connection first
- Validate schedule/timezone if changed
- Update `updated_at` and `updated_by`

---

#### 6. Delete File Source
```http
DELETE /api/v1/file-sources/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "File source deleted successfully"
}
```

**Side Effects:**
- Cascades to delete credentials (s3_credentials)
- Cascades to delete inward_files
- Cascades to delete file_tracking
- Cascades to delete notification_data

---

#### 7. Enable/Disable File Source
```http
PATCH /api/v1/file-sources/:id/toggle
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "enabled": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "enabled": false
    // ... other fields
  },
  "message": "File source disabled successfully"
}
```

---

### Inward Files Endpoints

#### 8. Get Inward Files (List)
```http
GET /api/v1/inward-files?fileSourceId=7&slaStatus=breached&page=1&limit=50
Authorization: Bearer <token>
```

**Query Parameters:**
- `fileSourceId` - Filter by file source (optional)
- `slaStatus` - Filter by SLA status (optional)
- `processingStatus` - Filter by processing status (optional)
- `detectedAfter` - ISO 8601 timestamp (optional)
- `detectedBefore` - ISO 8601 timestamp (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "fileSourceId": 7,
      "fileName": "report_2025-10-26.csv",
      "filePath": "daily-reports/report_2025-10-26.csv",
      "fileSize": 2048576,
      "detectedAt": "2025-10-26T09:15:00Z",
      "slaDeadline": "2025-10-26T11:00:00Z",
      "slaStatus": "on_time",
      "processingStatus": "detected"
      // ... other fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3
  }
}
```

---

#### 9. Get Inward File by ID
```http
GET /api/v1/inward-files/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    // ... full InwardFile object with s3_metadata
  }
}
```

---

### File Tracking Endpoints

#### 10. Get File Tracking Records (List)
```http
GET /api/v1/file-tracking?fileSourceId=7&trackingStatus=missing
Authorization: Bearer <token>
```

**Query Parameters:**
- `fileSourceId` - Filter by file source (optional)
- `trackingStatus` - Filter by status (optional)
- `alertTriggered` - Filter by alert status (optional)
- `expectedAfter` - ISO 8601 timestamp (optional)
- `expectedBefore` - ISO 8601 timestamp (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "fileSourceId": 7,
      "expectedPattern": "report_*.csv",
      "expectedAt": "2025-10-26T09:00:00Z",
      "trackingStatus": "missing",
      "alertTriggered": true,
      "alertTriggeredAt": "2025-10-26T11:00:00Z",
      "slaDeadline": "2025-10-26T11:00:00Z"
      // ... other fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### Error Responses

**Standard Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Request validation failed (400)
- `AUTHENTICATION_ERROR` - Invalid/missing token (401)
- `AUTHORIZATION_ERROR` - Insufficient permissions (403)
- `NOT_FOUND` - Resource not found (404)
- `CREDENTIAL_ERROR` - Invalid AWS credentials (400)
- `S3_ACCESS_ERROR` - Cannot access S3 bucket (403)
- `DUPLICATE_ERROR` - Unique constraint violation (409)
- `INTERNAL_ERROR` - Server error (500)

---

## Authentication & Authorization

### Authentication Model

**JWT Bearer Tokens:**
- Tokens issued by backend API after login
- Stored in HTTP-only cookies (for web) or localStorage (for mobile)
- Include in `Authorization: Bearer <token>` header

**Token Payload:**
```json
{
  "userId": 123,
  "email": "user@example.com",
  "department": "Finance",
  "role": "user",  // or "admin"
  "iat": 1698345600,
  "exp": 1698432000
}
```

---

### Authorization Model

**Department-Based Multi-Tenancy:**
- Each user belongs to one `department`
- Each file source belongs to one `department`
- Users can only access resources in their department
- Admins can access all departments

**Role-Based Access Control:**

| Role | Permissions |
|------|-------------|
| `user` | - View file sources in their department<br>- Create/edit/delete file sources in their department<br>- View inward files and tracking for their department |
| `admin` | - All `user` permissions<br>- View/manage all departments<br>- Access audit logs<br>- Manage user accounts |

**Middleware:**
```typescript
// Pseudo-code
function requireAuth(req, res, next) {
  // Verify JWT token
  // Attach user to req.user
}

function requireDepartmentAccess(req, res, next) {
  // Ensure user can access the requested resource's department
  // Unless user.role === 'admin'
}
```

---

## Technology Stack

### Backend API
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript 5.3+
- **Database:** PostgreSQL 15+
- **ORM/Query Builder:** Knex.js
- **Validation:** Joi
- **Authentication:** jsonwebtoken
- **Encryption:** Node.js crypto (AES-256-GCM)
- **AWS SDK:** @aws-sdk/client-s3, @aws-sdk/client-secrets-manager
- **Logging:** Winston
- **Testing:** Jest, Supertest

### Database
- **PostgreSQL 15+**
- **Connection Pooling:** pg + Knex
- **Migrations:** Knex migrations

### DevOps
- **Containerization:** Docker, Docker Compose
- **Secrets:** AWS Secrets Manager / Encrypted DB
- **CI/CD:** GitHub Actions (future)
- **Monitoring:** Prometheus + Grafana (future)

---

## Development Phases

### Phase 1: Backend Foundation (Current)
**Goal:** Database schema + API endpoints for S3 file sources

**Tasks:**
1. ✅ Repository setup (completed)
2. ⏳ Database migrations
   - Create `file_sources` table
   - Create `s3_credentials` table
   - Create `inward_files` table
   - Create `file_tracking` table
   - Create `notification_config` table
   - Create `notification_data` table
3. ⏳ API implementation
   - File source CRUD endpoints
   - Test connection endpoint
   - Inward files endpoints
   - File tracking endpoints
4. ⏳ Secrets management service
   - Cloud-native (AWS Secrets Manager)
   - Encrypted DB fallback
5. ⏳ Authentication middleware
6. ⏳ Input validation
7. ⏳ Error handling
8. ⏳ Unit tests
9. ⏳ Integration tests

**Deliverables:**
- Working REST API
- Database schema
- API documentation
- Postman collection

---

### Phase 2: Frontend Integration (Future)
- React web app
- File source configuration UI
- Dashboard with file status
- User authentication

---

### Phase 3: Worker Service (Future)
- S3 poller implementation
- Scheduler (node-cron)
- File detection logic
- SLA calculation
- Notification event creation

---

### Phase 4: Notification Manager (Future)
- Notification processor
- Channel handlers (Email, Slack, Teams, Jira, SMS, ServiceNow)
- Retry logic
- Delivery tracking

---

### Phase 5: Production Readiness (Future)
- Security hardening
- Performance optimization
- Monitoring & logging
- Docker Compose for local dev
- Deployment documentation

---

## Next Steps

### Immediate Actions (Phase 1)

1. **Set up development environment:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL:**
   - Install PostgreSQL 15+
   - Create database: `omnitrackr`
   - Create `.env` file with DB credentials

3. **Create database migrations:**
   ```bash
   npm run db:migrate:make create_file_sources
   npm run db:migrate:make create_s3_credentials
   npm run db:migrate:make create_inward_files
   npm run db:migrate:make create_file_tracking
   npm run db:migrate:make create_notification_config
   npm run db:migrate:make create_notification_data
   ```

4. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Implement core services:**
   - `EncryptionService` - Encrypt/decrypt credentials
   - `SecretsManagerService` - Abstract secrets storage
   - `S3ConnectionService` - Test S3 connections

6. **Implement repositories:**
   - `FileSourceRepository` - Database operations
   - `InwardFileRepository` - Database operations
   - `FileTrackingRepository` - Database operations

7. **Implement API routes:**
   - File source CRUD
   - Test connection
   - Inward files list
   - File tracking list

8. **Write tests:**
   - Unit tests for services
   - Integration tests for API endpoints

9. **Documentation:**
   - API documentation
   - Postman collection
   - Deployment guide

---

## Questions & Decisions

### Open Questions
- [ ] Should we support multiple AWS accounts per customer?
- [ ] Do we need audit logs for credential access?
- [ ] Should we implement rate limiting on API?
- [ ] Do we need webhook notifications for real-time events?

### Decisions Made
- ✅ Use Knex.js (not TypeORM) for flexibility
- ✅ Store S3 config in JSONB (flexible, no separate table)
- ✅ Support both cloud-native and encrypted DB secrets
- ✅ Use department-based multi-tenancy
- ✅ Polling-based worker (not event-driven S3 notifications)
- ✅ Separate notification manager service

---

## Resources

- [S3 File Source Design (Full)](./S3_FILE_SOURCE_DESIGN.md)
- [Repository Structure](./REPOSITORY_STRUCTURE.md)
- [README](../README.md)

---

**Ready to start development!** 🚀
