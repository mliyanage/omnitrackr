# AWS S3 File Source Implementation - Design Document

**Project:** OmniTrackr File Exchange Platform
**Feature:** AWS S3 File Source Integration
**Version:** 1.0
**Date:** October 22, 2025
**Author:** Design Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture](#architecture)
4. [Data Models](#data-models)
5. [API Design](#api-design)
6. [Security](#security)
7. [File Detection & Monitoring](#file-detection--monitoring)
8. [SLA & Alert System](#sla--alert-system)
9. [Technology Stack](#technology-stack)
10. [Implementation Phases](#implementation-phases)
11. [Deployment Considerations](#deployment-considerations)
12. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Purpose
Enable customers to connect their AWS S3 buckets as file sources in OmniTrackr, allowing automated monitoring of inward files based on configurable schedules and patterns.

### Key Requirements
- **Cloud-Agnostic:** Solution must work on AWS, Google Cloud, Azure, or customer's own infrastructure
- **Authentication:** IAM User Access Keys (static credentials)
- **Monitoring:** Scheduled polling based on customer-defined schedules
- **Scope:** Metadata tracking only (no file downloads)
- **Security:** Cloud-native secrets management with encrypted PostgreSQL fallback
- **Validation:** Test credentials and bucket access on source creation

### Design Decisions Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Authentication | IAM User Access Keys | Minimize customer setup; works from any infrastructure |
| Monitoring Approach | Scheduled Polling | Customer control over frequency; predictable costs |
| File Processing | Metadata Only | Minimal permissions needed; no storage overhead |
| Secrets Storage | Cloud-native + Encrypted DB fallback | Balance security & cloud-agnostic deployment |
| Scheduler | Separate Worker Service | Scalable; independent from API server |
| Region Support | Single region per file source | Simpler implementation; clear source boundaries |

---

## System Overview

### High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                          OmniTrackr Platform                                   │
│                                                                                 │
│  ┌─────────────┐       ┌──────────────────┐        ┌──────────────────────┐  │
│  │  Frontend   │◄─────►│  Backend API     │◄──────►│   PostgreSQL DB      │  │
│  │  (React)    │       │  (Express)       │        │  - file_sources      │  │
│  │             │       │  - CRUD Sources   │        │  - inward_files      │  │
│  │  - Landing  │       │  - Validate Creds│        │  - file_tracking     │  │
│  │  - Web App  │       │  - Auth          │        │  - s3_credentials    │  │
│  │             │       │                  │        │  - users             │  │
│  └─────────────┘       └──────────────────┘        │  - notification_cfg  │  │
│        │                        │                   │  - notification_data │  │
│        │                        │                   └──────────────────────┘  │
│        ▼                        │                            ▲                 │
│  ┌─────────────┐                │                            │                 │
│  │    Auth     │◄───────────────┘                            │                 │
│  │  Provider   │                                              │                 │
│  └─────────────┘                                              │                 │
│                                                                │                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │        File Source Polling Worker Service (Node.js)                      │  │
│  │                                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐              │  │
│  │  │  Scheduler   │  │  S3 Poller   │  │  SFTP Poller     │              │  │
│  │  │ (node-cron)  │  │ (AWS SDK v3) │  │  (ssh2-sftp)     │              │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘              │  │
│  │                                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐              │  │
│  │  │  FTP Poller  │  │  API Poller  │  │  File Tracking   │              │  │
│  │  │              │  │              │  │  Service         │              │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘              │  │
│  │                                                                           │  │
│  │  Creates notification events → writes to notification_data table         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                   │                                             │
│                                   │                                             │
│                                   ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │        Notification Manager Service (Separate Node.js Service)           │  │
│  │                                                                           │  │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Notification Processor                                             │ │  │
│  │  │  - Polls notification_data table for unprocessed events            │ │  │
│  │  │  - Determines target channels based on user preferences             │ │  │
│  │  │  - Formats messages per channel                                     │ │  │
│  │  │  - Routes to appropriate channel handlers                           │ │  │
│  │  └────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  │  Channel Handlers:                                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐               │  │
│  │  │ MS Teams │ │   Jira   │ │  Email   │ │    Slack     │               │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘               │  │
│  │  ┌──────────┐ ┌──────────┐                                               │  │
│  │  │   SMS    │ │ Service  │                                               │  │
│  │  │ (Twilio) │ │   Now    │                                               │  │
│  │  └──────────┘ └──────────┘                                               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  Secure Key Vault   │
                        │  (Cloud-native or   │
                        │   Encrypted DB)     │
                        └─────────────────────┘
                                   │
                                   ▼
          ┌──────────────────────────────────────────────┐
          │        Customer AWS Account                   │
          │                                               │
          │  ┌────────────────────────────────────────┐  │
          │  │      S3 Bucket (us-east-1)             │  │
          │  │                                         │  │
          │  │  /monitored-path/                      │  │
          │  │    ├── file001.csv                     │  │
          │  │    ├── file002.xml                     │  │
          │  │    └── file003.json                    │  │
          │  │                                         │  │
          │  │  IAM User: omnitrackr-access           │  │
          │  │  Permissions: ListBucket, GetObject    │  │
          │  └────────────────────────────────────────┘  │
          └──────────────────────────────────────────────┘
```

### Component Responsibilities

#### 1. Frontend (React)
- **Landing pages:** Public-facing pages
- **Web App:** Authenticated application
  - **FileSources.tsx:** Add/edit file source configuration UI (S3, SFTP, FTP, API)
  - **InwardFiles.tsx:** Display detected files and tracking status
  - Form validation and user feedback

#### 2. Backend API (Node.js/Express)
- RESTful API endpoints for file source management
- Credential validation and connection testing
- Integration with secrets manager
- User authentication and authorization (department-based)
- CRUD operations for all entities

#### 3. PostgreSQL Database
- Persistent storage for all application data
- Tables: file_sources, inward_files, file_tracking, s3_credentials, users, notification_cfg, notification_data
- Encrypted credential storage (fallback mode)
- Transaction support for data consistency

#### 4. File Source Polling Worker Service
- **Separate Node.js process from API**
- Supports multiple file source types:
  - **S3 Poller:** AWS S3 bucket monitoring
  - **SFTP Poller:** SFTP server monitoring
  - **FTP Poller:** FTP server monitoring
  - **API Poller:** REST API polling
- Schedule-based polling execution for all source types
- File detection and metadata collection
- Creates notification events (writes to notification_data table)
- **Does NOT send notifications directly** - decoupled from notification channels

#### 5. Notification Manager Service
- **Separate Node.js service (independent from Worker)**
- **Notification Processor:**
  - Polls `notification_data` table for unprocessed events
  - Determines target channels based on user preferences (notification_cfg)
  - Formats messages appropriately for each channel
  - Routes to appropriate channel handlers
  - Marks notifications as processed
- **Channel Handlers:**
  - MS Teams integration
  - Jira ticket creation
  - Email (SMTP)
  - Slack messaging
  - SMS (Twilio)
  - ServiceNow ticket creation
- **Common service for all file source types** (not S3-specific)
- Handles retries and delivery failures
- Maintains notification delivery status

#### 6. Secrets Manager (Secure Key Vault)
- Primary: Cloud-native (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)
- Fallback: Encrypted fields in PostgreSQL
- Stores customer credentials for all file source types
- Credential rotation support (future)

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│              (React Frontend - FileSources UI)               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│              (Express REST API Endpoints)                    │
│  /api/file-sources, /api/file-sources/:id/test              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ FileSourceService│  │ S3ConnectionService│               │
│  └─────────────────┘  └──────────────────┘                 │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ InwardFileService│  │ NotificationService│               │
│  └─────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ FileSourceRepo   │  │ InwardFileRepo   │                 │
│  └─────────────────┘  └──────────────────┘                 │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ FileTrackingRepo │  │ SecretsManager   │                 │
│  └─────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│     PostgreSQL Database + Secrets Manager + AWS SDK         │
└─────────────────────────────────────────────────────────────┘
```

### Worker Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│       File Source Polling Worker Service                     │
│       (Supports All File Source Types: S3, SFTP, FTP, API)   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │             Main Scheduler (node-cron)                  │  │
│  │  Runs every minute: check for sources due for polling  │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           Poll Orchestrator                             │  │
│  │  - Fetch active file sources from DB (all types)       │  │
│  │  - Filter by schedule (due for polling)                │  │
│  │  - Route to appropriate poller based on type           │  │
│  │  - Execute polls sequentially or in batches            │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│         ┌─────────────────┼─────────────────┬────────────────┐
│         ▼                 ▼                 ▼                ▼
│  ┌──────────┐      ┌──────────┐      ┌──────────┐   ┌───────────┐
│  │ S3 Poller│      │SFTP Poller│      │FTP Poller│   │API Poller │
│  │          │      │           │      │          │   │           │
│  │ AWS SDK  │      │ ssh2-sftp │      │ ftp lib  │   │  axios    │
│  └──────────┘      └──────────┘      └──────────┘   └───────────┘
│         │                 │                 │                │
│         └─────────────────┼─────────────────┴────────────────┘
│                           ▼
│  ┌────────────────────────────────────────────────────────┐  │
│  │         File Processor (per detected file)              │  │
│  │  1. Check if file already tracked (deduplication)      │  │
│  │  2. Create InwardFile record                           │  │
│  │  3. Create/update FileTracking record                  │  │
│  │  4. Calculate SLA deadline                             │  │
│  │  5. Create notification event if needed                │  │
│  │     (writes to notification_data table)                │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Database Writer                            │  │
│  │  - Batch insert/update operations                      │  │
│  │  - Update file_source.last_sync timestamp              │  │
│  │  - Update success_rate and files_processed counters    │  │
│  │  - Write notification events to notification_data      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│           Notification Manager Service                       │
│           (Separate Service - Processes All Alerts)          │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │        Notification Scheduler (node-cron)               │  │
│  │  Runs every 1-2 minutes: poll for unprocessed events   │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │        Notification Event Reader                        │  │
│  │  - Query notification_data table                        │  │
│  │  - Filter WHERE processed = false                       │  │
│  │  - Order by priority, created_at                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │        Channel Router                                   │  │
│  │  - Get user notification preferences (notification_cfg) │  │
│  │  - Determine target channels for event type            │  │
│  │  - Format message for each channel                      │  │
│  │  - Route to appropriate handler                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │                                   │
│         ┌─────────────────┼─────────────────┬───────────────┐
│         ▼                 ▼                 ▼               ▼
│  ┌──────────┐      ┌──────────┐      ┌──────────┐   ┌─────────┐
│  │ MS Teams │      │   Jira   │      │  Email   │   │  Slack  │
│  │ Handler  │      │ Handler  │      │ Handler  │   │ Handler │
│  └──────────┘      └──────────┘      └──────────┘   └─────────┘
│         │                                                 │
│         └───┬──────────────┬──────────────┬──────────────┘
│             ▼              ▼              ▼
│      ┌──────────┐    ┌──────────┐    ┌──────────┐
│      │   SMS    │    │ Service  │    │  Custom  │
│      │ (Twilio) │    │   Now    │    │ Webhook  │
│      └──────────┘    └──────────┘    └──────────┘
│             │              │              │
│             └──────────────┼──────────────┘
│                           ▼
│  ┌────────────────────────────────────────────────────────┐  │
│  │        Delivery Status Updater                          │  │
│  │  - Mark notification as processed                       │  │
│  │  - Record delivery status (success/failed)              │  │
│  │  - Update retry count if failed                         │  │
│  │  - Schedule retry if needed                             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Database Schema

#### Table: `file_sources`

Stores file source configurations.

```sql
CREATE TABLE file_sources (
  id SERIAL PRIMARY KEY,

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('SFTP', 'FTP', 'API', 'REST_API', 'DATABASE', 'FILE_SHARE', 'S3')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'failed', 'pending', 'disabled')),
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- S3 Specific Configuration (JSON for flexibility)
  s3_config JSONB, -- Structure defined below

  -- Legacy fields (for other source types)
  host VARCHAR(255),
  port INTEGER,
  path VARCHAR(500),

  -- File Pattern Matching
  file_name_pattern VARCHAR(255),
  match_rule VARCHAR(50) CHECK (match_rule IN ('partial', 'exact', 'regex')),

  -- Schedule Configuration
  schedule VARCHAR(10), -- Format: HH:MM (24-hour)
  timezone VARCHAR(50) DEFAULT 'UTC',

  -- SLA Configuration
  sla_threshold INTEGER, -- Minutes

  -- Metadata
  direction VARCHAR(50) DEFAULT 'inward' CHECK (direction IN ('inward', 'outward', 'bidirectional')),
  department VARCHAR(100),

  -- Sync Statistics
  last_sync TIMESTAMP,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  files_processed INTEGER DEFAULT 0,

  -- Audit Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),

  -- Indexes
  CONSTRAINT unique_name_per_department UNIQUE(name, department)
);

CREATE INDEX idx_file_sources_type ON file_sources(type);
CREATE INDEX idx_file_sources_status ON file_sources(status);
CREATE INDEX idx_file_sources_department ON file_sources(department);
CREATE INDEX idx_file_sources_enabled ON file_sources(enabled);
CREATE INDEX idx_file_sources_schedule ON file_sources(schedule);
```

**s3_config JSONB Structure:**

```typescript
{
  bucketName: string;           // e.g., "customer-data-bucket"
  bucketRegion: string;         // e.g., "us-east-1"
  monitorPath: string;          // e.g., "/inbound/daily/" (prefix)
  credentialId: string;         // Reference to secrets manager or s3_credentials table
  credentialType: 'secrets_manager' | 'encrypted_db';

  // Connection validation results
  lastValidation: {
    timestamp: string;          // ISO 8601
    canAuthenticate: boolean;
    canAccessBucket: boolean;
    canListObjects: boolean;
    errorMessage?: string;
  };

  // Polling metadata
  lastPollDuration: number;     // milliseconds
  lastObjectsScanned: number;
  lastObjectsDetected: number;
}
```

#### Table: `s3_credentials`

Stores encrypted AWS credentials (fallback when secrets manager not available).

```sql
CREATE TABLE s3_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  file_source_id INTEGER REFERENCES file_sources(id) ON DELETE CASCADE,

  -- Encrypted credentials
  access_key_id_encrypted TEXT NOT NULL,
  secret_access_key_encrypted TEXT NOT NULL,

  -- Encryption metadata
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  encryption_key_version INTEGER DEFAULT 1,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,

  CONSTRAINT unique_file_source_credential UNIQUE(file_source_id)
);

CREATE INDEX idx_s3_credentials_file_source ON s3_credentials(file_source_id);
```

**Security Note:** Never log or expose these fields. Access only through dedicated service layer.

#### Table: `inward_files`

Tracks detected inward files.

```sql
CREATE TABLE inward_files (
  id SERIAL PRIMARY KEY,

  file_source_id INTEGER REFERENCES file_sources(id) ON DELETE CASCADE,

  -- File Information
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL, -- Full S3 key
  file_size BIGINT, -- bytes
  file_hash VARCHAR(64), -- Optional: for deduplication

  -- S3 Metadata
  s3_metadata JSONB, -- ETag, StorageClass, LastModified from S3

  -- Timestamps
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  s3_last_modified TIMESTAMP, -- From S3 object metadata

  -- SLA Tracking
  sla_deadline TIMESTAMP,
  sla_status VARCHAR(50) CHECK (sla_status IN ('on_time', 'at_risk', 'breached', 'not_applicable')),

  -- Processing Status
  processing_status VARCHAR(50) DEFAULT 'detected' CHECK (processing_status IN ('detected', 'processing', 'completed', 'failed')),

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_file_per_source UNIQUE(file_source_id, file_path, s3_last_modified)
);

CREATE INDEX idx_inward_files_source ON inward_files(file_source_id);
CREATE INDEX idx_inward_files_detected_at ON inward_files(detected_at);
CREATE INDEX idx_inward_files_sla_status ON inward_files(sla_status);
CREATE INDEX idx_inward_files_processing_status ON inward_files(processing_status);
```

#### Table: `file_tracking`

Tracks expected file arrivals and triggers alerts when files don't arrive.

```sql
CREATE TABLE file_tracking (
  id SERIAL PRIMARY KEY,

  file_source_id INTEGER REFERENCES file_sources(id) ON DELETE CASCADE,

  -- Expected arrival information
  expected_pattern VARCHAR(255) NOT NULL, -- What file pattern we expect
  expected_at TIMESTAMP NOT NULL, -- When we expect it
  expected_schedule VARCHAR(10), -- Schedule that created this expectation

  -- Actual arrival tracking
  actual_file_id INTEGER REFERENCES inward_files(id) ON DELETE SET NULL,
  arrived_at TIMESTAMP,

  -- Status
  tracking_status VARCHAR(50) DEFAULT 'pending' CHECK (tracking_status IN ('pending', 'arrived', 'late', 'missing')),

  -- Alert information
  alert_triggered BOOLEAN DEFAULT false,
  alert_triggered_at TIMESTAMP,

  -- SLA
  sla_threshold INTEGER, -- Minutes (copied from file_source)
  sla_deadline TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_tracking_source ON file_tracking(file_source_id);
CREATE INDEX idx_file_tracking_status ON file_tracking(tracking_status);
CREATE INDEX idx_file_tracking_expected_at ON file_tracking(expected_at);
CREATE INDEX idx_file_tracking_sla_deadline ON file_tracking(sla_deadline);
```

#### Table: `notification_config`

Stores user notification preferences for different event types and channels.

```sql
CREATE TABLE notification_config (
  id SERIAL PRIMARY KEY,

  user_id INTEGER NOT NULL, -- References users table
  department VARCHAR(100),

  -- Event type this config applies to
  event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
    'file_detected',
    'file_missing',
    'sla_at_risk',
    'sla_breached',
    'connection_failed',
    'source_disabled'
  )),

  -- Notification channels (can have multiple)
  channels JSONB NOT NULL, -- Array of channel configs

  -- Enabled/disabled
  enabled BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_event_type UNIQUE(user_id, event_type, department)
);

CREATE INDEX idx_notification_config_user ON notification_config(user_id);
CREATE INDEX idx_notification_config_enabled ON notification_config(enabled);
CREATE INDEX idx_notification_config_event_type ON notification_config(event_type);
```

**channels JSONB Structure:**
```typescript
[
  {
    channel: 'email',
    enabled: true,
    config: { to: 'user@example.com' }
  },
  {
    channel: 'slack',
    enabled: true,
    config: { webhook_url: 'https://hooks.slack.com/...' }
  },
  {
    channel: 'msteams',
    enabled: true,
    config: { webhook_url: 'https://outlook.office.com/webhook/...' }
  }
]
```

#### Table: `notification_data`

Stores notification events created by worker services, to be processed by Notification Manager.

```sql
CREATE TABLE notification_data (
  id SERIAL PRIMARY KEY,

  -- Event information
  event_type VARCHAR(100) NOT NULL,
  event_source VARCHAR(50) NOT NULL CHECK (event_source IN ('s3_poller', 'sftp_poller', 'ftp_poller', 'api_poller', 'file_tracking')),

  -- Related entities
  file_source_id INTEGER REFERENCES file_sources(id) ON DELETE CASCADE,
  inward_file_id INTEGER REFERENCES inward_files(id) ON DELETE CASCADE,
  file_tracking_id INTEGER REFERENCES file_tracking(id) ON DELETE CASCADE,

  -- Target user/department
  target_user_id INTEGER,
  target_department VARCHAR(100),

  -- Event payload (flexible JSON structure)
  payload JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,

  -- Delivery tracking
  delivery_status VARCHAR(50) CHECK (delivery_status IN ('pending', 'processing', 'delivered', 'failed', 'partially_delivered')),
  delivery_attempts INTEGER DEFAULT 0,
  last_delivery_attempt TIMESTAMP,

  -- Delivery details (which channels succeeded/failed)
  delivery_details JSONB,

  -- Priority
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest

  -- Retry configuration
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_data_processed ON notification_data(processed);
CREATE INDEX idx_notification_data_file_source ON notification_data(file_source_id);
CREATE INDEX idx_notification_data_event_type ON notification_data(event_type);
CREATE INDEX idx_notification_data_created_at ON notification_data(created_at);
CREATE INDEX idx_notification_data_next_retry ON notification_data(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_notification_data_delivery_status ON notification_data(delivery_status);
```

**payload JSONB Structure Examples:**

*File Missing Event:*
```typescript
{
  eventType: 'file_missing',
  fileSourceName: 'Production AWS Daily Reports',
  expectedPattern: 'report_*.csv',
  expectedAt: '2025-10-22T09:00:00Z',
  slaDeadline: '2025-10-22T11:00:00Z',
  department: 'Finance',
  message: 'Expected file matching "report_*.csv" has not arrived by SLA deadline'
}
```

*SLA Breached Event:*
```typescript
{
  eventType: 'sla_breached',
  fileSourceName: 'Production AWS Daily Reports',
  fileName: 'report_2025-10-22.csv',
  detectedAt: '2025-10-22T11:30:00Z',
  slaDeadline: '2025-10-22T11:00:00Z',
  breachedBy: 30, // minutes
  department: 'Finance'
}
```

*File Detected Event:*
```typescript
{
  eventType: 'file_detected',
  fileSourceName: 'Production AWS Daily Reports',
  fileName: 'report_2025-10-22.csv',
  fileSize: 2048576,
  detectedAt: '2025-10-22T09:15:00Z',
  department: 'Finance'
}
```

### TypeScript Interfaces

#### Frontend/Backend Shared Types

```typescript
// src/types/fileSource.types.ts

export type FileSourceType = 'SFTP' | 'FTP' | 'API' | 'REST_API' | 'DATABASE' | 'FILE_SHARE' | 'S3';
export type FileSourceStatus = 'active' | 'failed' | 'pending' | 'disabled';
export type FileSourceDirection = 'inward' | 'outward' | 'bidirectional';
export type MatchRule = 'partial' | 'exact' | 'regex';

export interface S3Config {
  bucketName: string;
  bucketRegion: string;
  monitorPath: string;
  credentialId: string;
  credentialType: 'secrets_manager' | 'encrypted_db';
  lastValidation?: {
    timestamp: string;
    canAuthenticate: boolean;
    canAccessBucket: boolean;
    canListObjects: boolean;
    errorMessage?: string;
  };
  lastPollDuration?: number;
  lastObjectsScanned?: number;
  lastObjectsDetected?: number;
}

export interface FileSource {
  id: number;
  name: string;
  type: FileSourceType;
  status: FileSourceStatus;
  enabled: boolean;

  // S3 specific
  s3Config?: S3Config;

  // Legacy fields
  host?: string;
  port?: number;
  path?: string;

  // Pattern matching
  fileNamePattern: string;
  matchRule: MatchRule;

  // Schedule
  schedule: string; // HH:MM
  timezone: string;

  // SLA
  slaThreshold: number; // minutes

  // Metadata
  direction: FileSourceDirection;
  department: string;

  // Stats
  lastSync?: string;
  successRate: number;
  filesProcessed: number;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateS3FileSourceRequest {
  name: string;
  department: string;

  // AWS credentials
  awsAccessKeyId: string;
  awsSecretAccessKey: string;

  // S3 configuration
  bucketName: string;
  bucketRegion: string;
  monitorPath: string;

  // Pattern matching
  fileNamePattern: string;
  matchRule: MatchRule;

  // Schedule
  schedule: string;
  timezone: string;

  // SLA
  slaThreshold: number;

  direction: FileSourceDirection;
}

export interface TestConnectionRequest {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  bucketName: string;
  bucketRegion: string;
  monitorPath: string;
}

export interface TestConnectionResponse {
  success: boolean;
  canAuthenticate: boolean;
  canAccessBucket: boolean;
  canListObjects: boolean;
  errorMessage?: string;
  sampleFiles?: string[]; // First 5 files found
}
```

```typescript
// src/types/inwardFile.types.ts

export type SLAStatus = 'on_time' | 'at_risk' | 'breached' | 'not_applicable';
export type ProcessingStatus = 'detected' | 'processing' | 'completed' | 'failed';

export interface InwardFile {
  id: number;
  fileSourceId: number;

  fileName: string;
  filePath: string;
  fileSize: number;
  fileHash?: string;

  s3Metadata?: {
    etag: string;
    storageClass: string;
    lastModified: string;
  };

  detectedAt: string;
  s3LastModified?: string;

  slaDeadline?: string;
  slaStatus: SLAStatus;

  processingStatus: ProcessingStatus;

  createdAt: string;
  updatedAt: string;
}

export interface FileTracking {
  id: number;
  fileSourceId: number;

  expectedPattern: string;
  expectedAt: string;
  expectedSchedule: string;

  actualFileId?: number;
  arrivedAt?: string;

  trackingStatus: 'pending' | 'arrived' | 'late' | 'missing';

  alertTriggered: boolean;
  alertTriggeredAt?: string;

  slaThreshold: number;
  slaDeadline: string;

  createdAt: string;
  updatedAt: string;
}
```

---

## API Design

### Base URL
```
/api/v1
```

### Authentication
All endpoints require authentication using existing AuthContext mechanism.

### Endpoints

#### 1. Create S3 File Source

```http
POST /api/v1/file-sources/s3
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
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

Response (201 Created):
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
      "lastValidation": {
        "timestamp": "2025-10-22T10:30:00Z",
        "canAuthenticate": true,
        "canAccessBucket": true,
        "canListObjects": true
      }
    },
    // ... other fields
  },
  "message": "S3 file source created successfully"
}

Error Response (400 Bad Request):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid AWS credentials",
    "details": {
      "canAuthenticate": false,
      "errorMessage": "The security token included in the request is invalid"
    }
  }
}
```

#### 2. Test S3 Connection

```http
POST /api/v1/file-sources/s3/test-connection
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "bucketName": "customer-production-data",
  "bucketRegion": "us-east-1",
  "monitorPath": "/daily-reports/"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "canAuthenticate": true,
    "canAccessBucket": true,
    "canListObjects": true,
    "sampleFiles": [
      "daily-reports/report_2025-10-20.csv",
      "daily-reports/report_2025-10-21.csv",
      "daily-reports/report_2025-10-22.csv"
    ]
  },
  "message": "Connection test successful"
}

Error Response (403 Forbidden):
{
  "success": false,
  "data": {
    "canAuthenticate": true,
    "canAccessBucket": false,
    "canListObjects": false,
    "errorMessage": "Access Denied: Insufficient permissions to list bucket objects"
  },
  "message": "Connection test failed"
}
```

#### 3. Get File Sources

```http
GET /api/v1/file-sources?type=S3&department=Finance
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": 7,
      "name": "Production AWS Daily Reports",
      "type": "S3",
      "status": "active",
      // ... full FileSource object
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

#### 4. Get File Source by ID

```http
GET /api/v1/file-sources/:id
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": {
    "id": 7,
    // ... full FileSource object with s3Config
    // NOTE: Credentials are NEVER returned in responses
  }
}
```

#### 5. Update S3 File Source

```http
PUT /api/v1/file-sources/s3/:id
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "schedule": "10:00",
  "slaThreshold": 180,
  "fileNamePattern": "report_*.{csv,xlsx}"
  // Can update any non-credential fields
  // To update credentials, provide new awsAccessKeyId and awsSecretAccessKey
}

Response (200 OK):
{
  "success": true,
  "data": {
    // Updated FileSource object
  },
  "message": "File source updated successfully"
}
```

#### 6. Delete File Source

```http
DELETE /api/v1/file-sources/:id
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "message": "File source deleted successfully"
}
```

#### 7. Enable/Disable File Source

```http
PATCH /api/v1/file-sources/:id/toggle
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "enabled": false
}

Response (200 OK):
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

#### 8. Get Inward Files

```http
GET /api/v1/inward-files?fileSourceId=7&slaStatus=breached
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": 123,
      "fileSourceId": 7,
      "fileName": "report_2025-10-22.csv",
      "filePath": "daily-reports/report_2025-10-22.csv",
      "fileSize": 2048576,
      "detectedAt": "2025-10-22T09:15:00Z",
      "slaDeadline": "2025-10-22T11:00:00Z",
      "slaStatus": "on_time",
      // ... other fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1
  }
}
```

#### 9. Get File Tracking Records

```http
GET /api/v1/file-tracking?fileSourceId=7&trackingStatus=missing
Authorization: Bearer <token>

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "id": 456,
      "fileSourceId": 7,
      "expectedPattern": "report_*.csv",
      "expectedAt": "2025-10-22T09:00:00Z",
      "trackingStatus": "missing",
      "alertTriggered": true,
      "alertTriggeredAt": "2025-10-22T11:00:00Z",
      // ... other fields
    }
  ]
}
```

### Error Handling

Standard error response format:

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

Common error codes:
- `VALIDATION_ERROR`: Request validation failed
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: User lacks permission
- `NOT_FOUND`: Resource not found
- `CREDENTIAL_ERROR`: Invalid AWS credentials
- `S3_ACCESS_ERROR`: Cannot access S3 bucket
- `INTERNAL_ERROR`: Server error

---

## Security

### Credential Storage Strategy

#### Primary: Cloud-Native Secrets Manager

When deployed on AWS, GCP, or Azure:

1. **AWS Deployment:**
   - Use AWS Secrets Manager
   - Store credentials as JSON secrets
   - Use IAM roles for accessing secrets (no keys needed)
   - Enable automatic rotation (future enhancement)

   ```javascript
   // Example: Storing credentials in AWS Secrets Manager
   const secretName = `omnitrackr/file-source/${fileSourceId}/aws-credentials`;
   const secret = {
     accessKeyId: awsAccessKeyId,
     secretAccessKey: awsSecretAccessKey
   };

   await secretsManagerClient.send(new CreateSecretCommand({
     Name: secretName,
     SecretString: JSON.stringify(secret),
     Tags: [
       { Key: 'FileSourceId', Value: String(fileSourceId) },
       { Key: 'Department', Value: department }
     ]
   }));
   ```

2. **GCP Deployment:**
   - Use GCP Secret Manager
   - Similar pattern as AWS

3. **Azure Deployment:**
   - Use Azure Key Vault
   - Similar pattern as AWS

#### Fallback: Encrypted Database Storage

When deployed on customer's own infrastructure:

1. **Encryption Strategy:**
   - Use AES-256-GCM encryption
   - Master encryption key stored in environment variable: `ENCRYPTION_MASTER_KEY`
   - Derive unique key per credential using HKDF
   - Store encrypted values in `s3_credentials` table

2. **Implementation:**
   ```javascript
   // src/services/encryption.service.ts
   import crypto from 'crypto';

   export class EncryptionService {
     private algorithm = 'aes-256-gcm';
     private masterKey: Buffer;

     constructor() {
       const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;
       if (!masterKeyHex) {
         throw new Error('ENCRYPTION_MASTER_KEY not set');
       }
       this.masterKey = Buffer.from(masterKeyHex, 'hex');
     }

     encrypt(plaintext: string, context: string): {
       encrypted: string;
       iv: string;
       authTag: string;
     } {
       // Derive key from master key + context
       const key = crypto.hkdfSync(
         'sha256',
         this.masterKey,
         Buffer.from(context),
         '',
         32
       );

       const iv = crypto.randomBytes(16);
       const cipher = crypto.createCipheriv(this.algorithm, key, iv);

       let encrypted = cipher.update(plaintext, 'utf8', 'hex');
       encrypted += cipher.final('hex');

       return {
         encrypted,
         iv: iv.toString('hex'),
         authTag: cipher.getAuthTag().toString('hex')
       };
     }

     decrypt(encrypted: string, iv: string, authTag: string, context: string): string {
       const key = crypto.hkdfSync(
         'sha256',
         this.masterKey,
         Buffer.from(context),
         '',
         32
       );

       const decipher = crypto.createDecipheriv(
         this.algorithm,
         key,
         Buffer.from(iv, 'hex')
       );
       decipher.setAuthTag(Buffer.from(authTag, 'hex'));

       let decrypted = decipher.update(encrypted, 'hex', 'utf8');
       decrypted += decipher.final('utf8');

       return decrypted;
     }
   }
   ```

### Secrets Manager Abstraction

```typescript
// src/services/secrets/secretsManager.interface.ts

export interface ISecretsManager {
  storeCredentials(fileSourceId: number, credentials: AWSCredentials): Promise<string>;
  retrieveCredentials(credentialId: string): Promise<AWSCredentials>;
  deleteCredentials(credentialId: string): Promise<void>;
  updateCredentials(credentialId: string, credentials: AWSCredentials): Promise<void>;
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}
```

```typescript
// src/services/secrets/secretsManagerFactory.ts

export class SecretsManagerFactory {
  static create(): ISecretsManager {
    const provider = process.env.SECRETS_PROVIDER || 'auto';

    switch (provider) {
      case 'aws':
        return new AWSSecretsManager();
      case 'gcp':
        return new GCPSecretsManager();
      case 'azure':
        return new AzureKeyVaultManager();
      case 'encrypted_db':
        return new EncryptedDBSecretsManager();
      case 'auto':
        return SecretsManagerFactory.detectAndCreate();
      default:
        throw new Error(`Unknown secrets provider: ${provider}`);
    }
  }

  private static detectAndCreate(): ISecretsManager {
    // Try to detect cloud environment
    if (process.env.AWS_REGION) {
      return new AWSSecretsManager();
    }
    if (process.env.GCP_PROJECT) {
      return new GCPSecretsManager();
    }
    if (process.env.AZURE_TENANT_ID) {
      return new AzureKeyVaultManager();
    }

    // Fallback to encrypted DB
    return new EncryptedDBSecretsManager();
  }
}
```

### Security Best Practices

1. **Credential Management:**
   - Never log credentials
   - Never return credentials in API responses
   - Mask credentials in error messages
   - Use connection pooling with credential caching (short TTL)

2. **IAM Permissions (Customer Side):**
   Minimal required permissions for customer IAM user:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:ListBucket"
         ],
         "Resource": "arn:aws:s3:::customer-bucket"
       },
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:GetObjectMetadata"
         ],
         "Resource": "arn:aws:s3:::customer-bucket/monitored-path/*"
       }
     ]
   }
   ```

3. **Network Security:**
   - Use HTTPS for all API communication
   - Implement rate limiting on API endpoints
   - Use VPC endpoints when accessing AWS services (if deployed on AWS)

4. **Audit Logging:**
   - Log all credential access (who, when, which file source)
   - Log all S3 API calls (source, bucket, success/failure)
   - Store logs in centralized logging system

5. **Access Control:**
   - Department-based isolation (users see only their department's sources)
   - Admin role for cross-department visibility
   - Audit trail for all configuration changes

---

## File Detection & Monitoring

### Polling Strategy

#### Schedule Parsing

Customers define schedules in HH:MM format (24-hour) with timezone:
- `09:00` in `EST` → Poll every day at 9 AM Eastern
- `14:30` in `UTC` → Poll every day at 2:30 PM UTC

The worker service runs a scheduler that:
1. Checks every minute for sources due for polling
2. Converts schedule + timezone to UTC for comparison
3. Executes poll if current time matches schedule (within 1-minute window)

#### Worker Service Implementation

```typescript
// src/worker/pollScheduler.ts

import cron from 'node-cron';
import { FileSourceRepository } from '../repositories/fileSource.repository';
import { S3Poller } from './s3Poller';
import moment from 'moment-timezone';

export class PollScheduler {
  private fileSourceRepo: FileSourceRepository;
  private s3Poller: S3Poller;

  constructor() {
    this.fileSourceRepo = new FileSourceRepository();
    this.s3Poller = new S3Poller();
  }

  start() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      await this.checkAndPoll();
    });

    console.log('Poll scheduler started');
  }

  private async checkAndPoll() {
    const now = moment.utc();

    // Get all enabled S3 sources
    const sources = await this.fileSourceRepo.findAll({
      type: 'S3',
      enabled: true,
      status: ['active', 'pending']
    });

    for (const source of sources) {
      if (this.isDueForPoll(source, now)) {
        console.log(`Polling file source: ${source.name} (ID: ${source.id})`);

        try {
          await this.s3Poller.poll(source);
          await this.fileSourceRepo.updateLastSync(source.id, now.toISOString());
        } catch (error) {
          console.error(`Failed to poll source ${source.id}:`, error);
          await this.fileSourceRepo.updateStatus(source.id, 'failed');
        }
      }
    }
  }

  private isDueForPoll(source: FileSource, now: moment.Moment): boolean {
    const [hours, minutes] = source.schedule.split(':').map(Number);

    // Convert schedule time to UTC
    const scheduledTime = moment.tz(source.timezone)
      .hours(hours)
      .minutes(minutes)
      .seconds(0)
      .utc();

    // Check if current time matches scheduled time (within 1-minute window)
    const currentHour = now.hours();
    const currentMinute = now.minutes();

    return (
      currentHour === scheduledTime.hours() &&
      currentMinute === scheduledTime.minutes()
    );
  }
}
```

### S3 Polling Implementation

```typescript
// src/worker/s3Poller.ts

import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { FileSource } from '../types/fileSource.types';
import { SecretsManagerFactory } from '../services/secrets/secretsManagerFactory';
import { InwardFileService } from '../services/inwardFile.service';
import { FileTrackingService } from '../services/fileTracking.service';
import { minimatch } from 'minimatch';

export class S3Poller {
  private secretsManager = SecretsManagerFactory.create();
  private inwardFileService = new InwardFileService();
  private fileTrackingService = new FileTrackingService();

  async poll(source: FileSource): Promise<void> {
    const startTime = Date.now();

    // 1. Retrieve credentials
    const credentials = await this.secretsManager.retrieveCredentials(
      source.s3Config!.credentialId
    );

    // 2. Initialize S3 client
    const s3Client = new S3Client({
      region: source.s3Config!.bucketRegion,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    // 3. List objects
    const objects = await this.listObjects(
      s3Client,
      source.s3Config!.bucketName,
      source.s3Config!.monitorPath
    );

    // 4. Filter by pattern and lastSync
    const newFiles = this.filterNewFiles(objects, source);

    // 5. Process detected files
    for (const file of newFiles) {
      await this.processDetectedFile(file, source);
    }

    // 6. Update source statistics
    const duration = Date.now() - startTime;
    await this.updateSourceStats(source.id, objects.length, newFiles.length, duration);

    console.log(
      `Poll complete for source ${source.id}: ` +
      `${objects.length} scanned, ${newFiles.length} new files detected, ` +
      `${duration}ms`
    );
  }

  private async listObjects(
    s3Client: S3Client,
    bucket: string,
    prefix: string
  ): Promise<S3Object[]> {
    const objects: S3Object[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      });

      const response: ListObjectsV2CommandOutput = await s3Client.send(command);

      if (response.Contents) {
        objects.push(...response.Contents.map(obj => ({
          key: obj.Key!,
          size: obj.Size!,
          lastModified: obj.LastModified!,
          etag: obj.ETag!
        })));
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  private filterNewFiles(objects: S3Object[], source: FileSource): S3Object[] {
    return objects.filter(obj => {
      // 1. Check if file matches pattern
      const fileName = obj.key.split('/').pop()!;
      if (!this.matchesPattern(fileName, source.fileNamePattern, source.matchRule)) {
        return false;
      }

      // 2. Check if file is newer than last sync
      if (source.lastSync) {
        const lastSyncTime = new Date(source.lastSync);
        if (obj.lastModified <= lastSyncTime) {
          return false;
        }
      }

      return true;
    });
  }

  private matchesPattern(fileName: string, pattern: string, matchRule: MatchRule): boolean {
    switch (matchRule) {
      case 'exact':
        return fileName === pattern;
      case 'partial':
        return fileName.includes(pattern.replace('*', ''));
      case 'regex':
        const regex = new RegExp(pattern);
        return regex.test(fileName);
      default:
        // Use glob matching (supports *, ?, etc.)
        return minimatch(fileName, pattern);
    }
  }

  private async processDetectedFile(file: S3Object, source: FileSource): Promise<void> {
    // 1. Create InwardFile record
    const inwardFile = await this.inwardFileService.create({
      fileSourceId: source.id,
      fileName: file.key.split('/').pop()!,
      filePath: file.key,
      fileSize: file.size,
      s3Metadata: {
        etag: file.etag,
        storageClass: 'STANDARD',
        lastModified: file.lastModified.toISOString()
      },
      detectedAt: new Date().toISOString(),
      s3LastModified: file.lastModified.toISOString()
    });

    // 2. Calculate SLA deadline
    if (source.slaThreshold) {
      const slaDeadline = new Date(file.lastModified);
      slaDeadline.setMinutes(slaDeadline.getMinutes() + source.slaThreshold);

      await this.inwardFileService.updateSLA(inwardFile.id, {
        slaDeadline: slaDeadline.toISOString(),
        slaStatus: this.calculateSLAStatus(slaDeadline)
      });
    }

    // 3. Update file tracking (if exists)
    await this.fileTrackingService.markAsArrived(source.id, inwardFile);
  }

  private calculateSLAStatus(deadline: Date): SLAStatus {
    const now = new Date();
    const timeRemaining = deadline.getTime() - now.getTime();
    const minutesRemaining = timeRemaining / 1000 / 60;

    if (now > deadline) {
      return 'breached';
    } else if (minutesRemaining <= 30) {
      return 'at_risk';
    } else {
      return 'on_time';
    }
  }

  private async updateSourceStats(
    sourceId: number,
    objectsScanned: number,
    objectsDetected: number,
    duration: number
  ): Promise<void> {
    // Update s3_config JSONB field
    // This would be implemented in FileSourceRepository
    await this.fileSourceRepo.updatePollMetadata(sourceId, {
      lastPollDuration: duration,
      lastObjectsScanned: objectsScanned,
      lastObjectsDetected: objectsDetected
    });
  }
}

interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}
```

### Deduplication Strategy

To avoid processing the same file multiple times:

1. **Unique Constraint:** `UNIQUE(file_source_id, file_path, s3_last_modified)` on `inward_files` table
2. **Check Before Insert:** Query database before creating InwardFile record
3. **Hash-Based (Optional):** Use file ETag as hash for additional verification

---

## SLA & Alert System

### Architecture Overview

The alert system is **decoupled** from the polling workers:
1. **Polling Workers** detect events and write to `notification_data` table
2. **Notification Manager Service** (separate process) reads events and delivers to channels
3. **Channels** are configurable per user via `notification_config` table

This design ensures:
- Polling workers remain fast and lightweight
- Notification delivery failures don't block polling
- Easy to add new notification channels without modifying pollers
- Common notification infrastructure for all file source types

### File Tracking & Event Creation

When polling workers detect files or identify missing files, they create notification events:

```typescript
// src/services/fileTracking.service.ts

export class FileTrackingService {
  private notificationService: NotificationService;

  async createExpectation(source: FileSource): Promise<void> {
    const now = new Date();
    const slaDeadline = new Date(now);
    slaDeadline.setMinutes(slaDeadline.getMinutes() + source.slaThreshold);

    await this.fileTrackingRepo.create({
      fileSourceId: source.id,
      expectedPattern: source.fileNamePattern,
      expectedAt: now.toISOString(),
      expectedSchedule: source.schedule,
      trackingStatus: 'pending',
      slaThreshold: source.slaThreshold,
      slaDeadline: slaDeadline.toISOString()
    });
  }

  async markAsArrived(sourceId: number, inwardFile: InwardFile): Promise<void> {
    // Find pending tracking record for this source
    const tracking = await this.fileTrackingRepo.findPending(sourceId);

    if (tracking) {
      await this.fileTrackingRepo.update(tracking.id, {
        actualFileId: inwardFile.id,
        arrivedAt: inwardFile.detectedAt,
        trackingStatus: 'arrived'
      });

      // Create notification event for file detection (if configured)
      await this.notificationService.createEvent({
        eventType: 'file_detected',
        eventSource: 's3_poller', // or sftp_poller, ftp_poller, etc.
        fileSourceId: sourceId,
        inwardFileId: inwardFile.id,
        fileTrackingId: tracking.id,
        targetDepartment: tracking.department,
        payload: {
          eventType: 'file_detected',
          fileSourceName: tracking.fileSourceName,
          fileName: inwardFile.fileName,
          fileSize: inwardFile.fileSize,
          detectedAt: inwardFile.detectedAt,
          department: tracking.department
        },
        priority: 5
      });
    }
  }

  async checkMissingFiles(): Promise<void> {
    // Find all pending tracking records past SLA deadline
    const overdue = await this.fileTrackingRepo.findOverdue();

    for (const tracking of overdue) {
      if (!tracking.alertTriggered) {
        // Create notification event for missing file
        await this.notificationService.createEvent({
          eventType: 'file_missing',
          eventSource: 'file_tracking',
          fileSourceId: tracking.fileSourceId,
          fileTrackingId: tracking.id,
          targetDepartment: tracking.department,
          payload: {
            eventType: 'file_missing',
            fileSourceName: tracking.fileSourceName,
            expectedPattern: tracking.expectedPattern,
            expectedAt: tracking.expectedAt,
            slaDeadline: tracking.slaDeadline,
            department: tracking.department,
            message: `Expected file matching "${tracking.expectedPattern}" has not arrived by SLA deadline`
          },
          priority: 1 // High priority
        });

        await this.fileTrackingRepo.update(tracking.id, {
          trackingStatus: 'missing',
          alertTriggered: true,
          alertTriggeredAt: new Date().toISOString()
        });
      }
    }
  }
}
```

### Notification Service (Worker Side)

Service used by polling workers to create notification events:

```typescript
// src/services/notification.service.ts

export interface CreateNotificationEventRequest {
  eventType: string;
  eventSource: string;
  fileSourceId?: number;
  inwardFileId?: number;
  fileTrackingId?: number;
  targetUserId?: number;
  targetDepartment?: string;
  payload: any;
  priority?: number;
}

export class NotificationService {
  private notificationRepo: NotificationRepository;

  async createEvent(request: CreateNotificationEventRequest): Promise<void> {
    await this.notificationRepo.create({
      eventType: request.eventType,
      eventSource: request.eventSource,
      fileSourceId: request.fileSourceId,
      inwardFileId: request.inwardFileId,
      fileTrackingId: request.fileTrackingId,
      targetUserId: request.targetUserId,
      targetDepartment: request.targetDepartment,
      payload: request.payload,
      processed: false,
      deliveryStatus: 'pending',
      priority: request.priority || 5,
      deliveryAttempts: 0,
      retryCount: 0,
      maxRetries: 3
    });
  }
}
```

### Notification Manager Service (Separate Service)

Independent service that processes notification events and delivers to channels:

```typescript
// notification-manager/src/notificationManager.ts

import cron from 'node-cron';
import { NotificationProcessor } from './processor';

export class NotificationManagerService {
  private processor: NotificationProcessor;

  constructor() {
    this.processor = new NotificationProcessor();
  }

  start() {
    // Run every 1-2 minutes to process pending notifications
    cron.schedule('*/2 * * * *', async () => {
      await this.processor.processQueue();
    });

    console.log('Notification Manager Service started');
  }
}
```

```typescript
// notification-manager/src/processor.ts

export class NotificationProcessor {
  private notificationRepo: NotificationRepository;
  private configRepo: NotificationConfigRepository;
  private channelHandlers: Map<string, IChannelHandler>;

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.configRepo = new NotificationConfigRepository();

    // Register channel handlers
    this.channelHandlers = new Map([
      ['email', new EmailHandler()],
      ['slack', new SlackHandler()],
      ['msteams', new MSTeamsHandler()],
      ['jira', new JiraHandler()],
      ['sms', new SMSHandler()],
      ['servicenow', new ServiceNowHandler()],
      ['webhook', new WebhookHandler()]
    ]);
  }

  async processQueue(): Promise<void> {
    // Fetch unprocessed events
    const events = await this.notificationRepo.findUnprocessed({
      limit: 100,
      orderBy: ['priority', 'created_at']
    });

    for (const event of events) {
      try {
        await this.processEvent(event);
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error);
        await this.handleProcessingError(event, error);
      }
    }
  }

  private async processEvent(event: NotificationEvent): Promise<void> {
    // Mark as processing
    await this.notificationRepo.update(event.id, {
      deliveryStatus: 'processing',
      lastDeliveryAttempt: new Date()
    });

    // Get notification preferences for target users
    const configs = await this.configRepo.find({
      eventType: event.eventType,
      department: event.targetDepartment,
      enabled: true
    });

    if (configs.length === 0) {
      // No one wants notifications for this event type
      await this.notificationRepo.update(event.id, {
        processed: true,
        processedAt: new Date(),
        deliveryStatus: 'delivered',
        deliveryDetails: { message: 'No subscribers for this event type' }
      });
      return;
    }

    // Deliver to all configured channels
    const deliveryResults = [];

    for (const config of configs) {
      for (const channelConfig of config.channels) {
        if (!channelConfig.enabled) continue;

        const handler = this.channelHandlers.get(channelConfig.channel);
        if (!handler) {
          console.warn(`No handler for channel: ${channelConfig.channel}`);
          continue;
        }

        try {
          await handler.send({
            event,
            channelConfig: channelConfig.config,
            user: config.user
          });

          deliveryResults.push({
            channel: channelConfig.channel,
            status: 'success',
            timestamp: new Date()
          });
        } catch (error) {
          deliveryResults.push({
            channel: channelConfig.channel,
            status: 'failed',
            error: error.message,
            timestamp: new Date()
          });
        }
      }
    }

    // Determine overall delivery status
    const allSuccess = deliveryResults.every(r => r.status === 'success');
    const allFailed = deliveryResults.every(r => r.status === 'failed');
    const deliveryStatus = allSuccess ? 'delivered' : allFailed ? 'failed' : 'partially_delivered';

    // Update notification record
    await this.notificationRepo.update(event.id, {
      processed: true,
      processedAt: new Date(),
      deliveryStatus,
      deliveryDetails: { results: deliveryResults },
      deliveryAttempts: event.deliveryAttempts + 1
    });
  }

  private async handleProcessingError(event: NotificationEvent, error: Error): Promise<void> {
    const retryCount = event.retryCount + 1;

    if (retryCount < event.maxRetries) {
      // Schedule retry (exponential backoff)
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, retryCount) * 5);

      await this.notificationRepo.update(event.id, {
        retryCount,
        nextRetryAt: nextRetry,
        deliveryStatus: 'failed',
        deliveryDetails: {
          lastError: error.message,
          willRetry: true,
          nextRetryAt: nextRetry
        }
      });
    } else {
      // Max retries exceeded, mark as failed
      await this.notificationRepo.update(event.id, {
        processed: true,
        processedAt: new Date(),
        deliveryStatus: 'failed',
        deliveryDetails: {
          lastError: error.message,
          retriesExhausted: true
        }
      });
    }
  }
}
```

### Channel Handler Interface

```typescript
// notification-manager/src/channels/interface.ts

export interface IChannelHandler {
  send(params: {
    event: NotificationEvent;
    channelConfig: any;
    user: User;
  }): Promise<void>;
}
```

### Example Channel Handler: Email

```typescript
// notification-manager/src/channels/emailHandler.ts

import nodemailer from 'nodemailer';

export class EmailHandler implements IChannelHandler {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async send(params: { event: NotificationEvent; channelConfig: any; user: User }): Promise<void> {
    const { event, channelConfig, user } = params;

    const subject = this.formatSubject(event);
    const html = this.formatBody(event);

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@omnitrackr.com',
      to: channelConfig.to || user.email,
      subject,
      html
    });
  }

  private formatSubject(event: NotificationEvent): string {
    switch (event.eventType) {
      case 'file_missing':
        return `[OmniTrackr] Alert: File Missing - ${event.payload.fileSourceName}`;
      case 'sla_breached':
        return `[OmniTrackr] Alert: SLA Breached - ${event.payload.fileName}`;
      case 'file_detected':
        return `[OmniTrackr] File Detected - ${event.payload.fileName}`;
      default:
        return `[OmniTrackr] Notification - ${event.eventType}`;
    }
  }

  private formatBody(event: NotificationEvent): string {
    // Format HTML email body based on event type
    return `
      <h2>${this.formatSubject(event)}</h2>
      <p><strong>Event:</strong> ${event.eventType}</p>
      <p><strong>Department:</strong> ${event.payload.department}</p>
      <p><strong>Time:</strong> ${new Date(event.createdAt).toLocaleString()}</p>
      <hr>
      <pre>${JSON.stringify(event.payload, null, 2)}</pre>
    `;
  }
}
```

### Summary: Worker vs Notification Manager Responsibilities

| Responsibility | Polling Worker Service | Notification Manager Service |
|----------------|------------------------|------------------------------|
| File Detection | ✅ Polls S3/SFTP/FTP/API | ❌ |
| Create InwardFile records | ✅ | ❌ |
| Track SLA status | ✅ | ❌ |
| Write notification events | ✅ Writes to notification_data | ❌ |
| Read notification events | ❌ | ✅ Reads from notification_data |
| Determine channels | ❌ | ✅ Uses notification_config |
| Send to MS Teams | ❌ | ✅ |
| Send to Slack | ❌ | ✅ |
| Send to Email | ❌ | ✅ |
| Send to Jira | ❌ | ✅ |
| Send to SMS | ❌ | ✅ |
| Send to ServiceNow | ❌ | ✅ |
| Retry failed deliveries | ❌ | ✅ |
| Track delivery status | ❌ | ✅ |

---

## Technology Stack

### Backend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 20.x LTS | JavaScript runtime |
| Framework | Express.js | ^4.18.0 | REST API framework |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM/Query Builder | Knex.js | ^3.0.0 | Database migrations & queries |
| AWS SDK | @aws-sdk/client-s3 | ^3.0.0 | S3 operations |
| AWS SDK | @aws-sdk/client-secrets-manager | ^3.0.0 | Secrets management (AWS) |
| Scheduler | node-cron | ^3.0.0 | Job scheduling |
| Date/Time | moment-timezone | ^0.5.0 | Timezone handling |
| Pattern Matching | minimatch | ^9.0.0 | Glob pattern matching |
| Validation | joi | ^17.0.0 | Request validation |
| Authentication | jsonwebtoken | ^9.0.0 | JWT tokens |
| Encryption | crypto (built-in) | - | Credential encryption |
| Logging | winston | ^3.0.0 | Structured logging |
| Process Manager | PM2 | ^5.0.0 | Production process management |

### Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React | 18.3.1 | UI framework |
| Build Tool | Vite | 5.4.19 | Build & dev server |
| UI Library | shadcn/ui | - | Component library |
| Styling | Tailwind CSS | 3.4.17 | CSS framework |
| State | React Context | - | State management |
| Forms | React Hook Form | 7.61.1 | Form handling |
| HTTP Client | fetch API | - | API calls |

### Infrastructure

| Component | Options | Purpose |
|-----------|---------|---------|
| Hosting | AWS, GCP, Azure, Own Server | Application hosting |
| Secrets | AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, Encrypted DB | Credential storage |
| Database | PostgreSQL (RDS, Cloud SQL, Azure Database, Self-hosted) | Data persistence |
| Monitoring | CloudWatch, Stackdriver, Azure Monitor, Prometheus | System monitoring |
| Logging | CloudWatch Logs, Stackdriver, Azure Logs, ELK Stack | Log aggregation |

### Development Tools

- TypeScript 5.x
- ESLint
- Prettier
- Jest (unit tests)
- Supertest (API tests)
- Docker (containerization)

---

## Implementation Phases

### Phase 1: Backend Foundation (Week 1-2)

**Goals:**
- Set up backend project structure
- Implement database schema and migrations
- Create secrets management abstraction layer
- Build core repositories and services

**Deliverables:**
1. ✅ PostgreSQL database with tables:
   - `file_sources` (updated with S3 support)
   - `s3_credentials`
   - `inward_files` (updated)
   - `file_tracking` (new)

2. ✅ Backend services:
   - `SecretsManagerFactory` and implementations
   - `FileSourceService` (CRUD operations)
   - `S3ConnectionService` (test connection, validate credentials)
   - `EncryptionService` (for encrypted DB fallback)

3. ✅ API endpoints:
   - `POST /api/v1/file-sources/s3`
   - `POST /api/v1/file-sources/s3/test-connection`
   - `GET /api/v1/file-sources`
   - `GET /api/v1/file-sources/:id`
   - `PUT /api/v1/file-sources/s3/:id`
   - `DELETE /api/v1/file-sources/:id`
   - `PATCH /api/v1/file-sources/:id/toggle`

**Testing:**
- Unit tests for services
- Integration tests for API endpoints
- Manual testing with real AWS credentials

### Phase 2: Frontend Integration (Week 2-3)

**Goals:**
- Update FileSources.tsx to support S3 configuration
- Create S3-specific form components
- Implement connection testing UI

**Deliverables:**
1. ✅ Updated `FileSources.tsx`:
   - Add S3 type to source type selector
   - Conditional rendering for S3 configuration form
   - Test connection button with loading state

2. ✅ New components:
   - `S3ConfigForm.tsx`: Form for S3 credentials and bucket details
   - `S3ConnectionTest.tsx`: Test connection dialog with results
   - `S3SourceDetails.tsx`: Display S3-specific details in detail panel

3. ✅ Form validation:
   - AWS Access Key ID format
   - S3 bucket name validation
   - Region selection dropdown
   - Path prefix validation

**Testing:**
- Component unit tests
- E2E tests for creating S3 source
- Manual testing with test AWS account

### Phase 3: Worker Service & Polling (Week 3-4)

**Goals:**
- Build file source polling worker service (supports S3, SFTP, FTP, API)
- Implement schedule-based polling
- Create file detection and tracking logic
- Implement notification event creation (NOT delivery)

**Deliverables:**
1. ✅ Worker service (`src/worker/`):
   - `PollScheduler.ts`: Main scheduler (cron-based)
   - `S3Poller.ts`: S3 polling implementation
   - `SFTPPoller.ts`: SFTP polling (placeholder for future)
   - `FTPPoller.ts`: FTP polling (placeholder for future)
   - `APIPoller.ts`: API polling (placeholder for future)

2. ✅ Services:
   - `InwardFileService`: Create and manage inward file records
   - `FileTrackingService`: Expectation and arrival tracking
   - `NotificationService`: Create notification events (write to notification_data table)

3. ✅ Database tables:
   - `notification_config`: User notification preferences
   - `notification_data`: Notification events queue

4. ✅ Deployment:
   - Separate process from API server
   - PM2 configuration for worker management
   - Environment variables for configuration

**Testing:**
- Unit tests for poller logic
- Integration tests with test S3 bucket
- Test notification event creation (verify DB records)
- Load testing (multiple sources, large buckets)

### Phase 4: Notification Manager Service (Week 4)

**Goals:**
- Build separate Notification Manager service
- Implement channel handlers (Email, Slack, MS Teams, etc.)
- Handle notification delivery and retries
- Create notification configuration UI

**Deliverables:**
1. ✅ Notification Manager Service (`notification-manager/`):
   - `NotificationProcessor.ts`: Process notification events from DB
   - `ChannelRouter.ts`: Route events to appropriate channels
   - Channel Handlers:
     - `EmailHandler.ts`: Email via SMTP
     - `SlackHandler.ts`: Slack webhooks
     - `MSTeamsHandler.ts`: MS Teams webhooks
     - `JiraHandler.ts`: Jira ticket creation
     - `SMSHandler.ts`: SMS via Twilio
     - `ServiceNowHandler.ts`: ServiceNow integration

2. ✅ Notification preferences API:
   - `GET /api/v1/notifications/config`: Get user preferences
   - `POST /api/v1/notifications/config`: Create preference
   - `PUT /api/v1/notifications/config/:id`: Update preference
   - `DELETE /api/v1/notifications/config/:id`: Delete preference

3. ✅ Updated `InwardFiles.tsx`:
   - Display S3 file metadata
   - SLA status indicators
   - Filter by file source and SLA status

4. ✅ Notification preferences UI:
   - Configure channels per event type
   - Enable/disable notifications
   - Test notification delivery

**Testing:**
- Test each channel handler independently
- Test notification routing logic
- Test retry mechanism
- Integration tests: worker creates event → notification manager delivers
- Test UI for configuring preferences

### Phase 5: Production Readiness (Week 5)

**Goals:**
- Security hardening
- Performance optimization
- Monitoring and logging
- Documentation

**Deliverables:**
1. ✅ Security:
   - Security audit of credential handling
   - Rate limiting on API endpoints
   - Input sanitization
   - HTTPS enforcement

2. ✅ Performance:
   - Database indexing optimization
   - Connection pooling
   - Caching strategies (if applicable)
   - Batch operations for large file lists

3. ✅ Monitoring:
   - Structured logging with Winston
   - Error tracking (Sentry or similar)
   - Performance metrics
   - Health check endpoints

4. ✅ Documentation:
   - Customer setup guide (IAM user creation)
   - API documentation
   - Deployment guide
   - Troubleshooting guide

**Testing:**
- Full regression testing
- Security testing
- Performance testing
- User acceptance testing

---

## Deployment Considerations

### Multi-Cloud Deployment Strategy

#### 1. AWS Deployment

```yaml
# Architecture
- EC2 or ECS for backend API and worker
- RDS PostgreSQL for database
- AWS Secrets Manager for credentials
- CloudWatch for monitoring and logging
- ALB for load balancing

# Environment Variables
SECRETS_PROVIDER=aws
AWS_REGION=us-east-1
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=<username>
DB_PASSWORD=<password>
```

#### 2. Google Cloud Deployment

```yaml
# Architecture
- Compute Engine or Cloud Run for backend
- Cloud SQL (PostgreSQL) for database
- Secret Manager for credentials
- Cloud Logging for logs
- Cloud Load Balancing

# Environment Variables
SECRETS_PROVIDER=gcp
GCP_PROJECT=<project-id>
DB_HOST=<cloud-sql-ip>
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=<username>
DB_PASSWORD=<password>
```

#### 3. Azure Deployment

```yaml
# Architecture
- Azure App Service or VMs for backend
- Azure Database for PostgreSQL
- Azure Key Vault for credentials
- Azure Monitor for monitoring
- Azure Application Gateway

# Environment Variables
SECRETS_PROVIDER=azure
AZURE_TENANT_ID=<tenant-id>
AZURE_KEY_VAULT_URL=<vault-url>
DB_HOST=<azure-db-host>
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=<username>
DB_PASSWORD=<password>
```

#### 4. Self-Hosted Deployment

```yaml
# Architecture
- Docker containers for API and worker
- PostgreSQL database (Docker or installed)
- Encrypted database for credentials
- Custom monitoring stack (Prometheus + Grafana)
- Nginx for reverse proxy

# Environment Variables
SECRETS_PROVIDER=encrypted_db
ENCRYPTION_MASTER_KEY=<64-char-hex-key>
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=<username>
DB_PASSWORD=<password>
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY dist/ ./dist/
COPY node_modules/ ./node_modules/

# Environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: omnitrackr
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    command: node dist/api.js
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: omnitrackr
      DB_USER: admin
      DB_PASSWORD: ${DB_PASSWORD}
      SECRETS_PROVIDER: encrypted_db
      ENCRYPTION_MASTER_KEY: ${ENCRYPTION_MASTER_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  worker:
    build: .
    command: node dist/worker.js
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: omnitrackr
      DB_USER: admin
      DB_PASSWORD: ${DB_PASSWORD}
      SECRETS_PROVIDER: encrypted_db
      ENCRYPTION_MASTER_KEY: ${ENCRYPTION_MASTER_KEY}
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'omnitrackr-api',
      script: './dist/api.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'omnitrackr-worker',
      script: './dist/worker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'omnitrackr-notification-manager',
      script: './notification-manager/dist/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### Environment Variables Reference

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omnitrackr
DB_USER=admin
DB_PASSWORD=<secure-password>
DB_POOL_MIN=2
DB_POOL_MAX=10

# Secrets Management
SECRETS_PROVIDER=auto  # auto, aws, gcp, azure, encrypted_db
ENCRYPTION_MASTER_KEY=<64-char-hex-key>  # Required if using encrypted_db

# AWS (if applicable)
AWS_REGION=us-east-1
AWS_SECRETS_MANAGER_PREFIX=omnitrackr/

# GCP (if applicable)
GCP_PROJECT=<project-id>

# Azure (if applicable)
AZURE_TENANT_ID=<tenant-id>
AZURE_KEY_VAULT_URL=<vault-url>

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
JWT_SECRET=<secure-random-string>
JWT_EXPIRY=24h
```

---

## Testing Strategy

### Unit Tests

**Services:**
- `S3ConnectionService.test.ts`: Test credential validation, bucket access
- `FileSourceService.test.ts`: Test CRUD operations
- `S3Poller.test.ts`: Test polling logic, pattern matching
- `EncryptionService.test.ts`: Test encryption/decryption

**Example:**
```typescript
// tests/services/s3Connection.service.test.ts

import { S3ConnectionService } from '../../src/services/s3Connection.service';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Mock = mockClient(S3Client);

describe('S3ConnectionService', () => {
  let service: S3ConnectionService;

  beforeEach(() => {
    service = new S3ConnectionService();
    s3Mock.reset();
  });

  describe('testConnection', () => {
    it('should return success when credentials are valid', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: 'test.csv', Size: 1024, LastModified: new Date() }
        ]
      });

      const result = await service.testConnection({
        awsAccessKeyId: 'AKIATEST',
        awsSecretAccessKey: 'secret',
        bucketName: 'test-bucket',
        bucketRegion: 'us-east-1',
        monitorPath: '/test/'
      });

      expect(result.success).toBe(true);
      expect(result.canAuthenticate).toBe(true);
      expect(result.canAccessBucket).toBe(true);
      expect(result.canListObjects).toBe(true);
      expect(result.sampleFiles).toHaveLength(1);
    });

    it('should return error when credentials are invalid', async () => {
      s3Mock.on(ListObjectsV2Command).rejects({
        name: 'InvalidAccessKeyId',
        message: 'The AWS Access Key Id you provided does not exist'
      });

      const result = await service.testConnection({
        awsAccessKeyId: 'INVALID',
        awsSecretAccessKey: 'invalid',
        bucketName: 'test-bucket',
        bucketRegion: 'us-east-1',
        monitorPath: '/test/'
      });

      expect(result.success).toBe(false);
      expect(result.canAuthenticate).toBe(false);
      expect(result.errorMessage).toContain('Access Key');
    });
  });
});
```

### Integration Tests

**API Endpoints:**
- Test full request/response cycle
- Test database persistence
- Test error handling

**Example:**
```typescript
// tests/api/fileSources.test.ts

import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/database';

describe('POST /api/v1/file-sources/s3', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should create S3 file source with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/file-sources/s3')
      .set('Authorization', 'Bearer <test-token>')
      .send({
        name: 'Test S3 Source',
        department: 'Finance',
        awsAccessKeyId: process.env.TEST_AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.TEST_AWS_SECRET_ACCESS_KEY,
        bucketName: process.env.TEST_S3_BUCKET,
        bucketRegion: 'us-east-1',
        monitorPath: '/test/',
        fileNamePattern: '*.csv',
        matchRule: 'partial',
        schedule: '09:00',
        timezone: 'UTC',
        slaThreshold: 120,
        direction: 'inward'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.type).toBe('S3');
  });
});
```

### E2E Tests

**User Flows:**
1. Admin logs in
2. Creates S3 file source
3. Tests connection
4. Enables source
5. Worker polls bucket
6. Files appear in InwardFiles page
7. SLA alerts trigger

### Performance Tests

**Load Testing:**
- Simulate 100 concurrent file sources
- Test polling performance with large buckets (10,000+ objects)
- Test database query performance under load

**Tools:**
- Apache JMeter or k6 for load testing
- PostgreSQL EXPLAIN ANALYZE for query optimization

---

## Customer Onboarding Guide

### Prerequisites
- Customer has an AWS account
- Customer has S3 bucket with files to monitor
- Customer has permissions to create IAM users

### Step-by-Step Setup

#### Step 1: Create IAM User

1. Log into AWS Console
2. Navigate to IAM → Users → Create User
3. User name: `omnitrackr-file-monitor`
4. Access type: Programmatic access (Access key ID & Secret)
5. Create user and save credentials (shown only once!)

#### Step 2: Create IAM Policy

1. Navigate to IAM → Policies → Create Policy
2. Use JSON editor and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    },
    {
      "Sid": "GetObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectMetadata"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/YOUR-PATH-PREFIX/*"
    }
  ]
}
```

3. Name: `OmniTrackrS3ReadOnly`
4. Create policy

#### Step 3: Attach Policy to User

1. Navigate to IAM → Users → omnitrackr-file-monitor
2. Add permissions → Attach policies directly
3. Search for `OmniTrackrS3ReadOnly`
4. Attach policy

#### Step 4: Configure in OmniTrackr

1. Log into OmniTrackr platform
2. Navigate to File Sources → Add Source
3. Select type: AWS S3
4. Fill in form:
   - **Name:** Descriptive name (e.g., "Production Daily Reports")
   - **AWS Access Key ID:** From Step 1
   - **AWS Secret Access Key:** From Step 1
   - **Bucket Name:** Your S3 bucket name
   - **Region:** Your bucket region (e.g., us-east-1)
   - **Monitor Path:** Path prefix (e.g., /daily-reports/)
   - **File Pattern:** Pattern to match (e.g., report_*.csv)
   - **Schedule:** When to check (e.g., 09:00)
   - **Timezone:** Your timezone (e.g., EST)
   - **SLA Threshold:** Alert threshold in minutes (e.g., 120)
5. Click "Test Connection" to verify setup
6. If successful, click "Create Source"

#### Step 5: Verify Monitoring

1. Navigate to Inward Files page
2. Wait for scheduled poll time
3. Verify files appear in the list
4. Check SLA status

### Troubleshooting

**"Access Denied" Error:**
- Verify IAM policy Resource ARNs match your bucket name
- Check bucket name spelling
- Ensure IAM user has policy attached

**"No files detected":**
- Verify files exist in the specified path
- Check file name pattern matches actual file names
- Confirm schedule time has passed (in correct timezone)

**"Invalid credentials":**
- Verify Access Key ID and Secret are correct
- Check if credentials were copied completely (no spaces)
- Ensure IAM user is active (not deleted)

---

## Next Steps & Future Enhancements

### Future Enhancements (Post-MVP)

1. **IAM Role Support:**
   - Add AssumeRole cross-account access option
   - Implement External ID management
   - Support for both methods (access keys + roles)

2. **Real-time Monitoring:**
   - S3 Event Notifications via EventBridge
   - Webhook receiver for S3 events
   - Near-instant file detection

3. **File Processing:**
   - Download and store files in OmniTrackr storage
   - File content validation
   - Automatic file parsing (CSV, JSON, XML)

4. **Advanced Patterns:**
   - Multiple patterns per source
   - Exclusion patterns
   - Date-based pattern matching (e.g., {YYYY}-{MM}-{DD})

5. **Multi-Region Support:**
   - Monitor multiple buckets per source
   - Cross-region replication tracking

6. **Credential Rotation:**
   - Automatic detection of expired credentials
   - Notification to refresh credentials
   - Support for AWS STS temporary credentials

7. **Analytics & Reporting:**
   - File arrival trends
   - SLA compliance reports
   - Cost analysis (API call costs)

8. **Advanced Alerting:**
   - Slack integration
   - Microsoft Teams integration
   - Custom webhook endpoints
   - SMS notifications (Twilio)

### Conclusion

This design provides a robust, cloud-agnostic solution for AWS S3 file source monitoring in OmniTrackr. The polling-based approach minimizes customer setup complexity while maintaining flexibility to deploy across different cloud providers.

The architecture separates concerns between API server and worker service, allowing independent scaling. The secrets management abstraction enables seamless deployment across AWS, GCP, Azure, or self-hosted infrastructure.

Implementation will be phased over 5 weeks, with each phase delivering testable, production-ready functionality. The final system will provide customers with reliable file monitoring, SLA tracking, and alerting capabilities.

---

**Document Version:** 1.0
**Last Updated:** October 22, 2025
**Review Date:** November 22, 2025
