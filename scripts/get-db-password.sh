#!/bin/bash
# Get database password from GCP Secret Manager

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔑 Fetching Database Password from Secret Manager${NC}"
echo ""

# Get password
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password" 2>/dev/null)

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Failed to fetch password"
    echo "Make sure you're authenticated: gcloud auth application-default login"
    exit 1
fi

echo -e "${GREEN}✅ Password retrieved:${NC}"
echo ""
echo "$DB_PASSWORD"
echo ""
echo -e "${YELLOW}💡 Copy this password for pgAdmin or other database tools${NC}"
