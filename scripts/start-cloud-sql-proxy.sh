#!/bin/bash
# Start Cloud SQL Proxy for staging database on port 5433
# This avoids conflicts with local PostgreSQL running on 5432

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔌 Starting Cloud SQL Proxy for Staging Database${NC}"
echo ""

# Check if already running
if pgrep -f "cloud-sql-proxy.*omnitrackr-staging" > /dev/null; then
    echo -e "${RED}❌ Cloud SQL Proxy is already running${NC}"
    echo ""
    echo "To stop it, run:"
    echo "  pkill -f 'cloud-sql-proxy.*omnitrackr-staging'"
    exit 1
fi

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo -e "${RED}❌ cloud-sql-proxy not found${NC}"
    echo ""
    echo "Install with:"
    echo "  brew install cloud-sql-proxy"
    exit 1
fi

echo -e "${GREEN}✅ Starting proxy on 0.0.0.0:5433 (accessible from Docker)${NC}"
echo ""
echo "Connection details:"
echo "  Host: 127.0.0.1 (from host machine)"
echo "  Host: host.docker.internal (from Docker containers)"
echo "  Port: 5433"
echo "  Database: omnitrackr"
echo "  User: omnitrackr_user"
echo ""
echo -e "${YELLOW}💡 Connect using pgAdmin, psql, or any PostgreSQL client${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop the proxy${NC}"
echo ""

# Start proxy on port 5433, listening on all interfaces (0.0.0.0)
# This allows Docker containers to connect via host.docker.internal
cloud-sql-proxy \
  --address 0.0.0.0 \
  --port 5433 \
  omnitrackr-staging:us-central1:omnitrackr-staging-db
