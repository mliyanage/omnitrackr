# AWS Credentials Setup for OmniTrackr

Complete guide for setting up AWS credentials to monitor S3 buckets.

---

## 🏢 Multi-Tenant SaaS Architecture

**IMPORTANT**: OmniTrackr is a **multi-tenant SaaS platform** where:
- Multiple customers use the same OmniTrackr instance
- Each customer has their own AWS account and S3 buckets
- Customers provide their own AWS credentials

**This means:**
- ✅ Customers create IAM users in **their own AWS accounts**
- ✅ Customers provide access keys to OmniTrackr
- ✅ OmniTrackr stores credentials securely (isolated per customer)
- ❌ IAM Roles (Option 2) are NOT applicable for customer buckets
- ❌ OmniTrackr does NOT use its own AWS account to access customer data

**For Customer-Facing Documentation**: See `CUSTOMER_AWS_SETUP.md`

---

## 📋 Overview

OmniTrackr needs AWS credentials to:
- List files in customer S3 buckets
- Read file metadata (size, timestamps, etc.)
- Monitor for new files based on schedule

---

## 🔑 Option 1: IAM User (Recommended for Development)

### Step 1: Create IAM User

1. Log in to **AWS Console**: https://console.aws.amazon.com/
2. Navigate to **IAM** → **Users**
3. Click **Create user**
4. Username: `omnitrackr-s3-monitor`
5. Click **Next**

### Step 2: Attach Permissions

#### Option A: Specific Bucket Access (Most Secure)

Create a custom policy for specific bucket access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListSpecificBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    },
    {
      "Sid": "ReadObjectsInBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:GetObjectMetadata",
        "s3:GetObjectAttributes"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

**Replace `YOUR-BUCKET-NAME`** with your actual bucket name.

**Steps:**
1. In IAM Users, click **Add permissions** → **Attach policies directly**
2. Click **Create policy**
3. Switch to **JSON** tab
4. Paste the policy above
5. Replace `YOUR-BUCKET-NAME` with your bucket
6. Name: `OmniTrackr-S3-ReadOnly-YourBucket`
7. Click **Create policy**
8. Go back to user permissions and attach this policy

#### Option B: Multiple Buckets

If you need to monitor multiple buckets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListMultipleBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::bucket-1",
        "arn:aws:s3:::bucket-2",
        "arn:aws:s3:::bucket-3"
      ]
    },
    {
      "Sid": "ReadObjectsInBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:GetObjectMetadata"
      ],
      "Resource": [
        "arn:aws:s3:::bucket-1/*",
        "arn:aws:s3:::bucket-2/*",
        "arn:aws:s3:::bucket-3/*"
      ]
    }
  ]
}
```

#### Option C: All S3 Buckets (Least Secure - Dev/Test Only)

Use AWS managed policy:
1. Search for: **AmazonS3ReadOnlyAccess**
2. Attach to user

⚠️ **Warning**: Gives access to ALL S3 buckets in your account.

### Step 3: Create Access Keys

1. Click on the username
2. Go to **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select: **Application running outside AWS**
6. Click **Next** → **Create access key**

7. **IMPORTANT**: Save these credentials immediately:
   ```
   Access Key ID:     AKIAIOSFODNN7EXAMPLE
   Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

8. **Download CSV file** for backup
9. ⚠️ You cannot retrieve the secret key again!

---

## 🚀 Option 2: IAM Role (OmniTrackr Infrastructure Only)

⚠️ **Note**: This is ONLY for OmniTrackr's own AWS infrastructure (if you deploy OmniTrackr on EC2/ECS).
This does NOT apply to customer S3 buckets - customers must use Option 1 (IAM Users).

If OmniTrackr's backend runs on AWS infrastructure:

### Step 1: Create IAM Role

1. IAM → **Roles** → **Create role**
2. Trusted entity: **AWS service**
3. Use case: **EC2** (or your service)
4. Click **Next**

### Step 2: Attach Permissions

Use the same policies as Option 1 above.

### Step 3: Attach Role to Instance

1. EC2 Console → Select your instance
2. **Actions** → **Security** → **Modify IAM role**
3. Select the role you created
4. **Update IAM role**

### Benefits

- ✅ No credentials in code/config
- ✅ Automatic credential rotation
- ✅ More secure
- ✅ AWS SDK handles auth automatically

---

## 🧪 Test Your Credentials

### Method 1: Using OmniTrackr API

```bash
curl -X POST http://localhost:3000/api/file-sources/s3/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCY",
    "bucketName": "my-test-bucket",
    "bucketRegion": "us-east-1",
    "monitorPath": "/"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "canAuthenticate": true,
    "canAccessBucket": true,
    "canListObjects": true,
    "objectsFound": 5,
    "message": "Successfully connected to S3 bucket"
  }
}
```

### Method 2: Using AWS CLI

```bash
# Configure AWS CLI with your credentials
aws configure

# Test access
aws s3 ls s3://your-bucket-name --region us-east-1

# Test reading a specific path
aws s3 ls s3://your-bucket-name/your/path/ --region us-east-1
```

### Method 3: Using Postman

1. Import collection from `docs/postman/OmniTrackr-API.postman_collection.json`
2. Find request: **Test S3 Connection**
3. Update request body with your credentials
4. Send request

---

## 🔒 Security Best Practices

### 1. Use Environment Variables (Never Hardcode)

OmniTrackr stores credentials in AWS Secrets Manager, but for initial setup:

```bash
# .env.local (never commit to git)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCY
```

### 2. Principle of Least Privilege

Only grant permissions actually needed:
- ✅ Read-only access
- ✅ Specific buckets only
- ✅ Specific paths if possible
- ❌ No write permissions
- ❌ No delete permissions
- ❌ No full S3 access

### 3. Rotate Credentials Regularly

```bash
# AWS Console → IAM → Users → Security credentials
# Create new access key
# Update OmniTrackr configuration
# Deactivate old key
# Test everything works
# Delete old key
```

### 4. Monitor Usage

Enable CloudTrail to monitor S3 API calls:
1. CloudTrail → **Create trail**
2. Monitor `ListBucket`, `GetObject` calls
3. Set up alerts for suspicious activity

### 5. Use IAM Roles in Production

For production deployments:
- ✅ Use IAM roles instead of access keys
- ✅ Attach to EC2/ECS/Lambda
- ✅ No credentials in code
- ✅ Automatic rotation

---

## 📊 Required Permissions Explained

### Minimum Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",           // REQUIRED: List files
        "s3:GetBucketLocation",    // REQUIRED: Verify bucket region
        "s3:GetObject",            // REQUIRED: Read file metadata
        "s3:GetObjectMetadata",    // OPTIONAL: Additional metadata
        "s3:GetObjectVersion"      // OPTIONAL: For versioned buckets
      ],
      "Resource": [
        "arn:aws:s3:::bucket-name",
        "arn:aws:s3:::bucket-name/*"
      ]
    }
  ]
}
```

### Permission Details

| Permission | Required? | Purpose |
|------------|-----------|---------|
| `s3:ListBucket` | ✅ Yes | List files in bucket/folder |
| `s3:GetBucketLocation` | ✅ Yes | Verify correct region |
| `s3:GetObject` | ✅ Yes | Read file metadata (size, date) |
| `s3:GetObjectMetadata` | ⚠️ Optional | Additional file properties |
| `s3:GetObjectVersion` | ⚠️ Optional | For versioned buckets |
| `s3:GetObjectAttributes` | ⚠️ Optional | Advanced attributes |

**Note**: OmniTrackr only READS metadata, never downloads file contents.

---

## 🌍 AWS Regions

Make sure to specify the correct region for your bucket:

| Region Code | Region Name |
|-------------|-------------|
| `us-east-1` | US East (N. Virginia) |
| `us-east-2` | US East (Ohio) |
| `us-west-1` | US West (N. California) |
| `us-west-2` | US West (Oregon) |
| `eu-west-1` | Europe (Ireland) |
| `eu-central-1` | Europe (Frankfurt) |
| `ap-southeast-1` | Asia Pacific (Singapore) |
| `ap-southeast-2` | Asia Pacific (Sydney) |
| `ap-northeast-1` | Asia Pacific (Tokyo) |

Full list: https://docs.aws.amazon.com/general/latest/gr/s3.html

---

## 🐛 Troubleshooting

### Error: "Access Denied"

**Cause**: Missing permissions or wrong bucket name

**Solutions**:
1. Verify IAM policy includes `s3:ListBucket` and `s3:GetObject`
2. Check bucket name is correct
3. Verify bucket region matches
4. Ensure bucket exists and you have access

**Test manually**:
```bash
aws s3 ls s3://your-bucket-name --region us-east-1
```

### Error: "Invalid credentials"

**Cause**: Wrong access key or secret key

**Solutions**:
1. Verify you copied keys correctly (no extra spaces)
2. Check if access key is active in IAM console
3. Ensure no special characters were lost during copy/paste
4. Try creating new access keys

### Error: "No such bucket"

**Cause**: Bucket doesn't exist or wrong region

**Solutions**:
1. Verify bucket name (case-sensitive)
2. Check bucket exists: `aws s3 ls`
3. Verify correct region
4. Check if bucket is in different AWS account

### Error: "Bucket is in a different region"

**Cause**: Region mismatch

**Solution**:
```bash
# Find correct region
aws s3api get-bucket-location --bucket your-bucket-name
```

Update `bucketRegion` in your request.

---

## 📝 Example: Complete File Source Creation

After getting credentials, create a file source:

```bash
curl -X POST http://localhost:3000/api/file-sources/s3 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance Reports - Daily",
    "department": "Finance",
    "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCY",
    "bucketName": "company-finance-reports",
    "bucketRegion": "us-east-1",
    "monitorPath": "/daily-reports/",
    "fileNamePattern": "report_*.csv",
    "matchRule": "partial",
    "schedule": "09:00",
    "timezone": "America/New_York",
    "slaThreshold": 120,
    "direction": "inward"
  }'
```

---

## 🔐 Where Credentials Are Stored

OmniTrackr stores credentials securely:

1. **Initial creation**: Credentials sent in API request
2. **API receives**: FileSourceService processes them
3. **Storage**:
   - **Production**: AWS Secrets Manager (encrypted)
   - **Development**: Database `file_source_credentials` table (encrypted)
4. **Usage**: Worker service retrieves when polling S3
5. **Never logged**: Credentials never appear in logs

### Database Schema

```sql
CREATE TABLE file_source_credentials (
  id SERIAL PRIMARY KEY,
  file_source_id INTEGER REFERENCES file_sources(id),
  credential_type VARCHAR(50) NOT NULL, -- 'aws_access_key'
  encrypted_credentials JSONB NOT NULL,  -- Encrypted with KMS
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📚 Related Documentation

- **AWS IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **S3 Bucket Policies**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
- **AWS SDK Authentication**: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html

---

## ✅ Quick Checklist

Before creating a file source in OmniTrackr:

- [ ] Created IAM user or role
- [ ] Attached S3 read permissions
- [ ] Created access keys
- [ ] Saved access key ID and secret key securely
- [ ] Tested credentials with AWS CLI or OmniTrackr test endpoint
- [ ] Know your bucket name
- [ ] Know your bucket region
- [ ] Know the path to monitor
- [ ] Defined file name pattern
- [ ] Set monitoring schedule

---

_Last Updated: 2025-10-27_
