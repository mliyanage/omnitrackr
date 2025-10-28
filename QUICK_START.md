# OmniTrackr - Quick Start Guide

Get up and running in 5 minutes! ⚡

---

## 🚀 Option 1: Automated Setup (Recommended)

```bash
# Navigate to project root
cd /Users/manjulaliyanage/dev/omnitrackr

# Run the setup script
./scripts/dev-start.sh

# Start the API server
npm run dev --workspace=packages/api
```

**Done!** API is now running at http://localhost:3000

---

## 🛠️ Option 2: Manual Setup

### Step 1: Start Databases

```bash
cd /Users/manjulaliyanage/dev/omnitrackr

# Using docker-compose
docker-compose up -d

# OR using Make
make db-up
```

### Step 2: Run Migrations

```bash
cd packages/api
npm run migrate
```

### Step 3: Start API Server

```bash
# From project root
npm run dev --workspace=packages/api

# OR from packages/api
cd packages/api && npm run dev

# OR using Make
make dev-api
```

### Step 4: Verify

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "OmniTrackr API is healthy",
  "environment": "development",
  "database": "connected"
}
```

---

## 📝 Common Commands

### Using Make (Easiest)

```bash
make help           # Show all available commands
make db-up          # Start databases
make db-migrate     # Run migrations
make dev-api        # Start API server
make test-api       # Run tests
make db-connect     # Open psql shell
make db-logs        # View database logs
```

### Using npm

```bash
# Start API server
npm run dev --workspace=packages/api

# Run tests
npm test --workspace=packages/api

# Run tests in watch mode
npm test --workspace=packages/api -- --watch

# Run migrations
cd packages/api && npm run migrate

# Check migration status
cd packages/api && npm run migrate:status
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f postgres-dev

# Check status
docker-compose ps
```

---

## 🌐 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| API Server | http://localhost:3000 | - |
| Health Check | http://localhost:3000/api/health | - |
| Dev Database | localhost:5432 | User: `omnitrackr_user`<br>Pass: `omnitrackr_password_dev`<br>DB: `omnitrackr_dev` |
| Test Database | localhost:5433 | User: `test_user`<br>Pass: `93W4tQcwoKaKi9c4dWKh`<br>DB: `omnitrackr_test` |
| pgAdmin | http://localhost:5050 | Email: `admin@omnitrackr.local`<br>Pass: `admin` |

---

## 🧪 Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3000/api/health

# Get all file sources
curl http://localhost:3000/api/file-sources

# Get file source by ID
curl http://localhost:3000/api/file-sources/1

# Test S3 connection
curl -X POST http://localhost:3000/api/file-sources/s3/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "awsAccessKeyId": "AKIATEST12345678901",
    "awsSecretAccessKey": "testSecretKey1234567890123456789012",
    "bucketName": "test-bucket",
    "bucketRegion": "us-east-1",
    "monitorPath": "/test/"
  }'
```

### Using Postman

1. Import collection from `docs/postman/OmniTrackr-API.postman_collection.json`
2. Import environment from `docs/postman/Development.postman_environment.json`
3. Start making requests!

See `docs/postman/README.md` for details.

---

## 🗄️ Database Access

### Using psql CLI

```bash
# Connect to dev database
docker exec -it omnitrackr-db-dev psql -U omnitrackr_user -d omnitrackr_dev

# OR using Make
make db-connect

# Useful psql commands:
\dt                     # List tables
\d file_sources         # Describe table
SELECT * FROM file_sources;
\q                      # Quit
```

### Using pgAdmin

1. Open http://localhost:5050
2. Login with credentials above
3. Add server:
   - Name: OmniTrackr Dev
   - Host: postgres-dev (or host.docker.internal)
   - Port: 5432
   - Username: omnitrackr_user
   - Password: omnitrackr_password_dev

---

## 🐛 Troubleshooting

### Database won't start

```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs postgres-dev

# Restart databases
docker-compose restart postgres-dev
```

### Port 3000 already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in packages/api/.env.development
```

### Migration errors

```bash
# Check migration status
cd packages/api && npm run migrate:status

# Rollback and retry
npm run migrate:rollback
npm run migrate
```

### Can't connect to database

```bash
# Verify database is running
make db-status

# Check connection from API
docker exec omnitrackr-db-dev psql -U omnitrackr_user -d omnitrackr_dev -c "SELECT 1;"
```

---

## 📚 Documentation

- **Full Setup Guide**: `docs/DEVELOPMENT_SETUP.md`
- **API Documentation**: `docs/API_SUMMARY.md`
- **Testing Guide**: `docs/TESTING_GUIDE.md`
- **Postman Guide**: `docs/postman/README.md`

---

## 🎯 Development Workflow

### Recommended VS Code Terminal Setup

**Terminal 1 - API Server:**
```bash
npm run dev --workspace=packages/api
```

**Terminal 2 - Tests (Watch Mode):**
```bash
npm test --workspace=packages/api -- --watch
```

**Terminal 3 - Commands:**
```bash
# Use for git, docker, migrations, etc.
```

---

## 🔄 Daily Workflow

```bash
# 1. Start your day
make db-up              # Start databases
make db-migrate         # Run any new migrations
make dev-api            # Start API server

# 2. Develop
# Make code changes...
# Tests run automatically in watch mode

# 3. End of day
# Commit your changes
docker-compose down     # Stop databases (optional)
```

---

## 💡 Pro Tips

- Use `make help` to see all available commands
- Keep tests running in watch mode while developing
- Use pgAdmin for complex database queries
- Check `make db-status` if database seems slow
- Postman collection has examples for all endpoints

---

## 🆘 Need Help?

1. Check the logs: `docker-compose logs -f`
2. Review full documentation in `docs/`
3. Try `make db-reset` (⚠️ destroys data)
4. Create a GitHub issue

---

**Happy Coding!** 🎉
