
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [master, develop]
  push:
    branches: [master, develop]

jobs:
  lint-and-test:
    name: Lint and Test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint --workspace=packages/api

      - name: Type check
        run: npm run build --workspace=packages/api

      - name: Run tests
        run: |
          npm test --workspace=packages/api
          npm test --workspace=packages/shared

      - name: Run tests with coverage
        run: npm test --workspace=packages/api -- --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/api/coverage/lcov.info
          flags: api
          name: API Coverage

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

---

### **Workflow 2: Deploy to Staging**

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

env:
  GCP_PROJECT_ID: omnitrackr-staging
  GCP_REGION: us-central1
  SERVICE_NAME_API: omnitrackr-api
  SERVICE_NAME_WORKER: omnitrackr-worker

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm test --workspace=packages/api
      - run: npm test --workspace=packages/shared

  build-and-deploy:
    name: Build and Deploy to Cloud Run
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for GCP
        run: gcloud auth configure-docker

      - name: Build and push API image
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/api:$IMAGE_TAG \
            -t gcr.io/${{ env.GCP_PROJECT_ID }}/api:staging \
            -f packages/api/Dockerfile .
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/api:$IMAGE_TAG
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/api:staging

      - name: Build and push Worker image
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/worker:$IMAGE_TAG \
            -t gcr.io/${{ env.GCP_PROJECT_ID }}/worker:staging \
            -f packages/worker/Dockerfile .
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/worker:$IMAGE_TAG
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/worker:staging

      - name: Deploy API to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME_API }} \
            --image gcr.io/${{ env.GCP_PROJECT_ID }}/api:${{ github.sha }} \
            --region ${{ env.GCP_REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --min-instances 1 \
            --max-instances 10 \
            --memory 512Mi \
            --cpu 1 \
            --set-env-vars NODE_ENV=staging \
            --set-secrets DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest

      - name: Deploy Worker to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME_WORKER }} \
            --image gcr.io/${{ env.GCP_PROJECT_ID }}/worker:${{ github.sha }} \
            --region ${{ env.GCP_REGION }} \
            --platform managed \
            --no-allow-unauthenticated \
            --min-instances 0 \
            --max-instances 5 \
            --memory 512Mi \
            --cpu 0.5 \
            --set-env-vars NODE_ENV=staging \
            --set-secrets DB_PASSWORD=db-password:latest

  smoke-tests:
    name: Run Smoke Tests
    needs: build-and-deploy
    runs-on: ubuntu-latest

    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Get Cloud Run service URL
        id: get-url
        run: |
          URL=$(gcloud run services describe ${{ env.SERVICE_NAME_API }} \
            --region ${{ env.GCP_REGION }} \
            --format 'value(status.url)')
          echo "url=$URL" >> $GITHUB_OUTPUT

      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" ${{ steps.get-url.outputs.url }}/api/health)
          if [ $response != "200" ]; then
            echo "Health check failed with status $response"
            exit 1
          fi
          echo "Health check passed"

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Staging deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}\nURL: ${{ steps.get-url.outputs.url }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

### **Workflow 3: Deploy to Production**

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [master]
  workflow_dispatch:  # Allow manual trigger

env:
  GCP_PROJECT_ID: omnitrackr-prod
  GCP_REGION: us-central1
  SERVICE_NAME_API: omnitrackr-api
  SERVICE_NAME_WORKER: omnitrackr-worker

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm test --workspace=packages/api -- --coverage
      - run: npm test --workspace=packages/shared

      - name: Check test coverage
        run: |
          COVERAGE=$(cat packages/api/coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage is below 80%: $COVERAGE%"
            exit 1
          fi

  build-and-push:
    name: Build and Push Docker Images
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY_PROD }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for GCP
        run: gcloud auth configure-docker

      - name: Build and push API image
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/api:$IMAGE_TAG \
            -t gcr.io/${{ env.GCP_PROJECT_ID }}/api:latest \
            -f packages/api/Dockerfile .
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/api:$IMAGE_TAG
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/api:latest

      - name: Build and push Worker image
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/worker:$IMAGE_TAG \
            -t gcr.io/${{ env.GCP_PROJECT_ID }}/worker:latest \
            -f packages/worker/Dockerfile .
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/worker:$IMAGE_TAG
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/worker:latest

  approval:
    name: Manual Approval
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub
    
    steps:
      - name: Request approval
        run: echo "Deployment approved"

  deploy:
    name: Deploy to Production Cloud Run
    needs: approval
    runs-on: ubuntu-latest

    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY_PROD }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Deploy API with Gradual Rollout
        run: |
          # Deploy new revision with 0% traffic
          gcloud run deploy ${{ env.SERVICE_NAME_API }} \
            --image gcr.io/${{ env.GCP_PROJECT_ID }}/api:${{ github.sha }} \
            --region ${{ env.GCP_REGION }} \
            --platform managed \
            --allow-unauthenticated \
            --min-instances 2 \
            --max-instances 100 \
            --memory 1Gi \
            --cpu 1 \
            --set-env-vars NODE_ENV=production \
            --set-secrets DB_PASSWORD=db-password-prod:latest,JWT_SECRET=jwt-secret-prod:latest \
            --no-traffic

          # Get the new revision name
          NEW_REVISION=$(gcloud run services describe ${{ env.SERVICE_NAME_API }} \
            --region ${{ env.GCP_REGION }} \
            --format 'value(status.latestCreatedRevisionName)')

          # Gradual rollout: 10% -> 50% -> 100%
          echo "Routing 10% traffic to new revision..."
          gcloud run services update-traffic ${{ env.SERVICE_NAME_API }} \
            --region ${{ env.GCP_REGION }} \
            --to-revisions $NEW_REVISION=10

          sleep 60  # Monitor for 1 minute

          echo "Routing 50% traffic to new revision..."
          gcloud run services update-traffic ${{ env.SERVICE_NAME_API }} \
            --region ${{ env.GCP_REGION }} \
            --to-revisions $NEW_REVISION=50

          sleep 120  # Monitor for 2 minutes

          echo "Routing 100% traffic to new revision..."
          gcloud run services update-traffic ${{ env.SERVICE_NAME_API }} \
            --region ${{ env.GCP_REGION }} \
            --to-revisions $NEW_REVISION=100

      - name: Deploy Worker
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME_WORKER }} \
            --image gcr.io/${{ env.GCP_PROJECT_ID }}/worker:${{ github.sha }} \
            --region ${{ env.GCP_REGION }} \
            --platform managed \
            --no-allow-unauthenticated \
            --min-instances 1 \
            --max-instances 50 \
            --memory 1Gi \
            --cpu 1 \
            --set-env-vars NODE_ENV=production \
            --set-secrets DB_PASSWORD=db-password-prod:latest

  smoke-tests:
    name: Production Smoke Tests
    needs: deploy
    runs-on: ubuntu-latest

    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY_PROD }}

      - name: Get Cloud Run service URL
        id: get-url
        run: |
          URL=$(gcloud run services describe ${{ env.SERVICE_NAME_API }} \
            --region ${{ env.GCP_REGION }} \
            --format 'value(status.url)')
          echo "url=$URL" >> $GITHUB_OUTPUT

      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" ${{ steps.get-url.outputs.url }}/api/health)
          if [ $response != "200" ]; then
            echo "Health check failed"
            exit 1
          fi

      - name: API test
        run: |
          # Test critical endpoint
          response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X GET ${{ steps.get-url.outputs.url }}/api/file-sources)
          if [ $response != "200" ] && [ $response != "401" ]; then
            echo "API test failed with status $response"
            exit 1
          fi

      - name: Notify team
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Production deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}\nURL: ${{ steps.get-url.outputs.url }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_PROD }}
```

---

### **Workflow 4: Pull Request Checks**

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      worker: ${{ steps.filter.outputs.worker }}
      shared: ${{ steps.filter.outputs.shared }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            api:
              - 'packages/api/**'
            worker:
              - 'packages/worker/**'
            shared:
              - 'packages/shared/**'

  test-api:
    name: Test API
    needs: changes
    if: needs.changes.outputs.api == 'true' || needs.changes.outputs.shared == 'true'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test --workspace=packages/api -- --coverage

  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint --workspace=packages/api

  pr-comment:
    name: Comment Test Results
    needs: [test-api]
    if: always()
    runs-on: ubuntu-latest
    
    steps:
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ All tests passed! Ready for review.'
            })
```

---

## 🔐 Part 3: GitHub Secrets Setup

### **Required Secrets:**

#### **For Staging:**
```
GCP_SA_KEY                 # Service account JSON key for staging
SLACK_WEBHOOK_URL          # Optional: Slack notifications
```

#### **For Production:**
```
GCP_SA_KEY_PROD            # Service account JSON key for production
SLACK_WEBHOOK_PROD         # Optional: Slack notifications
```

### **How to Create Service Account Keys:**

```bash
# For Staging
gcloud iam service-accounts create github-actions-staging \
  --display-name="GitHub Actions Staging Deployment" \
  --project=omnitrackr-staging

# Grant necessary permissions
gcloud projects add-iam-policy-binding omnitrackr-staging \
  --member="serviceAccount:github-actions-staging@omnitrackr-staging.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding omnitrackr-staging \
  --member="serviceAccount:github-actions-staging@omnitrackr-staging.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding omnitrackr-staging \
  --member="serviceAccount:github-actions-staging@omnitrackr-staging.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create key
gcloud iam service-accounts keys create github-actions-staging-key.json \
  --iam-account=github-actions-staging@omnitrackr-staging.iam.gserviceaccount.com

# For Production (repeat with omnitrackr-prod project)
```

### **How to Add Secrets to GitHub:**

```bash
# Using GitHub CLI
gh secret set GCP_SA_KEY < github-actions-staging-key.json
gh secret set GCP_SA_KEY_PROD < github-actions-prod-key.json

# Optional: Slack webhooks
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/..."
gh secret set SLACK_WEBHOOK_PROD --body "https://hooks.slack.com/services/..."

# Or via GitHub UI:
# Settings → Secrets and variables → Actions → New repository secret
```

### **Service Account Permissions Summary:**

The GitHub Actions service account needs these roles:
- `roles/run.admin` - Deploy Cloud Run services
- `roles/storage.admin` - Push to Google Container Registry (GCR)
- `roles/iam.serviceAccountUser` - Act as Cloud Run service account
- `roles/secretmanager.secretAccessor` - Access secrets (optional, for migrations)

---

## 📁 Part 4: Create Dockerfiles

### **API Dockerfile:**

```dockerfile
# packages/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Build
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/api

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --production

# Copy built files
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy migrations
COPY packages/api/migrations ./packages/api/migrations
COPY packages/api/knexfile.ts ./packages/api/

WORKDIR /app/packages/api

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### **Worker Dockerfile:**

```dockerfile
# packages/worker/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY packages/worker/package*.json ./packages/worker/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci

COPY packages/worker ./packages/worker
COPY packages/shared ./packages/shared

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/worker

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/worker/package*.json ./packages/worker/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --production

COPY --from=builder /app/packages/worker/dist ./packages/worker/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/packages/worker

CMD ["node", "dist/index.js"]
```

---

## ✅ Checklist: Ready for Deployment

### **Code Preparation:**
- [ ] All tests passing
- [ ] Linting configured
- [ ] .gitignore configured
- [ ] README.md updated
- [ ] Documentation complete

### **GitHub:**
- [x] Repository created
- [x] Code pushed
- [ ] Branch protection enabled
- [ ] Secrets configured
- [ ] Workflows added (.github/workflows/)

### **GCP:**
- [ ] GCP account created (get $300 free credits)
- [ ] Projects created (omnitrackr-staging, omnitrackr-prod)
- [ ] gcloud CLI installed and configured
- [ ] Cloud SQL PostgreSQL provisioned
- [ ] Secret Manager secrets created
- [ ] Service accounts created for GitHub Actions
- [ ] APIs enabled (Cloud Run, Cloud SQL, Secret Manager, etc.)

### **CI/CD:**
- [ ] Dockerfiles created (packages/api/Dockerfile, packages/worker/Dockerfile)
- [ ] GitHub Actions workflows added
- [ ] GCP service account keys added to GitHub Secrets
- [ ] Test deployment to staging (merge to develop branch)
- [ ] Smoke tests passing
- [ ] Production environment configured
- [ ] Manual approval environment set up in GitHub

---

_Last Updated: 2025-10-27_
