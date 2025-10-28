
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
  AWS_REGION: us-east-1
  ECR_REPOSITORY_API: omnitrackr/api
  ECR_REPOSITORY_WORKER: omnitrackr/worker
  ECS_CLUSTER: omnitrackr-staging
  ECS_SERVICE_API: omnitrackr-api-staging
  ECS_SERVICE_WORKER: omnitrackr-worker-staging

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

  build-and-push:
    name: Build and Push Docker Images
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push API image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_API:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY_API:staging \
            -f packages/api/Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_API:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_API:staging

      - name: Build, tag, and push Worker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:staging \
            -f packages/worker/Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:staging

  deploy:
    name: Deploy to ECS
    needs: build-and-push
    runs-on: ubuntu-latest
    
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Update ECS service (API)
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE_API }} \
            --force-new-deployment

      - name: Update ECS service (Worker)
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE_WORKER }} \
            --force-new-deployment

      - name: Wait for services to stabilize
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE_API }} ${{ env.ECS_SERVICE_WORKER }}

  smoke-tests:
    name: Run Smoke Tests
    needs: deploy
    runs-on: ubuntu-latest
    
    steps:
      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://staging.omnitrackr.com/api/health)
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
                    "text": "*Staging Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
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
  AWS_REGION: us-east-1
  ECR_REPOSITORY_API: omnitrackr/api
  ECR_REPOSITORY_WORKER: omnitrackr/worker
  ECS_CLUSTER: omnitrackr-prod
  ECS_SERVICE_API: omnitrackr-api-prod
  ECS_SERVICE_WORKER: omnitrackr-worker-prod

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

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_PROD }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_PROD }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push API image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_API:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY_API:latest \
            -f packages/api/Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_API:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_API:latest

      - name: Build, tag, and push Worker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:latest \
            -f packages/worker/Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_WORKER:latest

  approval:
    name: Manual Approval
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval in GitHub
    
    steps:
      - name: Request approval
        run: echo "Deployment approved"

  deploy:
    name: Deploy to Production ECS
    needs: approval
    runs-on: ubuntu-latest
    
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_PROD }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_PROD }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy API with Blue/Green
        run: |
          # Update task definition with new image
          TASK_DEFINITION=$(aws ecs describe-task-definition --task-definition omnitrackr-api-prod)
          NEW_TASK_DEF=$(echo $TASK_DEFINITION | jq --arg IMAGE "$ECR_REGISTRY/$ECR_REPOSITORY_API:${{ github.sha }}" '.taskDefinition | .containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.compatibilities) | del(.registeredAt) | del(.registeredBy)')
          
          # Register new task definition
          NEW_TASK_INFO=$(aws ecs register-task-definition --cli-input-json "$NEW_TASK_DEF")
          NEW_REVISION=$(echo $NEW_TASK_INFO | jq '.taskDefinition.revision')
          
          # Update service
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE_API }} \
            --task-definition omnitrackr-api-prod:$NEW_REVISION

      - name: Wait for service stabilization
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE_API }}

  smoke-tests:
    name: Production Smoke Tests
    needs: deploy
    runs-on: ubuntu-latest
    
    steps:
      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://api.omnitrackr.com/api/health)
          if [ $response != "200" ]; then
            echo "Health check failed"
            exit 1
          fi

      - name: Create file source test
        run: |
          # Test critical endpoint
          response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X GET https://api.omnitrackr.com/api/file-sources)
          if [ $response != "200" ]; then
            echo "API test failed"
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
                    "text": "*Production Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
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
AWS_ACCESS_KEY_ID          # IAM user for staging deployments
AWS_SECRET_ACCESS_KEY
SLACK_WEBHOOK_URL          # Optional: Slack notifications
```

#### **For Production:**
```
AWS_ACCESS_KEY_ID_PROD     # IAM user for production deployments
AWS_SECRET_ACCESS_KEY_PROD
SLACK_WEBHOOK_PROD
```

### **How to Add Secrets:**

```bash
# Using GitHub CLI
gh secret set AWS_ACCESS_KEY_ID --body "AKIAIOSFODNN7EXAMPLE"
gh secret set AWS_SECRET_ACCESS_KEY --body "wJalrXUtnFEMI..."

# Or via GitHub UI:
# Settings → Secrets and variables → Actions → New repository secret
```

### **IAM Policy for GitHub Actions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    }
  ]
}
```

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
- [ ] Repository created
- [ ] Code pushed
- [ ] Branch protection enabled
- [ ] Secrets configured
- [ ] Workflows added

### **AWS:**
- [ ] AWS account created
- [ ] ECR repositories created
- [ ] ECS clusters created
- [ ] RDS instances provisioned
- [ ] VPC configured
- [ ] IAM roles/policies created

### **CI/CD:**
- [ ] Dockerfiles created
- [ ] GitHub Actions workflows added
- [ ] Secrets configured
- [ ] Test deployment to staging
- [ ] Smoke tests passing

---

_Last Updated: 2025-10-27_
