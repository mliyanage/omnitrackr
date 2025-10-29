# OmniTrackr Deployment Action Plan

Step-by-step plan to deploy to GCP with GitHub Actions automation.

---

## 📊 Summary of Recommendation

**Selected Provider:** **GCP (Google Cloud Platform)**
- **Staging Cost:** ~$50-80/month (40% cheaper than AWS)
- **Production Cost:** ~$300-420/month (start), scales to $600-800/month
- **Secrets Cost:** $0.06/secret (85% cheaper than AWS)
- **Timeline:** 1-2 weeks to full production deployment
- **Key Advantage:** Cloud Run serverless containers - simple, fast, cost-effective

---

## 🎯 Phase 1: Push to GitHub (Today - 30 minutes)

### **Step 1: Commit and Push**

```bash
cd /Users/manjulaliyanage/dev/omnitrackr

# Check status
git status

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: OmniTrackr SaaS Platform

Features:
- Complete REST API for S3 file source management
- Multi-tenant credential storage architecture
- PostgreSQL database with migrations
- Comprehensive testing (28 passing tests)
- Docker Compose for local development
- Complete documentation
- Postman collection

Tech Stack:
- Node.js 20 + TypeScript
- Express.js REST API
- PostgreSQL 15
- Jest testing
- Docker"

# Create GitHub repo (using GitHub CLI)
gh auth login
gh repo create omnitrackr --private --source=. --remote=origin --push

# Or manually:
# Create repo on GitHub.com
# git remote add origin https://github.com/YOUR_USERNAME/omnitrackr.git
# git push -u origin master

# Create develop branch
git checkout -b develop
git push -u origin develop
```

### **Step 2: Set Up Branch Protection**

Via GitHub UI:
1. Go to Settings → Branches
2. Add rule for `master`:
   - ✅ Require pull request reviews (1 approval)
   - ✅ Require status checks (CI must pass)
   - ✅ Require branches to be up to date
3. Add rule for `develop`:
   - ✅ Require status checks

---

## 🏗️ Phase 2: GCP Infrastructure Setup (Week 1)

### **Day 1: GCP Account & Project Setup**

1. **Create/Access GCP Account**
   - Sign up at https://console.cloud.google.com
   - $300 free credits for new accounts (90 days)
   - Enable billing account
   - Set up billing alerts

2. **Create GCP Project**
   ```bash
   # Using gcloud CLI
   gcloud projects create omnitrackr-prod --name="OmniTrackr Production"
   gcloud projects create omnitrackr-staging --name="OmniTrackr Staging"

   # Set default project
   gcloud config set project omnitrackr-staging
   ```

3. **Enable Required APIs**
   ```bash
   gcloud services enable \
     run.googleapis.com \
     sqladmin.googleapis.com \
     secretmanager.googleapis.com \
     cloudbuild.googleapis.com \
     containerregistry.googleapis.com \
     cloudscheduler.googleapis.com \
     logging.googleapis.com \
     monitoring.googleapis.com
   ```

4. **Create Service Accounts**
   ```bash
   # For GitHub Actions deployments
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions Deployment"

   # For Cloud Run services
   gcloud iam service-accounts create omnitrackr-api \
     --display-name="OmniTrackr API Service"
   ```

### **Day 2-3: Infrastructure as Code**

**Option A: Terraform (Recommended for GCP)**

```bash
# Create infrastructure
mkdir -p infrastructure/terraform/staging
mkdir -p infrastructure/terraform/production

cd infrastructure/terraform/staging

# Files to create:
# - main.tf (provider configuration)
# - cloud_run.tf (API and Worker services)
# - cloud_sql.tf (PostgreSQL database)
# - secrets.tf (Secret Manager)
# - iam.tf (Service accounts and permissions)
# - variables.tf
# - outputs.tf
```

**Option B: Manual Setup (Quick Start)**

```bash
# Create Cloud SQL instance (staging)
gcloud sql instances create omnitrackr-staging-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create omnitrackr \
  --instance=omnitrackr-staging-db

# Store database credentials in Secret Manager
echo -n "your-db-password" | gcloud secrets create db-password \
  --data-file=- \
  --replication-policy="automatic"
```

**What to Provision:**

**Staging:**
- Cloud SQL PostgreSQL (db-f1-micro)
- Secret Manager secrets (db credentials, JWT secret)
- Cloud Run services (API, Worker)
- Cloud Scheduler (for worker cron jobs)
- Cloud Logging and Monitoring

**Production** (same as staging but bigger):
- Cloud SQL PostgreSQL (db-n1-standard-1, High Availability)
- Cloud Run with higher limits and min instances
- Cloud Armor (WAF protection)
- Additional monitoring and alerting

### **Day 4: Create Dockerfiles**

Already documented in `GITHUB_AND_CICD_SETUP.md`:
- `packages/api/Dockerfile`
- `packages/worker/Dockerfile` (when ready)

Test locally:
```bash
# Build API
docker build -t omnitrackr/api:local -f packages/api/Dockerfile .

# Run locally
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=omnitrackr_dev \
  omnitrackr/api:local
```

### **Day 5: Database Migration Strategy**

```bash
# Run migrations using Cloud Run Jobs
gcloud run jobs create omnitrackr-migrate \
  --image gcr.io/omnitrackr-staging/api:latest \
  --command npm \
  --args "run,migrate" \
  --region us-central1 \
  --set-env-vars DB_HOST=<cloud-sql-ip> \
  --set-secrets DB_PASSWORD=db-password:latest

# Execute migration job
gcloud run jobs execute omnitrackr-migrate \
  --region us-central1 \
  --wait
```

---

## 🚀 Phase 3: CI/CD Setup (Week 1-2)

### **Day 6: Create GitHub Actions Workflows**

Copy workflows from `GITHUB_AND_CICD_SETUP.md`:

```bash
mkdir -p .github/workflows

# Create files:
.github/workflows/ci.yml
.github/workflows/deploy-staging.yml
.github/workflows/deploy-production.yml
.github/workflows/pr-checks.yml
```

### **Day 7: Configure GitHub Secrets**

```bash
# Create service account key for GitHub Actions
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@omnitrackr-staging.iam.gserviceaccount.com

# Add secrets via GitHub CLI
gh secret set GCP_PROJECT_ID --body "omnitrackr-staging"
gh secret set GCP_SA_KEY < github-actions-key.json
gh secret set GCP_REGION --body "us-central1"

# Production secrets (separate)
gh secret set GCP_PROJECT_ID_PROD --body "omnitrackr-prod"
gh secret set GCP_SA_KEY_PROD < github-actions-prod-key.json

# Database secrets (will be stored in GCP Secret Manager)
# These are just for reference in workflows
gh secret set DB_NAME --body "omnitrackr"
```

### **Day 8: First Deployment to Staging**

```bash
# Push to develop branch to trigger deployment
git checkout develop
git push origin develop

# Monitor deployment
gh run watch

# Alternatively, monitor via gcloud
gcloud run services describe omnitrackr-api \
  --region us-central1 \
  --platform managed

# Verify deployment
curl https://omnitrackr-api-staging-<hash>-uc.a.run.app/api/health

# Set up custom domain (optional)
gcloud run services update omnitrackr-api \
  --region us-central1 \
  --add-domain staging.omnitrackr.com
```

### **Day 9-10: Testing & Iteration**

- Run integration tests
- Test all API endpoints
- Verify database connectivity
- Check logs in CloudWatch
- Test file source creation
- Verify S3 access

---

## 🎯 Phase 4: Production Deployment (Week 2)

### **Day 11: Pre-Production Checklist**

- [ ] All staging tests passing
- [ ] Performance testing complete
- [ ] Security scan passed
- [ ] Database backups configured
- [ ] Monitoring dashboards set up
- [ ] Incident response plan ready
- [ ] Domain/SSL configured

### **Day 12: Production Infrastructure**

- Provision production infrastructure (like-for-like with staging)
- Configure production domain
- Set up CloudFront CDN
- Enable WAF rules
- Configure backup strategy

### **Day 13: First Production Deployment**

```bash
# Merge to master
git checkout master
git merge develop
git push origin master

# Workflow requires manual approval
# Approve in GitHub Actions UI

# Monitor deployment
gh run watch

# Verify
curl https://api.omnitrackr.com/api/health
```

### **Day 14: Post-Deployment**

- Monitor metrics for 24 hours
- Test all functionality
- Set up alerts
- Document runbook
- Train team on deployment process

---

## 📋 Detailed Steps for Today

### **Immediate Actions (Next 1 Hour):**

1. **Commit Your Code** (10 min)
   ```bash
   cd /Users/manjulaliyanage/dev/omnitrackr
   git add .
   git commit -m "Initial commit: Complete OmniTrackr API"
   ```

2. **Create GitHub Repository** (5 min)
   ```bash
   gh repo create omnitrackr --private --source=. --remote=origin --push
   ```

3. **Create Develop Branch** (2 min)
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

4. **Review Documentation** (15 min)
   - Read `docs/DEPLOYMENT_COMPARISON.md`
   - Review `docs/GITHUB_AND_CICD_SETUP.md`
   - Understand the architecture

5. **Set Up AWS Account** (30 min)
   - Create account if needed
   - Enable MFA
   - Create IAM user for yourself
   - Set up billing alerts

---

## 💰 Cost Breakdown

### **Month 1 (Development):**
- GCP Free Tier eligible ($300 credits)
- Actual cost: ~$30-50/month (with free tier credits)
  - Staging only
  - Minimal traffic
  - db-f1-micro instance
  - Cloud Run auto-scales to zero

### **Month 2-3 (Early Production):**
- ~$350-430/month
  - Staging: $50-80/month
  - Production: $300-350/month
  - <100 customers
  - Auto-scaling based on traffic

### **Month 6 (Growth):**
- ~$650-800/month
  - Scaling to handle 500-1,000 customers
  - Auto-scaling enabled
  - Read replicas added
  - Secrets: $30-60/month (vs AWS $200-400/month)

### **Year 1:**
- Total: ~$5,000-7,000 (vs AWS $6,000-10,000)
- Per customer (1,000 customers): $5-7/month
- With $50/customer pricing: 10-14% cost ratio ✅
- **Savings vs AWS**: $1,000-3,000/year

---

## 🎓 Learning Resources

### **GCP:**
- Cloud Run: https://cloud.google.com/run/docs
- Cloud SQL PostgreSQL: https://cloud.google.com/sql/docs/postgres
- Secret Manager: https://cloud.google.com/secret-manager/docs
- Cloud Build: https://cloud.google.com/build/docs

### **GitHub Actions:**
- Workflow syntax: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- GCP Actions: https://github.com/google-github-actions

### **Docker:**
- Multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Best practices: https://docs.docker.com/develop/dev-best-practices/

### **GCP CLI (gcloud):**
- Installation: https://cloud.google.com/sdk/docs/install
- Quickstart: https://cloud.google.com/sdk/docs/quickstarts

---

## ✅ Success Criteria

### **Week 1 Complete:**
- [x] Code pushed to GitHub
- [ ] GCP projects created (staging & production)
- [ ] Cloud SQL PostgreSQL provisioned
- [ ] Cloud Run services deployed (staging)
- [ ] CI/CD pipeline working
- [ ] Basic monitoring set up

### **Week 2 Complete:**
- [ ] Production environment ready
- [ ] Custom domain configured
- [ ] SSL certificates automatic (Cloud Run managed)
- [ ] First production deployment successful
- [ ] Team trained on gcloud CLI and GCP Console

---

## 🆘 Rollback Plan

### **If Deployment Fails:**

1. **Automatic Rollback** (Cloud Run Traffic Splitting)
   - Cloud Run keeps previous revision active
   - Traffic automatically routes to healthy revision
   - Zero downtime

2. **Manual Rollback via Traffic Split**
   ```bash
   # List revisions
   gcloud run revisions list \
     --service omnitrackr-api \
     --region us-central1

   # Route 100% traffic to previous revision
   gcloud run services update-traffic omnitrackr-api \
     --to-revisions=omnitrackr-api-previous=100 \
     --region us-central1
   ```

3. **Rollback Specific Revision**
   ```bash
   # Revert to specific revision
   gcloud run services update omnitrackr-api \
     --image gcr.io/omnitrackr-prod/api:PREVIOUS_TAG \
     --region us-central1
   ```

4. **Emergency Rollback**
   - Revert git commit
   - Push to branch
   - Triggers automatic redeployment with previous code

---

## 📞 Next Steps

**Ready to start?** Here's what to do:

1. ✅ **Read this plan** - Make sure you understand each phase
2. ✅ **Push to GitHub** - Execute Phase 1 today
3. ✅ **Create GCP account** - Get $300 free credits
4. ✅ **Install gcloud CLI** - Required for GCP management
5. ✅ **Set up infrastructure** - Use Terraform or manual setup
6. ✅ **Deploy to staging** - Test with Cloud Run
7. ✅ **Deploy to production** - Go live!

**Why GCP over AWS?**
- 40% cheaper ($50-80 vs $65-100 staging)
- 85% cheaper secrets ($0.06 vs $0.40 per secret)
- Cloud Run simplicity (no cluster management)
- Fast deployments (seconds vs minutes)
- Auto-scale to zero (save costs)

**Questions or concerns?**
- Review the detailed docs in `docs/`
- GCP has excellent documentation: https://cloud.google.com/docs
- Cloud Run quickstart: https://cloud.google.com/run/docs/quickstarts
- GitHub Actions has great GCP examples

---

## 📊 Progress Tracking

| Phase | Status | Est. Time | Actual Time |
|-------|--------|-----------|-------------|
| 1. GitHub Setup | ✅ Complete | 30 min | - |
| 2. GCP Account | ⏳ Pending | 1 hour | - |
| 3. Infrastructure | ⏳ Pending | 2 days | - |
| 4. Dockerfiles | ⏳ Pending | 1 day | - |
| 5. CI/CD Setup | ⏳ Pending | 2 days | - |
| 6. Staging Deploy | ⏳ Pending | 1 day | - |
| 7. Testing | ⏳ Pending | 2 days | - |
| 8. Prod Deploy | ⏳ Pending | 1 day | - |

**Target:** Production ready in 10-14 days
**Note:** GCP Cloud Run is simpler than AWS ECS, potentially saving 1-2 days on infrastructure setup

---

_Last Updated: 2025-10-27_
_Ready to deploy? Let's do this! 🚀_
