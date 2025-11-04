# GitHub Actions CI/CD Setup Guide

This document outlines the setup required for the OmniTrackr GitHub Actions CI/CD pipeline.

## Workflow Overview

### 1. PR Checks (`pr-checks.yml`)
- **Triggers:** Pull requests to `develop` or `master` branches
- **Actions:**
  - Installs dependencies
  - Runs linting (`npm run lint`)
  - Runs tests (`npm run test`)
  - Builds all packages (`npm run build`)
  - Uploads test coverage reports

### 2. Deploy to Staging (`deploy-staging.yml`)
- **Triggers:** Push to `develop` branch
- **Actions:**
  - Runs tests and linting
  - Builds Docker image
  - Pushes to GCP Artifact Registry
  - Deploys to Cloud Run (staging environment)
  - **Config:** Min 0 instances, Max 10, 512Mi memory, 1 CPU

### 3. Deploy to Production (`deploy-production.yml`)
- **Triggers:** Push to `master` branch
- **Actions:**
  - Runs tests and linting
  - Builds Docker image
  - Pushes to GCP Artifact Registry
  - Deploys to Cloud Run (production environment)
  - **Config:** Min 1 instance, Max 100, 1Gi memory, 2 CPUs
  - Uses GitHub environment protection

## Required GitHub Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions

### Staging Secrets

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `GCP_PROJECT_ID_STAGING` | GCP project ID for staging | Your staging GCP project ID (e.g., `omnitrackr-staging`) |
| `GCP_SA_KEY_STAGING` | Service account key JSON for staging | See "Creating Service Account" section below |

### Production Secrets

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `GCP_PROJECT_ID_PROD` | GCP project ID for production | Your production GCP project ID |
| `GCP_SA_KEY_PROD` | Service account key JSON for production | See "Creating Service Account" section below |

Step 1: Add Staging Secrets (Repository Secrets)

  1. Click "New repository secret" button (green button in your screenshot)
  2. Add first secret:
    - Name: GCP_PROJECT_ID_STAGING
    - Value: omnitrackr-staging (or your actual project ID)
    - Click "Add secret"
  3. Add second secret:
    - Name: GCP_SA_KEY_STAGING
    - Value: (paste the entire JSON content from your service account key file)
    - Click "Add secret"

  Step 2: Create Production Environment

  1. Go to Settings → Environments
  2. Click "New environment"
  3. Name it: production
  4. Configure protection rules:
    - ☑️ Required reviewers - Select team members who can approve
    - ☑️ Wait timer (optional) - e.g., 5 minutes delay
    - ☑️ Deployment branches - Only master branch
  5. Click "Configure environment"

  Step 3: Add Production Secrets (Environment Secrets)

  1. While still in the production environment settings
  2. Scroll to "Environment secrets" section
  3. Click "Add secret"
  4. Add secrets:
    - Name: GCP_PROJECT_ID_PROD
    - Value: Your production project ID
    - Name: GCP_SA_KEY_PROD
    - Value: Production service account JSON key

## GCP Setup Instructions

### 1. Enable Required APIs

For both staging and production GCP projects:

```bash
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  containerregistry.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
# Create repository for Docker images
gcloud artifacts repositories create omnitrackr \
  --repository-format=docker \
  --location=us-central1 \
  --description="OmniTrackr Docker images"
```

### 3. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for GitHub Actions deployments"

# Get the service account email
SA_EMAIL="github-actions-deployer@omnitrackr-staging.iam.gserviceaccount.com"

# Grant required permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=$SA_EMAIL
```

### 4. Add Service Account Key to GitHub Secrets

1. Open the downloaded `github-actions-key.json` file
2. Copy the entire JSON content
3. Go to GitHub repository → Settings → Secrets and variables → Actions
4. Click "New repository secret"
5. Name: `GCP_SA_KEY_STAGING` (or `GCP_SA_KEY_PROD` for production)
6. Value: Paste the entire JSON content
7. Click "Add secret"

**Important:** Delete the local `github-actions-key.json` file after adding to GitHub:
```bash
rm github-actions-key.json
```

### 5. Configure GitHub Environment (Optional but Recommended)

For production deployments with manual approval:

1. Go to Settings → Environments
2. Create new environment named `production`
3. Add protection rules:
   - Required reviewers (select team members who can approve production deployments)
   - Wait timer (optional delay before deployment)
4. Add environment secrets if different from repository secrets

## Customization Guide

### Adjusting Cloud Run Configuration

Edit the `gcloud run deploy` command in the workflow files:

**Staging (`deploy-staging.yml`):**
```yaml
--min-instances=0          # Scale to zero when idle
--max-instances=10         # Max concurrent instances
--memory=512Mi             # Memory per instance
--cpu=1                    # CPU allocation
--timeout=300              # Request timeout (seconds)
--concurrency=80           # Requests per instance
```

**Production (`deploy-production.yml`):**
```yaml
--min-instances=1          # Always-on (no cold starts)
--max-instances=100        # Higher ceiling for production
--memory=1Gi              # More memory for production
--cpu=2                   # More CPU for production
```

### Changing GCP Region

Update the `GCP_REGION` environment variable in the workflow files:
```yaml
env:
  GCP_REGION: us-central1  # Change to your preferred region
```

### Adding Environment Variables to Cloud Run

Add to the `gcloud run deploy` command:
```yaml
--set-env-vars="NODE_ENV=staging,DATABASE_URL=...,API_KEY=..."
```

Or use secrets from Google Secret Manager:
```yaml
--set-secrets="DATABASE_URL=database-url:latest,API_KEY=api-key:latest"
```

### Custom Docker Build Args

Add to the `docker build` command:
```yaml
--build-arg VERSION=${{ github.sha }} \
--build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
```

## Workflow Diagram

```
Feature Branch → PR to develop → PR Checks Run
                                      ↓
                                 Tests Pass
                                      ↓
                          Merge to develop
                                      ↓
                          Deploy to Staging
                                      ↓
                           Test in Staging
                                      ↓
                          PR to master
                                      ↓
                           PR Checks Run
                                      ↓
                         Merge to master
                                      ↓
                      Deploy to Production
```

## Troubleshooting

### Docker Build Fails
- Check that all dependencies are in `package.json`
- Verify Dockerfile syntax
- Ensure Node version matches (20.x)

### GCP Authentication Fails
- Verify service account key is valid JSON
- Check service account has required permissions
- Ensure APIs are enabled in GCP project

### Cloud Run Deployment Fails
- Check Artifact Registry repository exists
- Verify service account has `roles/run.admin`
- Review Cloud Run service logs in GCP Console

### Tests Fail in CI but Pass Locally
- Check environment variables are set correctly
- Ensure test database is configured
- Review test logs in GitHub Actions

## Security Best Practices

1. **Rotate Service Account Keys** regularly (every 90 days recommended)
2. **Use least privilege** - only grant necessary permissions
3. **Enable Branch Protection** on `develop` and `master`
4. **Require PR Reviews** before merging
5. **Use GitHub Environments** for production with approvals
6. **Scan Images** for vulnerabilities (consider adding Trivy or similar)
7. **Monitor Deployments** using GCP Cloud Monitoring

## Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GCP Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

## Support

For issues with:
- **Workflows:** Check GitHub Actions logs
- **GCP Deployment:** Check Cloud Run logs in GCP Console
- **Build Failures:** Review build logs and Docker configuration
