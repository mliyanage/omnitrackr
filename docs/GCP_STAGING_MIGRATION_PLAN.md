# GCP Account Migration Plan - OmniTrackr Staging

## Overview

Migrate all staging infrastructure from the current GCP project (`omnitrackr-staging`) to a brand new GCP account to get fresh free trial credits ($300 for 90 days). Keep Cloud DNS in the old account (moving to GoDaddy later).

## Current Infrastructure Inventory

| Resource | Name / Details |
|----------|---------------|
| **GCP Project** | `omnitrackr-staging` |
| **Region** | `us-central1` |
| **Terraform State** | GCS bucket `omnitrackr-terraform-state` |
| **Cloud SQL** | `omnitrackr-staging-db` (PostgreSQL 15, db-f1-micro) |
| **Cloud Run API** | `omnitrackr-api-staging` (512Mi, 1 vCPU) |
| **Cloud Run Jobs** | polling-worker, sla-monitor, escalation-worker |
| **Cloud Scheduler** | 2 cron triggers (1min, 5min) |
| **Load Balancer** | Global HTTPS with managed SSL for `staging.omnitrackr.dev` |
| **Cloud Storage** | `omnitrackr-staging-frontend` (SPA hosting) |
| **Artifact Registry** | `omnitrackr` repo in `us-central1` |
| **Secret Manager** | db-password, jwt-secret, db-connection-string |
| **Service Account** | `omnitrackr-staging@omnitrackr-staging.iam.gserviceaccount.com` |
| **Cloud DNS** | DNS zone for `omnitrackr.dev` (KEEP - do not delete) |

## GitHub Actions Secrets to Update

| Secret | Purpose |
|--------|---------|
| `GCP_PROJECT_ID_STAGING` | New project ID |
| `GCP_SA_KEY_STAGING` | New service account JSON key |
| `DB_HOST_STAGING` | New Cloud SQL public IP |
| `DB_PORT_STAGING` | 5432 (unchanged) |
| `DB_NAME_STAGING` | omnitrackr (unchanged) |
| `DB_USER_STAGING` | omnitrackr_user (unchanged) |
| `DB_PASSWORD` | New auto-generated password |
| `JWT_SECRET` | New auto-generated secret |
| `ENCRYPTION_MASTER_KEY` | New or re-use existing |
| `MJ_APIKEY_PUBLIC` | Mailjet key (unchanged - not GCP) |
| `MJ_APIKEY_PRIVATE` | Mailjet key (unchanged - not GCP) |
| `FROM_EMAIL` | Unchanged |
| `FROM_NAME` | Unchanged |

---

## Step-by-Step Migration Instructions

### Phase 1: Backup Data from Old Account

#### Step 1.1 - Export the Database

```bash
# Get current DB credentials
gcloud config set project omnitrackr-staging
DB_HOST=$(cd infrastructure/terraform/staging && terraform output -raw database_public_ip)
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password")

# Export full database dump
pg_dump "postgresql://omnitrackr_user:${DB_PASSWORD}@${DB_HOST}:5432/omnitrackr" \
  --format=custom \
  --file=omnitrackr-staging-backup-$(date +%Y%m%d).dump

# Also export as plain SQL as a fallback
pg_dump "postgresql://omnitrackr_user:${DB_PASSWORD}@${DB_HOST}:5432/omnitrackr" \
  --format=plain \
  --file=omnitrackr-staging-backup-$(date +%Y%m%d).sql
```

#### Step 1.2 - Save Current Secrets Locally (temporary)

```bash
echo "DB_PASSWORD: $(gcloud secrets versions access latest --secret='db-password')" > /tmp/old-secrets.txt
echo "JWT_SECRET: $(gcloud secrets versions access latest --secret='jwt-secret')" >> /tmp/old-secrets.txt
echo "DB_CONN_STRING: $(gcloud secrets versions access latest --secret='db-connection-string')" >> /tmp/old-secrets.txt

# Note the current Load Balancer IP
cd infrastructure/terraform/staging
terraform output load_balancer_ip
```

#### Step 1.3 - Note the Current DNS Configuration

```bash
# Record current DNS records so you can recreate them
gcloud dns record-sets list --zone=<your-dns-zone-name> --project=omnitrackr-staging
```

---

### Phase 2: Set Up New GCP Project

Since you already have a new Google account ready, log into GCP Console with it and activate the free trial if not done already.

#### Step 2.1 - Create New GCP Project

```bash
# Log in with the new account
gcloud auth login  # Use the NEW Google account

# Create new project (choose a unique project ID)
gcloud projects create omnitrackr-staging-v2 --name="OmniTrackr Staging V2"

# Set as active project
gcloud config set project omnitrackr-staging-v2

# Link billing account (the free trial billing account)
# You can find the billing account ID in the GCP Console under Billing
gcloud billing projects link omnitrackr-staging-v2 --billing-account=<NEW_BILLING_ACCOUNT_ID>
```

#### Step 2.3 - Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com \
  storage-api.googleapis.com \
  storage-component.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com
```

#### Step 2.4 - Create Artifact Registry Repository

```bash
gcloud artifacts repositories create omnitrackr \
  --repository-format=docker \
  --location=us-central1 \
  --description="OmniTrackr Docker images"
```

#### Step 2.5 - Create Terraform State Bucket

```bash
gsutil mb -p omnitrackr-staging-v2 -l us-central1 gs://omnitrackr-terraform-state-v2
gsutil versioning set on gs://omnitrackr-terraform-state-v2
```

#### Step 2.6 - Create Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for CI/CD deployments"

# Grant required roles
SA_EMAIL="github-actions@omnitrackr-staging-v2.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudscheduler.admin"

# Generate key file
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account="${SA_EMAIL}"

# This JSON file content goes into GitHub secret GCP_SA_KEY_STAGING
cat ~/github-actions-key.json
```

---

### Phase 3: Update Terraform Configuration

#### Step 3.1 - Update `terraform.tfvars`

**File:** `infrastructure/terraform/staging/terraform.tfvars`

Change `project_id` to the new project ID:

```hcl
project_id  = "omnitrackr-staging-v2"   # <-- NEW PROJECT ID
region      = "us-central1"
environment = "staging"
```

#### Step 3.2 - Update Terraform Backend

**File:** `infrastructure/terraform/staging/main.tf`

Update the backend bucket name:

```hcl
terraform {
  backend "gcs" {
    bucket = "omnitrackr-terraform-state-v2"   # <-- NEW BUCKET
    prefix = "staging"
  }
}
```

#### Step 3.3 - Update `variables.tf` Default

**File:** `infrastructure/terraform/staging/variables.tf`

Update the default project_id:

```hcl
variable "project_id" {
  description = "GCP Project ID"
  default     = "omnitrackr-staging-v2"   # <-- NEW PROJECT ID
}
```

#### Step 3.4 - Disable Deletion Protection on Cloud SQL (temporarily)

**File:** `infrastructure/terraform/staging/cloud_sql.tf`

The Cloud SQL instance has `deletion_protection = true`. This is fine for the new project. But for the OLD project cleanup (Phase 7), you'll need to set it to `false` before destroying.

#### Step 3.5 - Initialize and Apply Terraform

```bash
cd infrastructure/terraform/staging

# Authenticate with the new GCP account
gcloud auth application-default login   # Use NEW account

# Re-initialize Terraform (new backend)
rm -rf .terraform .terraform.lock.hcl
terraform init

# Preview the changes
terraform plan

# Apply (creates all resources in the new project)
terraform apply
# Type 'yes' when prompted
# This takes ~10 minutes (Cloud SQL is the slowest)

# Note the outputs
terraform output
```

---

### Phase 4: Restore Database & Configure

#### Step 4.1 - Get New Database Credentials

```bash
gcloud config set project omnitrackr-staging-v2

NEW_DB_HOST=$(cd infrastructure/terraform/staging && terraform output -raw database_public_ip)
NEW_DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password" --project=omnitrackr-staging-v2)

echo "New DB Host: ${NEW_DB_HOST}"
```

#### Step 4.2 - Restore Database from Backup

```bash
# Restore using the custom format dump
pg_restore \
  --host="${NEW_DB_HOST}" \
  --port=5432 \
  --username=omnitrackr_user \
  --dbname=omnitrackr \
  --no-owner \
  --no-privileges \
  --verbose \
  omnitrackr-staging-backup-*.dump

# Enter the NEW_DB_PASSWORD when prompted
```

#### Step 4.3 - Verify Database Restoration

```bash
psql "postgresql://omnitrackr_user:${NEW_DB_PASSWORD}@${NEW_DB_HOST}:5432/omnitrackr" \
  -c "SELECT COUNT(*) FROM watchers;"
```

---

### Phase 5: Update GitHub Actions & Deploy

#### Step 5.1 - Update GitHub Repository Secrets

Go to: GitHub repo > Settings > Secrets and variables > Actions

Update these secrets:

| Secret | New Value |
|--------|-----------|
| `GCP_PROJECT_ID_STAGING` | `omnitrackr-staging-v2` |
| `GCP_SA_KEY_STAGING` | Contents of `~/github-actions-key.json` |
| `DB_HOST_STAGING` | New Cloud SQL IP (from `terraform output database_public_ip`) |
| `DB_PASSWORD` | New password (from `gcloud secrets versions access latest --secret="db-password"`) |
| `JWT_SECRET` | New JWT secret (from `gcloud secrets versions access latest --secret="jwt-secret"`) |
| `ENCRYPTION_MASTER_KEY` | Generate a new one or keep existing |

Secrets that do NOT need updating (not GCP-specific):
- `DB_PORT_STAGING` (still 5432)
- `DB_NAME_STAGING` (still omnitrackr)
- `DB_USER_STAGING` (still omnitrackr_user)
- `MJ_APIKEY_PUBLIC`, `MJ_APIKEY_PRIVATE` (Mailjet - unchanged)
- `FROM_EMAIL`, `FROM_NAME` (unchanged)

#### Step 5.2 - Trigger Deployments

```bash
# Option A: Push to develop branch to trigger automatic deployments
git push origin develop

# Option B: Manually trigger workflows from GitHub Actions UI
# Go to Actions tab > select workflow > Run workflow
```

#### Step 5.3 - Verify Deployments

```bash
# Check API service
gcloud run services describe omnitrackr-api-staging \
  --region=us-central1 \
  --project=omnitrackr-staging-v2

# Check worker jobs
gcloud run jobs describe omnitrackr-polling-worker-staging \
  --region=us-central1 \
  --project=omnitrackr-staging-v2

# Check frontend bucket
gsutil ls gs://omnitrackr-staging-frontend/
```

---

### Phase 6: Update DNS

#### Step 6.1 - Get New Load Balancer IP

```bash
cd infrastructure/terraform/staging
NEW_LB_IP=$(terraform output -raw load_balancer_ip)
echo "New Load Balancer IP: ${NEW_LB_IP}"
```

#### Step 6.2 - Update DNS A Record

Since you're keeping Cloud DNS in the OLD account for now:

```bash
# Switch to old account temporarily
gcloud config set project omnitrackr-staging

# Update the A record for staging.omnitrackr.dev
# First, find the zone name
gcloud dns managed-zones list

# Delete old record and add new one
gcloud dns record-sets update staging.omnitrackr.dev. \
  --zone=<your-zone-name> \
  --type=A \
  --ttl=300 \
  --rrdatas="${NEW_LB_IP}"
```

#### Step 6.3 - Wait for SSL Certificate Provisioning

The Google-managed SSL certificate in the new project will need to provision after DNS points to the new IP. This can take 15-60 minutes.

```bash
# Check certificate status
gcloud compute ssl-certificates describe omnitrackr-staging-ssl-cert \
  --project=omnitrackr-staging-v2 \
  --global
```

#### Step 6.4 - Verify End-to-End

```bash
# Test frontend
curl -I https://staging.omnitrackr.dev

# Test API
curl https://staging.omnitrackr.dev/api/health
```

---

### Phase 7: Clean Up Old Account

**Only do this after verifying everything works in the new account.**

#### Step 7.1 - Disable Cloud Scheduler in Old Project

```bash
gcloud config set project omnitrackr-staging

# Pause schedulers to stop incurring costs
gcloud scheduler jobs pause omnitrackr-polling-worker-staging-trigger --location=us-central1
gcloud scheduler jobs pause omnitrackr-sla-monitor-staging-trigger --location=us-central1
```

#### Step 7.2 - Scale Down Cloud Run in Old Project

```bash
# Scale API to 0 instances
gcloud run services update omnitrackr-api-staging \
  --min-instances=0 --max-instances=0 \
  --region=us-central1
```

#### Step 7.3 - Destroy Terraform Resources

Since Cloud DNS is managed outside Terraform (via GCP Console), `terraform destroy` will not touch your DNS zone.

```bash
# Switch auth to old account
gcloud auth application-default login   # Use OLD account
gcloud config set project omnitrackr-staging

# Temporarily point terraform back to the OLD backend
cd infrastructure/terraform/staging
# Edit main.tf backend to: bucket = "omnitrackr-terraform-state"
# Edit terraform.tfvars to: project_id = "omnitrackr-staging"
# Edit variables.tf default to: "omnitrackr-staging"

rm -rf .terraform
terraform init

# First, disable deletion protection on Cloud SQL
# Edit cloud_sql.tf: change deletion_protection = true to false
terraform apply -target=google_sql_database_instance.postgres

# Now destroy all Terraform-managed resources
terraform destroy
# Type 'yes' when prompted
# DNS zone is safe - it's not managed by Terraform
```

#### Step 7.4 - Manual Cleanup (if Terraform doesn't cover everything)

```bash
# Delete Artifact Registry images
gcloud artifacts repositories delete omnitrackr \
  --location=us-central1 --quiet

# Delete Terraform state bucket
gsutil rm -r gs://omnitrackr-terraform-state

# Delete any remaining resources visible in GCP Console
```

#### Step 7.5 - Revert Terraform Files for New Account

After destroying old resources, update Terraform files back to the new project:

```bash
# Edit main.tf backend back to: bucket = "omnitrackr-terraform-state-v2"
# Edit terraform.tfvars back to: project_id = "omnitrackr-staging-v2"
# Edit variables.tf default back to: "omnitrackr-staging-v2"

# Re-init for new project
rm -rf .terraform
terraform init
```

#### Step 7.6 - Clean Up Local Files

```bash
# Delete the service account key
rm ~/github-actions-key.json

# Delete the temporary secrets file
rm /tmp/old-secrets.txt
```

---

## Important Notes

1. **Cloud DNS stays in old account** - DNS is managed via GCP Console (not Terraform), so `terraform destroy` won't touch it. The old account's DNS zone will continue to work even after the free trial expires (DNS is very cheap, ~$0.20/month per zone). You can move it to GoDaddy later at your convenience.

2. **Database migration** - All application data (watchers, connections, schedules, users, etc.) will be preserved through pg_dump/pg_restore. User passwords stored in the DB are safe.

3. **New secrets are generated** - Terraform will generate new DB password and JWT secret. Users will need to log in again since the JWT secret changes (this is fine per your confirmation).

4. **SSL certificate provisioning** - There will be brief downtime (~15-60 min) while the new Google-managed SSL certificate provisions after the DNS change.

5. **Artifact Registry** - A new repository is needed in the new project. Old images don't need to be migrated since GitHub Actions will build and push fresh images.

6. **Commit the Terraform changes** - After confirming the new project works, commit the updated Terraform files (`main.tf`, `terraform.tfvars`, `variables.tf`) to the `develop` branch.

7. **Production is separate** - The production workflows reference `GCP_PROJECT_ID_PROD` / `GCP_SA_KEY_PROD` which are different secrets. Those remain unchanged unless you also migrate production.

## Estimated Downtime

- **Frontend:** ~1-2 hours (DNS propagation + SSL provisioning)
- **API:** Same window, depending on DNS propagation
- **Mitigation:** Set DNS TTL to 60s before migration, switch back if issues arise

## Files Changed (Phase 3)

These are the Terraform files that need updating for the new project:

| File | Change |
|------|--------|
| `infrastructure/terraform/staging/main.tf` | Backend bucket: `omnitrackr-terraform-state` -> `omnitrackr-terraform-state-v2` |
| `infrastructure/terraform/staging/terraform.tfvars` | project_id: `omnitrackr-staging` -> `omnitrackr-staging-v2` |
| `infrastructure/terraform/staging/variables.tf` | Default project_id: `omnitrackr-staging` -> `omnitrackr-staging-v2` |
