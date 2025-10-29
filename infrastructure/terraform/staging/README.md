# OmniTrackr Staging Infrastructure (Terraform)

This directory contains Terraform configuration to provision OmniTrackr staging infrastructure on GCP.

## Prerequisites

1. **Install Terraform:**
   ```bash
   # macOS
   brew install terraform

   # Or download from https://www.terraform.io/downloads
   ```

2. **Authenticate with GCP:**
   ```bash
   gcloud auth application-default login
   ```

3. **Set your GCP project:**
   ```bash
   gcloud config set project omnitrackr-staging
   ```

## What This Creates

This Terraform configuration will create:

- ✅ **Cloud SQL PostgreSQL** instance (db-f1-micro, 10GB)
- ✅ **Secret Manager** secrets (database password, JWT secret)
- ✅ **Cloud Run** services (API and Worker with placeholder images)
- ✅ **Service Account** for Cloud Run with appropriate permissions
- ✅ **IAM bindings** for accessing secrets and databases

**Estimated Monthly Cost:** $50-80

## Files Explanation

- `main.tf` - Provider configuration and required APIs
- `variables.tf` - Input variables (can be overridden)
- `terraform.tfvars` - Actual values for this environment
- `cloud_sql.tf` - PostgreSQL database configuration
- `secrets.tf` - Secret Manager setup
- `iam.tf` - Service accounts and permissions
- `cloud_run.tf` - Cloud Run services (API and Worker)
- `outputs.tf` - Output values after deployment

## Deployment Steps

### 1. **Update terraform.tfvars**

Edit `terraform.tfvars` and update the `project_id` to match your actual GCP project:

```hcl
project_id = "your-actual-project-id"
```

### 2. **Initialize Terraform**

```bash
cd infrastructure/terraform/staging
terraform init
```

This downloads required providers (Google Cloud).

### 3. **Preview Changes (Plan)**

```bash
terraform plan
```

This shows what Terraform will create WITHOUT actually creating it. Review carefully!

### 4. **Apply Changes (Deploy)**

```bash
terraform apply
```

Type `yes` when prompted. This will:
- Create Cloud SQL database (~5-10 minutes)
- Create secrets
- Create Cloud Run services
- Set up IAM permissions

### 5. **View Outputs**

```bash
terraform output
```

This shows important information like:
- API service URL
- Database connection details
- Secret IDs

### 6. **Get Database Password**

```bash
gcloud secrets versions access latest --secret="db-password"
```

## After Deployment

### Run Database Migrations

Once the infrastructure is created, you need to run migrations:

```bash
# Option 1: Connect via public IP (quick test)
DB_HOST=$(terraform output -raw database_public_ip)
DB_NAME=$(terraform output -raw database_name)
DB_USER=$(terraform output -raw database_user)
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")

# Run migrations locally (pointing to Cloud SQL)
cd /Users/manjulaliyanage/dev/omnitrackr/packages/api
npm run migrate

# Option 2: Use Cloud SQL Proxy (more secure)
cloud-sql-proxy $(terraform output -raw database_connection_name) &
npm run migrate
```

### Deploy Your Application

The Cloud Run services are created with placeholder images. To deploy your actual application:

```bash
# Build and push your Docker image
docker build -t gcr.io/omnitrackr-staging/api:v1 -f packages/api/Dockerfile .
docker push gcr.io/omnitrackr-staging/api:v1

# Update Cloud Run service
gcloud run deploy omnitrackr-api \
  --image gcr.io/omnitrackr-staging/api:v1 \
  --region us-central1

# Or use GitHub Actions to deploy automatically!
```

## Common Commands

```bash
# See current state
terraform show

# List resources
terraform state list

# Get specific output
terraform output api_service_url

# Update infrastructure (after changing .tf files)
terraform apply

# Destroy everything (BE CAREFUL!)
terraform destroy
```

## Troubleshooting

### Error: Project not found
- Make sure you've updated `terraform.tfvars` with your actual project ID
- Verify you're authenticated: `gcloud auth application-default login`

### Error: API not enabled
- Run: `gcloud services enable <api-name>`
- Or wait for Terraform to enable APIs (can take 1-2 minutes)

### Database connection fails
- Check that your IP is in the authorized networks
- Use Cloud SQL Proxy for secure connections
- Verify database password: `gcloud secrets versions access latest --secret="db-password"`

## Security Notes

- 🔒 Database password is auto-generated and stored in Secret Manager
- 🔒 JWT secret is auto-generated
- ⚠️ Database allows connections from 0.0.0.0/0 (anywhere) for initial setup
  - In production, restrict this to Cloud Run IP ranges or use private IP
- 🔒 Service account has minimal required permissions

## Next Steps

1. ✅ Run migrations
2. ✅ Deploy your application via GitHub Actions
3. ✅ Test the API: `curl https://your-api-url/api/health`
4. ✅ Set up custom domain (optional)
5. ✅ Configure Cloud Scheduler for worker jobs

## Cost Optimization

Current configuration is optimized for low cost:
- `db-f1-micro` instance ($25/month)
- API scales to 0 when idle
- Worker scales from 0
- Secret Manager: $0.40/secret/month

To reduce costs further:
- Set `api_min_instances = 0` (adds cold start delay)
- Use Cloud SQL's automatic storage reduction
- Enable Cloud SQL's "Scale down" feature

## Support

For issues:
- Check Terraform logs
- View GCP Console for resource status
- Check Cloud Run logs: `gcloud run services logs read omnitrackr-api`
