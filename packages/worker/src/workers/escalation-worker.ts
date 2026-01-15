import { Knex } from 'knex';
import { NotificationManagerService } from '../services/notification-manager.service';
import { getCurrentTimestamp } from '../utils/timestamp.utils';

/**
 * Escalation Worker
 * Periodically checks for unacknowledged alerts and escalates them
 * Also handles retry logic for failed alert deliveries
 */
export class EscalationWorker {
  private notificationManager: NotificationManagerService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private db: Knex,
    private config: {
      checkIntervalSeconds: number; // e.g., 300 (5 minutes)
    }
  ) {
    this.notificationManager = new NotificationManagerService(db);
  }

  /**
   * Start the escalation worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Escalation worker already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting escalation worker...');
    console.log(`   Check interval: ${this.config.checkIntervalSeconds}s`);

    // Run immediately on start
    await this.runEscalationCycle();

    // Then run on interval
    this.intervalId = setInterval(
      () => this.runEscalationCycle(),
      this.config.checkIntervalSeconds * 1000
    );

    console.log('✅ Escalation worker started');
  }

  /**
   * Run a single escalation cycle without setting up intervals
   * Used for Cloud Run Jobs that execute once per trigger
   */
  async runOnce(): Promise<void> {
    console.log('📊 Executing single escalation cycle...');

    const wasRunning = this.isRunning;
    this.isRunning = true;

    try {
      await this.runEscalationCycle();
      console.log('✅ Escalation cycle complete');
    } finally {
      this.isRunning = wasRunning;
    }
  }

  /**
   * Stop the escalation worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping escalation worker...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Escalation worker stopped');
  }

  /**
   * Run one escalation cycle
   */
  private async runEscalationCycle(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const cycleStart = Date.now();
    console.log(
      `\n🔼 Starting escalation cycle at ${getCurrentTimestamp()}`
    );

    try {
      // Process escalations (alerts past delay_minutes without acknowledgment)
      await this.notificationManager.processEscalations();

      // Process retries (failed alert deliveries)
      await this.notificationManager.processRetries();

      console.log(`\n   ✅ Escalation cycle complete:`);
      console.log(`      Duration: ${Date.now() - cycleStart}ms`);
    } catch (error) {
      console.error('❌ Error in escalation cycle:', error);
    }
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
