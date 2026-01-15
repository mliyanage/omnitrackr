import {
  AlertConfigRepository,
  AlertHistoryRepository,
  AlertRecipientGroupRepository,
  AlertEscalationRepository,
  AlertCommentRepository,
  WatcherRepository,
  AlertConfig,
  AlertRecipientGroup,
  AlertEscalation,
  AlertComment,
  AlertHistoryWithDetails,
  AlertHistoryQueryOptions,
  CreateAlertConfigRequest,
  UpdateAlertConfigRequest,
  CreateRecipientGroupRequest,
  UpdateRecipientGroupRequest,
  CreateEscalationRequest,
  UpdateEscalationRequest,
  CreateAlertCommentRequest,
} from '@omnitrackr/shared';
import { db } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Alert Service
 * Business logic for managing alert configurations, recipient groups, and alert history
 */
export class AlertService {
  private alertConfigRepo: AlertConfigRepository;
  private alertHistoryRepo: AlertHistoryRepository;
  private recipientGroupRepo: AlertRecipientGroupRepository;
  private escalationRepo: AlertEscalationRepository;
  private commentRepo: AlertCommentRepository;
  private watcherRepo: WatcherRepository;

  constructor() {
    this.alertConfigRepo = new AlertConfigRepository(db);
    this.alertHistoryRepo = new AlertHistoryRepository(db);
    this.recipientGroupRepo = new AlertRecipientGroupRepository(db);
    this.escalationRepo = new AlertEscalationRepository(db);
    this.commentRepo = new AlertCommentRepository(db);
    this.watcherRepo = new WatcherRepository(db);
  }

  // ==================== Alert Configs ====================

  /**
   * Get all alert configs for an organization
   */
  async getAllConfigs(organizationId: number): Promise<AlertConfig[]> {
    return this.alertConfigRepo.findByOrganizationId(organizationId);
  }

  /**
   * Get alert config by ID (with organization ownership validation)
   */
  async getConfigById(
    id: number,
    organizationId: number
  ): Promise<AlertConfig> {
    const config = await this.alertConfigRepo.findById<AlertConfig>(id);
    if (!config || config.deleted_at) {
      throw new NotFoundError('Alert Config', id);
    }

    // Validate organization ownership
    if (config.organization_id !== organizationId) {
      throw new NotFoundError('Alert Config', id);
    }

    return config;
  }

  /**
   * Create alert config
   */
  async createAlertConfig(
    organizationId: number,
    request: CreateAlertConfigRequest,
    createdBy?: number
  ): Promise<AlertConfig> {
    // Validate watcher exists and belongs to organization
    const watcher = await this.watcherRepo.findById<any>(request.watcher_id);
    if (!watcher || watcher.organization_id !== organizationId) {
      throw new NotFoundError('Watcher', request.watcher_id);
    }

    // Validate at least one recipient
    if (
      !request.email_recipients?.length &&
      !request.recipient_group_ids?.length
    ) {
      throw new ValidationError(
        'At least one recipient or recipient group is required'
      );
    }

    // Check if a soft-deleted config exists for this watcher
    const deletedConfig =
      await this.alertConfigRepo.findDeletedByWatcherId(
        request.watcher_id
      );

    if (
      deletedConfig &&
      deletedConfig.organization_id === organizationId
    ) {
      // Restore the soft-deleted config
      const restored = await this.alertConfigRepo.restore(deletedConfig.id, {
        alert_types: request.alert_types || ['sla_breached'],
        email_enabled: request.email_enabled ?? true,
        email_recipients: request.email_recipients,
        email_cc: request.email_cc,
        email_bcc: request.email_bcc,
        recipient_group_ids: request.recipient_group_ids,
        channel_configs: request.channel_configs,
        enabled: request.enabled ?? true,
        updated_by: createdBy,
      });
      if (!restored) {
        throw new NotFoundError('Alert Config', deletedConfig.id);
      }
      return restored;
    }

    // Create new config
    return this.alertConfigRepo.create<AlertConfig>({
      watcher_id: request.watcher_id,
      organization_id: organizationId,
      department_id: watcher.department_id,
      alert_types: request.alert_types || ['sla_breached'],
      email_enabled: request.email_enabled ?? true,
      email_recipients: request.email_recipients,
      email_cc: request.email_cc,
      email_bcc: request.email_bcc,
      recipient_group_ids: request.recipient_group_ids,
      channel_configs: request.channel_configs,
      enabled: request.enabled ?? true,
      created_by: createdBy,
    });
  }

  /**
   * Update alert config
   */
  async updateAlertConfig(
    id: number,
    organizationId: number,
    request: UpdateAlertConfigRequest,
    updatedBy?: number
  ): Promise<AlertConfig> {
    // Validate ownership
    await this.getConfigById(id, organizationId);

    // Validate at least one recipient if changing recipients
    const currentConfig = await this.alertConfigRepo.findById<AlertConfig>(id);
    const newEmailRecipients =
      request.email_recipients !== undefined
        ? request.email_recipients
        : currentConfig!.email_recipients;
    const newRecipientGroups =
      request.recipient_group_ids !== undefined
        ? request.recipient_group_ids
        : currentConfig!.recipient_group_ids;

    if (!newEmailRecipients?.length && !newRecipientGroups?.length) {
      throw new ValidationError(
        'At least one recipient or recipient group is required'
      );
    }

    // Update
    await this.alertConfigRepo.update(id, {
      ...request,
      updated_by: updatedBy,
    });

    return this.getConfigById(id, organizationId);
  }

  /**
   * Delete alert config (soft delete)
   */
  async deleteAlertConfig(
    id: number,
    organizationId: number
  ): Promise<void> {
    // Validate ownership
    await this.getConfigById(id, organizationId);

    // Soft delete
    await this.alertConfigRepo.softDelete(id);
  }

  // ==================== Recipient Groups ====================

  /**
   * Get all recipient groups for an organization
   */
  async getAllRecipientGroups(
    organizationId: number
  ): Promise<AlertRecipientGroup[]> {
    return this.recipientGroupRepo.findByOrganizationId(organizationId);
  }

  /**
   * Get recipient group by ID
   */
  async getRecipientGroupById(
    id: number,
    organizationId: number
  ): Promise<AlertRecipientGroup> {
    const group =
      await this.recipientGroupRepo.findById<AlertRecipientGroup>(id);
    if (!group || group.deleted_at) {
      throw new NotFoundError('Recipient Group', id);
    }

    // Validate organization ownership
    if (group.organization_id !== organizationId) {
      throw new NotFoundError('Recipient Group', id);
    }

    return group;
  }

  /**
   * Create recipient group
   */
  async createRecipientGroup(
    organizationId: number,
    request: CreateRecipientGroupRequest,
    createdBy?: number
  ): Promise<AlertRecipientGroup> {
    // Validate at least one email
    if (!request.email_addresses?.length) {
      throw new ValidationError('At least one email address is required');
    }

    // Check for existing with same name
    const existing = await this.recipientGroupRepo.findByName(
      organizationId,
      request.name
    );
    if (existing) {
      throw new ValidationError(
        `Recipient group with name "${request.name}" already exists`
      );
    }

    // Check for soft-deleted with same name
    const deletedGroup = await this.recipientGroupRepo.findDeletedByName(
      organizationId,
      request.name
    );

    if (deletedGroup) {
      // Restore
      const restored = await this.recipientGroupRepo.restore(deletedGroup.id, {
        description: request.description,
        email_addresses: request.email_addresses,
        user_ids: request.user_ids,
        updated_by: createdBy,
      });
      if (!restored) {
        throw new NotFoundError('Recipient Group', deletedGroup.id);
      }
      return restored;
    }

    // Create new
    return this.recipientGroupRepo.create<AlertRecipientGroup>({
      organization_id: organizationId,
      name: request.name,
      description: request.description,
      email_addresses: request.email_addresses,
      user_ids: request.user_ids,
      created_by: createdBy,
    });
  }

  /**
   * Update recipient group
   */
  async updateRecipientGroup(
    id: number,
    organizationId: number,
    request: UpdateRecipientGroupRequest,
    updatedBy?: number
  ): Promise<AlertRecipientGroup> {
    // Validate ownership
    await this.getRecipientGroupById(id, organizationId);

    // Validate name uniqueness if changing name
    if (request.name) {
      const existing = await this.recipientGroupRepo.findByName(
        organizationId,
        request.name
      );
      if (existing && existing.id !== id) {
        throw new ValidationError(
          `Recipient group with name "${request.name}" already exists`
        );
      }
    }

    // Update
    await this.recipientGroupRepo.update(id, {
      ...request,
      updated_by: updatedBy,
    });

    return this.getRecipientGroupById(id, organizationId);
  }

  /**
   * Delete recipient group (soft delete)
   */
  async deleteRecipientGroup(
    id: number,
    organizationId: number
  ): Promise<void> {
    // Validate ownership
    await this.getRecipientGroupById(id, organizationId);

    // Soft delete
    await this.recipientGroupRepo.softDelete(id);
  }

  // ==================== Escalations ====================

  /**
   * Get escalations for an alert config
   */
  async getEscalations(
    configId: number,
    organizationId: number
  ): Promise<AlertEscalation[]> {
    // Validate config ownership
    await this.getConfigById(configId, organizationId);

    return this.escalationRepo.findByConfigId(configId);
  }

  /**
   * Create escalation
   */
  async createEscalation(
    organizationId: number,
    request: CreateEscalationRequest
  ): Promise<AlertEscalation> {
    // Validate config ownership
    await this.getConfigById(request.alert_config_id, organizationId);

    // Validate at least one recipient
    if (
      !request.email_recipients?.length &&
      !request.recipient_group_ids?.length
    ) {
      throw new ValidationError(
        'At least one recipient or recipient group is required'
      );
    }

    // Check if escalation level already exists
    const existing = await this.escalationRepo.findByConfigAndLevel(
      request.alert_config_id,
      request.escalation_level
    );
    if (existing) {
      throw new ValidationError(
        `Escalation level ${request.escalation_level} already exists`
      );
    }

    // Create
    return this.escalationRepo.create<AlertEscalation>(request);
  }

  /**
   * Update escalation
   */
  async updateEscalation(
    id: number,
    organizationId: number,
    request: UpdateEscalationRequest
  ): Promise<AlertEscalation> {
    const escalation =
      await this.escalationRepo.findById<AlertEscalation>(id);
    if (!escalation || escalation.deleted_at) {
      throw new NotFoundError('Escalation', id);
    }

    // Validate config ownership
    await this.getConfigById(escalation.alert_config_id, organizationId);

    // Update
    await this.escalationRepo.update(id, request);

    const updated = await this.escalationRepo.findById<AlertEscalation>(id);
    if (!updated) {
      throw new NotFoundError('Escalation', id);
    }
    return updated;
  }

  /**
   * Delete escalation (soft delete)
   */
  async deleteEscalation(
    id: number,
    organizationId: number
  ): Promise<void> {
    const escalation =
      await this.escalationRepo.findById<AlertEscalation>(id);
    if (!escalation || escalation.deleted_at) {
      throw new NotFoundError('Escalation', id);
    }

    // Validate config ownership
    await this.getConfigById(escalation.alert_config_id, organizationId);

    // Soft delete
    await this.escalationRepo.softDelete(id);
  }

  // ==================== Alert History ====================

  /**
   * Get alert history with filtering
   */
  async getAlertHistory(
    organizationId: number,
    options: AlertHistoryQueryOptions
  ): Promise<{
    data: AlertHistoryWithDetails[];
    pagination: any;
  }> {
    const result = await this.alertHistoryRepo.findWithFilters(options);

    // Additional filtering by organization (security)
    const configs =
      await this.alertConfigRepo.findByOrganizationId(organizationId);
    const configIds = configs.map((c) => c.id);

    const filteredData = result.data.filter((alert) =>
      configIds.includes(alert.alert_config_id)
    );

    return {
      data: filteredData,
      pagination: result.pagination,
    };
  }

  /**
   * Get alert history by ID
   */
  async getAlertHistoryById(
    id: number,
    organizationId: number
  ): Promise<AlertHistoryWithDetails> {
    const alerts = await this.alertHistoryRepo.findWithFilters({
      organization_id: organizationId,
      page: 1,
      limit: 1,
    });

    const alert = alerts.data.find((a) => a.id === id);
    if (!alert) {
      throw new NotFoundError('Alert History', id);
    }

    // Validate organization ownership through config
    const config = await this.alertConfigRepo.findById<any>(
      alert.alert_config_id
    );
    if (!config || config.organization_id !== organizationId) {
      throw new NotFoundError('Alert History', id);
    }

    return alert;
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertHistoryId: number,
    userId: number,
    organizationId: number,
    note?: string
  ): Promise<void> {
    const alert = await this.alertHistoryRepo.findById<any>(alertHistoryId);
    if (!alert) {
      throw new NotFoundError('Alert', alertHistoryId);
    }

    // Validate organization access
    const config = await this.alertConfigRepo.findById<any>(
      alert.alert_config_id
    );
    if (!config || config.organization_id !== organizationId) {
      throw new NotFoundError('Alert', alertHistoryId);
    }

    await this.alertHistoryRepo.acknowledge(alertHistoryId, userId, note);
  }

  /**
   * Get comments for an alert
   */
  async getAlertComments(
    alertHistoryId: number,
    organizationId: number
  ): Promise<any[]> {
    // Validate alert exists and user has access
    await this.getAlertHistoryById(alertHistoryId, organizationId);

    return this.commentRepo.findByAlertHistoryId(alertHistoryId);
  }

  /**
   * Add comment to alert
   */
  async addAlertComment(
    alertHistoryId: number,
    userId: number,
    organizationId: number,
    request: CreateAlertCommentRequest
  ): Promise<AlertComment> {
    // Validate alert exists and user has access
    await this.getAlertHistoryById(alertHistoryId, organizationId);

    return this.commentRepo.createComment({
      alert_history_id: alertHistoryId,
      user_id: userId,
      comment: request.comment,
    });
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(organizationId: number): Promise<any> {
    // Note: This would need filtering by organization
    // For now, returning basic stats
    return this.alertHistoryRepo.getDashboardStats();
  }
}
