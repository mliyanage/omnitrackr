# OmniTrackr Scheduler User Guide

## Table of Contents
1. [Overview](#overview)
2. [Schedule Concepts](#schedule-concepts)
3. [Frequency Types](#frequency-types)
4. [Schedule Patterns](#schedule-patterns)
5. [Exclusions (Holidays & Blackouts)](#exclusions-holidays--blackouts)
6. [Timezone Handling](#timezone-handling)
7. [How Polling Works with Schedules](#how-polling-works-with-schedules)
8. [SLA Tracking with Schedules](#sla-tracking-with-schedules)
9. [Examples](#examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The OmniTrackr Scheduler is a sophisticated scheduling engine that determines when file watchers should execute their polls. It supports complex patterns, timezone handling, and holiday exclusions to ensure files are checked at the right times.

**Key Features:**
- ✅ Multiple frequency types (minutely to yearly)
- ✅ Complex patterns ("2nd Tuesday", "Last Friday", etc.)
- ✅ Timezone-aware calculations
- ✅ Holiday and blackout date exclusions
- ✅ SLA deadline calculation
- ✅ Efficient batch polling

---

## Schedule Concepts

### What is a Schedule?

A **Schedule** defines *when* something should happen. In OmniTrackr:
- Schedules are created once and can be reused by multiple watchers
- Each schedule has a frequency type, interval, and optional constraints
- Schedules can be enabled/disabled without affecting watchers
- Schedules support validity periods (valid_from, valid_until)

### Schedule Components

```sql
schedules table:
├── frequency_type        -- How often (minutely/hourly/daily/weekly/monthly/yearly)
├── interval              -- Every N minutes/hours/days/etc.
├── execution_times       -- Specific times to run (e.g., ["09:00", "14:00"])
├── days_of_week          -- Which weekdays (1=Monday, 7=Sunday)
├── day_of_month          -- Which day of month (1-31)
├── week_of_month         -- Which week (1-4, -1=last)
├── timezone              -- IANA timezone (e.g., "America/New_York")
├── valid_from            -- Start date for schedule
├── valid_until           -- End date for schedule
└── enabled               -- Active/inactive toggle
```

---

## Frequency Types

### 1. Minutely
Run every N minutes continuously.

**Fields Used:**
- `frequency_type`: `"minutely"`
- `interval`: Number of minutes (e.g., 15, 30, 60)

**Example:**
```json
{
  "name": "Every 15 minutes",
  "frequency_type": "minutely",
  "interval": 15,
  "timezone": "UTC"
}
```

**Behavior:**
- Runs continuously, 24/7
- Next run = Last run + interval
- No exclusions apply (runs even on holidays)

---

### 2. Hourly
Run every N hours at a specific minute.

**Fields Used:**
- `frequency_type`: `"hourly"`
- `interval`: Number of hours (e.g., 1, 2, 6)

**Example:**
```json
{
  "name": "Every 2 hours",
  "frequency_type": "hourly",
  "interval": 2,
  "timezone": "UTC"
}
```

**Behavior:**
- Runs at consistent intervals
- If started at 9:00 AM, runs at 9:00, 11:00, 1:00, 3:00, etc.

---

### 3. Daily
Run every N days at specific times.

**Fields Used:**
- `frequency_type`: `"daily"`
- `interval`: Number of days (e.g., 1 for daily, 7 for weekly equivalent)
- `execution_times`: Array of times in 24-hour format (e.g., `["09:00", "14:00", "18:00"]`)

**Example:**
```json
{
  "name": "Daily at 9am",
  "frequency_type": "daily",
  "interval": 1,
  "execution_times": ["09:00"],
  "timezone": "America/New_York"
}
```

**Behavior:**
- Runs at specified times each day
- If multiple times specified, runs at each time
- Respects timezone (9:00 AM EST is different from 9:00 AM UTC)

---

### 4. Weekly
Run on specific days of the week at specific times.

**Fields Used:**
- `frequency_type`: `"weekly"`
- `interval`: Number of weeks (usually 1)
- `days_of_week`: Array of weekday numbers (1=Monday, 2=Tuesday, ..., 7=Sunday)
- `execution_times`: Times to run on those days

**Example:**
```json
{
  "name": "Weekdays at 9am and 2pm",
  "frequency_type": "weekly",
  "interval": 1,
  "days_of_week": [1, 2, 3, 4, 5],
  "execution_times": ["09:00", "14:00"],
  "timezone": "America/New_York"
}
```

**Behavior:**
- Runs only on specified weekdays
- Runs at each execution time on those days
- Example above = Monday-Friday at 9:00 AM and 2:00 PM EST

**Common Patterns:**
- `[1, 2, 3, 4, 5]` = Weekdays (Monday-Friday)
- `[6, 7]` = Weekends (Saturday-Sunday)
- `[1, 3, 5]` = Monday, Wednesday, Friday

---

### 5. Monthly
Run on specific days of the month or specific weekdays of the month.

**Option A: Specific Day of Month**

**Fields Used:**
- `frequency_type`: `"monthly"`
- `day_of_month`: Day number (1-31, or -1 for last day)
- `execution_times`: Times to run

**Example:**
```json
{
  "name": "First of month at midnight",
  "frequency_type": "monthly",
  "interval": 1,
  "day_of_month": 1,
  "execution_times": ["00:00"],
  "timezone": "UTC"
}
```

**Option B: Nth Weekday of Month**

**Fields Used:**
- `frequency_type`: `"monthly"`
- `week_of_month`: Which occurrence (1=first, 2=second, 3=third, 4=fourth, -1=last)
- `days_of_week`: Which weekday (e.g., `[5]` for Friday)
- `execution_times`: Times to run

**Example:**
```json
{
  "name": "Last Friday of month at 5pm",
  "frequency_type": "monthly",
  "interval": 1,
  "week_of_month": -1,
  "days_of_week": [5],
  "execution_times": ["17:00"],
  "timezone": "America/New_York"
}
```

**Common Patterns:**
- First Monday: `week_of_month=1`, `days_of_week=[1]`
- Second Tuesday: `week_of_month=2`, `days_of_week=[2]`
- Last business day: `week_of_month=-1`, `days_of_week=[1,2,3,4,5]`

---

### 6. Yearly
Run once per year on a specific date.

**Fields Used:**
- `frequency_type`: `"yearly"`
- `day_of_month`: Day (1-31)
- Month is implicit in execution time or configuration
- `execution_times`: Time to run

**Example:**
```json
{
  "name": "New Year's Day at midnight",
  "frequency_type": "yearly",
  "interval": 1,
  "day_of_month": 1,
  "execution_times": ["00:00"],
  "timezone": "UTC"
}
```

---

## Schedule Patterns

### Simple Patterns

**Every 30 Minutes:**
```json
{
  "frequency_type": "minutely",
  "interval": 30
}
```

**Daily at 9 AM:**
```json
{
  "frequency_type": "daily",
  "interval": 1,
  "execution_times": ["09:00"],
  "timezone": "America/New_York"
}
```

### Complex Patterns

**Business Hours (9am, 2pm, 6pm on weekdays):**
```json
{
  "frequency_type": "weekly",
  "interval": 1,
  "days_of_week": [1, 2, 3, 4, 5],
  "execution_times": ["09:00", "14:00", "18:00"],
  "timezone": "America/New_York"
}
```

**2nd Tuesday of Each Month at 10 AM:**
```json
{
  "frequency_type": "monthly",
  "interval": 1,
  "week_of_month": 2,
  "days_of_week": [2],
  "execution_times": ["10:00"],
  "timezone": "America/Chicago"
}
```

**Last Friday of Every Quarter at 5 PM:**
This requires separate schedules for each quarter month:
```json
[
  {
    "frequency_type": "monthly",
    "week_of_month": -1,
    "days_of_week": [5],
    "execution_times": ["17:00"],
    "valid_from": "2025-03-01",
    "valid_until": "2025-03-31"
  },
  {
    "frequency_type": "monthly",
    "week_of_month": -1,
    "days_of_week": [5],
    "execution_times": ["17:00"],
    "valid_from": "2025-06-01",
    "valid_until": "2025-06-30"
  }
  // ... repeat for Sep and Dec
]
```

---

## Exclusions (Holidays & Blackouts)

### What are Exclusions?

Exclusions prevent a schedule from running on specific dates or date ranges. Common uses:
- **Holidays**: Don't expect files on Christmas, New Year's, etc.
- **Blackout periods**: Maintenance windows, system outages
- **Exception dates**: One-off dates when files won't arrive

### Exclusion Types

**1. Single Date Exclusion:**
```json
{
  "schedule_id": 1,
  "excluded_date": "2025-12-25",
  "reason": "Christmas Day",
  "description": "US Federal Holiday"
}
```

**2. Date Range Exclusion:**
```json
{
  "schedule_id": 1,
  "excluded_date_from": "2025-12-24",
  "excluded_date_to": "2025-12-26",
  "reason": "Holiday Period",
  "description": "Christmas holiday period"
}
```

### How Exclusions Work

**Scheduler Behavior:**
1. Calculate next run time based on schedule pattern
2. Check if that date falls on any exclusion
3. If excluded, skip to next valid date
4. Repeat until non-excluded date found (max 365 attempts)

**Example:**
```
Schedule: Daily at 9 AM
Exclusions: Dec 25 (Christmas), Dec 26 (Boxing Day)

Timeline:
- Dec 23: ✅ Runs at 9 AM
- Dec 24: ✅ Runs at 9 AM
- Dec 25: ❌ Excluded - skips to next day
- Dec 26: ❌ Excluded - skips to next day
- Dec 27: ✅ Runs at 9 AM (first non-excluded date)
```

### Managing Exclusions via API

**Create Exclusion:**
```bash
POST /api/schedules/:id/exclusions
{
  "excluded_date": "2025-12-25",
  "reason": "Christmas Day"
}
```

**Create Date Range Exclusion:**
```bash
POST /api/schedules/:id/exclusions
{
  "excluded_date_from": "2025-07-01",
  "excluded_date_to": "2025-07-07",
  "reason": "System Maintenance Window"
}
```

**List Exclusions:**
```bash
GET /api/schedules/:id/exclusions
```

---

## Timezone Handling

### Why Timezones Matter

File delivery schedules are often tied to business hours in specific timezones:
- NYC office expects files by 9 AM **Eastern Time**
- London office expects files by 9 AM **GMT**
- These are **different UTC times**!

### How OmniTrackr Handles Timezones

**1. Schedule Definition:**
```json
{
  "name": "Daily at 9am EST",
  "execution_times": ["09:00"],
  "timezone": "America/New_York"  // IANA timezone
}
```

**2. Calculation Process:**
```
User Input: "9:00 AM" in "America/New_York"
        ↓
Scheduler: Converts to schedule's timezone
        ↓
Calculation: Determines next "9:00 AM EST"
        ↓
Storage: Converts to UTC for database
        ↓
Display: Can convert back to any timezone
```

**3. Daylight Saving Time:**
The scheduler automatically handles DST transitions:
```
March 10, 2025 (DST starts):
- 9:00 AM EST = 14:00 UTC (winter)
- 9:00 AM EDT = 13:00 UTC (summer)
Scheduler adjusts automatically!
```

### Supported Timezones

OmniTrackr uses **IANA timezone database**:
- `America/New_York` (Eastern)
- `America/Chicago` (Central)
- `America/Los_Angeles` (Pacific)
- `Europe/London` (GMT/BST)
- `Asia/Tokyo` (JST)
- `UTC` (Coordinated Universal Time)

See full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## How Polling Works with Schedules

### Complete Polling Flow

```
┌─────────────────────────────────────────────────┐
│         Polling Worker (Every 60 seconds)       │
└─────────────────────────────────────────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │ Get all active watchers    │
        │ with schedules             │
        └────────────────────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │ For each watcher:          │
        │ 1. Get schedule            │
        │ 2. Calculate next run time │
        │ 3. Check if due now        │
        └────────────────────────────┘
                      │
                      ▼
              ┌─────────────┐
              │   Is due?   │
              └─────────────┘
                /           \
              NO             YES
              │               │
              ▼               ▼
          Skip          ┌───────────────┐
                        │  Execute Poll │
                        └───────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ 1. Connect to source │
                    │ 2. List files        │
                    │ 3. Match patterns    │
                    │ 4. Log results       │
                    │ 5. Update stats      │
                    └──────────────────────┘
```

### When is a Watcher "Due"?

A watcher is due to run when:
1. ✅ Its status is `"active"`
2. ✅ It has a schedule assigned (`schedule_id` is not null)
3. ✅ The schedule is enabled
4. ✅ Current time >= next calculated run time
5. ✅ The date is not excluded

### Calculation Example

**Scenario:**
- Schedule: "Daily at 9:00 AM EST"
- Last poll: Today at 8:00 AM EST
- Current time: Today at 9:15 AM EST

**Scheduler Logic:**
```javascript
1. Get schedule: "Daily at 9:00 AM EST"
2. Calculate next run from last poll (8:00 AM):
   → Next run = Today at 9:00 AM EST
3. Current time: 9:15 AM EST
4. Compare: 9:15 AM >= 9:00 AM → TRUE
5. Check exclusions: Today not excluded → TRUE
6. Result: WATCHER IS DUE ✅
```

---

## SLA Tracking with Schedules

### How SLA Works with Schedules

The SLA Monitor uses schedules to create **expected file tracking records**:

```
Schedule: "Daily at 9 AM"
SLA Threshold: 60 minutes
                ↓
Expected Arrival: Tomorrow 9:00 AM
SLA Deadline: Tomorrow 10:00 AM
                ↓
Create file_tracking record:
{
  expected_at: "2025-11-23 09:00:00 EST",
  sla_deadline: "2025-11-23 10:00:00 EST",
  tracking_status: "pending"
}
```

### SLA Statuses

**Timeline Example:**

```
09:00 AM - File expected to arrive
   │
   ▼
09:30 AM - File arrives
   │       Status: ✅ "arrived" (on time)
   │
10:00 AM - SLA deadline
   │
   ▼
10:15 AM - File arrives
   │       Status: ⚠️ "late" (after deadline)
   │
11:00 AM - Still no file
   │       Status: 🚨 "missing" (SLA violation)
```

### SLA Calculation Process

**1. Daily Creation (SLA Monitor Worker):**
```
Every 5 minutes:
1. Find watchers with sla_enabled=true
2. Calculate next run time for each
3. Create expected file record:
   - expected_at = next run time
   - sla_deadline = next run time + sla_threshold_minutes
4. Status = "pending"
```

**2. When File Arrives (Polling Worker):**
```
File detected at 09:30 AM:
1. Find matching pending file_tracking record
2. Compare arrival time to sla_deadline:
   - If before deadline → "arrived" ✅
   - If after deadline → "late" ⚠️
3. Update record with file details
4. Clear "pending" status
```

**3. Missing File Detection (SLA Monitor Worker):**
```
Every 5 minutes:
1. Find records where:
   - status = "pending"
   - sla_deadline < current time
2. Mark as "missing" 🚨
3. Trigger alert
```

### SLA Configuration

**Per Watcher:**
```json
{
  "watcher_id": 123,
  "sla_enabled": true,
  "sla_threshold_minutes": 60,  // 1 hour after expected time
  "schedule_id": 5
}
```

**Expected vs Deadline:**
```
Schedule: Daily at 9 AM
SLA Threshold: 60 minutes

Expected: 9:00 AM (when file should arrive)
Deadline: 10:00 AM (latest acceptable arrival)

Status Timeline:
├─ 8:00 AM: ⏰ Too early (before expected)
├─ 9:00 AM: ✅ Expected arrival time
├─ 9:30 AM: ✅ On time (before deadline)
├─ 10:00 AM: ⏰ SLA deadline
├─ 10:15 AM: ⚠️ Late (after deadline)
└─ 11:00 AM: 🚨 Missing (still not arrived)
```

---

## Examples

### Example 1: Financial Report (Daily)

**Requirement:**
> "Finance team needs the daily sales report every morning at 9 AM EST,
> but not on weekends or bank holidays."

**Solution:**

**Schedule:**
```json
{
  "name": "Daily Sales Report - 9am EST",
  "frequency_type": "daily",
  "interval": 1,
  "execution_times": ["09:00"],
  "timezone": "America/New_York",
  "enabled": true
}
```

**Exclusions:**
```json
[
  {"excluded_date": "2025-01-01", "reason": "New Year's Day"},
  {"excluded_date": "2025-07-04", "reason": "Independence Day"},
  {"excluded_date": "2025-12-25", "reason": "Christmas"},
  // Plus weekend exclusions via schedule logic or recurring exclusions
]
```

**Watcher:**
```json
{
  "name": "Daily Sales Report",
  "file_name_pattern": "sales_report_*.csv",
  "schedule_id": 1,
  "sla_enabled": true,
  "sla_threshold_minutes": 30  // File must arrive by 9:30 AM
}
```

---

### Example 2: Month-End Processing

**Requirement:**
> "Process month-end reports on the last business day of each month at 6 PM CT."

**Solution:**

**Schedule:**
```json
{
  "name": "Month-End - Last Business Day 6pm",
  "frequency_type": "monthly",
  "interval": 1,
  "week_of_month": -1,
  "days_of_week": [1, 2, 3, 4, 5],  // Mon-Fri
  "execution_times": ["18:00"],
  "timezone": "America/Chicago",
  "enabled": true
}
```

**Behavior:**
- Automatically finds last weekday of month
- If last day is Saturday → runs Friday
- If last day is Sunday → runs Friday
- Skips holidays if added as exclusions

---

### Example 3: Quarterly Compliance Report

**Requirement:**
> "Generate compliance reports on the 15th of March, June, September, and December at midnight UTC."

**Solution:**

Create 4 separate schedules with validity periods:

**Q1 (March):**
```json
{
  "name": "Q1 Compliance - March 15",
  "frequency_type": "yearly",
  "day_of_month": 15,
  "execution_times": ["00:00"],
  "timezone": "UTC",
  "valid_from": "2025-03-01",
  "valid_until": "2025-03-31"
}
```

**Q2 (June), Q3 (September), Q4 (December):**
Similar with different validity periods.

---

### Example 4: Multi-Timezone Operation

**Requirement:**
> "London office needs files at 9 AM GMT, NYC office needs files at 9 AM EST."

**Solution:**

**London Schedule:**
```json
{
  "name": "London Daily 9am",
  "frequency_type": "daily",
  "execution_times": ["09:00"],
  "timezone": "Europe/London"
}
```

**NYC Schedule:**
```json
{
  "name": "NYC Daily 9am",
  "frequency_type": "daily",
  "execution_times": ["09:00"],
  "timezone": "America/New_York"
}
```

These run at **different UTC times**:
- London 9 AM GMT = 09:00 UTC
- NYC 9 AM EST = 14:00 UTC

---

## Best Practices

### 1. Use Descriptive Names
✅ Good: `"Weekdays 9am EST - Sales Reports"`
❌ Bad: `"Schedule 1"`

### 2. Set Appropriate SLA Thresholds
```
File arrival window consideration:
- Network latency
- File size (large files take longer)
- Source system processing time

Example:
Expected: 9:00 AM
Typical arrival: 9:00-9:15 AM
SLA threshold: 30 minutes → Deadline: 9:30 AM
```

### 3. Always Specify Timezones
✅ Good: `"timezone": "America/New_York"`
❌ Bad: Omitting timezone (defaults to UTC, might not be intended)

### 4. Use Exclusions for Known Outages
```json
{
  "excluded_date_from": "2025-12-24",
  "excluded_date_to": "2025-12-26",
  "reason": "Holiday Shutdown",
  "description": "Source system offline for Christmas"
}
```

### 5. Test Schedules Before Production
```bash
# Get next run time for a schedule
POST /api/schedules/:id/calculate-next-run
{
  "from": "2025-11-22T10:00:00Z"
}

Response:
{
  "next_run": "2025-11-23T09:00:00Z",
  "next_run_local": "2025-11-23 09:00:00 EST"
}
```

### 6. Monitor SLA Compliance
```bash
# Get SLA dashboard
GET /api/file-tracking/sla-summary?days=30

Response:
{
  "total_expected": 300,
  "arrived_on_time": 285,
  "arrived_late": 10,
  "missing": 5,
  "on_time_percentage": 95.0
}
```

---

## Troubleshooting

### Problem: Watcher Not Running

**Check:**
1. ✅ Watcher status is `"active"`?
2. ✅ Schedule is enabled?
3. ✅ Schedule has valid `frequency_type` and required fields?
4. ✅ Current date not in exclusions?
5. ✅ Worker process is running?

**Debug:**
```sql
-- Check watcher details
SELECT w.id, w.name, w.status, w.schedule_id, w.last_check_at,
       s.name as schedule_name, s.enabled, s.frequency_type
FROM watchers w
JOIN schedules s ON w.schedule_id = s.id
WHERE w.id = 123;

-- Check recent poll logs
SELECT * FROM watcher_logs
WHERE watcher_id = 123
ORDER BY poll_started_at DESC
LIMIT 10;
```

---

### Problem: Schedule Running at Wrong Time

**Check:**
1. ✅ Timezone correct? (`America/New_York` vs `UTC`)
2. ✅ Execution times in 24-hour format? (`"09:00"` not `"9:00 AM"`)
3. ✅ DST transition? (clocks changed recently)

**Fix:**
```sql
-- Update schedule timezone
UPDATE schedules
SET timezone = 'America/New_York'
WHERE id = 123;
```

---

### Problem: Files Marked "Missing" But They Arrived

**Possible Causes:**
1. File name pattern doesn't match
2. File arrived in different directory
3. SLA threshold too short
4. Polling interval too long

**Check:**
```sql
-- Check file tracking records
SELECT ft.*, w.file_name_pattern
FROM file_tracking ft
JOIN watchers w ON ft.watcher_id = w.id
WHERE ft.tracking_status = 'missing'
  AND ft.expected_at > NOW() - INTERVAL '7 days';

-- Check if file was detected but not matched
SELECT * FROM watcher_logs
WHERE watcher_id = 123
  AND poll_started_at >= (SELECT expected_at FROM file_tracking WHERE id = 456)
  AND poll_started_at <= (SELECT sla_deadline FROM file_tracking WHERE id = 456);
```

---

### Problem: Too Many SLA Violations

**Investigation:**
```sql
-- Get SLA violation summary
SELECT
  w.name,
  COUNT(*) as total_violations,
  AVG(EXTRACT(EPOCH FROM (ft.arrived_at - ft.sla_deadline))/60) as avg_minutes_late
FROM file_tracking ft
JOIN watchers w ON ft.watcher_id = w.id
WHERE ft.tracking_status = 'late'
  AND ft.expected_at > NOW() - INTERVAL '30 days'
GROUP BY w.id, w.name
ORDER BY total_violations DESC;
```

**Solutions:**
1. Increase SLA threshold if consistently arriving slightly late
2. Adjust schedule if files actually arrive at different time
3. Investigate source system delays

---

## Summary

The OmniTrackr Scheduler provides:

✅ **Flexibility**: From simple "every hour" to complex "2nd Tuesday of month"
✅ **Reliability**: Timezone-aware, DST-handling, exclusion support
✅ **Observability**: Full audit trail in watcher_logs
✅ **Proactive SLA**: Detect missing files before users complain
✅ **Efficiency**: Batch polling reduces API calls and costs

**Next Steps:**
- Create schedules via API
- Assign schedules to watchers
- Configure SLA thresholds
- Monitor via dashboard

For more help, see:
- API Documentation: `/docs/postman/OmniTrackr-API.postman_collection.json`
- Schema Design: `/docs/SCHEMA_SPLIT_DESIGN.md`
