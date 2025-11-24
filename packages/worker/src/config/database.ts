import { Knex, knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment-specific .env files
const nodeEnv = process.env.NODE_ENV || 'development';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${nodeEnv}.local`) });

let dbInstance: Knex | null = null;

/**
 * Get or create database connection
 */
export function getDatabase(): Knex {
  if (!dbInstance) {
    dbInstance = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'omnitrackr_dev',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        max: parseInt(process.env.DB_POOL_MAX || '10'),
        afterCreate: (conn: any, done: any) => {
          conn.query('SET timezone="UTC";', (err: any) => {
            done(err, conn);
          });
        },
      },
      debug: process.env.DB_DEBUG === 'true',
    });
  }
  return dbInstance;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    console.log('🔌 Database connection closed');
  }
}

/**
 * Initialize and test database connection
 */
export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  try {
    await db.raw('SELECT 1');
    console.log(`✅ Database connected successfully (${nodeEnv})`);
  } catch (error) {
    console.error(`❌ Database connection failed (${nodeEnv}):`, error);
    throw new Error(`Failed to connect to database in ${nodeEnv} environment`);
  }
}
