import { Knex } from 'knex';
import { SLAMonitorService } from '../services/sla-monitor.service';
import { getCurrentTimestamp } from '../utils/timestamp.utils';

/**
 * SLA Monitor Worker
 * Background process that:
 * 1. Creates expected file tracking records based on schedules
 * 2. Detects missing/late files past their SLA deadline
 * 3. Triggers alerts for SLA violations
 */
export class SLAMonitorWorker {
  private slaMonitorService: SLAMonitorService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private db: Knex,
    private config: {
      checkIntervalSeconds: number;
      lookAheadHours: number;
      lookBackHours: number;
    }
  ) {
    this.slaMonitorService = new SLAMonitorService(db);
  }

  /**
   * Start the SLA monitor worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  SLA monitor worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting SLA monitor worker...');
    console.log(`   Check interval: ${this.config.checkIntervalSeconds}s`);
    console.log(`   Look ahead: ${this.config.lookAheadHours}h`);
    console.log(`   Look back: ${this.config.lookBackHours}h`);

    // Run immediately on start
    await this.runMonitoringCycle();

    // Then run on interval
    this.intervalId = setInterval(
      () => this.runMonitoringCycle(),
      this.config.checkIntervalSeconds * 1000
    );

    console.log('✅ SLA monitor worker started');
  }

  /**
   * Run a single monitoring cycle without setting up intervals
   * Used for Cloud Run Jobs that execute once per trigger
   */
  async runOnce(): Promise<void> {
    console.log('📊 Executing single SLA monitoring cycle...');

    // Temporarily set running flag for the cycle
    const wasRunning = this.isRunning;
    this.isRunning = true;

    try {
      await this.runMonitoringCycle();
      console.log('✅ SLA monitoring cycle complete');
    } finally {
      this.isRunning = wasRunning;
    }
  }

  /**
   * Stop the SLA monitor worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping SLA monitor worker...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ SLA monitor worker stopped');
  }

  /**
   * Run one monitoring cycle
   */
  private async runMonitoringCycle(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const cycleStart = Date.now();
    console.log(`\n📊 Starting SLA monitoring cycle at ${getCurrentTimestamp()}`);

    try {
      // Step 1: Create expected file tracking records for upcoming polls
      const recordsCreated =
        await this.slaMonitorService.createExpectedFileRecords(
          this.config.lookAheadHours
        );

      // Step 2: Check for missing/late files
      const alerts = await this.slaMonitorService.checkForMissingFiles(
        this.config.lookBackHours
      );

      // Step 3: Trigger notifications for alerts
      // TODO: Integrate with notification manager
      if (alerts.length > 0) {
        console.log(`\n   🚨 Found ${alerts.length} SLA violations:`);
        for (const alert of alerts) {
          console.log(
            `      - Watcher: ${alert.watcher.name}, Type: ${alert.alertType}, Message: ${alert.message}`
          );
        }
      }

      // Log summary
      console.log(`\n   ✅ SLA monitoring cycle complete:`);
      console.log(`      Expected records created: ${recordsCreated}`);
      console.log(`      SLA violations detected: ${alerts.length}`);
      console.log(`      Duration: ${Date.now() - cycleStart}ms`);
    } catch (error) {
      console.error('❌ Error in SLA monitoring cycle:', error);
    }
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get SLA dashboard summary
   */
  async getDashboardSummary(days: number = 7): Promise<any> {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    return this.slaMonitorService.getSLASummary(periodStart, periodEnd);
  }
}
