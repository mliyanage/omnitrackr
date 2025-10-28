# File Sources Schema Design - Extensible Multi-Source Support

**Version:** 2.0
**Date:** October 26, 2025
**Purpose:** Design an extensible schema to support all file source types

---

## Table of Contents

1. [Overview](#overview)
2. [File Source Types Comparison](#file-source-types-comparison)
3. [Recommended Schema Design](#recommended-schema-design)
4. [Configuration Structures by Type](#configuration-structures-by-type)
5. [Credential Storage Strategy](#credential-storage-strategy)
6. [Migration Path](#migration-path)

---

## Overview

### Supported File Source Types

OmniTrackr will support the following file source types:

1. **AWS S3** - Amazon S3 bucket monitoring
2. **Azure Blob Storage** - Microsoft Azure blob storage
3. **Google Cloud Storage (GCS)** - Google Cloud Storage buckets
4. **SFTP** - SSH File Transfer Protocol servers
5. **FTP/FTPS** - File Transfer Protocol (with SSL/TLS)
6. **SharePoint Online** - Microsoft SharePoint document libraries
7. **REST API** - Custom REST API endpoints
8. **Database** - Direct database queries (future)
9. **Network File Share (SMB/CIFS)** - Network file shares (future)

### Design Goals

✅ **Extensible** - Easy to add new file source types
✅ **Flexible** - Each source type has different configuration needs
✅ **Secure** - Credentials stored separately and encrypted
✅ **Backward Compatible** - Can evolve schema without breaking changes
✅ **Type-Safe** - Clear structure for each source type

---

## File Source Types Comparison

### Configuration Requirements by Source Type

| Source Type | Key Configuration Parameters | Authentication Methods | Special Features |
|-------------|----------------------------|----------------------|------------------|
| **AWS S3** | - Bucket name<br>- Region<br>- Prefix/path | - IAM Access Keys<br>- IAM Role (future) | - Metadata-only<br>- No downloads |
| **Azure Blob** | - Storage account<br>- Container<br>- Prefix/path | - SAS Token<br>- Connection String<br>- Managed Identity | - Hierarchical namespace<br>- Access tiers |
| **GCS** | - Bucket name<br>- Project ID<br>- Prefix/path | - Service Account Key (JSON)<br>- Workload Identity | - Uniform/fine-grained access<br>- Versioning |
| **SFTP** | - Host<br>- Port (22)<br>- Remote path | - Password<br>- SSH Private Key<br>- Host-based | - Secure tunneling<br>- Key fingerprinting |
| **FTP/FTPS** | - Host<br>- Port (21/990)<br>- Remote path<br>- SSL mode | - Anonymous<br>- Basic Auth (username/password)<br>- Client certificates | - Explicit/Implicit SSL<br>- Active/Passive mode |
| **SharePoint** | - Site URL<br>- Library name<br>- Folder path | - Azure AD App Registration<br>- Certificate Auth<br>- OAuth 2.0 | - Modern auth only<br>- Tenant-scoped |
| **REST API** | - Endpoint URL<br>- HTTP method<br>- Headers | - API Key<br>- Bearer Token<br>- OAuth 2.0<br>- Basic Auth | - Custom response parsing<br>- Pagination |

---

## Recommended Schema Design

### Option 1: Single JSONB Column (Recommended ✅)

**Approach:** Use a single `connection_config` JSONB column that stores all configuration, with structure varying by `type`.

**Advantages:**
- ✅ Maximum flexibility - each source type can have unique fields
- ✅ Easy to add new source types without schema changes
- ✅ Simple schema maintenance
- ✅ Supports nested configurations
- ✅ Can query JSONB fields with PostgreSQL JSONB operators

**Disadvantages:**
- ❌ Less type safety at database level
- ❌ Need application-level validation
- ❌ Harder to write complex queries across types

### Option 2: Multiple Type-Specific JSONB Columns

**Approach:** Use separate columns like `s3_config`, `sftp_config`, `azure_config`, etc.

**Advantages:**
- ✅ Clearer what fields exist for each type
- ✅ Can enforce NULL constraints per type

**Disadvantages:**
- ❌ Schema changes needed for every new source type
- ❌ Many NULL columns for each row
- ❌ Harder to maintain

### Option 3: Separate Tables per Source Type

**Approach:** Create `file_sources_s3`, `file_sources_sftp`, etc.

**Advantages:**
- ✅ Maximum type safety
- ✅ Can use proper foreign keys

**Disadvantages:**
- ❌ Complex queries across source types
- ❌ Code duplication
- ❌ Harder to add shared features
- ❌ Not recommended for this use case

---

## Recommended Schema Design

### Updated `file_sources` Table

```sql
CREATE TABLE file_sources (
  id SERIAL PRIMARY KEY,

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'S3',
    'AZURE_BLOB',
    'GCS',
    'SFTP',
    'FTP',
    'FTPS',
    'SHAREPOINT',
    'REST_API',
    'DATABASE',
    'FILE_SHARE'
  )),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'active',
    'failed',
    'pending',
    'disabled'
  )),
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- UNIFIED CONNECTION CONFIGURATION (JSONB)
  -- Structure varies by type - see below for schemas
  connection_config JSONB NOT NULL,

  -- File Pattern Matching (common to all types)
  file_name_pattern VARCHAR(255),
  match_rule VARCHAR(50) CHECK (match_rule IN ('partial', 'exact', 'regex')),

  -- Schedule Configuration (common to all types)
  schedule VARCHAR(10), -- Format: HH:MM (24-hour)
  timezone VARCHAR(50) DEFAULT 'UTC',
  poll_frequency_minutes INTEGER, -- Alternative: polling interval in minutes

  -- SLA Configuration (common to all types)
  sla_threshold INTEGER, -- Minutes

  -- Metadata (common to all types)
  direction VARCHAR(50) DEFAULT 'inward' CHECK (direction IN (
    'inward',
    'outward',
    'bidirectional'
  )),
  department VARCHAR(100),

  -- Sync Statistics (common to all types)
  last_sync TIMESTAMP,
  last_sync_status VARCHAR(50) CHECK (last_sync_status IN (
    'success',
    'failed',
    'in_progress'
  )),
  last_sync_error TEXT,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  files_processed INTEGER DEFAULT 0,

  -- Polling metadata
  last_poll_duration_ms INTEGER,
  last_objects_scanned INTEGER,
  last_objects_detected INTEGER,

  -- Audit Fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),

  -- Indexes
  CONSTRAINT unique_name_per_department UNIQUE(name, department)
);

-- Indexes
CREATE INDEX idx_file_sources_type ON file_sources(type);
CREATE INDEX idx_file_sources_status ON file_sources(status);
CREATE INDEX idx_file_sources_department ON file_sources(department);
CREATE INDEX idx_file_sources_enabled ON file_sources(enabled);
CREATE INDEX idx_file_sources_schedule ON file_sources(schedule);
CREATE INDEX idx_file_sources_last_sync ON file_sources(last_sync);

-- JSONB indexes for common queries
CREATE INDEX idx_file_sources_connection_config ON file_sources USING GIN (connection_config);
```

---

### Updated `credentials` Table (Renamed from `s3_credentials`)

Store encrypted credentials for ALL source types in a unified table:

```sql
CREATE TABLE file_source_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  file_source_id INTEGER REFERENCES file_sources(id) ON DELETE CASCADE,

  -- Credential type matches file source type
  credential_type VARCHAR(50) NOT NULL CHECK (credential_type IN (
    'S3',
    'AZURE_BLOB',
    'GCS',
    'SFTP',
    'FTP',
    'FTPS',
    'SHAREPOINT',
    'REST_API',
    'DATABASE',
    'FILE_SHARE'
  )),

  -- Storage location
  storage_method VARCHAR(50) NOT NULL CHECK (storage_method IN (
    'secrets_manager',  -- Cloud-native (AWS/GCP/Azure)
    'encrypted_db'      -- Encrypted in this table
  )),

  -- Cloud secrets manager reference (if storage_method = 'secrets_manager')
  secret_id VARCHAR(500), -- ARN or secret name
  secret_version VARCHAR(100),

  -- Encrypted credentials (if storage_method = 'encrypted_db')
  -- JSONB structure varies by credential_type - see below
  encrypted_credentials JSONB,

  -- Encryption metadata
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  encryption_key_version INTEGER DEFAULT 1,
  encryption_iv TEXT,
  encryption_auth_tag TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  last_rotation_at TIMESTAMP,

  CONSTRAINT unique_file_source_credential UNIQUE(file_source_id)
);

CREATE INDEX idx_credentials_file_source ON file_source_credentials(file_source_id);
CREATE INDEX idx_credentials_type ON file_source_credentials(credential_type);
CREATE INDEX idx_credentials_storage_method ON file_source_credentials(storage_method);
```

---

## Configuration Structures by Type

### 1. AWS S3

**`connection_config` JSONB:**
```json
{
  "sourceType": "S3",
  "bucketName": "customer-data-bucket",
  "bucketRegion": "us-east-1",
  "monitorPath": "/inbound/daily/",
  "credentialId": "uuid-reference",

  "advancedOptions": {
    "usePathStyle": false,
    "endpoint": null,
    "forcePathStyle": false
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

**Credential Structure (in `encrypted_credentials` JSONB):**
```json
{
  "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "sessionToken": null  // Optional for temporary credentials
}
```

---

### 2. Azure Blob Storage

**`connection_config` JSONB:**
```json
{
  "sourceType": "AZURE_BLOB",
  "storageAccountName": "mystorageaccount",
  "containerName": "inbound-files",
  "blobPrefix": "daily/",
  "credentialId": "uuid-reference",

  "advancedOptions": {
    "endpoint": null,  // Custom endpoint URL
    "apiVersion": "2023-11-03"
  },

  "lastValidation": {
    "timestamp": "2025-10-26T10:00:00Z",
    "canAuthenticate": true,
    "canAccessContainer": true,
    "canListBlobs": true,
    "errorMessage": null
  }
}
```

**Credential Structure:**
```json
{
  "authMethod": "sas_token",  // or "connection_string", "account_key"
  "sasToken": "sv=2023-11-03&ss=b&srt=sco&sp=rl&se=2025-12-31T23:59:59Z&st=2025-01-01T00:00:00Z&spr=https&sig=...",
  "connectionString": null,  // Alternative: full connection string
  "accountKey": null  // Alternative: account key
}
```

---

### 3. Google Cloud Storage (GCS)

**`connection_config` JSONB:**
```json
{
  "sourceType": "GCS",
  "projectId": "my-gcp-project",
  "bucketName": "customer-inbound-files",
  "objectPrefix": "daily/",
  "credentialId": "uuid-reference",

  "advancedOptions": {
    "endpoint": null,
    "uniformBucketLevelAccess": true
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

**Credential Structure:**
```json
{
  "authMethod": "service_account",
  "serviceAccountKeyJson": "{\"type\": \"service_account\", \"project_id\": \"...\", \"private_key_id\": \"...\", \"private_key\": \"...\", \"client_email\": \"...\", \"client_id\": \"...\"}",
  "workloadIdentityProvider": null  // Future: for workload identity federation
}
```

---

### 4. SFTP

**`connection_config` JSONB:**
```json
{
  "sourceType": "SFTP",
  "host": "sftp.example.com",
  "port": 22,
  "remotePath": "/inbound/files/",
  "credentialId": "uuid-reference",

  "advancedOptions": {
    "hostKeyAlgorithm": "ssh-rsa",
    "hostKeyFingerprint": "SHA256:abc123...",
    "strictHostKeyChecking": true,
    "timeout": 30000,  // milliseconds
    "keepaliveInterval": 10000,
    "retryAttempts": 3
  },

  "lastValidation": {
    "timestamp": "2025-10-26T10:00:00Z",
    "canConnect": true,
    "canAuthenticate": true,
    "canAccessPath": true,
    "canListFiles": true,
    "errorMessage": null
  }
}
```

**Credential Structure:**
```json
{
  "authMethod": "private_key",  // or "password", "keyboard_interactive"
  "username": "fileuser",
  "password": null,  // For password auth
  "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",  // For key-based auth
  "privateKeyPassphrase": "optional-passphrase"  // If private key is encrypted
}
```

---

### 5. FTP/FTPS

**`connection_config` JSONB:**
```json
{
  "sourceType": "FTPS",  // or "FTP"
  "host": "ftp.example.com",
  "port": 21,  // 21 for explicit, 990 for implicit
  "remotePath": "/inbound/files/",
  "credentialId": "uuid-reference",

  "advancedOptions": {
    "secureMode": "explicit",  // "none" (FTP), "explicit" (FTPES), "implicit" (FTPS)
    "connectionMode": "passive",  // "active" or "passive"
    "tlsVersion": "TLSv1.2",
    "verifyCertificate": true,
    "timeout": 30000,
    "encoding": "utf8"
  },

  "lastValidation": {
    "timestamp": "2025-10-26T10:00:00Z",
    "canConnect": true,
    "canAuthenticate": true,
    "canAccessPath": true,
    "canListFiles": true,
    "sslValid": true,
    "errorMessage": null
  }
}
```

**Credential Structure:**
```json
{
  "authMethod": "basic",  // or "anonymous"
  "username": "ftpuser",
  "password": "secure-password",
  "clientCertificate": null,  // Optional: for client cert auth
  "clientCertificateKey": null
}
```

---

### 6. SharePoint Online

**`connection_config` JSONB:**
```json
{
  "sourceType": "SHAREPOINT",
  "tenantId": "12345678-1234-1234-1234-123456789abc",
  "siteUrl": "https://contoso.sharepoint.com/sites/ProjectFiles",
  "libraryName": "Documents",
  "folderPath": "/Shared Documents/Inbound/",
  "credentialId": "uuid-reference",

  "advancedOptions": {
    "apiVersion": "v1.0",  // Microsoft Graph API version
    "recursiveSearch": true,
    "downloadMetadataOnly": true
  },

  "lastValidation": {
    "timestamp": "2025-10-26T10:00:00Z",
    "canAuthenticate": true,
    "canAccessSite": true,
    "canAccessLibrary": true,
    "canListFiles": true,
    "errorMessage": null
  }
}
```

**Credential Structure:**
```json
{
  "authMethod": "certificate",  // or "client_secret"
  "clientId": "app-client-id",
  "clientSecret": null,  // For client secret auth
  "certificatePem": "-----BEGIN CERTIFICATE-----\n...",  // For certificate auth
  "privateKeyPem": "-----BEGIN PRIVATE KEY-----\n...",  // For certificate auth
  "scope": "https://contoso.sharepoint.com/.default"
}
```

---

### 7. REST API

**`connection_config` JSONB:**
```json
{
  "sourceType": "REST_API",
  "endpoint": "https://api.example.com/v1/files",
  "httpMethod": "GET",
  "credentialId": "uuid-reference",

  "requestConfig": {
    "headers": {
      "Accept": "application/json",
      "User-Agent": "OmniTrackr/1.0"
    },
    "queryParams": {
      "status": "new",
      "limit": "100"
    },
    "timeout": 30000
  },

  "responseConfig": {
    "dataPath": "$.data.files",  // JSONPath to file list
    "fileNameField": "name",
    "fileSizeField": "size",
    "fileTimestampField": "created_at",
    "paginationType": "offset",  // "offset", "cursor", "page", "none"
    "paginationConfig": {
      "offsetParam": "offset",
      "limitParam": "limit",
      "totalField": "$.total"
    }
  },

  "lastValidation": {
    "timestamp": "2025-10-26T10:00:00Z",
    "canConnect": true,
    "canAuthenticate": true,
    "responseValid": true,
    "errorMessage": null
  }
}
```

**Credential Structure:**
```json
{
  "authMethod": "bearer_token",  // or "api_key", "basic", "oauth2"
  "apiKey": null,  // For API key auth
  "apiKeyHeader": "X-API-Key",  // Header name for API key
  "bearerToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // For bearer token
  "basicAuthUsername": null,  // For basic auth
  "basicAuthPassword": null,  // For basic auth
  "oauth2": {  // For OAuth 2.0
    "tokenEndpoint": "https://api.example.com/oauth/token",
    "clientId": "client-id",
    "clientSecret": "client-secret",
    "scope": "files.read",
    "grantType": "client_credentials"
  }
}
```

---

## Credential Storage Strategy

### Encryption Service Interface

The encryption service must support all credential types:

```typescript
interface EncryptionService {
  // Encrypt credentials for storage
  encrypt(credentials: any, context: CredentialContext): EncryptedData;

  // Decrypt credentials for use
  decrypt(encryptedData: EncryptedData, context: CredentialContext): any;

  // Rotate encryption keys
  rotateKey(oldVersion: number, newVersion: number): Promise<void>;
}

interface CredentialContext {
  fileSourceId: number;
  credentialType: string;
  department: string;
}

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: number;
}
```

### Storage Methods

#### 1. Cloud-Native Secrets Manager (Primary)

**AWS Secrets Manager:**
```typescript
// Store credentials
const secretName = `omnitrackr/${department}/file-source/${fileSourceId}`;
await secretsManager.createSecret({
  Name: secretName,
  SecretString: JSON.stringify(credentials),
  Tags: [
    { Key: 'FileSourceId', Value: String(fileSourceId) },
    { Key: 'Type', Value: credentialType },
    { Key: 'Department', Value: department }
  ]
});

// Store reference in database
await db.insert({
  file_source_id: fileSourceId,
  credential_type: credentialType,
  storage_method: 'secrets_manager',
  secret_id: secretName,
  encrypted_credentials: null
});
```

**GCP Secret Manager:**
```typescript
const secretName = `projects/${projectId}/secrets/omnitrackr-${fileSourceId}`;
// Similar pattern
```

**Azure Key Vault:**
```typescript
const secretName = `omnitrackr-${department}-${fileSourceId}`;
// Similar pattern
```

#### 2. Encrypted Database Storage (Fallback)

```typescript
// Encrypt credentials
const encryptedData = encryptionService.encrypt(credentials, {
  fileSourceId,
  credentialType,
  department
});

// Store in database
await db.insert({
  file_source_id: fileSourceId,
  credential_type: credentialType,
  storage_method: 'encrypted_db',
  secret_id: null,
  encrypted_credentials: encryptedData.encrypted,
  encryption_iv: encryptedData.iv,
  encryption_auth_tag: encryptedData.authTag,
  encryption_algorithm: encryptedData.algorithm,
  encryption_key_version: encryptedData.keyVersion
});
```

---

## Migration Path

### From Current Design to New Design

**Step 1: Add new columns to `file_sources`**
```sql
ALTER TABLE file_sources
ADD COLUMN connection_config JSONB,
ADD COLUMN last_sync_status VARCHAR(50),
ADD COLUMN last_sync_error TEXT,
ADD COLUMN last_poll_duration_ms INTEGER,
ADD COLUMN last_objects_scanned INTEGER,
ADD COLUMN last_objects_detected INTEGER;
```

**Step 2: Migrate existing `s3_config` data**
```sql
UPDATE file_sources
SET connection_config = s3_config
WHERE type = 'S3' AND s3_config IS NOT NULL;
```

**Step 3: Create new credentials table**
```sql
CREATE TABLE file_source_credentials (
  -- Schema as shown above
);
```

**Step 4: Migrate credentials from `s3_credentials`**
```sql
INSERT INTO file_source_credentials (
  file_source_id,
  credential_type,
  storage_method,
  encrypted_credentials,
  -- ... other fields
)
SELECT
  file_source_id,
  'S3',
  'encrypted_db',
  jsonb_build_object(
    'accessKeyId', access_key_id_encrypted,
    'secretAccessKey', secret_access_key_encrypted
  ),
  -- ... other fields
FROM s3_credentials;
```

**Step 5: Drop old columns (after validation)**
```sql
ALTER TABLE file_sources DROP COLUMN s3_config;
DROP TABLE s3_credentials;
```

---

## TypeScript Type Definitions

### Shared Types

```typescript
// packages/shared/src/types/fileSource.types.ts

export type FileSourceType =
  | 'S3'
  | 'AZURE_BLOB'
  | 'GCS'
  | 'SFTP'
  | 'FTP'
  | 'FTPS'
  | 'SHAREPOINT'
  | 'REST_API'
  | 'DATABASE'
  | 'FILE_SHARE';

export type FileSourceStatus = 'active' | 'failed' | 'pending' | 'disabled';
export type LastSyncStatus = 'success' | 'failed' | 'in_progress';

// Base configuration interface
export interface BaseConnectionConfig {
  sourceType: FileSourceType;
  credentialId: string;
  lastValidation?: ValidationResult;
}

export interface ValidationResult {
  timestamp: string;
  canAuthenticate: boolean;
  errorMessage?: string;
  [key: string]: any;  // Type-specific validation fields
}

// S3 Configuration
export interface S3ConnectionConfig extends BaseConnectionConfig {
  sourceType: 'S3';
  bucketName: string;
  bucketRegion: string;
  monitorPath: string;
  advancedOptions?: {
    usePathStyle?: boolean;
    endpoint?: string;
    forcePathStyle?: boolean;
  };
  lastValidation?: S3ValidationResult;
}

export interface S3ValidationResult extends ValidationResult {
  canAccessBucket: boolean;
  canListObjects: boolean;
}

// Azure Blob Configuration
export interface AzureBlobConnectionConfig extends BaseConnectionConfig {
  sourceType: 'AZURE_BLOB';
  storageAccountName: string;
  containerName: string;
  blobPrefix: string;
  advancedOptions?: {
    endpoint?: string;
    apiVersion?: string;
  };
}

// SFTP Configuration
export interface SFTPConnectionConfig extends BaseConnectionConfig {
  sourceType: 'SFTP';
  host: string;
  port: number;
  remotePath: string;
  advancedOptions?: {
    hostKeyAlgorithm?: string;
    hostKeyFingerprint?: string;
    strictHostKeyChecking?: boolean;
    timeout?: number;
    keepaliveInterval?: number;
    retryAttempts?: number;
  };
}

// Union type for all connection configs
export type ConnectionConfig =
  | S3ConnectionConfig
  | AzureBlobConnectionConfig
  | SFTPConnectionConfig
  // ... add other types

// File Source entity
export interface FileSource {
  id: number;
  name: string;
  type: FileSourceType;
  status: FileSourceStatus;
  enabled: boolean;

  connectionConfig: ConnectionConfig;

  fileNamePattern: string;
  matchRule: 'partial' | 'exact' | 'regex';

  schedule: string;
  timezone: string;
  pollFrequencyMinutes?: number;

  slaThreshold: number;
  direction: 'inward' | 'outward' | 'bidirectional';
  department: string;

  lastSync?: string;
  lastSyncStatus?: LastSyncStatus;
  lastSyncError?: string;
  successRate: number;
  filesProcessed: number;

  lastPollDurationMs?: number;
  lastObjectsScanned?: number;
  lastObjectsDetected?: number;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}
```

---

## Summary & Recommendations

### ✅ Recommended Approach

1. **Use single `connection_config` JSONB column** in `file_sources` table
2. **Rename and extend `s3_credentials`** to `file_source_credentials` for all types
3. **Support both cloud-native and encrypted DB** credential storage
4. **Type-safe TypeScript interfaces** for each source type
5. **Extensible design** - adding new source types requires:
   - Adding new type to CHECK constraint
   - Defining TypeScript interface
   - Implementing poller service
   - No schema changes needed!

### Next Steps

1. ✅ Update database migration files
2. ✅ Update TypeScript type definitions in `packages/shared`
3. ✅ Update API endpoints to handle new structure
4. ✅ Implement credential management service
5. ✅ Implement connection validators for each type
6. ✅ Update documentation

---

**This design provides maximum flexibility while maintaining type safety and security!** 🚀
