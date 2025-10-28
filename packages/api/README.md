# OmniTrackr API

Backend REST API for OmniTrackr File Exchange Platform.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Installation

```bash
# From the root of the monorepo
npm install

# Or from this package directory
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the environment variables in `.env` with your configuration.

### Database Setup

```bash
# Run migrations
npm run migrate

# Create a new migration
npm run migrate:make migration_name

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

### Development

```bash
# Start in development mode (with hot reload)
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
src/
├── api/
│   ├── routes/          # Express routes
│   ├── controllers/     # Request handlers
│   └── middleware/      # Express middleware
├── services/            # Business logic
├── repositories/        # Database access layer
├── config/              # Configuration files
├── utils/               # Utility functions
└── index.ts             # Application entry point

migrations/              # Database migrations
tests/                   # Test files
```

## API Endpoints

Documentation coming soon...

## Environment Variables

See `.env.example` for all available configuration options.

## License

Proprietary
