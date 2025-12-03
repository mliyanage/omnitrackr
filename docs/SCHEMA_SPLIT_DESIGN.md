# File Source Schema Split Design - FINAL

## Executive Summary

Split the monolithic `file_sources` table into **reusable layers** with flexible scheduling:

1. **`source_connections`** - Reusable connection configs (S3, SFTP, etc.)
2. **`schedules`** - Reusable, complex scheduling rules
3. **`watchers`** - What files to watch (references connections & schedules)
4. **`file_tracking`** - Expected file arrivals & SLA monitoring
5. **`watcher_logs`** - Poll execution audit trail

This addresses:
- ✅ Reusability & DRY Principle
- ✅ Credential Management & Security
- ✅ Connection Health Monitoring
- ✅ Scalability (1 connection → N watchers)
- ✅ Cost Efficiency
- ✅ Flexible Scheduling (complex patterns, exclusions)
- ✅ SLA Tracking & Missing File Alerts

---

## Current vs. Proposed Schema

### **CURRENT (Before Split):**
```
file_sources (MONOLITHIC)
├─ Connection Config (S3 credentials, SFTP host, etc.)
├─ File Pattern (what files to watch)
├─ Polling Schedule (when to check)
├─ Last Sync Status (connection + detection mixed)
└─ SLA Configuration
```

**Problems:**
- 100 file patterns on same S3 bucket = 100 duplicate credential sets
- Can't test connection health independently
- Mixed concerns (connection vs. file detection)
- Inflexible scheduling (single time or interval)
- No holiday/blackout date support

---

### **PROPOSED (After Split):**

```
┌──────────────────────┐
│ source_connections   │  1:N  ┌─────────────┐
│ (Credentials)        │───────│  watchers   │
└──────────────────────┘       └──────┬──────┘
                                      │
┌──────────────────────┐              │
│    schedules         │  1:N         │
│ (Reusable Rules)     │──────────────┘
└──────────┬───────────┘
           │ 1:N
           │
┌──────────▼───────────┐
│ schedule_exclusions  │
│ (Holidays/Blackouts) │
└──────────────────────┘

┌──────────────────────┐
│   watcher_logs       │  ← Poll audit trail
└──────────────────────┘

┌──────────────────────┐
│   file_tracking      │  ← Expected arrivals & SLA
└──────────────────────┘

┌──────────────────────┐
│     ref_data         │  ← Departments, etc.
└──────────────────────┘
```

---

## Complete Table Designs

### **1. `source_connections`** (Simplified - No Department/Environment)

**Purpose:** Store reusable connection configurations and credentials

```typescript
source_connections {
  // Primary Key
  id: number (PK, auto-increment)

  // Basic Info
  name: string (unique)                    // "Production S3 Bucket"
  type: enum                               // S3, SFTP, FTP, SHAREPOINT, etc.
  description: text

  // Connection Configuration (JSONB - encrypted)
  // For S3: { region, bucket, accessKeyId, secretAccessKey }
  // For SFTP: { host, port, username, password/keyPath }
  connection_config: jsonb

  // Connection Health
  connection_status: enum                  // healthy, degraded, failed, untested
  last_health_check: timestamp
  last_successful_connection: timestamp
  health_check_error: text

  // Security
  credential_last_rotated: timestamp
  credential_expires_at: timestamp

  // Control
  enabled: boolean (default: true)         // Admin can disable connection

  // Audit
  created_at: timestamp
  updated_at: timestamp
  created_by: string
  updated_by: string
  deleted_at: timestamp (soft delete)

  // Indexes
  INDEX(type)
  INDEX(connection_status)
  INDEX(enabled)
  INDEX(deleted_at)
  UNIQUE(name)
}
```

**Key Changes:**
- ❌ **Removed `department`** - Moved to `watchers` table
- ❌ **Removed `environment`** - Not needed (connections are reusable across environments)
- ✅ **Added `enabled`** - Admin control to enable/disable connection

---

### **2. `schedules`** (NEW - Reusable Scheduling)

**Purpose:** Define reusable, complex scheduling rules

```typescript
schedules {
  // Primary Key
  id: number (PK, auto-increment)

  // Identity
  name: string (unique)                    // "Every 15 minutes", "Weekday Mornings"
  description: text

  // Frequency Configuration
  frequency_type: enum                     // minutely, hourly, daily, weekly, monthly, yearly
  interval: integer (default: 1)           // Every N [frequency_type]
                                          // E.g., frequency=daily, interval=2 = every 2 days

  // Time Configuration
  execution_times: string[]                // ['09:00', '14:00', '18:00'] (HH:MM 24-hour)
                                          // For "multiple times per day"
                                          // NULL for interval-based (e.g., every 15 mins)

  // Day-based Rules (for weekly/monthly)
  days_of_week: integer[]                  // [1,2,3,4,5] = Mon-Fri, [0,6] = Sun,Sat
                                          // NULL if not weekly

  day_of_month: integer                    // 1-31 for monthly (e.g., 1 = first day)
                                          // NULL if not monthly

  week_of_month: integer[]                 // [1-5] or [-1] for last week
                                          // Combined with days_of_week for complex patterns
                                          // Examples: [1] = first week, [-1] = last week
                                          //           [1, -1] = first AND last week
                                          //           [2, 4] = second AND fourth week
                                          // NULL if not needed

  // Timezone
  timezone: string (default: 'UTC')        // 'America/New_York', 'UTC', etc.

  // Active Period (optional)
  valid_from: timestamp                    // Schedule becomes active
  valid_until: timestamp                   // Schedule expires

  // Status
  enabled: boolean (default: true)

  // Audit
  created_at: timestamp
  updated_at: timestamp
  created_by: string
  updated_by: string
  deleted_at: timestamp

  // Indexes
  INDEX(frequency_type)
  INDEX(enabled)
  INDEX(deleted_at)
  UNIQUE(name)
}
```

**Examples:**
```sql
-- Every 15 minutes
INSERT INTO schedules (name, frequency_type, interval)
VALUES ('Every 15 minutes', 'minutely', 15);

-- Multiple times per day (9am, 2pm, 6pm)
INSERT INTO schedules (name, frequency_type, execution_times, timezone)
VALUES ('Business Hours', 'daily', ARRAY['09:00', '14:00', '18:00'], 'America/New_York');

-- Weekdays only at 9am
INSERT INTO schedules (name, frequency_type, execution_times, days_of_week, timezone)
VALUES ('Weekday Morning', 'weekly', ARRAY['09:00'], ARRAY[1,2,3,4,5], 'UTC');

-- First day of month at midnight
INSERT INTO schedules (name, frequency_type, execution_times, day_of_month)
VALUES ('Monthly Report', 'monthly', ARRAY['00:00'], 1);

-- Last Friday of month at 5pm
INSERT INTO schedules (name, frequency_type, execution_times, days_of_week, week_of_month)
VALUES ('End of Month', 'monthly', ARRAY['17:00'], ARRAY[5], ARRAY[-1]);

-- First and last Monday of month at 8am
INSERT INTO schedules (name, frequency_type, execution_times, days_of_week, week_of_month)
VALUES ('Bi-Monthly Monday', 'monthly', ARRAY['08:00'], ARRAY[1], ARRAY[1, -1]);

-- Second and fourth Friday at 3pm
INSERT INTO schedules (name, frequency_type, execution_times, days_of_week, week_of_month)
VALUES ('Semi-Monthly Friday', 'monthly', ARRAY['15:00'], ARRAY[5], ARRAY[2, 4]);
```

---

### **3. `schedule_exclusions`** (NEW - Holidays & Blackouts)

**Purpose:** Define dates when schedules should NOT run

```typescript
schedule_exclusions {
  // Primary Key
  id: number (PK, auto-increment)

  // Foreign Key
  schedule_id: number (FK -> schedules.id, ON DELETE CASCADE)

  // Exclusion Type
  exclusion_type: enum                     // specific_date, date_range, holiday_calendar

  // Date Exclusions
  excluded_date: date                      // For specific_date
  excluded_from: date                      // For date_range
  excluded_to: date                        // For date_range

  // Holiday Calendar (references ref_data)
  holiday_calendar_code: string            // FK -> ref_data.code (e.g., 'HOLIDAY_US_2025')

  // Metadata
  reason: string                           // "Christmas Day", "System Maintenance", etc.

  // Audit
  created_at: timestamp
  created_by: string

  // Indexes
  INDEX(schedule_id)
  INDEX(excluded_date)
  INDEX(holiday_calendar_code)
}
```

**Examples:**
```sql
-- Skip Christmas Day
INSERT INTO schedule_exclusions (schedule_id, exclusion_type, excluded_date, reason)
VALUES (1, 'specific_date', '2025-12-25', 'Christmas Day');

-- Skip maintenance window
INSERT INTO schedule_exclusions (schedule_id, exclusion_type, excluded_from, excluded_to, reason)
VALUES (1, 'date_range', '2025-07-01', '2025-07-07', 'System Migration');

-- Use holiday calendar from ref_data
INSERT INTO schedule_exclusions (schedule_id, exclusion_type, holiday_calendar_code, reason)
VALUES (1, 'holiday_calendar', 'HOLIDAY_US_2025', 'US Federal Holidays');
```

---

### **4. `watchers`** (Replaces `file_sources`)

**Purpose:** Define what files to watch and when

```typescript
watchers {
  // Primary Key
  id: number (PK, auto-increment)

  // Foreign Keys
  source_connection_id: number (FK -> source_connections.id, ON DELETE CASCADE)
  schedule_id: number (FK -> schedules.id, ON DELETE SET NULL)
  department_code: string (FK -> ref_data.code WHERE code LIKE 'DEPARTMENT:%')

  // Watcher Identity
  name: string                             // "Daily Sales Report"
  description: text

  // File Pattern Matching
  file_name_pattern: string                // "sales_*.csv"
  file_path_pattern: string                // "/reports/sales/{YYYY}/{MM}/{DD}/"
  match_rule: enum                         // partial, exact, regex

  // Last Check Info (lightweight status only)
  last_check_at: timestamp                 // When we last polled
  last_check_status: enum                  // success, failed, in_progress, never_run
  last_files_detected: integer             // Count from last poll

  // SLA Configuration
  sla_enabled: boolean (default: false)
  sla_threshold_minutes: integer           // 60, 120, 240, etc.

  // Metadata
  direction: enum                          // inward, outward, bidirectional
  owner_team: string

  // Status (consolidates enabled + polling_enabled)
  status: enum                             // active, paused, error, disabled
                                          // active = enabled AND should be polled
                                          // paused = enabled but NOT polled
                                          // disabled = not enabled

  // Statistics (summary only)
  total_files_detected: integer (default: 0)
  total_polls_succeeded: integer (default: 0)
  total_polls_failed: integer (default: 0)
  success_rate: decimal(5,2)               // Calculated

  // Audit
  created_at: timestamp
  updated_at: timestamp
  created_by: string
  updated_by: string
  deleted_at: timestamp

  // Indexes
  INDEX(source_connection_id)
  INDEX(schedule_id)
  INDEX(department_code)
  INDEX(status)
  INDEX(last_check_at)
  INDEX(deleted_at)
  UNIQUE(name, department_code)
}
```

**Key Changes:**
- ✅ Renamed from `file_watchers` to `watchers`
- ✅ Added `schedule_id` FK (reusable schedules)
- ✅ Added `department_code` FK to `ref_data`
- ✅ Consolidated `enabled` + `polling_enabled` into single `status` enum
- ✅ `direction` field handles inward/outward (no separate tables)
- ❌ Removed `poll_frequency_minutes` (moved to schedules)
- ❌ Removed `schedule` time field (moved to schedules)
- ❌ Removed `timezone` (moved to schedules)

---

### **5. `watcher_logs`** (Renamed from `connection_poll_logs`)

**Purpose:** Detailed polling history and audit trail

```typescript
watcher_logs {
  // Primary Key
  id: bigint (PK, auto-increment)

  // Foreign Keys
  watcher_id: number (FK -> watchers.id, ON DELETE CASCADE)
  source_connection_id: number (FK -> source_connections.id, ON DELETE CASCADE)

  // Poll Execution
  poll_started_at: timestamp (indexed)
  poll_completed_at: timestamp
  poll_duration_ms: integer

  // Poll Results
  poll_status: enum                        // success, failed, timeout, cancelled, skipped
  objects_scanned: integer                 // Total objects examined
  files_detected: integer                  // Files matching pattern
  files_new: integer                       // New files (first time seen)
  files_duplicate: integer                 // Already tracked

  // Error Information
  error_details: jsonb                     // { message, code, stack, context }

  // Performance Metrics
  api_calls_made: integer                  // For rate limiting tracking
  bytes_transferred: bigint                // Data transfer

  // Connection Status at Poll Time
  connection_status_at_poll: enum          // healthy, degraded, failed

  // Metadata
  triggered_by: enum                       // scheduler, manual, api, retry
  triggered_by_user: string                // If manual

  // Partitioning
  poll_date: date (GENERATED, partitioned by month)

  // Audit
  created_at: timestamp (default: poll_started_at)

  // Indexes
  INDEX(watcher_id, poll_started_at DESC)
  INDEX(source_connection_id, poll_started_at DESC)
  INDEX(poll_status)
  INDEX(poll_date)
}
```

**Key Features:**
- ✅ Detailed audit trail separate from main tables
- ✅ Can be partitioned by month for performance
- ✅ Can be archived/purged periodically
- ✅ Performance metrics for monitoring
- ✅ NOT queried for routine operations

**Retention Policy:**
- Keep 90 days online
- Archive to cold storage after 90 days
- Purge after 1 year (configurable)

---

### **6. `file_tracking`** (Updated - SLA & Missing File Alerts)

**Purpose:** Track expected file arrivals and SLA compliance

**Why This Table is Essential:**
- ✅ Creates **expectations**: "We EXPECT file X at time Y"
- ✅ Tracks **missing files**: "File didn't arrive, breach SLA, send alert"
- ✅ Differentiates **late vs missing**: File arrived after deadline vs never arrived
- ✅ Proactive alerts: Alert when expected file doesn't arrive
- ✅ SLA reporting: Track on-time delivery rates

**Difference from `watcher_logs`:**
- `watcher_logs` = **Reactive**: "We polled, here's what we found"
- `file_tracking` = **Proactive**: "We expect this file, alert if missing"

  1. Why file_path, file_name, file_size are NULL ✅ This is CORRECT behavior

  When the SLA monitor creates expected file tracking records (sla-monitor.service.ts:93-100), it only sets:
  - watcher_id
  - expected_pattern (from watcher's file_name_pattern)
  - expected_at (calculated next run time)
  - expected_schedule (schedule name)
  - sla_threshold_minutes
  - sla_deadline
  - tracking_status = 'pending'

  The file details are intentionally NULL because:
  - These records represent future expected files that haven't arrived yet
  - They're placeholders waiting for actual file arrivals
  - File details only get populated when:
    - The polling worker detects a matching file
    - The matchDetectedFile method is called (sla-monitor.service.ts:169-214)
    - The tracking status changes from 'pending' to 'arrived' or 'late'

  Think of it like this: The SLA monitor creates "reservations" for expected files. The actual file details get filled in when the files are
  detected by the polling worker.

  ---
  2. How expected_at and sla_deadline are Determined

  From sla-monitor.service.ts:64-78:

  // Step 1: Calculate next scheduled run time
  const nextRun = await this.schedulerService.calculateNextRunTime(schedule, now);
  // Returns the next execution time based on:
  // - Schedule frequency (minutely, hourly, daily, weekly, monthly)
  // - Schedule timezone (converts to schedule's timezone, then back to UTC)
  // - valid_from/valid_until constraints
  // - Exclusions (holidays, blackouts)

  // Step 2: Calculate SLA deadline
  const slaThresholdMinutes = watcher.sla_threshold_minutes || 60;
  const slaDeadline = DateTime.fromJSDate(nextRun)
    .plus({ minutes: slaThresholdMinutes })
    .toJSDate();

  Example:
  - Schedule: Daily at 02:00 AM EST
  - expected_at: 2025-12-02 07:00:00 UTC (2 AM EST = 7 AM UTC)
  - SLA threshold: 20 minutes
  - sla_deadline: 2025-12-02 07:20:00 UTC
  
```typescript
file_tracking {
  // Primary Key
  id: number (PK, auto-increment)

  // Foreign Key
  watcher_id: number (FK -> watchers.id, ON DELETE CASCADE)

  // Expected Arrival Information
  expected_pattern: string                 // What file pattern we expect
  expected_at: timestamp                   // When we expect it
  expected_schedule: string                // Schedule that created this (e.g., "09:00")

  // Actual Arrival Tracking
  file_path: string                        // Actual file found (if arrived)
  file_name: string                        // Actual file name
  file_size: bigint                        // File size in bytes
  arrived_at: timestamp                    // When file was detected

  // Status
  tracking_status: enum                    // pending, arrived, late, missing
                                          // pending = not arrived yet
                                          // arrived = arrived on time (before SLA)
                                          // late = arrived after SLA deadline
                                          // missing = never arrived, past deadline

  // Alert Information
  alert_triggered: boolean (default: false)
  alert_triggered_at: timestamp
  alert_type: enum                         // sla_at_risk, sla_breached, file_arrived

  // SLA
  sla_threshold_minutes: integer           // Copied from watcher
  sla_deadline: timestamp                  // Calculated: expected_at + sla_threshold

  // Audit
  created_at: timestamp
  updated_at: timestamp

  // Indexes
  INDEX(watcher_id)
  INDEX(tracking_status)
  INDEX(expected_at)
  INDEX(sla_deadline)
  INDEX(alert_triggered, tracking_status)
}
```

**Example Flow:**
```sql
-- 1. Schedule creates expectation
INSERT INTO file_tracking (watcher_id, expected_pattern, expected_at, sla_deadline, tracking_status)
VALUES (1, 'sales_*.csv', '2025-01-16 09:00:00', '2025-01-16 10:00:00', 'pending');

-- 2. Poll at 9:15am finds nothing
-- watcher_logs: poll_status='success', files_detected=0
-- file_tracking: status stays 'pending'

-- 3. Poll at 10:05am finds file (after SLA deadline)
UPDATE file_tracking
SET tracking_status = 'late',
    arrived_at = '2025-01-16 10:05:00',
    file_path = '/reports/sales_20250116.csv',
    alert_triggered = true,
    alert_triggered_at = NOW(),
    alert_type = 'sla_breached'
WHERE id = 1;

-- 4. SLA Report: How many files arrived late this week?
SELECT COUNT(*)
FROM file_tracking
WHERE tracking_status = 'late'
  AND expected_at > NOW() - INTERVAL '7 days';
```

---

### **7. `ref_data`** (Generic Reference Table)

**Purpose:** Store all reference/lookup data in one flexible table

```typescript
ref_data {
  // Primary Key
  id: number (PK, auto-increment)

  // Key for lookup (hierarchical)
  code: string (indexed, unique)           // "DEPARTMENT:Finance", "HOLIDAY_US_2025:NewYear"

  // Values (up to 5 as requested)
  value1: string                           // Main value
  value2: string                           // Secondary value
  value3: string                           // Tertiary value
  value4: string                           // Additional value
  value5: string                           // Additional value

  // Flexible JSON for additional attributes
  metadata: jsonb                          // Any additional info

  // Audit
  created_at: timestamp
  updated_at: timestamp
  created_by: string
  updated_by: string

  // Indexes
  UNIQUE(code)
  INDEX(value1)
}
```

**Example Data:**
```sql
-- Departments
INSERT INTO ref_data (code, value1, value2) VALUES
('DEPARTMENT:Finance', 'Finance', 'FIN'),
('DEPARTMENT:Operations', 'Operations', 'OPS'),
('DEPARTMENT:IT', 'Information Technology', 'IT');

-- US Federal Holidays 2025
INSERT INTO ref_data (code, value1, value2, value3) VALUES
('HOLIDAY_US_2025:NewYear', '2025-01-01', 'New Year Day', 'Federal'),
('HOLIDAY_US_2025:Christmas', '2025-12-25', 'Christmas Day', 'Federal'),
('HOLIDAY_US_2025:Thanksgiving', '2025-11-27', 'Thanksgiving', 'Federal');

-- Timezones
INSERT INTO ref_data (code, value1, value2) VALUES
('TIMEZONE:EST', 'America/New_York', 'Eastern Time'),
('TIMEZONE:PST', 'America/Los_Angeles', 'Pacific Time'),
('TIMEZONE:UTC', 'UTC', 'Coordinated Universal Time');

-- SLA Thresholds (if you want predefined options)
INSERT INTO ref_data (code, value1, value2, value3) VALUES
('SLA_THRESHOLD:CRITICAL', '30', 'minutes', 'Critical files'),
('SLA_THRESHOLD:STANDARD', '120', 'minutes', 'Standard files'),
('SLA_THRESHOLD:LOW', '240', 'minutes', 'Low priority files');
```

---

## Entity Relationships

```
source_connections (1) ──────> (N) watchers
schedules (1) ──────────────> (N) watchers
schedules (1) ──────────────> (N) schedule_exclusions
ref_data (lookup) ──────────> watchers (department_code)
watchers (1) ───────────────> (N) watcher_logs
watchers (1) ───────────────> (N) file_tracking
```

---

## Removed Tables

### **`inward_files` - REMOVED** ❌

**Why Removed:**
- Inward/outward is just a logical separation via `watchers.direction` field
- No need for separate tables to track detected files
- `file_tracking` handles expected arrivals with actual file details
- `watcher_logs` records what was found during polls
- Simplifies schema

**Migration Impact:**
- Any code referencing `inward_files` will be updated to use `file_tracking` or `watcher_logs`

---

## How This Addresses Your Requirements

### **1. Reusability & DRY Principle ✅**

**Before:**
```
100 file patterns on same S3 bucket = 100 duplicate credential sets
```

**After:**
```
1 source_connection + 100 watchers = credentials stored ONCE
```

---

### **2. Credential Management ✅**

- ✅ Credentials stored once per connection
- ✅ Rotate in one place, applies to all watchers
- ✅ Track rotation dates and expiration
- ✅ Better security (fewer copies)

**Example:**
```sql
UPDATE source_connections
SET connection_config = '{"accessKeyId": "NEW_KEY", ...}',
    credential_last_rotated = NOW()
WHERE id = 1;
-- All watchers using this connection now have new credentials
```

---

### **3. Connection Health Monitoring ✅**

- ✅ Test connection independently from file detection
- ✅ Connection status separate from watcher status
- ✅ Easier troubleshooting

**Example:**
```sql
-- Check connection health
SELECT id, name, connection_status, last_health_check
FROM source_connections
WHERE connection_status = 'failed';

-- See affected watchers
SELECT w.name, w.status
FROM watchers w
WHERE w.source_connection_id = 1;
```

---

### **4. Scalability ✅**

**Before:**
```
100 file patterns = 100 file_sources = 100 connection configs
```

**After:**
```
100 file patterns = 1 connection + 1 schedule + 100 watchers
```

---

### **5. Cost Efficiency ✅**

**Batch Operations:**
```typescript
// Connect once, check 100 patterns
const client = await connectToS3(connection.connection_config);
for (const watcher of watchers) {
  await checkForFiles(client, watcher.file_name_pattern);
}
await client.disconnect();
```

---

### **6. Flexible Scheduling ✅**

**Supported Patterns:**
- ✅ Multiple times per day (9am, 2pm, 6pm)
- ✅ Weekday-specific (Mon-Fri, weekends)
- ✅ Monthly patterns (1st of month, last Friday)
- ✅ **Complex monthly** (first AND last Monday, 2nd and 4th Friday)
- ✅ Exclusions (holidays, blackout dates)
- ✅ Timezone support
- ✅ Reusable schedules (1 schedule → N watchers)

---

### **7. SLA Tracking & Alerts ✅**

**Via `file_tracking` table:**
- ✅ Track expected arrivals
- ✅ Alert on missing files
- ✅ Differentiate late vs missing
- ✅ SLA compliance reporting
- ✅ Proactive monitoring

---

## Migration Strategy

### **Phase 1: Create New Tables**
1. Create `ref_data` table
2. Create `source_connections` table
3. Create `schedules` table
4. Create `schedule_exclusions` table
5. Create `watchers` table
6. Create `watcher_logs` table
7. Update `file_tracking` table

### **Phase 2: Seed Reference Data**
```sql
-- Populate departments
INSERT INTO ref_data (code, value1, value2) VALUES
  ('DEPARTMENT:Finance', 'Finance', 'FIN'),
  ('DEPARTMENT:Operations', 'Operations', 'OPS');

-- Create default schedule
INSERT INTO schedules (name, frequency_type, interval)
VALUES ('Default 15 min polling', 'minutely', 15);
```

### **Phase 3: Cleanup Old Tables**
```sql
-- No data migration needed (only one test record in file_sources)
-- Simply drop old tables
DROP TABLE IF EXISTS inward_files CASCADE;
DROP TABLE IF EXISTS file_sources CASCADE;
```

### **Phase 4: Update Code**
1. Update repositories
2. Update API endpoints
3. Update worker polling logic
4. Update tests
5. Remove old code references to `file_sources` and `inward_files`

---

## Summary

### **Final Schema:**
1. ✅ `source_connections` - Reusable connections (no department/environment)
2. ✅ `schedules` - Reusable, complex scheduling rules
3. ✅ `schedule_exclusions` - Holidays/blackout dates
4. ✅ `watchers` - File patterns to watch (with schedule_id, department_code)
5. ✅ `watcher_logs` - Poll execution audit trail
6. ✅ `ref_data` - Generic reference data (5 values + JSON)
7. ✅ `file_tracking` - Expected arrivals & SLA monitoring

### **Tables Removed:**
- ❌ `file_sources` - Split into connections + watchers
- ❌ `inward_files` - Not needed (direction is just a field)

### **Key Benefits:**
- ✅ 1 connection → N watchers (DRY principle)
- ✅ Credentials stored once, rotated easily
- ✅ Connection health monitored independently
- ✅ Flexible, reusable schedules with complex patterns
- ✅ Holiday/blackout date support
- ✅ SLA tracking and missing file alerts
- ✅ Scalable and cost-efficient
- ✅ Clean separation of concerns

---

## Implementation Action Plan

### **Phase 1: Database Migrations** (Foundation)

**1.1 Create new tables in order (respecting FK dependencies):**
```
1. ref_data           ← No dependencies
2. source_connections ← No dependencies
3. schedules          ← No dependencies
4. schedule_exclusions ← FK to schedules
5. watchers           ← FK to source_connections, schedules, ref_data
6. watcher_logs       ← FK to watchers, source_connections
7. file_tracking      ← FK to watchers (update existing or recreate)
```

**1.2 Migration tasks:**
- [x] Create enums: `connection_status`, `frequency_type`, `exclusion_type`, `tracking_status`, `watcher_status`, `match_rule`, `direction`, `poll_status`, `trigger_type`, `alert_type`
- [x] Create `ref_data` table
- [x] Create `source_connections` table
- [x] Create `schedules` table
- [x] Create `schedule_exclusions` table
- [x] Create `watchers` table
- [x] Create `watcher_logs` table
- [x] Create/update `file_tracking` table
- [x] Seed initial reference data (departments, default schedules)
- [x] Drop old tables (`file_sources`, `inward_files`)

---

### **Phase 2: Backend Code Updates**

**2.1 TypeScript types/interfaces:**
- [x] `SourceConnection`, `S3ConnectionConfig`, `SFTPConnectionConfig`
- [x] `Schedule`, `ScheduleExclusion`
- [x] `Watcher`, `WatcherLog`, `FileTracking`
- [x] `RefData`

**2.2 Repositories:**
- [x] `SourceConnectionRepository`
- [x] `ScheduleRepository` + `ScheduleExclusionRepository`
- [x] `WatcherRepository`
- [x] `WatcherLogRepository`
- [x] `FileTrackingRepository`
- [x] `RefDataRepository`

**2.3 Services:**
- [x] `SourceConnectionService`
- [x] `ScheduleService`
- [x] `WatcherService`
- [ ] `WatcherLogService` (query service - can be added as needed)
- [ ] `FileTrackingService` (query service - can be added as needed)
- [x] `RefDataService`

**2.4 Controllers:**
- [x] `SourceConnectionController`
- [x] `ScheduleController`
- [x] `WatcherController`
- [x] `RefDataController`

**2.5 API endpoints:**
- [x] `/api/source-connections` - CRUD + health check + test
- [x] `/api/schedules` - CRUD + exclusions + toggle
- [x] `/api/watchers` - CRUD with FK references + status
- [ ] `/api/watcher-logs` - Query/pagination (pending)
- [ ] `/api/file-tracking` - SLA dashboard, alerts (pending)
- [x] `/api/ref-data` - Lookup data + departments/timezones/holidays

---

### **Phase 3: Worker/Polling Logic Updates**

**3.1 Scheduler updates:**
- [x] Parse `schedules` table for next run times
- [x] Evaluate `schedule_exclusions` (holidays, blackouts)
- [x] Support complex patterns: `week_of_month`, `days_of_week`, `execution_times`
- [x] Created SchedulerService with full timezone support using Luxon
- [x] Supports all frequency types: minutely, hourly, daily, weekly, monthly, yearly
- [x] Implements complex patterns: "2nd Tuesday", "Last Friday of month", etc.

**3.2 Polling worker updates:**
- [x] Group watchers by `source_connection_id`
- [x] Batch check all watchers per connection
- [x] Log results to `watcher_logs`
- [x] Update `file_tracking` for SLA
- [x] Created PollingService with S3 support
- [x] Added updatePollStatistics to WatcherRepository
- [x] Pattern matching: exact, partial, regex
- [x] Comprehensive error handling and retry logic

**3.3 SLA monitoring:**
- [x] Create expected `file_tracking` records from schedule
- [x] Background job for missing/late file detection
- [x] Alert triggering logic
- [x] Created SLAMonitorService with dashboard summary
- [x] Detects missing files past SLA deadline
- [x] Matches detected files to expectations
- [x] Triggers alerts for late arrivals

**3.4 Worker Processes:**
- [x] Created PollingWorker with configurable intervals
- [x] Created SLAMonitorWorker with look-ahead/look-back
- [x] Graceful shutdown handling
- [x] Environment-based configuration
- [x] Comprehensive logging

**3.5 Deployment & Configuration:**
- [x] Created root-level Dockerfile.worker following monorepo pattern (matches API deployment)
- [x] Created GitHub Actions workflows (deploy-worker-staging.yml, deploy-worker-production.yml)
- [x] Configured Terraform Cloud Run **Jobs** (not Services) for worker (staging)
- [x] Set up Cloud Scheduler to trigger jobs on cron schedule
- [x] Implemented dual-mode architecture (JOB mode for cloud, CONTINUOUS mode for local dev)
- [x] Set up environment variables for worker configuration
- [x] Configured health check and non-root user for security
- [x] Set up proper logging and graceful shutdown
- [x] Aligned with existing GCP Cloud Run deployment architecture

**Architecture Decision: Cloud Run Jobs + Cloud Scheduler**
- **Cloud Deployment**: Uses Cloud Run Jobs triggered by Cloud Scheduler
  - Polling Worker Job: Triggered every minute
  - SLA Monitor Job: Triggered every 5 minutes
  - Each job runs once and exits (run-to-completion)
  - No timeout limitation (jobs complete naturally)
  - Cost-effective (pay per execution, not always-on)
- **Local Development**: Uses CONTINUOUS mode with `RUN_MODE=continuous`
  - Workers run with intervals like traditional background processes
  - Easy to test and debug locally
  - Same codebase, different execution mode

**3.6 Dependencies & Fixes:**
- [x] Updated package.json to use AWS SDK v3 (@aws-sdk/client-s3)
- [x] Removed deprecated aws-sdk v2 and node-cron
- [x] Fixed scheduler service to handle day_of_month = -1 for "last day of month"
- [x] All dependencies aligned with API package versions
- [x] Added `runOnce()` methods to both workers for JOB mode execution

**Files Created/Updated:**
- `packages/worker/src/services/scheduler.service.ts` (~425 lines) - Fixed last day support
- `packages/worker/src/services/polling.service.ts` (~343 lines)
- `packages/worker/src/services/sla-monitor.service.ts` (~250 lines)
- `packages/worker/src/workers/polling-worker.ts` (~178 lines) - Added runOnce() method
- `packages/worker/src/workers/sla-monitor-worker.ts` (~148 lines) - Added runOnce() method
- `packages/worker/src/index.ts` (Dual-mode entry point, ~207 lines)
- `packages/worker/src/config/database.ts`
- `packages/worker/package.json` (Updated with AWS SDK v3)
- `packages/worker/tsconfig.json`
- `Dockerfile.worker` (Root-level, multi-stage build for Cloud Run)
- `.github/workflows/deploy-worker-staging.yml` (Deploy Cloud Run Jobs)
- `.github/workflows/deploy-worker-production.yml` (Deploy Cloud Run Jobs)
- `infrastructure/terraform/staging/cloud_run.tf` (Worker removed - moved to Jobs)
- `infrastructure/terraform/staging/cloud_run_jobs.tf` (Cloud Run Jobs + Cloud Scheduler)

---

### **Phase 4: Frontend Updates**

- [ ] Connection management UI (create/edit/test health)
- [ ] Schedule builder UI (complex patterns)
- [ ] Watcher configuration UI (select connection + schedule)
- [ ] SLA dashboard (missing/late files)

---

### **Phase 5: Cleanup & Testing**

**5.1 Unit Tests:**
- [x] Unit tests for SourceConnectionService (12 tests passing)
- [x] Unit tests for ScheduleService (7 tests passing)
- [x] Unit tests for WatcherService (9 tests passing)
- [x] Unit tests for RefDataService (13 tests passing)
- [x] All existing tests still passing (12 tests passing)

**5.2 Integration & E2E Tests:** (Pending)
- [ ] Integration tests for polling flow
- [ ] E2E tests for API endpoints
- [ ] Unit tests for schedule calculation logic

**5.3 Cleanup:** (Pending - after Phase 3)
- [ ] Remove old repositories, types, API endpoints

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Migrations | ✅ Complete | 10 migration files created |
| Phase 2: Backend | ✅ Complete | Types, repositories, services, controllers, routes |
| Phase 2.5: Testing | ✅ Complete | 53 unit tests passing (41 new + 12 existing) |
| Phase 3: Workers | ✅ Complete | Worker package with 3 services + 2 workers (~1000 lines) |
| Phase 4: Frontend | ✅ Complete | Watchers page with nested sheet pattern (~2500 lines) |
| Phase 5: Integration Tests | ⏳ Pending | |

---

**Current Focus: Phase 4 Complete - Ready for Integration Testing** 🎨

**Phase 4 Summary:**
- ✅ Created comprehensive type definitions (~400 lines)
- ✅ Built 4 API client modules (connections, schedules, watchers, refData)
- ✅ Implemented 3 Combobox components with create functionality
- ✅ Created ConnectionSheet/Form with S3, SFTP, Azure Blob support
- ✅ Created ScheduleSheet/Form with all 6 frequency types
- ✅ Built WatchersPage with table, filters, and summary stats
- ✅ Implemented WatcherSheet/Form with nested sheet pattern (z-50 parent, z-[60] nested)
- ✅ Added navigation and routing
- ✅ Google Cloud Console-style UX: inline creation via nested sheets
- ✅ Installed additional shadcn components: command, popover, scroll-area, checkbox, textarea, dropdown-menu
- ✅ Zero compilation errors

**Phase 3 Summary:**
- ✅ Created complete worker package from scratch
- ✅ SchedulerService: Complex schedule calculation with timezone support
- ✅ PollingService: S3 file polling with batch optimization
- ✅ SLAMonitorService: Proactive missing file detection
- ✅ 2 Background workers with graceful shutdown and dual-mode support
- ✅ Full configuration and environment setup
- ✅ Cloud Run Jobs + Cloud Scheduler deployment strategy

---

## Local Testing Guide

### Running the Worker Locally

The worker supports **dual-mode operation** to enable local testing while using Cloud Run Jobs in production:

#### **CONTINUOUS Mode (Local Development)**

```bash
# Navigate to worker directory
cd packages/worker

# Set environment variables
export RUN_MODE=continuous
export NODE_ENV=development
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=omnitrackr
export DB_USER=your_user
export DB_PASSWORD=your_password

# Worker configuration
export POLLING_WORKER_ENABLED=true
export POLLING_INTERVAL_SECONDS=60       # Check every 60 seconds
export POLLING_BATCH_SIZE=50

export SLA_MONITOR_ENABLED=true
export SLA_CHECK_INTERVAL_SECONDS=300    # Check every 5 minutes
export SLA_LOOKBACK_HOURS=24

# Run the worker
npm run dev
```

**Expected Output:**
```
🚀 OmniTrackr Worker starting...
   Mode: CONTINUOUS
♾️  Running in CONTINUOUS mode (local development)
   Environment: development
🚀 Starting polling worker...
   Interval: 60s
   Batch size: 50
✅ Polling worker started
🚀 Starting SLA monitor worker...
   Check interval: 300s
   Look ahead: 24h
   Look back: 24h
✅ SLA monitor worker started

✅ All workers started successfully
   Press Ctrl+C to stop
```

#### **JOB Mode (Testing Cloud Behavior Locally)**

To test how the worker will behave in Cloud Run Jobs:

```bash
export RUN_MODE=job
npm run dev
```

**Expected Output:**
```
🚀 OmniTrackr Worker starting...
   Mode: JOB
🔄 Running in JOB mode (single execution)
📦 Running polling worker...
🔄 Executing single polling cycle...
   Found 5 active watchers
   3 watchers are due to run
   ✅ Polling cycle complete:
      Success: 3
      Failed: 0
      Files detected: 12
      Duration: 1234ms
✅ Polling worker completed
📊 Running SLA monitor...
📊 Executing single SLA monitoring cycle...
   ✅ SLA monitoring cycle complete:
      Expected records created: 5
      SLA violations detected: 0
      Duration: 567ms
✅ SLA monitor completed

==================================================
Job Execution Summary:
  ✅ Polling worker completed
  ✅ SLA monitor completed
==================================================
```

The worker will exit with code 0 (success) or 1 (failure).

### Environment Variables Reference

| Variable | JOB Mode | CONTINUOUS Mode | Description |
|----------|----------|-----------------|-------------|
| `RUN_MODE` | `job` | `continuous` | Execution mode |
| `POLLING_WORKER_ENABLED` | `true`/`false` | `true`/`false` | Enable/disable polling worker |
| `POLLING_BATCH_SIZE` | Used | Used | Max watchers per execution |
| `POLLING_INTERVAL_SECONDS` | Ignored | Used | Seconds between polling cycles |
| `SLA_MONITOR_ENABLED` | `true`/`false` | `true`/`false` | Enable/disable SLA monitor |
| `SLA_LOOKBACK_HOURS` | Used | Used | Hours to look back for missing files |
| `SLA_CHECK_INTERVAL_SECONDS` | Ignored | Used | Seconds between SLA checks |

### Cloud Deployment

In cloud environments (staging/production), the worker runs as **Cloud Run Jobs** triggered by Cloud Scheduler:

- **Polling Worker Job**: Runs every minute with `RUN_MODE=job`, `POLLING_WORKER_ENABLED=true`, `SLA_MONITOR_ENABLED=false`
- **SLA Monitor Job**: Runs every 5 minutes with `RUN_MODE=job`, `POLLING_WORKER_ENABLED=false`, `SLA_MONITOR_ENABLED=true`

Each job executes once and exits, making it cost-effective and avoiding Cloud Run Service timeout limitations.

### Debugging Tips

1. **Check database connection**: Ensure your local database is running and accessible
2. **Verify schedules exist**: The polling worker needs schedules to determine when to run
3. **Check for active watchers**: Use `psql` to verify watchers with `status='active'`
4. **Monitor logs**: All workers use structured logging with timestamps
5. **Test graceful shutdown**: Press Ctrl+C in CONTINUOUS mode to test shutdown handling
