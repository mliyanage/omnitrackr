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

#### Step 2.1 - Create New GCP Project (COMPLETED)

Project and billing already set up:

- **Project ID:** `omnitrackr-staging-v2`
- **Billing Account:** `011903-BCD685-D21304`

```bash
# Set as active project
gcloud config set project omnitrackr-staging-v2
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

Roles pulled from the old account's `github-actions-deployer@` service account, plus
`roles/storage.admin` needed for frontend deployment (`gsutil rsync` to bucket).

> **Note:** The Cloud Run service account (`omnitrackr-staging@`) roles
> (`roles/cloudsql.client`, `roles/logging.logWriter`, `roles/monitoring.metricWriter`,
> `roles/secretmanager.secretAccessor`) are managed by Terraform in `iam.tf` and will be
> created automatically during `terraform apply`. Only the GitHub Actions SA needs manual setup.

```bash
# Create service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for CI/CD deployments"

SA_EMAIL="github-actions-deployer@omnitrackr-staging-v2.iam.gserviceaccount.com"

# Roles matching old account (from: gcloud projects get-iam-policy --filter)
gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Additional role needed for frontend deployment (gsutil rsync to bucket)
gcloud projects add-iam-policy-binding omnitrackr-staging-v2 \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

# Generate key file
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account="${SA_EMAIL}"

# This JSON file content goes into GitHub secret GCP_SA_KEY_STAGING
cat ~/github-actions-key.json
```

**Role summary for GitHub Actions SA:**

| Role | Purpose | Source |
|------|---------|--------|
| `roles/run.admin` | Deploy Cloud Run services and jobs | Old account |
| `roles/artifactregistry.writer` | Push Docker images | Old account |
| `roles/iam.serviceAccountUser` | Act as Cloud Run service account | Old account |
| `roles/storage.admin` | Deploy frontend to Cloud Storage bucket | New (needed for `gsutil rsync`) |

---

### Phase 3: Update Terraform Configuration

The key design decision here is to use **partial backend configuration** and **separate `.tfvars` files**
so you can target different GCP projects without editing Terraform source files. This same pattern
also works for managing staging and production from a single Terraform directory later on.

#### Step 3.1 - Switch to Partial Backend Configuration

**File:** `infrastructure/terraform/staging/main.tf`

Remove the hardcoded bucket name. The bucket will be provided via `-backend-config` at init time:

```hcl
terraform {
  backend "gcs" {
    prefix = "staging"
    # bucket provided via: terraform init -backend-config="bucket=BUCKET_NAME"
  }
}
```

#### Step 3.2 - Create New `.tfvars` File, Keep Old One

Rename the current file and create the new one:

```bash
cd infrastructure/terraform/staging
cp terraform.tfvars terraform.tfvars.old    # preserve old project config for cleanup
```

**File:** `infrastructure/terraform/staging/terraform.tfvars` (update for new project)

```hcl
project_id  = "omnitrackr-staging-v2"
region      = "us-central1"
environment = "staging"
```

**File:** `infrastructure/terraform/staging/terraform.tfvars.old` (preserved for Phase 7 cleanup)

```hcl
project_id  = "omnitrackr-staging"
region      = "us-central1"
environment = "staging"
```

#### Step 3.3 - Update `variables.tf` Default

**File:** `infrastructure/terraform/staging/variables.tf`

Update the default project_id to match the new project:

```hcl
variable "project_id" {
  description = "GCP Project ID"
  default     = "omnitrackr-staging-v2"
}
```

> **Note:** This default is overridden by whichever `.tfvars` file you use, but keeping it
> in sync with the active project avoids confusion.

#### Step 3.4 - Initialize and Apply Terraform

```bash
cd infrastructure/terraform/staging

# Authenticate with the new GCP account
gcloud auth application-default login   # Use NEW account

# Re-initialize Terraform with new backend bucket
rm -rf .terraform .terraform.lock.hcl
terraform init -backend-config="bucket=omnitrackr-terraform-state-v2"

# Preview the changes (uses terraform.tfvars by default)
terraform plan

# Apply (creates all resources in the new project)
terraform apply
# Type 'yes' when prompted
# This takes ~10 minutes (Cloud SQL is the slowest)

# Note the outputs
terraform output
```

> **How switching works:** To target a different project, you re-init with a different
> `-backend-config` and use `-var-file` to load different variables. No file editing needed:
>
> ```bash
> # Target new project (day-to-day)
> terraform init -backend-config="bucket=omnitrackr-terraform-state-v2"
> terraform plan                                # uses terraform.tfvars
>
> # Target old project (one-time cleanup)
> terraform init -backend-config="bucket=omnitrackr-terraform-state" -reconfigure
> terraform destroy -var-file="terraform.tfvars.old"
> ```
>
> This same pattern scales to production: create `terraform.tfvars.prod` and a separate
> state bucket, and manage both environments from the same Terraform directory.

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

#### Step 7.3 - Destroy Old Resources with Terraform

Thanks to the partial backend config and separate `.tfvars` files set up in Phase 3, we can
point Terraform at the old project's state and destroy everything — no file editing required.

```bash
cd infrastructure/terraform/staging

# Authenticate with the OLD GCP account
gcloud auth application-default login   # Use OLD Google account
gcloud config set project omnitrackr-staging

# Re-initialize Terraform against the OLD state bucket
rm -rf .terraform .terraform.lock.hcl
terraform init -backend-config="bucket=omnitrackr-terraform-state" -reconfigure

# First, disable deletion protection on Cloud SQL
# Temporarily edit cloud_sql.tf: change deletion_protection = true to false
# Then apply just that change against the old project:
terraform apply -var-file="terraform.tfvars.old" -target=google_sql_database_instance.postgres

# Now destroy all Terraform-managed resources in the old project
terraform destroy -var-file="terraform.tfvars.old"
# Type 'yes' when prompted
```

> **DNS zone is safe** — Cloud DNS is not managed by Terraform, so `terraform destroy`
> will not touch the DNS zone for `omnitrackr.dev`.

#### Step 7.4 - Switch Terraform Back to New Project

```bash
# Revert the deletion_protection change in cloud_sql.tf back to true

# Re-initialize against the NEW state bucket
rm -rf .terraform .terraform.lock.hcl
terraform init -backend-config="bucket=omnitrackr-terraform-state-v2"

# Verify everything is intact
terraform plan
# Should show "No changes. Your infrastructure matches the configuration."
```

#### Step 7.5 - Clean Up Old State Bucket and Local Files

```bash
# Delete the old Terraform state bucket (no longer needed)
gsutil rm -r gs://omnitrackr-terraform-state

# Delete the service account key
rm ~/github-actions-key.json

# Delete the temporary secrets file
rm /tmp/old-secrets.txt

# Optional: remove the old tfvars file now that cleanup is done
rm infrastructure/terraform/staging/terraform.tfvars.old
```

---

## Important Notes

1. **Cloud DNS stays in old account** - DNS is managed via GCP Console (not Terraform), so `terraform destroy` in Phase 7 will not touch it. The zone will continue to work even after the free trial expires (DNS is very cheap, ~$0.20/month per zone). You can move it to GoDaddy later at your convenience.

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

| File | Change |
|------|--------|
| `infrastructure/terraform/staging/main.tf` | Remove hardcoded bucket; use partial backend config (`-backend-config` at init time) |
| `infrastructure/terraform/staging/terraform.tfvars` | project_id: `omnitrackr-staging` -> `omnitrackr-staging-v2` |
| `infrastructure/terraform/staging/terraform.tfvars.old` | **New file** — copy of original `terraform.tfvars` before changes (for Phase 7 cleanup) |
| `infrastructure/terraform/staging/variables.tf` | Default project_id: `omnitrackr-staging` -> `omnitrackr-staging-v2` |

## Multi-Environment Pattern

The partial backend config + separate `.tfvars` approach used for this migration is the same
pattern you can use to manage **staging and production from a single Terraform directory**:

```bash
infrastructure/terraform/staging/
  main.tf                  # Shared config (no hardcoded bucket)
  variables.tf             # Shared variable definitions
  terraform.tfvars         # Staging values (active)
  terraform.tfvars.prod    # Production values (future)
  terraform.tfvars.old     # Old project values (cleanup, then delete)
  *.tf                     # Shared resource definitions
```

```bash
# Deploy to staging
terraform init -backend-config="bucket=omnitrackr-terraform-state-v2"
terraform apply                                    # uses terraform.tfvars

# Deploy to production (same directory, different state + vars)
terraform init -backend-config="bucket=omnitrackr-terraform-state-prod" -reconfigure
terraform apply -var-file="terraform.tfvars.prod"
```

This avoids duplicating Terraform files across separate `staging/` and `production/` directories.
All resource definitions (`.tf` files) are shared; only the variable values and state backends differ.
