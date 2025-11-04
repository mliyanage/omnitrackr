import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment-specific .env files
// Priority: .env.{NODE_ENV}.local > .env.{NODE_ENV} > .env
const nodeEnv = process.env.NODE_ENV || 'development';

// Load base .env file (if exists)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Load environment-specific file
dotenv.config({ path: path.resolve(__dirname, `.env.${nodeEnv}`) });

// Load local overrides (this is where secrets live!)
dotenv.config({ path: path.resolve(__dirname, `.env.${nodeEnv}.local`) });

// Base configuration shared by all environments
const baseConfig: Knex.Config = {
  client: 'pg',
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'knex_migrations',
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds', nodeEnv),
    extension: 'ts',
  },
  pool: {
    afterCreate: (conn: any, done: any) => {
      // Set timezone for all connections
      conn.query('SET timezone="UTC";', (err: any) => {
        done(err, conn);
      });
    },
  },
};

// Validate required environment variables
function validateEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter((varName) => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Make sure you have created .env.${nodeEnv}.local file with all required variables.\n` +
      `Run: npm run setup (or ./scripts/setup-dev-env.sh)`
    );
  }
}

// Environment-specific configurations
const config: { [key: string]: Knex.Config } = {
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'omnitrackr_dev',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      ...baseConfig.pool,
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '10'),
    },
    debug: process.env.DB_DEBUG === 'true', // Enable with DB_DEBUG=true
  },

  test: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'omnitrackr_test',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    pool: {
      ...baseConfig.pool,
      min: 1,
      max: 5, // Lower pool size for testing
    },
    debug: false,
    seeds: {
      directory: path.join(__dirname, 'seeds', 'test'),
    },
  },

  staging: {
    ...baseConfig,
    connection: (() => {
      // Use Cloud SQL Proxy if USE_CLOUD_SQL_PROXY=true (recommended for local migrations)
      const useProxy = process.env.USE_CLOUD_SQL_PROXY === 'true';

      if (useProxy) {
        // Connect via Cloud SQL Proxy (localhost)
        return {
          host: '127.0.0.1',
          port: parseInt(process.env.CLOUD_SQL_PROXY_PORT || '5433'),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          // No SSL needed - proxy handles encryption
        };
      } else {
        // Direct connection (used by Cloud Run)
        return {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: {
            rejectUnauthorized: false, // Cloud SQL uses self-signed certs
          },
        };
      }
    })(),
    pool: {
      ...baseConfig.pool,
      min: parseInt(process.env.DB_POOL_MIN || '0'),
      max: parseInt(process.env.DB_POOL_MAX || '5'), // db-f1-micro has max 25 connections
      // Prevent "too many connections" errors
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
    },
    debug: false,
  },

  production: {
    ...baseConfig,
    connection: (() => {
      // Use Cloud SQL Proxy if USE_CLOUD_SQL_PROXY=true (recommended for local access to prod)
      const useProxy = process.env.USE_CLOUD_SQL_PROXY === 'true';

      const baseConnection = {
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        // Connection timeout
        connectionTimeoutMillis: 5000,
        // Statement timeout (30 seconds)
        statement_timeout: 30000,
      };

      if (useProxy) {
        // Connect via Cloud SQL Proxy (localhost)
        return {
          ...baseConnection,
          host: '127.0.0.1',
          port: parseInt(process.env.CLOUD_SQL_PROXY_PORT || '5433'),
          // No SSL needed - proxy handles encryption
        };
      } else {
        // Direct connection (used by Cloud Run)
        return {
          ...baseConnection,
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432'),
          ssl: {
            rejectUnauthorized: false, // Cloud SQL uses self-signed certs
          },
        };
      }
    })(),
    pool: {
      ...baseConfig.pool,
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      max: parseInt(process.env.DB_POOL_MAX || '50'), // Higher pool for production
      // Pool timeout
      acquireTimeoutMillis: 60000,
      // Idle timeout (close idle connections after 30s)
      idleTimeoutMillis: 30000,
      // Check for dead connections
      reapIntervalMillis: 1000,
    },
    debug: false,
    // Production-specific settings
    acquireConnectionTimeout: 60000,
  },
};

// Validate environment variables for staging/production
if (nodeEnv === 'staging' || nodeEnv === 'production') {
  const useProxy = process.env.USE_CLOUD_SQL_PROXY === 'true';

  if (useProxy) {
    // When using Cloud SQL Proxy, DB_HOST is not needed (connects to localhost)
    validateEnvVars(['DB_NAME', 'DB_USER', 'DB_PASSWORD']);
  } else {
    // Direct connection requires DB_HOST
    validateEnvVars(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']);
  }
}

// Validate DB credentials exist for dev/test
if (nodeEnv === 'development' || nodeEnv === 'test') {
  validateEnvVars(['DB_USER', 'DB_PASSWORD']);
}

// Export the configuration
export default config;

// CommonJS export for knex CLI
module.exports = config;
