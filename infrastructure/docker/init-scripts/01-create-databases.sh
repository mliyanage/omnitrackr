#!/bin/bash
set -e

# Database initialization script for PostgreSQL
# This runs inside the postgres container on first startup

echo "🔧 Initializing OmniTrackr databases..."

# Create extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create trigram extension for fuzzy text search
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- Create extensions for full-text search
    CREATE EXTENSION IF NOT EXISTS "unaccent";
EOSQL

echo "✅ Database extensions created successfully"

# Grant all privileges
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};
EOSQL

echo "✅ Database privileges granted"
echo "✅ Database ${POSTGRES_DB} initialized successfully!"
