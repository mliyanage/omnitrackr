# Terraform Deployment Guide - Step by Step

Complete guide to deploy OmniTrackr infrastructure to GCP using Terraform.

---

## 📚 What is Terraform?

Think of Terraform like a **recipe** for your infrastructure:
- Instead of clicking through GCP Console, you **write code**
- Terraform reads your code and **creates** the resources
- You can **version control** your infrastructure (just like your app code)
- You can **destroy and recreate** everything exactly the same way

### Key Concepts:

1. **`.tf` files** = Configuration files (your infrastructure recipe)
2. **`terraform init`** = Download tools needed (like `npm install`)
3. **`terraform plan`** = Preview what will be created (**DRY RUN**)
4. **`terraform apply`** = Actually create the resources (**DO IT**)
5. **`terraform destroy`** = Delete everything (**BE CAREFUL**)

---

## 🚀 Quick Start (15 minutes)

### **Step 1: Install Terraform** (2 minutes)

```bash
# macOS
brew install terraform

# Verify installation
terraform version
# Should show: Terraform v1.x.x
```

### **Step 2: Authenticate with GCP** (2 minutes)

```bash
# Log in to GCP
gcloud auth application-default login

# Set your project
gcloud config set project omnitrackr-staging

# Verify
gcloud config get-value project
# Should show: omnitrackr-staging
```

### **Step 3: Update Configuration** (1 minute)

```bash
cd infrastructure/terraform/staging

# Edit terraform.tfvars and verify project_id
cat terraform.tfvars
```

Make sure `project_id` matches your actual GCP project ID.

### **Step 4: Initialize Terraform** (2 minutes)

```bash
# Download required providers
terraform init
```

You should see:
```
Terraform has been successfully initialized!
```

### **Step 5: Preview Changes** (3 minutes)

```bash
# See what Terraform will create (DOES NOT CREATE ANYTHING YET)
terraform plan
```

You'll see a list of resources to be created:
- ✅ Cloud SQL PostgreSQL instance
- ✅ Database and user
- ✅ Secrets in Secret Manager
- ✅ Cloud Run services (API and Worker)
- ✅ Service accounts
- ✅ IAM permissions

Review the output carefully. Look for **Plan: X to add, 0 to change, 0 to destroy**.

### **Step 6: Deploy Infrastructure** (5-10 minutes)

```bash
# Create all resources
terraform apply
```

1. Terraform will show the plan again
2. Type `yes` when prompted
3. Wait 5-10 minutes while resources are created

You'll see progress like:
```
google_sql_database_instance.postgres: Creating...
google_sql_database_instance.postgres: Still creating... [10s elapsed]
google_sql_database_instance.postgres: Still creating... [5m0s elapsed]
google_sql_database_instance.postgres: Creation complete after 6m23s
```

### **Step 7: View Results** (1 minute)

```bash
# See all outputs
terraform output

# Get API URL
terraform output api_service_url

# Get database IP
terraform output database_public_ip
```

---

## 📋 What Just Happened?

Terraform created:

### **1. Cloud SQL Database**
- PostgreSQL 15
- Instance name: `omnitrackr-staging-db`
- Database: `omnitrackr`
- User: `omnitrackr_user`
- Password: Auto-generated, stored in Secret Manager

### **2. Secrets**
- `db-password` - Database password
- `jwt-secret` - JWT signing key
- `db-connection-string` - Full connection string

### **3. Cloud Run Services**
- `omnitrackr-api` - API service (placeholder image)
- `omnitrackr-worker` - Worker service (placeholder image)

### **4. Service Account**
- Email: `omnitrackr-staging@omnitrackr-staging.iam.gserviceaccount.com`
- Permissions to access database and secrets

---

## 🔧 Next Steps After Deployment

### **1. Get Database Password**

```bash
# Get the password
gcloud secrets versions access latest --secret="db-password"

# Or save it to a variable
export DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")
```

### **2. Connect to Database** (Optional - to verify)

```bash
# Get connection details
DB_HOST=$(terraform output -raw database_public_ip)
DB_NAME=$(terraform output -raw database_name)
DB_USER=$(terraform output -raw database_user)

# Install PostgreSQL client if you don't have it
brew install postgresql

# Connect using psql
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"
```

### **3. Run Database Migrations**

```bash
# Go to API package
cd /Users/manjulaliyanage/dev/omnitrackr/packages/api

# Update .env.staging with database details
cat > .env.staging <<EOF
NODE_ENV=staging
DB_HOST=$(terraform output -raw database_public_ip)
DB_PORT=5432
DB_NAME=$(terraform output -raw database_name)
DB_USER=$(terraform output -raw database_user)
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")
EOF

# Run migrations
npm run migrate -- --env=staging
```

### **4. Deploy Your Application**

The Cloud Run services currently have placeholder images. Deploy your actual app:

```bash
# Build Docker image
docker build -t gcr.io/omnitrackr-staging/api:v1 -f packages/api/Dockerfile .

# Push to Google Container Registry
docker push gcr.io/omnitrackr-staging/api:v1

# Deploy to Cloud Run
gcloud run deploy omnitrackr-api \
  --image gcr.io/omnitrackr-staging/api:v1 \
  --region us-central1 \
  --platform managed
```

Or use GitHub Actions for automatic deployment!

### **5. Test Your API**

```bash
# Get API URL
API_URL=$(terraform output -raw api_service_url)

# Test health endpoint
curl $API_URL/api/health

# Should return: {"status":"ok"}
```

---

## 🔄 Common Terraform Commands

### **View Current State**

```bash
# Show all resources
terraform show

# List resources
terraform state list

# Get specific output
terraform output api_service_url
```

### **Update Infrastructure**

After modifying `.tf` files:

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply
```

### **Destroy Everything**

⚠️ **WARNING: This deletes everything!**

```bash
terraform destroy
```

---

## 🐛 Troubleshooting

### **Error: Project not found**

```bash
# Verify your project ID
gcloud projects list

# Update terraform.tfvars with correct project_id
nano terraform.tfvars
```

### **Error: API not enabled**

```bash
# Enable required APIs manually
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Then try terraform apply again
```

### **Error: Insufficient permissions**

```bash
# Check your account
gcloud auth list

# Make sure you're using the right account
gcloud config set account your-email@example.com

# Re-authenticate
gcloud auth application-default login
```

### **Database takes too long to create**

This is normal! Cloud SQL can take 5-10 minutes to provision. Be patient.

### **Can't connect to database**

1. Check your IP is allowed:
   ```bash
   # Get your public IP
   curl ifconfig.me
   ```

2. Use Cloud SQL Proxy (more secure):
   ```bash
   cloud-sql-proxy omnitrackr-staging-db:us-central1:omnitrackr-staging-db
   ```

---

## 💰 Cost Management

### **Current Configuration Cost**

- Cloud SQL (db-f1-micro): ~$25/month
- Cloud Run API (1 min instance): ~$15-20/month
- Cloud Run Worker (0 min instances): ~$5-10/month when active
- Secret Manager (3 secrets): ~$1.20/month
- **Total: ~$50-60/month**

### **To Reduce Costs**

Edit `terraform.tfvars`:

```hcl
# Allow API to scale to zero (adds cold start delay)
api_min_instances = 0

# Reduce max instances
api_max_instances = 5
```

Then apply:
```bash
terraform apply
```

---

## 🎓 Understanding Terraform Files

| File | Purpose | When to Edit |
|------|---------|--------------|
| `main.tf` | Provider setup, API enablement | Rarely |
| `variables.tf` | Variable definitions | When adding new config options |
| `terraform.tfvars` | Actual values | **Frequently** (project ID, scaling) |
| `cloud_sql.tf` | Database configuration | When changing DB size/settings |
| `cloud_run.tf` | API and Worker services | When changing scaling/resources |
| `secrets.tf` | Secret Manager | When adding new secrets |
| `iam.tf` | Permissions | When adding new permissions |
| `outputs.tf` | What to show after deployment | When you want to see more info |

---

## 📊 Terraform Workflow Diagram

```
┌─────────────────┐
│  Write .tf files│  ← Define infrastructure
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ terraform init  │  ← Download providers
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ terraform plan  │  ← Preview changes (DRY RUN)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ terraform apply │  ← Create resources (DO IT!)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Resources      │  ← Cloud SQL, Cloud Run, etc.
│  Created! 🎉    │
└─────────────────┘
```

---

## ✅ Deployment Checklist

- [ ] Install Terraform
- [ ] Authenticate with GCP (`gcloud auth application-default login`)
- [ ] Update `terraform.tfvars` with your project ID
- [ ] Run `terraform init`
- [ ] Run `terraform plan` and review
- [ ] Run `terraform apply` and wait
- [ ] View outputs with `terraform output`
- [ ] Get database password from Secret Manager
- [ ] Run database migrations
- [ ] Deploy application to Cloud Run
- [ ] Test API endpoint

---

## 🆘 Need Help?

1. **Check Terraform docs**: https://registry.terraform.io/providers/hashicorp/google/latest/docs
2. **Check GCP docs**: https://cloud.google.com/docs
3. **View Terraform state**: `terraform show`
4. **View Cloud Run logs**: `gcloud run services logs read omnitrackr-api`
5. **View Cloud SQL logs**: In GCP Console → SQL → Logs

---

**Ready to deploy? Run these commands:**

```bash
cd infrastructure/terraform/staging
terraform init
terraform plan
terraform apply
```

Good luck! 🚀
