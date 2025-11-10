# Load Balancer & Frontend Deployment Guide

This guide covers the deployment of the frontend application using Google Cloud Load Balancer, Cloud Storage, and SSL certificates.

## Architecture Overview

```
User
  ↓
Cloud Load Balancer (HTTPS + SSL)
  ├─> /* → Cloud Storage Bucket (React frontend)
  └─> /api/* → Cloud Run (Backend API)
```

## What Was Added

### Terraform Resources

#### 1. **storage.tf**
- Cloud Storage bucket for hosting static frontend files
- Public read access configuration
- Lifecycle policies for cleanup

#### 2. **load_balancer.tf**
- Global static IP address
- Google-managed SSL certificate for `staging.omnitrackr.dev`
- Backend bucket for Cloud Storage
- Serverless NEG for Cloud Run API
- URL map with routing rules
- HTTPS proxy and forwarding rules
- HTTP to HTTPS redirect

#### 3. **main.tf** (updated)
- Added Compute Engine API
- Added Cloud Storage APIs

#### 4. **outputs.tf** (updated)
- Load balancer IP address
- Bucket information
- SSL certificate status
- Deployment instructions

### GitHub Actions Workflows

#### 5. **deploy-frontend-staging.yml** (new)
- Builds React frontend with staging environment
- Deploys to Cloud Storage bucket
- Sets cache headers for optimal performance
- Triggers on frontend file changes or manual dispatch

#### 6. **deploy-staging.yml** (updated)
- Updated deployment summary to include load balancer URL
- Added note about separate frontend deployment

## Deployment Steps

### Step 1: Apply Terraform Configuration

```bash
cd infrastructure/terraform/staging
terraform init
terraform plan
terraform apply
```

**Expected output:**
- Load balancer IP address
- Bucket name: `omnitrackr-staging-frontend`
- SSL certificate status (initially "PROVISIONING")

### Step 2: Configure DNS

Point your DNS A record to the load balancer IP:

```
Name: staging.omnitrackr.dev
Type: A
Value: <load_balancer_ip from terraform output>
TTL: 300
```

**Important:** SSL certificate provisioning requires DNS to be configured first. It takes 15-30 minutes after DNS propagation.

### Step 3: Wait for SSL Certificate

Check certificate status:

```bash
terraform output ssl_certificate_status
```

Or via GCP Console:
- Navigate to **Load Balancing** → **Certificates**
- Wait for status to change from "PROVISIONING" to "ACTIVE"

### Step 4: Deploy Frontend (Manual - First Time)

```bash
# From project root
cd packages/frontend

# Build for staging
npm run build:staging

# Deploy to bucket
gsutil -m rsync -r -d dist/ gs://omnitrackr-staging-frontend/

# Set cache headers for HTML
gsutil setmeta -h "Cache-Control:no-cache" gs://omnitrackr-staging-frontend/index.html

# Set cache headers for assets
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
  "gs://omnitrackr-staging-frontend/assets/*"
```

### Step 5: Verify Deployment

Test the following URLs:

1. **Frontend**: https://staging.omnitrackr.dev
2. **API Health**: https://staging.omnitrackr.dev/api/health
3. **Direct Cloud Run** (should still work): `<cloud_run_url from terraform output>`

### Step 6: Enable Automated Deployments

Once the initial deployment is successful, GitHub Actions will handle future deployments automatically:

- **Backend changes**: Push to `develop` branch → `deploy-staging` workflow runs
- **Frontend changes**: Push to `develop` branch with frontend changes → `deploy-frontend-staging` workflow runs
- **Manual frontend deployment**: Go to Actions tab → Run `Deploy Frontend to Staging` workflow

## Troubleshooting

### SSL Certificate Not Provisioning

**Symptoms:** Certificate status stays "PROVISIONING" for > 30 minutes

**Solutions:**
1. Verify DNS is correctly configured and propagated
   ```bash
   dig staging.omnitrackr.dev
   nslookup staging.omnitrackr.dev
   ```
2. Check that DNS points to the correct load balancer IP
3. Wait up to 24 hours (though it usually takes 15-30 minutes)
4. Ensure domain ownership is verified in GCP Console

### Frontend Not Loading

**Symptoms:** 404 errors or blank page

**Solutions:**
1. Check bucket has files:
   ```bash
   gsutil ls gs://omnitrackr-staging-frontend/
   ```
2. Verify index.html exists:
   ```bash
   gsutil cat gs://omnitrackr-staging-frontend/index.html
   ```
3. Check bucket is public:
   ```bash
   gsutil iam get gs://omnitrackr-staging-frontend/
   ```
4. Verify load balancer backend bucket configuration in GCP Console

### API Requests Failing

**Symptoms:** `/api/*` requests return errors

**Solutions:**
1. Verify Cloud Run service is running:
   ```bash
   gcloud run services describe omnitrackr-api --region=us-central1
   ```
2. Test direct Cloud Run URL
3. Check URL map routing rules in GCP Console
4. Verify backend service health in Load Balancing console
5. Check Cloud Run logs for errors

## Useful Commands

### View Terraform Outputs
```bash
cd infrastructure/terraform/staging
terraform output
```

### Check SSL Certificate Status
```bash
gcloud compute ssl-certificates describe staging-frontend-cert --global
```

### List Bucket Contents
```bash
gsutil ls -r gs://omnitrackr-staging-frontend/
```

### View Load Balancer Details
```bash
gcloud compute url-maps describe staging-frontend-lb
gcloud compute backend-services describe staging-api-backend --global
gcloud compute backend-buckets describe staging-frontend-backend
```

### Test API Endpoint
```bash
curl https://staging.omnitrackr.dev/api/health
```

### Manually Trigger Frontend Deployment
```bash
# Via GitHub CLI
gh workflow run deploy-frontend-staging.yml

# Or push a commit to develop branch with frontend changes
```

## Cost Considerations

**Estimated Monthly Costs (Staging):**
- Cloud Load Balancer: ~$18/month (base + forwarding rules)
- Cloud Storage (100GB): ~$2.50/month
- SSL Certificate (managed): Free
- Egress (10GB): ~$1.20/month
- Cloud Run API: ~$5-10/month (depends on usage)

**Total: ~$25-30/month**

To reduce costs:
- Set lower min instances for Cloud Run (currently 1)
- Enable lifecycle policies on storage bucket (already configured)
- Use Cloud CDN if traffic increases (disabled for now as requested)

## Next Steps

1. **Apply Terraform** to create the infrastructure
2. **Configure DNS** to point to the load balancer IP
3. **Wait for SSL certificate** to provision
4. **Deploy frontend manually** for the first time
5. **Verify everything works** at https://staging.omnitrackr.dev
6. **Future deployments** will be automatic via GitHub Actions

## Production Deployment

To deploy to production:
1. Copy `staging/` Terraform files to `production/`
2. Update variables:
   - `project_id = "omnitrackr-production"`
   - `environment = "production"`
   - Domain to `omnitrackr.dev` or `app.omnitrackr.com`
3. Update GitHub Actions secrets for production
4. Apply Terraform and follow the same steps above

## Security Notes

- SSL/TLS 1.2+ enforced by default
- HTTPS redirect enabled for all HTTP traffic
- Cloud Storage bucket has public read access (required for web hosting)
- Cloud Run API accessible via load balancer and direct URL
- Consider adding Cloud Armor for DDoS protection in production
- Consider restricting Cloud Run ingress to load balancer only in production

## Support

For issues or questions:
- Check Terraform state: `terraform show`
- View GCP logs: Cloud Console → Logging
- Check GitHub Actions logs: Repository → Actions tab
- Review this guide's troubleshooting section
