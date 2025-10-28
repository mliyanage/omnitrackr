#!/bin/bash

# OmniTrackr Development Startup Script
# This script starts all necessary services for development

set -e

echo "🚀 Starting OmniTrackr Development Environment"
echo "=============================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Start databases
echo "📦 Starting database containers..."
docker-compose up -d postgres-dev postgres-test

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 5

# Check database health
if docker exec omnitrackr-db-dev psql -U omnitrackr_user -d omnitrackr_dev -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Development database is ready"
else
    echo "❌ Development database failed to start"
    exit 1
fi

if docker exec omnitrackr-db-test psql -U test_user -d omnitrackr_test -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Test database is ready"
else
    echo "⚠️  Test database failed to start (non-critical)"
fi

# Run migrations
echo ""
echo "🔄 Running database migrations..."
cd packages/api && npm run migrate

# Check migration status
echo ""
echo "📋 Migration status:"
npm run migrate:status

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "Next steps:"
echo "  1. Start the API server:"
echo "     npm run dev --workspace=packages/api"
echo ""
echo "  2. Or use the Makefile:"
echo "     make dev-api"
echo ""
echo "  3. API will be available at:"
echo "     http://localhost:3000"
echo ""
echo "  4. Health check:"
echo "     curl http://localhost:3000/api/health"
echo ""
