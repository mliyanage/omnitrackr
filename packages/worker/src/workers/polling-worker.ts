import { Knex } from 'knex';
import { WatcherRepository, ScheduleRepository } from '@omnitrackr/shared';
import { SchedulerService } from '../services/scheduler.service';
import { PollingService } from '../services/polling.service';
import { getCurrentTimestamp } from '../utils/timestamp.utils';

/**
 * Polling Worker
 * Main process that executes scheduled polls for active watchers
 */
export class PollingWorker {
  private watcherRepo: WatcherRepository;
  private scheduleRepo: ScheduleRepository;
  private schedulerService: SchedulerService;
  private pollingService: PollingService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private db: Knex,
    private config: {
      intervalSeconds: number;
      batchSize: number;
    }
  ) {
    this.watcherRepo = new WatcherRepository(db);
    this.scheduleRepo = new ScheduleRepository(db);
    this.schedulerService = new SchedulerService(db);
    this.pollingService = new PollingService(db);
  }

  /**
   * Start the polling worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Polling worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting polling worker...');
    console.log(`   Interval: ${this.config.intervalSeconds}s`);
    console.log(`   Batch size: ${this.config.batchSize}`);

    // Run immediately on start
    await this.runPollingCycle();

    // Then run on interval
    this.intervalId = setInterval(
      () => this.runPollingCycle(),
      this.config.intervalSeconds * 1000
    );

    console.log('✅ Polling worker started');
  }

  /**
   * Run a single polling cycle without setting up intervals
   * Used for Cloud Run Jobs that execute once per trigger
   */
  async runOnce(): Promise<void> {
    console.log('🔄 Executing single polling cycle...');

    // Temporarily set running flag for the cycle
    const wasRunning = this.isRunning;
    this.isRunning = true;

    try {
      await this.runPollingCycle();
      console.log('✅ Polling cycle complete');
    } finally {
      this.isRunning = wasRunning;
    }
  }

  /**
   * Stop the polling worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping polling worker...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Polling worker stopped');
  }

  /**
   * Run one polling cycle
   * Checks which watchers are due and polls them
   */
  private async runPollingCycle(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const cycleStart = Date.now();
    console.log(`\n🔄 Starting polling cycle at ${getCurrentTimestamp()}`);

    try {
      // Get watchers due for polling (based on poll_interval_minutes)
      const watchersDue = await this.watcherRepo.findDueForPolling();

      if (watchersDue.length === 0) {
        console.log('   No watchers due to poll');
        return;
      }

      console.log(`   ${watchersDue.length} watchers are due to run`);

      // Poll watchers in batches (grouped by connection for efficiency)
      const results = await this.pollingService.pollWatchersBatch(
        watchersDue.slice(0, this.config.batchSize),
        'scheduler'
      );

      // Log summary
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;
      const totalFilesDetected = results.reduce(
        (sum, r) => sum + r.filesDetected,
        0
      );

      console.log(`\n   ✅ Polling cycle complete:`);
      console.log(`      Success: ${successCount}`);
      console.log(`      Failed: ${failureCount}`);
      console.log(`      Files detected: ${totalFilesDetected}`);
      console.log(
        `      Duration: ${Date.now() - cycleStart}ms`
      );
    } catch (error) {
      console.error('❌ Error in polling cycle:', error);
    }
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
