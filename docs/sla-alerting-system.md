# SLA Breach Alerting System - User Guide

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Guide](#user-guide)
4. [Architecture](#architecture)
5. [API Reference](#api-reference)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The SLA Breach Alerting System provides comprehensive notification capabilities when files are late, missing, or at risk of breaching their SLA thresholds. The system supports:

- **Per-watcher alert configuration** - Configure alerts for each file watcher independently
- **Multiple alert types** - SLA Breached, SLA At Risk, File Arrived, File Arrived Late
- **Flexible recipient management** - Send to direct email addresses, CC recipients, or reusable recipient groups
- **Escalation chains** - Automatically escalate to higher levels if alerts aren't acknowledged
- **Alert history tracking** - Complete audit trail with acknowledgment and commenting
- **Retry logic** - Automatic retry for failed email deliveries with exponential backoff
- **Extensible architecture** - Ready for future channels (Slack, Teams, Jira, SMS, ServiceNow)

---

## Getting Started

### Prerequisites

- OmniTrackr API running with database access
- OmniTrackr Worker configured and running
- Mailjet account configured (for email notifications)
- User role: **Editor** or **Owner** (Viewers can only view alerts)

### Quick Start

1. **Navigate to Alerts page** - Click "Alerts" in the sidebar
2. **Create a recipient group** (optional) - Click "Recipient Group" button
3. **Create alert configuration** - Click "Alert Configuration" button
4. **Select watcher** - Choose which watcher to monitor
5. **Configure notifications** - Set alert types, recipients, and escalations
6. **Enable configuration** - Toggle "Configuration enabled" checkbox
7. **Save** - Click "Create" button

---

## User Guide

### Managing Recipient Groups

Recipient groups are reusable distribution lists that can be assigned to multiple alert configurations.

#### Creating a Recipient Group

1. Go to **Alerts** page → **Recipient Groups** tab
2. Click **"Recipient Group"** button
3. Enter group details:
   - **Name** (required): e.g., "Operations Team", "Support Team"
   - **Description** (optional): Purpose of this group
   - **Email Addresses** (required): Type email and press Enter to add multiple
4. Click **"Create"**

**Example:**
```
Name: IT Operations Team
Description: Primary on-call team for file monitoring alerts
Email Addresses:
  - ops-team@acme.com
  - it-oncall@acme.com
  - monitoring@acme.com
```

#### Editing a Recipient Group

1. Go to **Recipient Groups** tab
2. Click **"Edit"** on the group you want to modify
3. Update fields as needed
4. Click **"Update"**

**Note:** Changes to recipient groups automatically apply to all alert configurations using that group.

---

### Configuring Alert Notifications

Alert configurations define how and when alerts are sent for a specific watcher.

#### Creating an Alert Configuration

1. Go to **Alerts** page → **Configurations** tab
2. Click **"Alert Configuration"** button
3. **Select Watcher** (required):
   - Choose the watcher to monitor from dropdown
   - Cannot be changed after creation

4. **Select Alert Types** (required, one or more):
   - ☑ **SLA Breached** - File missed SLA deadline (critical)
   - ☑ **SLA At Risk** - File approaching SLA deadline (warning)
   - ☑ **File Arrived** - File received successfully (informational)
   - ☑ **File Arrived Late** - File arrived after expected time (warning)

5. **Configure Email Notifications**:
   - Toggle "Email Notifications" to enable/disable
   - **Email Recipients**: Direct email addresses (press Enter to add multiple)
   - **CC Recipients**: CC recipients for all alerts
   - **Recipient Groups**: Select one or more groups to notify

6. **Configure Escalation Chains** (optional):
   - Click **"Add Level"** to create escalation level
   - Set **delay in minutes** before escalating if not acknowledged
   - Configure recipients for each escalation level
   - Example:
     ```
     Level 1: 30 minutes → ops-team@acme.com
     Level 2: 60 minutes → manager@acme.com
     Level 3: 120 minutes → director@acme.com
     ```

7. **Enable Configuration**:
   - Toggle "Configuration enabled" checkbox
   - Disabled configs won't send alerts

8. Click **"Create"**

#### Example Configuration

```yaml
Watcher: Daily Sales Report
Alert Types:
  - SLA Breached
  - SLA At Risk
Email Recipients:
  - sales-ops@acme.com
CC Recipients:
  - sales-manager@acme.com
Recipient Groups:
  - IT Operations Team
Escalations:
  - Level 1: 30 minutes
  - Level 2: 60 minutes
Status: Enabled
```

#### Editing an Alert Configuration

1. Go to **Configurations** tab
2. Click **⋮** (three dots) → **Edit**
3. Modify configuration as needed
4. Click **"Update"**

#### Enabling/Disabling Configurations

To temporarily disable alerts without deleting:
1. Go to **Configurations** tab
2. Click **⋮** → **Disable** (or **Enable**)

**Note:** Disabled configurations are retained in the database but won't send alerts.

#### Deleting a Configuration

1. Go to **Configurations** tab
2. Click **⋮** → **Delete**
3. Confirm deletion

**Warning:** This is a soft delete. Configuration can be restored from database if needed.

---

### Viewing Alert History

The Alert History shows all triggered alerts with their delivery status and acknowledgments.

#### Viewing Alerts

1. Go to **Alerts** page → **Alert History** tab
2. Browse alerts in the table
3. Click **eye icon** to view full alert details

#### Understanding Alert Status

**Alert Types:**
- 🔴 **SLA Breached** - Critical: File missed deadline
- 🟠 **SLA At Risk** - Warning: File approaching deadline
- 🟢 **File Arrived** - Success: File received on time
- 🟡 **Arrived Late** - Warning: File arrived after expected time

**Delivery Status:**
- ⚪ **Pending** - Alert queued, not yet sent
- 🔵 **Processing** - Currently sending
- 🟢 **Delivered** - Successfully sent to all recipients
- 🔴 **Failed** - Delivery failed (will retry)
- 🟠 **Partial** - Some recipients succeeded, others failed

**Escalation Level:**
- **Initial** - First notification (Level 0)
- **Level 1, 2, 3...** - Escalated notifications

**Acknowledged:**
- ✓ **Yes** - Alert has been acknowledged (stops escalation)
- **No** - Alert not yet acknowledged (may escalate)

---

### Acknowledging Alerts

Acknowledging an alert marks it as "seen" and stops the escalation chain.

#### How to Acknowledge

1. Go to **Alert History** tab
2. Find unacknowledged alert
3. Click **"Acknowledge"** button in the Actions column

**OR**

1. Click **eye icon** to view alert details
2. In the **Acknowledgment** section:
   - Add optional acknowledgment note (e.g., "Investigated - vendor delay")
   - Click **"Acknowledge Alert"** button

#### Acknowledgment Effects

- **Stops escalation** - Alert won't escalate to higher levels
- **Records user** - Tracks who acknowledged and when
- **Updates dashboard** - Removes from "Unacknowledged" count
- **Preserves history** - Acknowledgment is permanent audit trail

---

### Adding Comments to Alerts

Comments allow teams to collaborate and document alert investigations.

#### Adding a Comment

1. Go to **Alert History** tab
2. Click **eye icon** on an alert
3. Scroll to **Comments** section
4. Type your comment
5. Click **"Add Comment"**

#### Comment Use Cases

- Document investigation steps
- Share findings with team
- Record resolution actions
- Link to related incidents

**Example:**
```
"Contacted vendor - file delayed due to system maintenance.
Expected arrival: 2pm. No further action needed."
```

---

### Dashboard and Statistics

The main Alerts page shows real-time statistics:

**Summary Cards:**
- **Active Configs** - Number of enabled alert configurations
- **Total Alerts** - All-time alert count
- **Unacknowledged** - Alerts requiring attention (orange)
- **Failed Deliveries** - Alerts with delivery errors (red)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│          SLA Monitor Worker (Every 5 minutes)                │
│  - Detects SLA breaches from file_tracking table             │
│  - Calls NotificationManagerService.processAlerts()          │
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
│  - sendSLABreachAlert() with CC/BCC support                  │
│  - Mailjet API with retry logic                              │
│  - Color-coded emails by alert type                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           Escalation Worker (Every 5 minutes)                │
│  - Finds unacknowledged alerts past delay_minutes            │
│  - Creates escalated alert_history record                    │
│  - Sends escalation emails to next level recipients          │
│  - Processes failed delivery retries                         │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

**Five Core Tables:**

1. **alert_configs** - Per-watcher configuration
   - Links to watcher
   - Alert types enabled
   - Email recipients and CC
   - Recipient group IDs
   - Enabled/disabled status

2. **alert_recipient_groups** - Reusable recipient lists
   - Organization-scoped
   - Email addresses array
   - Name and description

3. **alert_escalations** - Escalation chain levels
   - Links to alert config
   - Escalation level (1, 2, 3...)
   - Delay in minutes
   - Recipients for this level

4. **alert_history** - Complete audit trail
   - Links to watcher and file_tracking
   - Alert type and message
   - Delivery status
   - Acknowledgment info
   - Retry count and next retry time
   - Alert context (JSON)

5. **alert_comments** - User comments on alerts
   - Links to alert_history
   - User who commented
   - Comment text and timestamp

### Alert Processing Flow

**1. SLA Breach Detected**
```
SLA Monitor Worker → Queries file_tracking table
                   → Finds files past SLA deadline or at risk
                   → Generates SLAAlert objects
                   → Calls NotificationManager.processAlerts()
```

**2. Alert Configuration Loaded**
```
NotificationManager → Queries alert_configs by watcher_id
                   → If no config or disabled, skip
                   → If config exists, proceed
```

**3. Alert History Created**
```
NotificationManager → Creates alert_history record
                   → Status: pending
                   → Escalation level: 0 (initial)
                   → Priority: 1 (highest)
```

**4. Recipients Resolved**
```
NotificationManager → Collects direct email recipients
                   → Adds CC recipients
                   → Resolves recipient groups to emails
                   → Deduplicates email addresses
```

**5. Emails Sent**
```
NotificationManager → Calls EmailService.sendSLABreachAlert()
                   → For each recipient:
                      - Sends email via Mailjet
                      - Records in delivery_details
                   → Updates delivery_status:
                      - delivered (all succeeded)
                      - failed (all failed)
                      - partially_delivered (mixed)
```

**6. Escalation Check (separate worker)**
```
Escalation Worker → Runs every 5 minutes
                  → Queries unacknowledged alerts
                  → Finds alerts past delay_minutes
                  → Creates new alert_history with escalation_level + 1
                  → Sends to next level recipients
```

**7. Retry Logic**
```
Escalation Worker → Queries failed alerts
                  → Checks next_retry_at timestamp
                  → Retries up to max_retries times
                  → Exponential backoff: 5min, 15min, 45min
```

---

## API Reference

### Alert Configurations

#### GET /api/alerts/configs
Get all alert configurations for current organization.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "watcher_id": 5,
      "organization_id": 1,
      "alert_types": ["sla_breached", "sla_at_risk"],
      "email_enabled": true,
      "email_recipients": ["ops@acme.com"],
      "email_cc": ["manager@acme.com"],
      "recipient_group_ids": [1, 2],
      "enabled": true,
      "created_at": "2026-01-14T10:00:00Z",
      "watcher": {
        "id": 5,
        "name": "Daily Sales Report"
      }
    }
  ]
}
```

#### POST /api/alerts/configs
Create a new alert configuration.

**Authorization:** Editor or Owner

**Request Body:**
```json
{
  "watcher_id": 5,
  "alert_types": ["sla_breached", "sla_at_risk"],
  "email_enabled": true,
  "email_recipients": ["ops@acme.com"],
  "email_cc": ["manager@acme.com"],
  "recipient_group_ids": [1],
  "enabled": true
}
```

**Response:** 201 Created

#### PATCH /api/alerts/configs/:id
Update alert configuration.

**Authorization:** Editor or Owner

#### DELETE /api/alerts/configs/:id
Delete (soft delete) alert configuration.

**Authorization:** Editor or Owner

---

### Recipient Groups

#### GET /api/alerts/recipient-groups
Get all recipient groups.

#### POST /api/alerts/recipient-groups
Create recipient group.

**Request Body:**
```json
{
  "name": "IT Operations Team",
  "description": "Primary on-call team",
  "email_addresses": [
    "ops@acme.com",
    "oncall@acme.com"
  ]
}
```

#### PATCH /api/alerts/recipient-groups/:id
Update recipient group.

#### DELETE /api/alerts/recipient-groups/:id
Delete recipient group.

---

### Escalations

#### GET /api/alerts/configs/:configId/escalations
Get escalations for a config.

#### POST /api/alerts/escalations
Create escalation level.

**Request Body:**
```json
{
  "alert_config_id": 1,
  "escalation_level": 1,
  "delay_minutes": 30,
  "email_recipients": ["manager@acme.com"],
  "recipient_group_ids": [2]
}
```

#### PATCH /api/alerts/escalations/:id
Update escalation level.

#### DELETE /api/alerts/escalations/:id
Delete escalation level.

---

### Alert History

#### GET /api/alerts/history
Get alert history with filters.

**Query Parameters:**
- `watcher_id` - Filter by watcher
- `alert_type` - Filter by alert type
- `delivery_status` - Filter by delivery status
- `acknowledged` - true/false
- `from_date` - ISO date string
- `to_date` - ISO date string
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

#### POST /api/alerts/history/:id/acknowledge
Acknowledge an alert.

**Authorization:** Editor or Owner

**Request Body:**
```json
{
  "acknowledgment_note": "Investigated - resolved"
}
```

---

### Comments

#### GET /api/alerts/history/:id/comments
Get comments for an alert.

#### POST /api/alerts/history/:id/comments
Add comment to alert.

**Authorization:** Editor or Owner

**Request Body:**
```json
{
  "comment": "Contacted vendor - file delayed"
}
```

---

### Statistics

#### GET /api/alerts/stats
Get alert dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_alerts": 1250,
    "total_breaches": 45,
    "total_at_risk": 120,
    "unacknowledged_alerts": 8,
    "failed_deliveries": 2,
    "alerts_by_type": {
      "sla_breached": 45,
      "sla_at_risk": 120,
      "file_arrived": 1000,
      "file_arrived_late": 85
    },
    "delivery_success_rate": 99.5,
    "average_acknowledgment_time_minutes": 15
  }
}
```

---

## Configuration

### Environment Variables

Add these variables to your `.env` files:

**Worker Package (.env or worker config):**
```bash
# SLA Monitor Worker
SLA_MONITOR_ENABLED=true
SLA_CHECK_INTERVAL_SECONDS=300          # 5 minutes
SLA_LOOKBACK_HOURS=24

# Escalation Worker
ESCALATION_WORKER_ENABLED=true
ESCALATION_CHECK_INTERVAL=300           # 5 minutes

# Alert Settings
ALERT_RETRY_DELAY_MINUTES=5             # Initial retry delay
ALERT_MAX_RETRIES=3                     # Max retry attempts
```

**API Package (.env.development, .env.production):**
```bash
# Email Configuration (Mailjet)
MJ_APIKEY_PUBLIC=your_mailjet_public_key
MJ_APIKEY_PRIVATE=your_mailjet_private_key
FROM_EMAIL=noreply@omnitrackr.com
FROM_NAME=OmniTrackr Alerts

# Application URL (for email links)
APP_URL=https://app.omnitrackr.com
```

### Email Template Customization

Email templates are generated in `EmailService.sendSLABreachAlert()`.

**Color Coding:**
- SLA Breached: Red (#dc2626)
- SLA At Risk: Orange (#f59e0b)
- File Arrived: Green (#10b981)

**Email Structure:**
```
Subject: [ALERT] {Alert Type} - {Watcher Name}

Body:
  - Alert Type (colored badge)
  - Watcher Name
  - Department
  - Expected Pattern
  - Expected At
  - SLA Deadline
  - Alert Message
  - Escalation Level (if escalated)
  - Link to view in OmniTrackr
```

---

## Troubleshooting

### Alerts Not Being Sent

**Problem:** SLA breaches occur but no alerts are sent.

**Solutions:**

1. **Check Alert Configuration:**
   ```
   - Go to Alerts → Configurations tab
   - Verify config exists for the watcher
   - Check "Status" column shows "Enabled"
   - Verify alert types include the breach type
   ```

2. **Check Workers:**
   ```bash
   # Verify SLA Monitor Worker is running
   docker logs omnitrackr-worker | grep "SLA Monitor"

   # Should see:
   # ✅ SLA monitor check complete
   # 🚨 Found X SLA violations, sending alerts...
   ```

3. **Check Email Configuration:**
   ```bash
   # Test Mailjet connection
   curl http://localhost:3000/api/test-mailjet

   # Verify environment variables
   echo $MJ_APIKEY_PUBLIC
   echo $MJ_APIKEY_PRIVATE
   ```

4. **Check Database:**
   ```sql
   -- Verify alert config exists
   SELECT * FROM alert_configs WHERE watcher_id = {id};

   -- Check if alert history was created
   SELECT * FROM alert_history WHERE watcher_id = {id}
   ORDER BY created_at DESC LIMIT 10;
   ```

---

### Escalations Not Working

**Problem:** Unacknowledged alerts don't escalate.

**Solutions:**

1. **Check Escalation Configuration:**
   ```
   - Go to Alerts → Configurations
   - Edit the alert config
   - Scroll to "Escalation Chains"
   - Verify levels are configured with delay times
   ```

2. **Check Escalation Worker:**
   ```bash
   # Verify Escalation Worker is running
   docker logs omnitrackr-worker | grep "Escalation"

   # Should see:
   # 🔼 Starting escalation cycle
   # ✅ Escalation cycle complete
   ```

3. **Check Timing:**
   ```
   - Escalations trigger after delay_minutes
   - Example: Level 1 delay = 30 minutes
   - Alert created at 10:00 AM
   - Escalation triggers at 10:30 AM (or next worker cycle)
   ```

4. **Verify Not Acknowledged:**
   ```sql
   -- Check alert status
   SELECT id, acknowledged, escalation_level, created_at
   FROM alert_history
   WHERE watcher_id = {id}
   ORDER BY created_at DESC;
   ```

---

### Failed Email Deliveries

**Problem:** Alerts show "Failed" delivery status.

**Solutions:**

1. **Check Mailjet Status:**
   ```bash
   # Test Mailjet API
   curl http://localhost:3000/api/test-mailjet
   ```

2. **Verify Email Addresses:**
   ```
   - Check for typos in email addresses
   - Verify domains are valid
   - Test with known working email
   ```

3. **Check Retry Logic:**
   ```
   - Failed alerts automatically retry
   - Retry schedule: 5min, 15min, 45min
   - Check alert_history.retry_count
   - Check alert_history.next_retry_at
   ```

4. **Review Logs:**
   ```bash
   # Check worker logs for email errors
   docker logs omnitrackr-worker | grep -i "email\|mailjet\|error"
   ```

---

### Duplicate Alerts

**Problem:** Multiple alerts sent for same breach.

**Solutions:**

1. **Check Worker Configuration:**
   ```bash
   # Ensure only ONE instance of each worker is running
   docker ps | grep omnitrackr-worker

   # If multiple instances, stop extras
   ```

2. **Check SLA Monitor Interval:**
   ```bash
   # Verify SLA_CHECK_INTERVAL_SECONDS
   # Default: 300 (5 minutes)
   # Shorter intervals may create duplicates
   ```

3. **Check Database:**
   ```sql
   -- Check for duplicate alert_history records
   SELECT watcher_id, file_tracking_id, alert_type,
          COUNT(*), MIN(created_at), MAX(created_at)
   FROM alert_history
   GROUP BY watcher_id, file_tracking_id, alert_type
   HAVING COUNT(*) > 1;
   ```

---

### Permission Issues

**Problem:** "Forbidden" or "Unauthorized" errors.

**Solutions:**

1. **Check User Role:**
   ```
   - Viewers: Can only view alerts (read-only)
   - Editors: Can create/edit/acknowledge alerts
   - Owners: Full access
   ```

2. **Verify Authentication:**
   ```
   - Check JWT token is valid
   - Re-login if necessary
   - Check browser console for auth errors
   ```

3. **Check Organization Access:**
   ```sql
   -- Verify user belongs to organization
   SELECT u.email, u.role, o.name
   FROM users u
   JOIN organizations o ON u.organization_id = o.id
   WHERE u.email = 'user@example.com';
   ```

---

## Best Practices

### Configuration

1. **Use Recipient Groups** - Create groups for teams rather than listing individual emails in each config
2. **Start Simple** - Begin with one alert type (SLA Breached) before adding others
3. **Test Escalations** - Use short delay times (5-10 minutes) for testing, then increase for production
4. **Disable Don't Delete** - Use enable/disable toggle to temporarily pause alerts without losing configuration

### Operations

1. **Acknowledge Promptly** - Acknowledge alerts to prevent unnecessary escalations
2. **Add Context** - Use comments to document investigations and resolutions
3. **Monitor Failed Deliveries** - Check dashboard regularly for delivery failures
4. **Review Alert History** - Periodically review history to identify patterns

### Maintenance

1. **Keep Groups Updated** - Remove old email addresses from recipient groups
2. **Audit Configurations** - Quarterly review of all alert configs
3. **Clean Up History** - Archive old alert_history records (database maintenance)
4. **Test Email Delivery** - Periodically test Mailjet connection

---

## Support

For issues or questions:

1. Check this documentation
2. Review logs: `docker logs omnitrackr-worker`
3. Check database directly for data issues
4. Contact OmniTrackr support team

---

**Version:** 1.0
**Last Updated:** 2026-01-14
**Author:** OmniTrackr Development Team
