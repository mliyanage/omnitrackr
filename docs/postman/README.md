# OmniTrackr API - Postman Collection

Complete Postman collection for testing and using the OmniTrackr API.

## 📦 Files Included

- **OmniTrackr-API.postman_collection.json** - Complete API collection with all endpoints
- **Development.postman_environment.json** - Development environment configuration

## 🚀 Quick Start

### 1. Import into Postman

#### Import Collection
1. Open Postman
2. Click "Import" button (top left)
3. Select `OmniTrackr-API.postman_collection.json`
4. Click "Import"

#### Import Environment
1. Click "Import" button
2. Select `Development.postman_environment.json`
3. Click "Import"
4. Select "Development" from the environment dropdown (top right)

### 2. Start the API Server

```bash
# From project root
npm run dev --workspace=packages/api

# Or from packages/api
npm run dev
```

Server will start on: http://localhost:3000

### 3. Test Health Check

1. In Postman, open the collection: **OmniTrackr API**
2. Navigate to: **Health & Status → Health Check**
3. Click "Send"
4. You should see:
```json
{
  "success": true,
  "message": "OmniTrackr API is running",
  "timestamp": "2025-10-27T...",
  "environment": "development"
}
```

## 📚 Collection Structure

### 1. Health & Status
- **Health Check** - Verify API is running

### 2. File Sources
Core file source management endpoints:

#### Read Operations
- **Get All File Sources** - List with pagination and filters
- **Get File Source by ID** - Get single source details
- **Get File Source Statistics** - Get stats (file counts, success rate, etc.)

#### Write Operations
- **Test S3 Connection** - Validate AWS credentials before creating
- **Create S3 File Source** - Create new S3 file source
- **Update File Source** - Partial update of source fields
- **Enable File Source** - Enable monitoring
- **Disable File Source** - Disable monitoring
- **Delete File Source** - Remove file source

### 3. Examples
Real-world use case examples:
- **Sales Reports - Daily** - Morning sales reports with 1-hour SLA
- **Partner Data Feed** - JSON files from partner, 24-hour SLA
- **Outbound Reports** - Monitor our deliveries to customers

### 4. Error Examples
Test error handling:
- **Validation Error** - Missing required fields
- **Not Found Error** - Non-existent resource
- **Invalid Route** - Route doesn't exist

## 🔧 Configuration

### Environment Variables

The Development environment includes:

| Variable | Description | Default |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `awsAccessKeyId` | Your AWS Access Key | (Set your own) |
| `awsSecretAccessKey` | Your AWS Secret Key | (Set your own) |

To configure:
1. Click the eye icon (👁️) next to the environment dropdown
2. Click "Edit" on the Development environment
3. Update the values
4. Click "Save"

## 📝 Common Workflows

### Workflow 1: Create New File Source

1. **Test Connection First** (Optional but recommended)
   - Request: `File Sources → Test S3 Connection`
   - Update the AWS credentials and bucket details
   - Send request
   - Verify: `"success": true`

2. **Create File Source**
   - Request: `File Sources → Create S3 File Source`
   - Update the request body with your details
   - Send request
   - Save the returned `id` for next steps

3. **Verify Creation**
   - Request: `File Sources → Get File Source by ID`
   - Update the URL with the saved `id`
   - Send request
   - Verify all fields are correct

### Workflow 2: Update and Manage File Source

1. **Get Current State**
   - Request: `File Sources → Get File Source by ID`
   - Note current values

2. **Update Fields**
   - Request: `File Sources → Update File Source`
   - Send only the fields you want to change

3. **Disable if Needed**
   - Request: `File Sources → Disable File Source`
   - Temporarily stop monitoring

4. **Re-enable**
   - Request: `File Sources → Enable File Source`
   - Resume monitoring

### Workflow 3: Monitor File Source

1. **Get Statistics**
   - Request: `File Sources → Get File Source Statistics`
   - Check file counts, success rate, SLA status

2. **List All Sources**
   - Request: `File Sources → Get All File Sources`
   - Filter by department if needed
   - Use pagination for large lists

## 🧪 Testing with Real AWS Credentials

### Setup

1. Create a test S3 bucket in your AWS account
2. Create IAM user with S3 read permissions
3. Get access key and secret key
4. Update Postman environment variables

### Test Connection

```json
POST /api/file-sources/s3/test-connection

{
  "awsAccessKeyId": "{{awsAccessKeyId}}",
  "awsSecretAccessKey": "{{awsSecretAccessKey}}",
  "bucketName": "your-test-bucket",
  "bucketRegion": "us-east-1",
  "monitorPath": "/"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "canAuthenticate": true,
    "canAccessBucket": true,
    "canListObjects": true,
    "sampleFiles": ["file1.txt", "file2.csv"]
  }
}
```

**Failure Response:**
```json
{
  "success": false,
  "data": {
    "success": false,
    "canAuthenticate": false,
    "canAccessBucket": false,
    "canListObjects": false,
    "errorMessage": "Authentication failed: Invalid AWS credentials"
  }
}
```

## 📖 Field Reference

### Create S3 File Source Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Descriptive name | "Customer Data Bucket" |
| `department` | string | Yes | Department name | "Finance" |
| `awsAccessKeyId` | string | Yes | AWS Access Key | "AKIA..." |
| `awsSecretAccessKey` | string | Yes | AWS Secret Key | "wJal..." |
| `bucketName` | string | Yes | S3 bucket name | "customer-data-prod" |
| `bucketRegion` | string | Yes | AWS region | "us-east-1" |
| `monitorPath` | string | Yes | Path to monitor | "/inbound/daily/" |
| `fileNamePattern` | string | Yes | File pattern | "customer_*.csv" |
| `matchRule` | enum | Yes | Match type | "partial", "exact", "regex" |
| `schedule` | string | Yes | Check time (HH:MM) | "09:00" |
| `timezone` | string | Yes | Timezone | "America/New_York" |
| `slaThreshold` | number | Yes | SLA minutes | 120 |
| `direction` | enum | Yes | Direction | "inward", "outward", "bidirectional" |

### Match Rules

- **partial** - Pattern matches anywhere in filename (e.g., `customer_*` matches `customer_data.csv`)
- **exact** - Exact filename match (e.g., `report.csv` matches only `report.csv`)
- **regex** - Regular expression (e.g., `.*\.json$` matches all JSON files)

### Direction Types

- **inward** - Monitor external sources for files arriving (most common)
- **outward** - Monitor locations where you send files
- **bidirectional** - Monitor both incoming and outgoing

## 🐛 Troubleshooting

### Issue: Connection Refused

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:3000`

**Solution:**
- Ensure API server is running: `npm run dev --workspace=packages/api`
- Check the server logs for errors
- Verify port 3000 is not in use by another process

### Issue: Validation Error

**Symptom:** 400 Bad Request with validation details

**Solution:**
- Check the error response for specific field errors
- Ensure all required fields are included
- Verify field formats (e.g., schedule must be HH:MM)

### Issue: Connection Test Fails

**Symptom:** `"canAuthenticate": false`

**Solution:**
- Verify AWS credentials are correct
- Check IAM user has necessary permissions
- Ensure bucket name and region are correct

### Issue: 404 Not Found

**Symptom:** `Route GET /api/... not found`

**Solution:**
- Check the route path is correct
- Ensure you're using the right HTTP method
- Verify the resource ID exists

## 📊 Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

## 🔗 Additional Resources

- [API Documentation](../DATA_MODEL_AND_API_PLAN.md) - Complete API specification
- [Database Schema](../../packages/api/migrations/README.md) - Database structure
- [Architecture](../FILE_SOURCES_SCHEMA_DESIGN.md) - System design

## 📞 Support

For issues or questions:
1. Check this README first
2. Review the API documentation
3. Check server logs for detailed errors
4. Create an issue in the GitHub repository

---

**Happy Testing! 🚀**
