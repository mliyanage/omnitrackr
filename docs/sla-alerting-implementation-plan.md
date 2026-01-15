# SLA Breach Alerting System - Implementation Plan

## Overview

Design and implement a comprehensive SLA breach alerting system that:
- Allows per-watcher alert configuration (who gets notified, how, when)
- Sends email alerts with CC/BCC support to multiple recipients and groups
- Supports escalation chains (if not acknowledged in X minutes, notify next level)
- Tracks alert history with acknowledgment and commenting capabilities
- Extensible architecture for future channels (Slack, MS Teams, Jira, SMS, ServiceNow)
- **Phase 1: Email only** (extensibility built-in for future)

## User Requirements Summary

**From user Q&A:**
- ✅ Per-watcher configuration (not reusable templates)
- ✅ Escalation chains (if no acknowledgment, escalate to next level)
- ✅ Email recipients: arbitrary addresses + recipient groups
- ✅ Alert history: delivery status + acknowledgment + comments

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│          SLA Monitor Worker (Line 117 Integration)          │
│  Detects SLA breaches → Calls NotificationManager           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               Notification Manager Service                   │
│  - Loads alert config for watcher                            │
│  - Creates alert_history record                              │
│  - Resolves recipients (direct + groups)                     │
│  - Sends emails via EmailService                             │
│  - Updates delivery status                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Email Service                             │
│  - Existing Mailjet integration with retry logic             │
│  - New method: sendSLABreachAlert()                          │
│  - CC/BCC support                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Escalation Worker (New)                        │
│  - Runs every 5 minutes                                      │
│  - Finds unacknowledged alerts past delay_minutes            │
│  - Creates escalated alert_history record                    │
│  - Sends notifications to next level recipients              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema (5 New Tables)

### 1. `alert_configs` - Per-watcher alert configuration
```sql
- watcher_id (FK to watchers) - Which watcher triggers alerts
- organization_id, department_id - Multi-tenancy
- alert_types: text[] - Which events trigger (sla_breached, sla_at_risk, etc.)
- email_enabled, email_recipients[], email_cc[], email_bcc[]
- recipient_group_ids: integer[] - References to alert_recipient_groups
- channel_configs: jsonb - Future channels (slack, teams, etc.)
- enabled - Can disable alerts without deleting config
```

### 2. `alert_recipient_groups` - Reusable recipient groups
```sql
- organization_id
- name, description
- email_addresses: text[] - List of emails
- user_ids: integer[] - Future: internal users
```

### 3. `alert_escalations` - Escalation chain levels
```sql
- alert_config_id (FK)
- escalation_level - 1, 2, 3, etc.
- delay_minutes - Wait time before escalating if not acknowledged
- email_recipients[], email_cc[], recipient_group_ids[]
- channel_configs: jsonb - Future channels
```

### 4. `alert_history` - All alerts sent (audit trail)
```sql
- alert_config_id, file_tracking_id, watcher_id
- alert_type, alert_message, alert_context: jsonb
- escalation_level - 0=initial, 1+=escalated
- delivery_status - pending, processing, delivered, failed
- delivery_details: jsonb - Per-channel results
- acknowledged, acknowledged_at, acknowledged_by, acknowledgment_note
- retry_count, max_retries, next_retry_at
- priority - 1=highest for escalations
```

### 5. `alert_comments` - User comments on alerts
```sql
- alert_history_id (FK)
- user_id (FK)
- comment: text
```

## Implementation Phases

### Phase 1: Database Foundation (Day 1)

**Migrations to create:**

1. `/packages/api/migrations/20260114000001_create_alert_configs.ts`
   - Core per-watcher configuration table
   - Includes email recipients, groups, future channel_configs
   - CHECK constraint: at least one recipient required

2. `/packages/api/migrations/20260114000002_create_alert_recipient_groups.ts`
   - Reusable distribution lists
   - Organization-scoped

3. `/packages/api/migrations/20260114000003_create_alert_escalations.ts`
   - Escalation chain levels per config
   - delay_minutes determines when to escalate

4. `/packages/api/migrations/20260114000004_create_alert_history.ts`
   - Master audit table for all alerts
   - Tracks delivery, acknowledgment, escalations
   - Indexes for performance on escalation queries

5. `/packages/api/migrations/20260114000005_create_alert_comments.ts`
   - Comments/notes on alerts

**Type definitions:**

6. `/packages/shared/src/types/alert.types.ts`
   - All interfaces: AlertConfig, AlertRecipientGroup, AlertEscalation, AlertHistory, AlertComment
   - Request DTOs: CreateAlertConfigRequest, UpdateAlertConfigRequest, etc.
   - Enums: AlertType, DeliveryStatus, ChannelType
   - Query options and dashboard stats interfaces

### Phase 2: Backend Core (Day 2-3)

**Repositories:**

7. `/packages/shared/src/repositories/alertConfig.repository.ts`
   - Extends BaseRepository
   - Methods: findByWatcherId, findByOrganizationId, softDelete, restore

8. `/packages/shared/src/repositories/alertHistory.repository.ts`
   - Methods: createAlertRecord, findPendingEscalations, findPendingRetries
   - acknowledge, updateDeliveryStatus, findWithFilters (pagination)

9. `/packages/shared/src/repositories/alertRecipientGroup.repository.ts`
10. `/packages/shared/src/repositories/alertEscalation.repository.ts`
11. `/packages/shared/src/repositories/alertComment.repository.ts`

**Services:**

12. `/packages/api/src/services/alert.service.ts`
   - CRUD for alert configs, recipient groups, escalations
   - getAlertHistory with filters
   - acknowledgeAlert with authorization checks
   - Multi-tenancy enforcement

13. `/packages/worker/src/services/notification-manager.service.ts` ⭐ **CRITICAL**
   - `processAlerts(alerts: SLAAlert[])` - Main entry point from SLA monitor
   - `processSingleAlert()` - Load config, create alert_history, send notifications
   - `sendNotifications()` - Send via email (extensible to other channels)
   - `resolveEmailRecipients()` - Flatten recipients + groups
   - `sendEmailAlert()` - Call EmailService
   - `processEscalations()` - Find unacknowledged alerts, escalate
   - `escalateAlert()` - Create new alert_history with higher level
   - `processRetries()` - Retry failed deliveries

14. **Extend** `/packages/api/src/services/email.service.ts`
   - Add method: `sendSLABreachAlert(options: {...})`
   - Use existing template generator with SLA breach details
   - Support CC/BCC via Mailjet API
   - Leverage existing retry logic

### Phase 3: Worker Integration (Day 3)

15. **Modify** `/packages/worker/src/workers/sla-monitor-worker.ts`
   - Line 25: Add `private notificationManager: NotificationManagerService`
   - Line 117-125: Replace TODO with:
     ```typescript
     if (alerts.length > 0) {
       console.log(`\n   🚨 Found ${alerts.length} SLA violations, sending alerts...`);
       await this.notificationManager.processAlerts(alerts);
     }
     ```

16. **Create** `/packages/worker/src/workers/escalation-worker.ts`
   - Similar structure to SLA monitor worker
   - Runs every 5 minutes (configurable via ESCALATION_CHECK_INTERVAL)
   - Calls notificationManager.processEscalations()
   - Also calls notificationManager.processRetries() for failed deliveries

17. **Modify** `/packages/worker/src/index.ts`
   - Initialize EscalationWorker
   - Start both workers (SLA monitor + Escalation)
   - Graceful shutdown for both

### Phase 4: API Layer (Day 4)

18. `/packages/api/src/controllers/alert.controller.ts`
   - Full CRUD for alert configs (create, get, update, delete)
   - Alert history endpoints (list with filters, get detail)
   - Acknowledgment endpoint
   - Comment endpoints
   - Recipient group CRUD
   - Escalation CRUD
   - Statistics endpoint

19. `/packages/api/src/routes/alerts.routes.ts`
   - `/alerts/configs` - CRUD (requireEditor for modifications)
   - `/alerts/history` - List, get detail (all roles)
   - `/alerts/history/:id/acknowledge` - Acknowledge (requireEditor)
   - `/alerts/history/:id/comments` - Add comment (requireEditor)
   - `/alerts/recipient-groups` - CRUD (requireEditor)
   - `/alerts/configs/:configId/escalations` - CRUD (requireEditor)
   - `/alerts/stats` - Dashboard statistics

20. **Modify** `/packages/api/src/routes/index.ts`
   - Add: `router.use('/alerts', alertsRoutes)`

### Phase 5: Frontend UI (Day 5-6)

21. `/packages/frontend/src/api/alerts.api.ts`
   - API client functions for all endpoints
   - getAlertConfigs, createAlertConfig, updateAlertConfig, deleteAlertConfig
   - getAlertHistory, acknowledgeAlert, addAlertComment
   - Recipient group and escalation methods

22. `/packages/frontend/src/pages/AlertsPage.tsx`
   - Main page with tabs: Configurations | History | Statistics
   - Create button (owner/editor only)
   - List alert configs with edit/delete actions
   - Alert history table with filters
   - React Query for data fetching

23. `/packages/frontend/src/components/alerts/AlertConfigSheet.tsx`
   - Sheet component for create/edit alert config
   - Form fields:
     - Watcher dropdown (required)
     - Alert types checkboxes (sla_breached, sla_at_risk, etc.)
     - Email recipients (comma-separated)
     - CC/BCC fields
     - Recipient group multi-select
     - Enabled toggle
   - Validation with Zod

24. `/packages/frontend/src/components/alerts/AlertConfigTable.tsx`
   - Table component showing all configs
   - Columns: Watcher, Alert Types, Recipients, Status, Actions
   - Edit/Delete dropdowns (role-based)

25. `/packages/frontend/src/components/alerts/AlertHistoryTable.tsx`
   - Table showing alert history
   - Columns: Watcher, Type, Expected At, SLA Deadline, Delivery Status, Acknowledged, Created, Actions
   - Acknowledge button (if not acknowledged)
   - Click to view details

26. `/packages/frontend/src/components/alerts/AlertHistoryDetailSheet.tsx`
   - Full alert context view
   - Acknowledgment form with note
   - Comments section with add comment form
   - Escalation timeline

27. `/packages/frontend/src/components/alerts/RecipientGroupSheet.tsx`
   - CRUD for recipient groups
   - Name, description, email addresses (tags input)

28. `/packages/frontend/src/components/alerts/EscalationSheet.tsx`
   - Add/edit escalation levels
   - Escalation level number
   - Delay (minutes)
   - Recipients for this level

29. **Modify** `/packages/frontend/src/components/layout/Sidebar.tsx`
   - Add menu item:
     ```typescript
     {
       name: 'Alerts',
       href: '/alerts',
       icon: Bell,
       roles: ['owner', 'editor', 'viewer'],
     }
     ```

30. **Modify** `/packages/frontend/src/routes/index.tsx`
   - Add route: `<Route path="/alerts" element={<AlertsPage />} />`

### Phase 6: Documentation (Day 7)

31. `/docs/sla-alerting-system.md`
   - Overview of alerting system
   - User guide: Setting up alerts, managing configs, acknowledging
   - Architecture diagram
   - API reference
   - Troubleshooting guide

32. **Update** `/README.md` or `/docs/README.md`
   - Add link to SLA alerting documentation
   - Mention new ESCALATION_CHECK_INTERVAL environment variable

33. Create implementation progress tracker in `/docs/sla-alerting-implementation-progress.md`
   - Checklist of all tasks
   - Status tracking (Not Started | In Progress | Completed | Tested)

### Phase 7: Testing & Deployment (Day 8)

34. Unit tests for repositories
35. Integration tests for alert flow:
    - SLA breach → Alert created → Email sent
    - Escalation after delay
    - Acknowledgment prevents escalation
    - Organization isolation
36. E2E tests for frontend
37. Update `.env.development` with new variables:
    ```
    ESCALATION_CHECK_INTERVAL=300
    ALERT_RETRY_DELAY_MINUTES=5
    ALERT_MAX_RETRIES=3
    ```

## Critical Integration Points

### 1. SLA Monitor Worker (Line 117)
**File:** `/packages/worker/src/workers/sla-monitor-worker.ts`

**Current code (line 116-125):**
```typescript
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
```

**New code:**
```typescript
// Step 3: Trigger notifications for alerts
if (alerts.length > 0) {
  console.log(`\n   🚨 Found ${alerts.length} SLA violations, sending alerts...`);
  await this.notificationManager.processAlerts(alerts);
}
```

### 2. Email Service Extension
**File:** `/packages/api/src/services/email.service.ts`

**Add new method:**
```typescript
async sendSLABreachAlert(options: {
  to: string;
  cc?: string[];
  bcc?: string[];
  alert: {
    type: AlertType;
    watcherName: string;
    expectedPattern: string;
    expectedAt: Date;
    slaDeadline: Date;
    departmentCode?: string;
    message: string;
  };
}): Promise<void> {
  // Use existing generateEmailTemplate() and sendEmail() with retry logic
  // Mailjet supports CC/BCC in message object
}
```

### 3. Worker Initialization
**File:** `/packages/worker/src/index.ts`

**Add after SLA monitor initialization:**
```typescript
const escalationWorker = new EscalationWorker(db, {
  checkIntervalSeconds: Number(process.env.ESCALATION_CHECK_INTERVAL) || 300,
});

await escalationWorker.start();

// Update graceful shutdown
process.on('SIGTERM', async () => {
  await slaMonitorWorker.stop();
  await escalationWorker.stop();
  await db.destroy();
  process.exit(0);
});
```

## Extensibility Design (Future Channels)

**Channel Plugin Architecture:**

```typescript
// base-channel.ts
export abstract class BaseChannel {
  abstract get name(): string;
  abstract send(payload: NotificationPayload): Promise<any>;
  abstract validateConfig(config: any): boolean;
}

// email-channel.ts (Phase 1)
export class EmailChannel extends BaseChannel { ... }

// slack-channel.ts (Future)
export class SlackChannel extends BaseChannel { ... }

// channel-registry.ts
export class ChannelRegistry {
  private channels: Map<string, BaseChannel>;
  register(channel: BaseChannel): void { ... }
  get(name: string): BaseChannel | undefined { ... }
}
```

**NotificationManager uses registry:**
```typescript
private channelRegistry = new ChannelRegistry();

async sendNotifications(alertHistory, config) {
  // Email
  if (config.email_enabled) {
    const emailChannel = this.channelRegistry.get('email');
    await emailChannel.send({ ... });
  }

  // Future channels from channel_configs
  for (const [channelName, channelConfig] of Object.entries(config.channel_configs)) {
    if (channelConfig.enabled) {
      const channel = this.channelRegistry.get(channelName);
      await channel.send({ ... });
    }
  }
}
```

**To add Slack in future:**
1. Implement SlackChannel class
2. Register in ChannelRegistry constructor
3. Users add Slack webhook to channel_configs in alert config
4. No other code changes needed

## Testing Strategy

### Unit Tests
- Repository methods (findByWatcherId, acknowledge, etc.)
- Email recipient resolution (direct + groups)
- Escalation timing logic

### Integration Tests
- End-to-end alert flow:
  1. Trigger SLA breach in test
  2. Verify alert_history record created
  3. Verify email sent via EmailService mock
  4. Verify delivery_status updated
- Escalation flow:
  1. Create alert with escalation config
  2. Wait past delay_minutes
  3. Run escalation worker
  4. Verify escalated alert created
- Acknowledgment prevents escalation
- Retry logic for failed deliveries
- Organization/department isolation

### E2E Tests (Frontend)
- Create alert configuration for watcher
- View alert history
- Acknowledge alert
- Add comment to alert

## Environment Variables

**New variables to add:**

```bash
# SLA Alerting Configuration
ESCALATION_CHECK_INTERVAL=300  # 5 minutes
ALERT_RETRY_DELAY_MINUTES=5
ALERT_MAX_RETRIES=3
```

**Existing (already configured):**
```bash
MJ_APIKEY_PUBLIC=...
MJ_APIKEY_PRIVATE=...
FROM_EMAIL=noreply@omnitrackr.com
FROM_NAME=OmniTrackr Alerts
APP_URL=https://app.omnitrackr.com
```

## Security & Authorization

### Access Control
- **Viewer:** Can view configs, history, comments (read-only)
- **Editor:** Can create/edit configs, acknowledge alerts, add comments
- **Owner:** Full access
- **Super Admin:** Full access

### Data Isolation
- All queries filtered by organization_id
- Service layer validates ownership before operations
- Foreign key constraints enforce referential integrity

### Email Security
- Validate email addresses before sending
- Rate limiting on alert endpoints (prevent abuse)
- Log all alert deliveries for audit

## Success Criteria

✅ **Phase 1 Complete:**
- Alert configurations can be created per watcher
- Emails sent when SLA breaches detected
- Alert history visible in UI

✅ **Phase 2 Complete (Escalation):**
- Unacknowledged alerts escalate after configured delay
- Escalation emails sent to next level recipients
- Acknowledgment stops escalation

✅ **Phase 3 Complete (Full Feature):**
- Comments can be added to alerts
- Failed deliveries retry with exponential backoff
- Statistics dashboard shows alert metrics
- Documentation complete

## File Count Summary

- **Migrations:** 5 files
- **Types:** 1 file
- **Repositories:** 5 files
- **Services:** 2 files (1 new, 1 modified)
- **Workers:** 1 new file, 2 modified files
- **Controllers:** 1 file
- **Routes:** 1 file, 1 modified
- **Frontend API:** 1 file
- **Frontend Components:** 8 files
- **Frontend Navigation:** 2 modified files
- **Documentation:** 2 files
- **Tests:** Multiple test files

**Total:** ~33 files to create/modify

## Estimated Timeline

- **Day 1:** Database migrations + types
- **Day 2-3:** Backend services + repositories
- **Day 3:** Worker integration
- **Day 4:** API controllers + routes
- **Day 5-6:** Frontend UI
- **Day 7:** Documentation
- **Day 8:** Testing + deployment

**Total:** 8 development days for full implementation

## Next Steps After Approval

1. Create database migrations (start with alert_configs)
2. Run migrations in development
3. Create type definitions
4. Implement NotificationManagerService (core logic)
5. Integrate with SLA monitor worker
6. Test end-to-end alert flow
7. Add escalation worker
8. Build frontend UI
9. Write documentation
10. Deploy to production

---

**Ready to proceed once approved! 🚀**
