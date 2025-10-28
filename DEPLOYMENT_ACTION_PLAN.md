# OmniTrackr Deployment Action Plan

Step-by-step plan to deploy to AWS with GitHub Actions automation.

---

## 📊 Summary of Recommendation

**Selected Provider:** **AWS**
- **Staging Cost:** ~$75-100/month
- **Production Cost:** ~$300-500/month (start), scales to $1,000-2,000/month
- **Timeline:** 1-2 weeks to full production deployment

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

## 🏗️ Phase 2: AWS Infrastructure Setup (Week 1)

### **Day 1: AWS Account & IAM**

1. **Create/Access AWS Account**
   - Sign up at https://aws.amazon.com
   - Enable MFA on root account
   - Set up billing alerts

2. **Create IAM Users**
   ```
   terraform-admin  → For infrastructure provisioning
   github-actions   → For CI/CD deployments
   developer        → For manual access
   ```

3. **Create IAM Policies** (see GITHUB_AND_CICD_SETUP.md)

### **Day 2-3: Infrastructure as Code**

**Option A: AWS CDK (Recommended)**

```bash
# Install AWS CDK
npm install -g aws-cdk

# Create infrastructure package
mkdir -p infrastructure/cdk
cd infrastructure/cdk
cdk init app --language=typescript

# Define stacks:
# - NetworkStack (VPC, subnets)
# - DatabaseStack (RDS)
# - ComputeStack (ECS, ECR)
# - MonitoringStack (CloudWatch)
```

**Option B: Terraform**

```bash
# Create infrastructure
mkdir -p infrastructure/terraform
cd infrastructure/terraform

# Files to create:
# - vpc.tf
# - rds.tf
# - ecs.tf
# - ecr.tf
# - secrets.tf
# - variables.tf
```

**What to Provision:**

**Staging:**
- VPC with public/private subnets
- RDS PostgreSQL (db.t3.micro)
- ECS Cluster with Fargate
- ECR repositories (api, worker)
- Application Load Balancer
- Secrets Manager setup
- CloudWatch Logs

**Production** (same as staging but bigger):
- RDS PostgreSQL (db.t3.medium, Multi-AZ)
- ECS with auto-scaling
- Production ALB with WAF

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
# Create migration job in ECS
# Task Definition: omnitrackr-migrate

# Run migrations before deployment
aws ecs run-task \
  --cluster omnitrackr-staging \
  --task-definition omnitrackr-migrate \
  --launch-type FARGATE
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
# Add secrets via GitHub CLI
gh secret set AWS_ACCESS_KEY_ID
gh secret set AWS_SECRET_ACCESS_KEY
gh secret set AWS_REGION --body "us-east-1"
gh secret set ECR_REGISTRY --body "123456789012.dkr.ecr.us-east-1.amazonaws.com"

# Production secrets (separate)
gh secret set AWS_ACCESS_KEY_ID_PROD
gh secret set AWS_SECRET_ACCESS_KEY_PROD
```

### **Day 8: First Deployment to Staging**

```bash
# Push to develop branch to trigger deployment
git checkout develop
git push origin develop

# Monitor deployment
gh run watch

# Verify
curl https://staging.omnitrackr.com/api/health
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
- AWS Free Tier eligible
- Actual cost: ~$50-100/month
  - Staging only
  - Minimal traffic
  - t3.micro instances

### **Month 2-3 (Early Production):**
- ~$300-400/month
  - Staging: $75/month
  - Production: $250/month
  - <100 customers
  - Minimal auto-scaling

### **Month 6 (Growth):**
- ~$800-1,000/month
  - Scaling to handle 500-1,000 customers
  - Auto-scaling enabled
  - Read replicas added

### **Year 1:**
- Total: ~$6,000-10,000
- Per customer (1,000 customers): $6-10/month
- With $50/customer pricing: 10-20% cost ratio ✅

---

## 🎓 Learning Resources

### **AWS:**
- ECS Fargate: https://aws.amazon.com/fargate/
- RDS PostgreSQL: https://aws.amazon.com/rds/postgresql/
- Secrets Manager: https://aws.amazon.com/secrets-manager/

### **GitHub Actions:**
- Workflow syntax: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- AWS Actions: https://github.com/aws-actions

### **Docker:**
- Multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Best practices: https://docs.docker.com/develop/dev-best-practices/

---

## ✅ Success Criteria

### **Week 1 Complete:**
- [x] Code pushed to GitHub
- [ ] AWS infrastructure provisioned
- [ ] Staging environment deployed
- [ ] CI/CD pipeline working
- [ ] Basic monitoring set up

### **Week 2 Complete:**
- [ ] Production environment ready
- [ ] Domain configured
- [ ] SSL certificates in place
- [ ] First production deployment successful
- [ ] Team trained on process

---

## 🆘 Rollback Plan

### **If Deployment Fails:**

1. **Automatic Rollback** (ECS Blue/Green)
   - ECS automatically reverts to previous task definition
   - No manual intervention needed

2. **Manual Rollback**
   ```bash
   # Revert to previous image
   aws ecs update-service \
     --cluster omnitrackr-prod \
     --service omnitrackr-api-prod \
     --task-definition omnitrackr-api-prod:PREVIOUS_REVISION
   ```

3. **Emergency Rollback**
   - Revert git commit
   - Force push to master (with caution)
   - Triggers automatic redeployment

---

## 📞 Next Steps

**Ready to start?** Here's what to do:

1. ✅ **Read this plan** - Make sure you understand each phase
2. ✅ **Push to GitHub** - Execute Phase 1 today
3. ✅ **Create AWS account** - Start Phase 2 this week
4. ✅ **Set up infrastructure** - Use CDK or Terraform
5. ✅ **Deploy to staging** - Test everything
6. ✅ **Deploy to production** - Go live!

**Questions or concerns?**
- Review the detailed docs in `docs/`
- AWS has excellent documentation
- GitHub Actions has great examples

---

## 📊 Progress Tracking

| Phase | Status | Est. Time | Actual Time |
|-------|--------|-----------|-------------|
| 1. GitHub Setup | ⏳ Pending | 30 min | - |
| 2. AWS Account | ⏳ Pending | 1 hour | - |
| 3. Infrastructure | ⏳ Pending | 3 days | - |
| 4. Dockerfiles | ⏳ Pending | 1 day | - |
| 5. CI/CD Setup | ⏳ Pending | 2 days | - |
| 6. Staging Deploy | ⏳ Pending | 1 day | - |
| 7. Testing | ⏳ Pending | 2 days | - |
| 8. Prod Deploy | ⏳ Pending | 1 day | - |

**Target:** Production ready in 10-14 days

---

_Last Updated: 2025-10-27_
_Ready to deploy? Let's do this! 🚀_
