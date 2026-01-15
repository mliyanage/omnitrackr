import { Knex } from 'knex';
import { SLAAlert } from './sla-monitor.service';
import {
  AlertConfigRepository,
  AlertHistoryRepository,
  AlertRecipientGroupRepository,
  AlertEscalationRepository,
  AlertHistory,
  DeliveryStatus,
} from '@omnitrackr/shared';
import { EmailService } from '@omnitrackr/shared';

/**
 * Notification Manager Service
 * Handles alert delivery, retry logic, and escalation
 */
export class NotificationManagerService {
  private alertConfigRepo: AlertConfigRepository;
  private alertHistoryRepo: AlertHistoryRepository;
  private recipientGroupRepo: AlertRecipientGroupRepository;
  private escalationRepo: AlertEscalationRepository;
  private emailService: EmailService;

  constructor(private db: Knex) {
    this.alertConfigRepo = new AlertConfigRepository(db);
    this.alertHistoryRepo = new AlertHistoryRepository(db);
    this.recipientGroupRepo = new AlertRecipientGroupRepository(db);
    this.escalationRepo = new AlertEscalationRepository(db);
    this.emailService = new EmailService();
  }

  /**
   * Main entry point: Process SLA alerts from SLA monitor worker
   */
  async processAlerts(alerts: SLAAlert[]): Promise<void> {
    console.log(`📬 Processing ${alerts.length} SLA alerts...`);

    for (const alert of alerts) {
      try {
        await this.processSingleAlert(alert);
      } catch (error) {
        console.error(
          `Failed to process alert for watcher ${alert.watcher.id}:`,
          error
        );
      }
    }
  }

  /**
   * Process a single SLA alert
   */
  private async processSingleAlert(alert: SLAAlert): Promise<void> {
    // Get alert configuration for this watcher
    const config = await this.alertConfigRepo.findByWatcherId(
      alert.watcher.id
    );

    if (!config || !config.enabled) {
      console.log(
        `  ⏭️  No alert config or disabled for watcher ${alert.watcher.id}`
      );
      return;
    }

    // Check if this alert type is configured
    if (!config.alert_types.includes(alert.alertType)) {
      console.log(
        `  ⏭️  Alert type ${alert.alertType} not configured for watcher ${alert.watcher.id}`
      );
      return;
    }

    // Create alert history record
    const alertHistory = await this.alertHistoryRepo.createAlertRecord({
      alert_config_id: config.id,
      file_tracking_id: alert.fileTracking.id,
      watcher_id: alert.watcher.id,
      alert_type: alert.alertType,
      alert_message: alert.message,
      alert_context: {
        watcher_name: alert.watcher.name,
        expected_pattern: alert.fileTracking.expected_pattern,
        expected_at: alert.fileTracking.expected_at,
        sla_deadline: alert.fileTracking.sla_deadline,
        department_code: alert.watcher.department_code,
      },
      escalation_level: 0, // Initial alert
      delivery_status: 'pending',
      priority: 5, // Default priority
    });

    console.log(
      `  📝 Created alert history record ${alertHistory.id} for watcher "${alert.watcher.name}"`
    );

    // Send notifications
    await this.sendNotifications(alertHistory, config);
  }

  /**
   * Send notifications via configured channels
   */
  private async sendNotifications(
    alertHistory: AlertHistory,
    config: any
  ): Promise<void> {
    const deliveryResults: Record<string, any> = {};
    let overallStatus: DeliveryStatus = 'delivered';

    // Email notifications
    if (config.email_enabled) {
      try {
        const recipients = await this.resolveEmailRecipients(config);

        console.log(
          `  📧 Sending email alerts to ${recipients.to.length} recipient(s)...`
        );

        // Send email to all recipients
        for (const recipient of recipients.to) {
          await this.emailService.sendSLABreachAlert({
            to: recipient,
            cc: recipients.cc,
            bcc: recipients.bcc,
            alert: {
              type: alertHistory.alert_type,
              watcherName: alertHistory.alert_context.watcher_name,
              expectedPattern: alertHistory.alert_context.expected_pattern,
              expectedAt: new Date(alertHistory.alert_context.expected_at),
              slaDeadline: new Date(alertHistory.alert_context.sla_deadline),
              departmentCode: alertHistory.alert_context.department_code,
              message: alertHistory.alert_message,
            },
          });
        }

        deliveryResults.email = {
          status: 'delivered',
          recipients: recipients.to,
          cc: recipients.cc,
          bcc: recipients.bcc,
          sent_at: new Date(),
        };

        console.log(
          `  ✅ Email alerts sent successfully for alert ${alertHistory.id}`
        );
      } catch (error: any) {
        console.error(`Failed to send email alert:`, error);
        deliveryResults.email = { status: 'failed', error: error.message };
        overallStatus = 'failed';

        // Schedule retry
        const nextRetry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await this.alertHistoryRepo.updateRetryInfo(
          alertHistory.id,
          nextRetry
        );
      }
    }

    // Future channels: Slack, MS Teams, etc.
    // if (config.channel_configs?.slack) { ... }

    // Update delivery status
    await this.alertHistoryRepo.updateDeliveryStatus(
      alertHistory.id,
      overallStatus,
      deliveryResults
    );
  }

  /**
   * Resolve all email recipients (direct + groups)
   */
  private async resolveEmailRecipients(config: any): Promise<{
    to: string[];
    cc?: string[];
    bcc?: string[];
  }> {
    const recipients: string[] = [...(config.email_recipients || [])];

    // Add recipient groups
    if (config.recipient_group_ids?.length) {
      const groups = await this.recipientGroupRepo.findByIds(
        config.recipient_group_ids
      );

      for (const group of groups) {
        recipients.push(...(group.email_addresses || []));
      }
    }

    return {
      to: [...new Set(recipients)], // Deduplicate
      cc: config.email_cc,
      bcc: config.email_bcc,
    };
  }

  /**
   * Process escalations (called by escalation worker)
   */
  async processEscalations(): Promise<void> {
    const now = new Date();
    const pendingEscalations =
      await this.alertHistoryRepo.findPendingEscalations(now);

    console.log(
      `🔼 Processing ${pendingEscalations.length} escalations...`
    );

    for (const alert of pendingEscalations) {
      try {
        await this.escalateAlert(alert);
      } catch (error) {
        console.error(`Failed to escalate alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Escalate a single alert to next level
   */
  private async escalateAlert(alertHistory: any): Promise<void> {
    const nextLevel = alertHistory.escalation_level + 1;

    // Get escalation configuration
    const escalation = await this.escalationRepo.findByConfigAndLevel(
      alertHistory.alert_config_id,
      nextLevel
    );

    if (!escalation) {
      console.log(
        `  ⏭️  No escalation level ${nextLevel} configured for alert ${alertHistory.id}`
      );
      return;
    }

    // Create new alert history for escalation
    const escalatedAlert = await this.alertHistoryRepo.createAlertRecord({
      alert_config_id: alertHistory.alert_config_id,
      file_tracking_id: alertHistory.file_tracking_id,
      watcher_id: alertHistory.watcher_id,
      alert_type: alertHistory.alert_type,
      alert_message: `ESCALATED (Level ${nextLevel}): ${alertHistory.alert_message}`,
      alert_context: alertHistory.alert_context,
      escalation_level: nextLevel,
      escalation_to_id: escalation.id,
      delivery_status: 'pending',
      priority: Math.max(1, alertHistory.priority - 1), // Increase priority
    });

    console.log(
      `  🔼 Escalated alert ${alertHistory.id} to level ${nextLevel} (new alert ${escalatedAlert.id})`
    );

    // Send escalated notifications
    const recipients = await this.resolveEscalationRecipients(escalation);

    // Send escalation emails
    for (const recipient of recipients.to) {
      await this.emailService.sendSLABreachAlert({
        to: recipient,
        cc: recipients.cc,
        alert: {
          type: escalatedAlert.alert_type,
          watcherName: escalatedAlert.alert_context.watcher_name,
          expectedPattern: escalatedAlert.alert_context.expected_pattern,
          expectedAt: new Date(escalatedAlert.alert_context.expected_at),
          slaDeadline: new Date(escalatedAlert.alert_context.sla_deadline),
          departmentCode: escalatedAlert.alert_context.department_code,
          message: escalatedAlert.alert_message,
          escalationLevel: nextLevel,
        },
      });
    }

    const deliveryResults = {
      email: {
        status: 'delivered',
        recipients: recipients.to,
        cc: recipients.cc,
        escalation_level: nextLevel,
        sent_at: new Date(),
      },
    };

    await this.alertHistoryRepo.updateDeliveryStatus(
      escalatedAlert.id,
      'delivered',
      deliveryResults
    );

    console.log(
      `  ✅ Escalation notification sent for alert ${escalatedAlert.id}`
    );
  }

  /**
   * Resolve escalation recipients
   */
  private async resolveEscalationRecipients(escalation: any): Promise<{
    to: string[];
    cc?: string[];
    bcc?: string[];
  }> {
    const recipients: string[] = [
      ...(escalation.email_recipients || []),
    ];

    // Add recipient groups
    if (escalation.recipient_group_ids?.length) {
      const groups = await this.recipientGroupRepo.findByIds(
        escalation.recipient_group_ids
      );

      for (const group of groups) {
        recipients.push(...(group.email_addresses || []));
      }
    }

    return {
      to: [...new Set(recipients)], // Deduplicate
      cc: escalation.email_cc,
    };
  }

  /**
   * Process retry queue (called by escalation worker)
   */
  async processRetries(): Promise<void> {
    const now = new Date();
    const failedAlerts = await this.alertHistoryRepo.findPendingRetries(
      now,
      100
    );

    if (failedAlerts.length === 0) return;

    console.log(`🔁 Retrying ${failedAlerts.length} failed alerts...`);

    for (const alert of failedAlerts) {
      try {
        const config = await this.alertConfigRepo.findById(
          alert.alert_config_id
        );
        if (config) {
          await this.sendNotifications(alert, config);
          console.log(`  ✅ Retry successful for alert ${alert.id}`);
        }
      } catch (error) {
        console.error(`Retry failed for alert ${alert.id}:`, error);

        // Schedule next retry with exponential backoff
        const retryDelay = Math.min(
          300000,
          5 * 60 * 1000 * Math.pow(2, alert.retry_count)
        ); // Max 5 minutes
        const nextRetry = new Date(Date.now() + retryDelay);
        await this.alertHistoryRepo.updateRetryInfo(alert.id, nextRetry);
      }
    }
  }
}
