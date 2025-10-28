# OmniTrackr Credential Storage Architecture

How customer AWS credentials are stored and managed securely in production.

---

## 🎯 Overview

OmniTrackr is a **multi-tenant SaaS** where customers provide their AWS credentials to monitor their S3 buckets. This document describes how credentials are stored, accessed, and secured.

---

## 🔐 Storage Priority Strategy

### **Primary: AWS Secrets Manager (Cloud Key Vault)**

**Advantages:**
- ✅ Automatic encryption at rest (AWS KMS)
- ✅ Automatic key rotation
- ✅ Audit logging (CloudTrail integration)
- ✅ Fine-grained IAM access control
- ✅ High availability
- ✅ Versioning support
- ✅ No custom encryption code needed

**When to use:**
- Production environment
- OmniTrackr deployed on AWS
- High security requirements

### **Fallback: Database with Encryption**

**When to use:**
- Development/local environment
- Secrets Manager unavailable
- Cost optimization (small deployments)
- Self-hosted deployments

**Security measures:**
- Column-level encryption with KMS
- Application-level encryption before storage
- Credentials never in plain text
- Database backups encrypted

---

## 🌊 Production Flow

### **Step 1: Customer Provides Credentials (Front-end)**

```typescript
// Customer UI Form
interface CredentialForm {
  awsAccessKeyId: string;      // AKIAIOSFODNN7EXAMPLE
  awsSecretAccessKey: string;  // wJalrXUtn...
  bucketName: string;          // customer-data-prod
  bucketRegion: string;        // us-east-1
  monitorPath: string;         // /incoming/
}

// Front-end validation
- Format validation (regex)
- Required fields check
- Region validation

// Send to API via HTTPS
POST /api/file-sources/s3
```

### **Step 2: API Receives and Validates**

```typescript
// FileSourceController
async createS3(req: Request, res: Response) {
  const credentials: CreateS3FileSourceRequest = req.body;

  // 1. Validate format
  validateCredentialFormat(credentials);

  // 2. Test connection to customer's S3
  const testResult = await testS3Connection(credentials);
  if (!testResult.success) {
    throw new ValidationError('Cannot access S3 bucket');
  }

  // 3. Store credentials securely
  const fileSource = await fileSourceService.createS3FileSource(
    credentials,
    req.user.customerId  // Important: Tag with customer_id
  );

  // 4. Return file source (without credentials!)
  res.status(201).json({
    success: true,
    data: {
      id: fileSource.id,
      name: fileSource.name,
      status: fileSource.status,
      // credentials NOT included
    }
  });
}
```

### **Step 3: Service Stores Credentials**

```typescript
// FileSourceService
async createS3FileSource(
  request: CreateS3FileSourceRequest,
  customerId: string
): Promise<FileSource> {

  // 1. Create file source record
  const fileSource = await this.fileSourceRepo.create({
    name: request.name,
    type: 'S3',
    customer_id: customerId,  // Critical: Associate with customer
    connection_config: {
      sourceType: 'S3',
      bucketName: request.bucketName,
      bucketRegion: request.bucketRegion,
      monitorPath: request.monitorPath,
      credentialId: null,  // Will be set after storing
    },
    // ... other fields
  });

  // 2. Store credentials securely
  const credentialId = await this.storeCredentials({
    fileSourceId: fileSource.id,
    customerId: customerId,
    credentials: {
      awsAccessKeyId: request.awsAccessKeyId,
      awsSecretAccessKey: request.awsSecretAccessKey,
    }
  });

  // 3. Update file source with credential reference
  await this.fileSourceRepo.update(fileSource.id, {
    connection_config: {
      ...fileSource.connection_config,
      credentialId: credentialId,
    }
  });

  return fileSource;
}

// Credential storage with fallback
async storeCredentials(params: {
  fileSourceId: number;
  customerId: string;
  credentials: {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
  }
}): Promise<string> {

  try {
    // Priority 1: Store in AWS Secrets Manager
    return await this.storeInSecretsManager(params);
  } catch (error) {
    console.warn('Secrets Manager unavailable, using DB fallback', error);

    // Priority 2: Store in database (encrypted)
    return await this.storeInDatabase(params);
  }
}
```

### **Step 4: AWS Secrets Manager Storage**

```typescript
// CredentialService
async storeInSecretsManager(params: {
  fileSourceId: number;
  customerId: string;
  credentials: {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
  }
}): Promise<string> {

  const secretsManager = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  // Create unique secret name
  const secretName = `omnitrackr/customer/${params.customerId}/file-source/${params.fileSourceId}`;

  // Store credentials
  const command = new CreateSecretCommand({
    Name: secretName,
    Description: `AWS credentials for customer ${params.customerId} file source ${params.fileSourceId}`,
    SecretString: JSON.stringify({
      awsAccessKeyId: params.credentials.awsAccessKeyId,
      awsSecretAccessKey: params.credentials.awsSecretAccessKey,
      createdAt: new Date().toISOString(),
      customerId: params.customerId,
      fileSourceId: params.fileSourceId,
    }),
    Tags: [
      { Key: 'Application', Value: 'OmniTrackr' },
      { Key: 'CustomerId', Value: params.customerId },
      { Key: 'FileSourceId', Value: params.fileSourceId.toString() },
      { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
    ],
  });

  const response = await secretsManager.send(command);

  // Store reference in database
  await this.db('file_source_credentials').insert({
    file_source_id: params.fileSourceId,
    customer_id: params.customerId,
    credential_type: 'aws_secrets_manager',
    secret_id: response.ARN,
    secret_name: secretName,
    created_at: new Date(),
  });

  return secretName;
}
```

### **Step 5: Database Fallback Storage**

```typescript
// CredentialService
async storeInDatabase(params: {
  fileSourceId: number;
  customerId: string;
  credentials: {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
  }
}): Promise<string> {

  // Encrypt credentials using KMS or application-level encryption
  const encryptedCredentials = await this.encryptCredentials({
    awsAccessKeyId: params.credentials.awsAccessKeyId,
    awsSecretAccessKey: params.credentials.awsSecretAccessKey,
  });

  // Store in database
  const [record] = await this.db('file_source_credentials')
    .insert({
      file_source_id: params.fileSourceId,
      customer_id: params.customerId,
      credential_type: 'database_encrypted',
      encrypted_credentials: encryptedCredentials,
      encryption_key_version: 'v1',
      created_at: new Date(),
    })
    .returning('id');

  return `db-credential-${record.id}`;
}

// Encryption using crypto or AWS KMS
async encryptCredentials(credentials: {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
}): Promise<string> {

  // Option 1: Use AWS KMS
  const kmsClient = new KMSClient({ region: process.env.AWS_REGION });
  const command = new EncryptCommand({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: Buffer.from(JSON.stringify(credentials)),
  });
  const response = await kmsClient.send(command);
  return Buffer.from(response.CiphertextBlob).toString('base64');

  // Option 2: Use Node.js crypto (if KMS unavailable)
  // const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // return cipher.update(JSON.stringify(credentials), 'utf8', 'base64');
}
```

---

## 🔄 Credential Retrieval (Worker Service)

```typescript
// Worker polls S3 bucket
async pollFileSource(fileSourceId: number) {

  // 1. Fetch file source
  const fileSource = await this.fileSourceRepo.findById(fileSourceId);

  // 2. Get credential reference
  const credentialId = fileSource.connection_config.credentialId;

  // 3. Retrieve credentials securely
  const credentials = await this.retrieveCredentials(
    credentialId,
    fileSource.customer_id
  );

  // 4. Verify customer_id matches (security check)
  if (credentials.customerId !== fileSource.customer_id) {
    throw new Error('Credential customer mismatch - security violation');
  }

  // 5. Create S3 client with customer credentials
  const s3Client = new S3Client({
    region: fileSource.connection_config.bucketRegion,
    credentials: {
      accessKeyId: credentials.awsAccessKeyId,
      secretAccessKey: credentials.awsSecretAccessKey,
    },
  });

  // 6. Poll S3
  const objects = await this.listS3Objects(s3Client, fileSource);

  // 7. Process results
  await this.processNewFiles(fileSource, objects);

  // 8. Never log credentials
  this.logger.info('Polled file source', {
    fileSourceId: fileSource.id,
    customerId: fileSource.customer_id,
    objectsFound: objects.length,
    // credentials NOT logged
  });
}

async retrieveCredentials(
  credentialId: string,
  customerId: string
): Promise<{
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  customerId: string;
}> {

  // Check credential type
  const credRecord = await this.db('file_source_credentials')
    .where({ customer_id: customerId })
    .first();

  if (credRecord.credential_type === 'aws_secrets_manager') {
    return await this.retrieveFromSecretsManager(credRecord.secret_name);
  } else {
    return await this.retrieveFromDatabase(credRecord.id);
  }
}

async retrieveFromSecretsManager(secretName: string) {
  const secretsManager = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });

  const command = new GetSecretValueCommand({
    SecretId: secretName,
  });

  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

async retrieveFromDatabase(credentialId: number) {
  const record = await this.db('file_source_credentials')
    .where({ id: credentialId })
    .first();

  // Decrypt credentials
  const decrypted = await this.decryptCredentials(
    record.encrypted_credentials
  );

  return JSON.parse(decrypted);
}
```

---

## 🗄️ Database Schema

```sql
-- File source credentials table
CREATE TABLE file_source_credentials (
  id SERIAL PRIMARY KEY,

  -- Foreign keys
  file_source_id INTEGER NOT NULL REFERENCES file_sources(id) ON DELETE CASCADE,
  customer_id VARCHAR(255) NOT NULL,  -- Critical: Customer isolation

  -- Credential storage
  credential_type VARCHAR(50) NOT NULL,  -- 'aws_secrets_manager' or 'database_encrypted'

  -- AWS Secrets Manager (if used)
  secret_id VARCHAR(500),      -- ARN of secret
  secret_name VARCHAR(500),    -- Secret name
  secret_region VARCHAR(50),   -- AWS region

  -- Database storage (if used)
  encrypted_credentials TEXT,  -- Base64 encrypted JSON
  encryption_key_version VARCHAR(50),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,

  -- Security
  access_count INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT unique_file_source_credential UNIQUE(file_source_id),
  CONSTRAINT check_storage_type CHECK (
    (credential_type = 'aws_secrets_manager' AND secret_name IS NOT NULL) OR
    (credential_type = 'database_encrypted' AND encrypted_credentials IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_credentials_customer ON file_source_credentials(customer_id);
CREATE INDEX idx_credentials_file_source ON file_source_credentials(file_source_id);

-- Row-level security (if using PostgreSQL RLS)
ALTER TABLE file_source_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_isolation ON file_source_credentials
  FOR ALL
  USING (customer_id = current_setting('app.current_customer_id'));
```

---

## 🔒 Security Measures

### **1. Data in Transit**
- ✅ HTTPS/TLS 1.3 for all API calls
- ✅ Certificate pinning in mobile apps
- ✅ No credentials in URL parameters
- ✅ No credentials in logs

### **2. Data at Rest**
- ✅ AWS Secrets Manager encryption (primary)
- ✅ Database column encryption (fallback)
- ✅ Encrypted database backups
- ✅ Encrypted disk storage

### **3. Access Control**
- ✅ Customer ID isolation in all queries
- ✅ Worker service has minimal IAM permissions
- ✅ No direct database access to credentials table
- ✅ All access logged to audit trail

### **4. Credential Lifecycle**
- ✅ Validation before storage
- ✅ Test connection before accepting
- ✅ Support for credential rotation
- ✅ Revocation support
- ✅ Automatic cleanup on deletion

### **5. Monitoring**
- ✅ CloudTrail logging (Secrets Manager)
- ✅ Application audit logs
- ✅ Failed access attempt alerts
- ✅ Unusual activity detection

---

## 🎛️ Configuration

```typescript
// Environment variables
interface CredentialConfig {
  // Secrets Manager (primary)
  AWS_REGION: string;
  SECRETS_MANAGER_ENABLED: boolean;

  // Encryption (fallback)
  KMS_KEY_ID?: string;
  ENCRYPTION_KEY?: string;  // For non-AWS deployments

  // Security
  CREDENTIAL_ACCESS_LOG_ENABLED: boolean;
  CREDENTIAL_ROTATION_DAYS: number;
}

// Example .env
AWS_REGION=us-east-1
SECRETS_MANAGER_ENABLED=true
KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/abc...
CREDENTIAL_ACCESS_LOG_ENABLED=true
CREDENTIAL_ROTATION_DAYS=90
```

---

## 🧪 Testing Strategy

### **Development**
- Use database fallback (no AWS Secrets Manager)
- Test with dummy credentials
- Verify encryption/decryption

### **Staging**
- Use AWS Secrets Manager
- Test with real (but test) AWS credentials
- Verify full flow

### **Production**
- AWS Secrets Manager only
- Real customer credentials
- Full audit logging

---

## 📊 Cost Optimization

### **AWS Secrets Manager Pricing**
- $0.40 per secret per month
- $0.05 per 10,000 API calls

### **Example Costs**
- 1,000 customers = $400/month
- 100,000 customers = $40,000/month

### **Optimization Strategies**
1. Cache credentials in memory (5-15 minutes)
2. Batch retrieval for multiple file sources
3. Use database fallback for cost-sensitive deployments
4. Implement tiered storage (premium customers → Secrets Manager)

---

## ✅ Implementation Checklist

- [ ] Set up AWS Secrets Manager in production
- [ ] Implement storeInSecretsManager() method
- [ ] Implement storeInDatabase() with encryption
- [ ] Add customer_id column to file_source_credentials table
- [ ] Implement retrieveCredentials() with fallback
- [ ] Add credential validation before storage
- [ ] Implement access logging
- [ ] Add credential rotation support
- [ ] Set up CloudTrail monitoring
- [ ] Create customer credential management UI
- [ ] Document credential lifecycle for customers
- [ ] Add automated tests for encryption/decryption
- [ ] Implement credential revocation endpoint

---

## 📚 Related Documentation

- **Customer AWS Setup**: `CUSTOMER_AWS_SETUP.md`
- **AWS Credentials Guide**: `AWS_CREDENTIALS_SETUP.md`
- **Security Best Practices**: `SECURITY.md` (to be created)

---

_Last Updated: 2025-10-27_
