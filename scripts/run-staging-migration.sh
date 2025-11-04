#!/bin/bash
# Secure script to run database migrations on staging
# Fetches credentials from GCP Secret Manager (never stores in files!)

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔐 Running Staging Migrations Securely${NC}"
echo ""

# Check if Cloud SQL Proxy is running
if ! pgrep -f "cloud-sql-proxy.*omnitrackr-staging" > /dev/null; then
    echo -e "${RED}❌ Cloud SQL Proxy is not running${NC}"
    echo ""
    echo "Please start the Cloud SQL Proxy in a separate terminal:"
    echo -e "${YELLOW}./scripts/start-cloud-sql-proxy.sh${NC}"
    echo ""
    echo "Or manually:"
    echo -e "${YELLOW}cloud-sql-proxy --port 5433 omnitrackr-staging:us-central1:omnitrackr-staging-db${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Cloud SQL Proxy is running${NC}"
echo ""

# Check if terraform directory exists
TERRAFORM_DIR="infrastructure/terraform/staging"
if [ ! -d "$TERRAFORM_DIR" ]; then
    echo -e "${RED}❌ Terraform directory not found: $TERRAFORM_DIR${NC}"
    exit 1
fi

# Get database connection info from Terraform outputs
echo "📊 Fetching database connection details from Terraform..."
cd "$TERRAFORM_DIR"

DB_HOST=$(terraform output -raw database_public_ip 2>/dev/null)
DB_NAME=$(terraform output -raw database_name 2>/dev/null)
DB_USER=$(terraform output -raw database_user 2>/dev/null)

if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo -e "${RED}❌ Failed to get database details from Terraform${NC}"
    echo "Make sure you have run 'terraform apply' first"
    exit 1
fi

# Get password from Secret Manager (never stored in file!)
echo "🔑 Fetching DB password from Secret Manager..."
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password" 2>/dev/null)

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Failed to fetch DB password from Secret Manager${NC}"
    echo "Make sure you're authenticated: gcloud auth application-default login"
    exit 1
fi

cd ../../..  # Back to root

echo -e "${GREEN}✅ Credentials fetched successfully${NC}"
echo ""
echo "Database: $DB_NAME"
echo "Host: 127.0.0.1:5433 (via Cloud SQL Proxy)"
echo "User: $DB_USER"
echo "Password: ****** (hidden)"
echo ""

# Run migrations with environment variables (not stored in .env file!)
echo -e "${YELLOW}🚀 Running migrations via Cloud SQL Proxy...${NC}"
cd packages/api

NODE_ENV=staging \
USE_CLOUD_SQL_PROXY=true \
CLOUD_SQL_PROXY_PORT=5433 \
DB_NAME="$DB_NAME" \
DB_USER="$DB_USER" \
DB_PASSWORD="$DB_PASSWORD" \
npm run migrate

echo ""
echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
echo ""
echo -e "${YELLOW}🔒 Security notes:${NC}"
echo "✅ Credentials fetched from GCP Secret Manager (not .env files)"
echo "✅ Connection secured via Cloud SQL Proxy (encrypted tunnel)"
echo "✅ No passwords stored in files - cleared from memory on exit"
echo "✅ Cloud SQL Proxy uses IAM authentication and SSL automatically"
