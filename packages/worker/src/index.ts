import { getDatabase, initializeDatabase, closeDatabase } from './config/database';
import { PollingWorker } from './workers/polling-worker';
import { SLAMonitorWorker } from './workers/sla-monitor-worker';
import { EscalationWorker } from './workers/escalation-worker';

// Export services for use by other packages (e.g., API package for manual triggers)
export { PollingService } from './services/polling.service';
export { SLAMonitorService } from './services/sla-monitor.service';

/**
 * OmniTrackr Worker
 *
 * Supports two modes:
 * 1. JOB mode (default): Run once and exit - for Cloud Run Jobs
 * 2. CONTINUOUS mode: Run with intervals - for local development
 *
 * Set RUN_MODE env var to switch:
 *   RUN_MODE=job          -> Run once and exit (Cloud Run Jobs)
 *   RUN_MODE=continuous   -> Run continuously (local dev)
 */

const RUN_MODE = process.env.RUN_MODE || 'job';

let pollingWorker: PollingWorker | null = null;
let slaMonitorWorker: SLAMonitorWorker | null = null;
let escalationWorker: EscalationWorker | null = null;
let isShuttingDown = false;

/**
 * Run workers in JOB mode (single execution)
 * Perfect for Cloud Run Jobs triggered by Cloud Scheduler
 */
async function runJobMode(): Promise<void> {
  console.log('🔄 Running in JOB mode (single execution)');

  try {
    await initializeDatabase();
    const db = getDatabase();

    let success = true;
    const results: string[] = [];

    // Run polling worker once
    if (process.env.POLLING_WORKER_ENABLED !== 'false') {
      console.log('📦 Running polling worker...');
      pollingWorker = new PollingWorker(db, {
        intervalSeconds: 0, // Not used in job mode
        batchSize: parseInt(process.env.POLLING_BATCH_SIZE || '50'),
      });

      try {
        await pollingWorker.runOnce();
        results.push('✅ Polling worker completed');
      } catch (error) {
        success = false;
        results.push(`❌ Polling worker failed: ${error}`);
        console.error('Polling worker error:', error);
      }
    }

    // Run SLA monitor once
    if (process.env.SLA_MONITOR_ENABLED !== 'false') {
      console.log('📊 Running SLA monitor...');
      slaMonitorWorker = new SLAMonitorWorker(db, {
        checkIntervalSeconds: 0, // Not used in job mode
        lookAheadHours: parseInt(process.env.SLA_LOOKBACK_HOURS || '24'),
        lookBackHours: parseInt(process.env.SLA_LOOKBACK_HOURS || '24'),
      });

      try {
        await slaMonitorWorker.runOnce();
        results.push('✅ SLA monitor completed');
      } catch (error) {
        success = false;
        results.push(`❌ SLA monitor failed: ${error}`);
        console.error('SLA monitor error:', error);
      }
    }

    // Run escalation worker once
    if (process.env.ESCALATION_WORKER_ENABLED !== 'false') {
      console.log('🔼 Running escalation worker...');
      escalationWorker = new EscalationWorker(db, {
        checkIntervalSeconds: 0, // Not used in job mode
      });

      try {
        await escalationWorker.runOnce();
        results.push('✅ Escalation worker completed');
      } catch (error) {
        success = false;
        results.push(`❌ Escalation worker failed: ${error}`);
        console.error('Escalation worker error:', error);
      }
    }

    // Clean up
    await closeDatabase();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('Job Execution Summary:');
    results.forEach(r => console.log(`  ${r}`));
    console.log('='.repeat(50) + '\n');

    // Exit with appropriate code
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('❌ Job failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

/**
 * Run workers in CONTINUOUS mode (for local development)
 * Workers run on intervals until manually stopped
 */
async function runContinuousMode(): Promise<void> {
  console.log('♾️  Running in CONTINUOUS mode (local development)');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    await initializeDatabase();
    const db = getDatabase();

    // Start polling worker with intervals
    if (process.env.POLLING_WORKER_ENABLED !== 'false') {
      pollingWorker = new PollingWorker(db, {
        intervalSeconds: parseInt(process.env.POLLING_INTERVAL_SECONDS || '60'),
        batchSize: parseInt(process.env.POLLING_BATCH_SIZE || '50'),
      });
      await pollingWorker.start();
    } else {
      console.log('⏭️  Polling worker disabled');
    }

    // Start SLA monitor with intervals
    if (process.env.SLA_MONITOR_ENABLED !== 'false') {
      slaMonitorWorker = new SLAMonitorWorker(db, {
        checkIntervalSeconds: parseInt(process.env.SLA_CHECK_INTERVAL_SECONDS || '300'),
        lookAheadHours: parseInt(process.env.SLA_LOOKBACK_HOURS || '24'),
        lookBackHours: parseInt(process.env.SLA_LOOKBACK_HOURS || '24'),
      });
      await slaMonitorWorker.start();
    } else {
      console.log('⏭️  SLA monitor worker disabled');
    }

    // Start escalation worker with intervals
    if (process.env.ESCALATION_WORKER_ENABLED !== 'false') {
      escalationWorker = new EscalationWorker(db, {
        checkIntervalSeconds: parseInt(process.env.ESCALATION_CHECK_INTERVAL || '300'),
      });
      await escalationWorker.start();
    } else {
      console.log('⏭️  Escalation worker disabled');
    }

    console.log('\n✅ All workers started successfully');
    console.log('   Press Ctrl+C to stop\n');

  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    await gracefulShutdown(1);
  }
}

/**
 * Graceful shutdown (for continuous mode)
 */
async function gracefulShutdown(exitCode: number = 0): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log('\n🛑 Graceful shutdown initiated...');

  const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '30000');
  const forceExitTimeout = setTimeout(() => {
    console.error('⚠️  Shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, shutdownTimeout);

  try {
    if (pollingWorker) await pollingWorker.stop();
    if (slaMonitorWorker) await slaMonitorWorker.stop();
    if (escalationWorker) await escalationWorker.stop();
    await closeDatabase();

    clearTimeout(forceExitTimeout);
    console.log('✅ Graceful shutdown complete');
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

/**
 * Handle process signals (continuous mode only)
 */
if (RUN_MODE === 'continuous') {
  process.on('SIGTERM', () => {
    console.log('\nSIGTERM received. Starting graceful shutdown...');
    gracefulShutdown(0);
  });

  process.on('SIGINT', () => {
    console.log('\nSIGINT received. Starting graceful shutdown...');
    gracefulShutdown(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    gracefulShutdown(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    gracefulShutdown(1);
  });
}

/**
 * Main entry point
 */
async function main() {
  console.log('🚀 OmniTrackr Worker starting...');
  console.log(`   Mode: ${RUN_MODE.toUpperCase()}`);

  if (RUN_MODE === 'continuous') {
    await runContinuousMode();
  } else {
    await runJobMode();
  }
}

// Only run main() if this file is executed directly (not imported as a module)
if (require.main === module) {
  main();
}
