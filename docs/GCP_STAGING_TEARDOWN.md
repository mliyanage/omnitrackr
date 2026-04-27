# GCP Staging Teardown Guide

Teardown steps for `omnitrackr-staging-v2` when pausing to save GCP credits.
When ready to demo again, follow `GCP_STAGING_MIGRATION_PLAN.md` to bring everything back up in a fresh account.

## Current Infrastructure (as of 2026-04-20)

| Resource | Details |
|----------|---------|
| **GCP Project** | `omnitrackr-staging-v2` |
| **GCP Account** | `deepanimunasin@gmail.com` |
| **Cloud SQL** | `omnitrackr-staging-db` (PostgreSQL 15, `34.71.126.105`) |
| **Cloud Run API** | `omnitrackr-api-staging` |
| **Frontend Bucket** | `gs://omnitrackr-staging-v2-frontend` |
| **Load Balancer IP** | `34.49.65.41` |
| **Terraform State** | `gs://omnitrackr-terraform-state-v2/` |
| **Cloud DNS** | Managed separately — **do not delete** |

---

## Step 1 — Back Up the Database

**Do this first. There are no existing backup files.**

```bash
# Switch to the correct project and account
gcloud config set project omnitrackr-staging-v2

# Get DB credentials
DB_HOST="34.71.126.105"
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password" --project=omnitrackr-staging-v2)

# Dump database (custom format — use this for pg_restore)
pg_dump "postgresql://omnitrackr_user:${DB_PASSWORD}@${DB_HOST}:5432/omnitrackr" \
  --format=custom \
  --file=$HOME/omnitrackr-staging-backup-$(date +%Y%m%d).dump

# Also dump as plain SQL (fallback / readable)
pg_dump "postgresql://omnitrackr_user:${DB_PASSWORD}@${DB_HOST}:5432/omnitrackr" \
  --format=plain \
  --file=$HOME/omnitrackr-staging-backup-$(date +%Y%m%d).sql

# Verify the dump is not empty
ls -lh $HOME/omnitrackr-staging-backup-*.dump
```

---

## Step 2 — Save Current Secrets

```bash
echo "DB_PASSWORD: $(gcloud secrets versions access latest --secret='db-password' --project=omnitrackr-staging-v2)" > ~/omnitrackr-staging-secrets.txt
echo "JWT_SECRET: $(gcloud secrets versions access latest --secret='jwt-secret' --project=omnitrackr-staging-v2)" >> ~/omnitrackr-staging-secrets.txt
echo "DB_CONN_STRING: $(gcloud secrets versions access latest --secret='db-connection-string' --project=omnitrackr-staging-v2)" >> ~/omnitrackr-staging-secrets.txt

cat ~/omnitrackr-staging-secrets.txt
```

> Keep `~/omnitrackr-staging-secrets.txt` and `~/omnitrackr-staging-backup-*.dump` somewhere safe
> (e.g. an encrypted external drive or personal cloud storage). These files are not committed to git.

---

## Step 3 — Pause Cloud Scheduler

Stop the cron triggers so no workers fire during teardown.

```bash
gcloud scheduler jobs list --location=us-central1 --project=omnitrackr-staging-v2

# Pause each job (replace names if different)
gcloud scheduler jobs pause omnitrackr-polling-worker-staging-trigger --location=us-central1 --project=omnitrackr-staging-v2
gcloud scheduler jobs pause omnitrackr-sla-monitor-staging-trigger --location=us-central1 --project=omnitrackr-staging-v2
```

---

## Step 4 — Destroy Infrastructure via Terraform

```bash
cd /Users/manjulaliyanage/dev/omnitrackr/infrastructure/terraform/staging

# Make sure you're authenticated with the correct account
gcloud auth application-default login   # use deepanimunasin@gmail.com
gcloud config set project omnitrackr-staging-v2

# Ensure Terraform is pointing at the v2 state bucket
rm -rf .terraform .terraform.lock.hcl
terraform init -backend-config="bucket=omnitrackr-terraform-state-v2"

# Temporarily disable deletion protection on Cloud SQL (required before destroy)
# Edit infrastructure/terraform/staging/cloud_sql.tf:
#   deletion_protection = true  →  deletion_protection = false
# Then apply just that change:
terraform apply -target=google_sql_database_instance.postgres
```

Once deletion protection is disabled:

```bash
# Destroy all Terraform-managed resources
terraform destroy
# Type 'yes' when prompted
# This takes ~5-10 minutes
```

> **Cloud DNS is safe** — the DNS zone is not managed by Terraform and will not be touched.

---

## Step 5 — Restore deletion_protection After Destroy

Revert `cloud_sql.tf` back to `deletion_protection = true` and commit so the file is
correct for the next migration.

```bash
# After destroy completes, revert the file
# Then commit:
git add infrastructure/terraform/staging/cloud_sql.tf
git commit -m "chore: restore deletion_protection after staging teardown"
```

---

## Step 6 — Clean Up Local Files (Optional)

After you've safely stored the backups elsewhere:

```bash
# Delete the temporary secrets file (sensitive — don't leave it lying around)
rm ~/omnitrackr-staging-secrets.txt

# Delete service account key if one was generated
rm -f ~/github-actions-key.json
```

Keep the `.dump` and `.sql` backup files until you've verified the next migration restore works.

---

## Restoring Later (Demo Setup)

When you need to bring the app back up for a demo, follow `GCP_STAGING_MIGRATION_PLAN.md`
starting from **Phase 2** (new GCP project) using the backup files created above.

Key inputs you'll need:
- `~/omnitrackr-staging-backup-YYYYMMDD.dump` — for `pg_restore`
- A new GCP free-trial account
- `terraform.tfvars.old` already exists in the repo as a reference
