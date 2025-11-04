import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';

// Validate that we have configuration for this environment
if (!knexConfig[environment]) {
  throw new Error(
    `No database configuration found for environment: ${environment}\n` +
    `Available environments: ${Object.keys(knexConfig).join(', ')}`
  );
}

// Create and export the knex instance
export const db: Knex = knex(knexConfig[environment]);

/**
 * Check database connection health
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  environment: string;
  error?: string;
}> {
  try {
    await db.raw('SELECT 1');
    console.log(`✅ Database connected successfully (${environment})`);
    return {
      connected: true,
      environment,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Database connection failed (${environment}):`, errorMessage);
    return {
      connected: false,
      environment,
      error: errorMessage,
    };
  }
}

/**
 * Close database connection (for graceful shutdown)
 */
export async function closeDatabaseConnection(): Promise<void> {
  await db.destroy();
  console.log(`🔌 Database connection closed (${environment})`);
}

/**
 * Initialize database connection and verify health
 * Call this on application startup
 */
export async function initializeDatabase(): Promise<void> {
  const health = await checkDatabaseConnection();

  if (!health.connected) {
    throw new Error(
      `Failed to connect to database in ${environment} environment: ${health.error}`
    );
  }

  // Run pending migrations
  try {
    console.log('🔄 Running database migrations...');
    const [_batchNo, migrations] = await db.migrate.latest();

    if (migrations.length === 0) {
      console.log('✅ Database is up to date (no pending migrations)');
    } else {
      console.log(`✅ Ran ${migrations.length} migration(s):`);
      migrations.forEach((migration: string) => {
        console.log(`   - ${migration}`);
      });
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw new Error(`Database migration failed: ${error}`);
  }
}

// Export configuration for reference
export const dbConfig = knexConfig[environment];
export const dbEnvironment = environment;
