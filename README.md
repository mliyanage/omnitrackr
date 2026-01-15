# OmniTrackr File Exchange Platform

A multi-tenant SaaS platform for monitoring and tracking file sources across S3, SFTP, FTP, and API endpoints with comprehensive SLA monitoring and multi-channel notifications.

## Overview

OmniTrackr helps organizations monitor file arrivals from various sources, track SLA compliance, and receive notifications through multiple channels (Email, Slack, MS Teams, Jira, SMS, ServiceNow).

## Architecture

This is a monorepo containing:

- **API** - Backend REST API (Express.js + PostgreSQL)
- **Worker** - File source polling service (S3, SFTP, FTP, API)
- **Notification Manager** - Multi-channel notification delivery service
- **Frontend** - React web application (to be added)
- **Shared** - Shared types, utilities, and constants

## Tech Stack

- **Backend:** Node.js 20+, Express.js, TypeScript
- **Database:** PostgreSQL 15+
- **ORM/Migrations:** Knex.js
- **Containerization:** Docker, Docker Compose
- **Secrets Management:** HashiCorp Vault / Cloud-native secrets managers / Encrypted DB
- **Monitoring:** Prometheus + Grafana (optional)

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 15+
- Docker and Docker Compose (optional, for containerized development)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp packages/api/.env.example packages/api/.env
# Edit packages/api/.env with your configuration

# Run database migrations
npm run db:migrate
```

### Development

```bash
# Start all services in development mode
npm run dev

# Or start services individually
npm run dev:api
npm run dev:worker
npm run dev:notification
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build:api
npm run build:worker
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=packages/api
```

### Docker

```bash
# Build all Docker images
npm run docker:build

# Or use Docker Compose for local development
cd infrastructure/docker
docker-compose up
```

## Project Structure

```
omnitrackr/
├── packages/
│   ├── api/                  # Backend REST API
│   ├── worker/               # File polling worker
│   ├── notification-manager/ # Notification service
│   ├── frontend/            # React frontend (future)
│   └── shared/              # Shared code
├── infrastructure/
│   ├── docker/              # Docker configurations
│   ├── kubernetes/          # K8s manifests (optional)
│   └── scripts/             # Deployment scripts
├── docs/                    # Documentation
└── .github/                 # CI/CD workflows
```

See [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md) for detailed structure.

## Documentation

- [Repository Structure](./REPOSITORY_STRUCTURE.md) - Complete folder structure and organization
- [S3 File Source Design](./docs/S3_FILE_SOURCE_DESIGN.md) - Detailed design document
- [SLA Breach Alerting System](./docs/sla-alerting-system.md) - Complete user guide and API reference
- [SLA Alerting Implementation Progress](./docs/sla-alerting-implementation-progress.md) - Implementation status
- [API Documentation](./docs/API_DOCUMENTATION.md) - API endpoints (to be created)
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Deployment instructions (to be created)

## Roadmap

### Phase 1: Backend Foundation (Current)
- ✅ Repository setup
- 🚧 Database schema and migrations
- 🚧 API endpoints for file sources
- 🚧 Secrets management

### Phase 2: Frontend Integration
- React frontend
- File source configuration UI
- Dashboard and monitoring views

### Phase 3: Worker Service
- S3 polling implementation
- SFTP/FTP/API pollers
- File tracking and SLA monitoring

### Phase 4: Notification Manager
- Multi-channel notification delivery
- Retry logic and delivery tracking
- User notification preferences

### Phase 5: Production Readiness
- Security hardening
- Performance optimization
- Monitoring and logging
- Documentation

## Contributing

This is a private project. For team members:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: your feature"`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.
