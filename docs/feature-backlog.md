# File Tracking Feature Backlog

## Overview
This document tracks all planned improvements and feature requests for the File Tracking system. Features are prioritized based on business impact and customer feedback.

---

## 🚀 In Progress

### 1. Per-Watcher Configurable Polling Frequency
**Priority:** 🔴 CRITICAL
**Status:** In Progress
**Effort:** 2-3 days
**Assigned To:** TBD

**Problem:**
Current system ties polling frequency to file schedule (hourly files = hourly polls). This causes incorrect SLA calculations where late files appear as "early" because detection happens after the fact.

**Solution:**
- Add `poll_interval_minutes` field to watchers table (default: 5 minutes)
- Each watcher runs independently at its configured interval
- Users can configure polling frequency when creating watchers
- Decouples file schedule from polling frequency

**Business Impact:**
Fixes critical flaw where SLA tracking is inaccurate. Without this, the core value proposition is broken.

**Implementation Steps:**
1. Database migration to add `poll_interval_minutes` column
2. Update watcher schemas/types
3. Modify polling worker to schedule watchers independently
4. Add field to Create Watcher UI
5. Test with early/on-time/late file scenarios

---

### 2. Manual File Override (Mark as Arrived)
**Priority:** 🟠 HIGH
**Status:** In Progress
**Effort:** 1-2 days
**Assigned To:** TBD

**Problem:**
No way to manually correct false "missing" status when auto-matching fails. Users can't fix mistakes, reducing trust in the system.

**Solution:**
- Add "Mark as Arrived" action button in File Tracking UI
- Opens right sheet modal showing S3 files matching the pattern
- User selects file to link to tracking record
- API updates file_tracking with file details and status

**Business Impact:**
Builds user trust by allowing manual intervention when automation fails. Essential for production use.

**Implementation Steps:**
1. Create API endpoint: `POST /api/file-tracking/:id/mark-arrived`
2. Add "Mark as Arrived" button to Actions menu in File Tracking table
3. Create right sheet modal to browse and select S3 files
4. Call API and refresh table on success
5. Add error handling and validation

---

## 🟡 Backlog - High Priority

### 3. Partner/Department Grouping
**Priority:** 🟠 HIGH
**Effort:** 1-2 days
**Business Value:** Makes it easy to identify problematic partners

**Problem:**
Can't see per-partner performance. Hard to analyze which partners are consistently late.

**Solution:**
- Add `partner_name` or `department_id` to watchers table
- Add partner filter to File Tracking UI
- Create "Per-Partner Performance" dashboard
- Show metrics grouped by partner

**Questions to Answer:**
- Preferred organization: partner name, department, tags, or all three?
- Should partners be a separate table with relationships?
- What metrics do users want to see per partner?

---

### 4. Expand Matching Time Window
**Priority:** 🟡 MEDIUM
**Effort:** 1 hour
**Business Value:** Handles very late files better

**Problem:**
Files must arrive within ±2 hours of expected_at to match. Very delayed files (>2 hours) won't match any tracking record.

**Solution:**
- Make time window configurable per watcher (default: 2 hours)
- OR increase global default to ±4 hours
- Add configuration to watcher settings UI

**Questions to Answer:**
- What's the typical range of delays customers see?
- Should this be global or per-watcher?
- What's a reasonable maximum window?

---

### 5. Better Error Messaging
**Priority:** 🟡 MEDIUM
**Effort:** 3-5 hours
**Business Value:** Helps users understand why files aren't matching

**Problem:**
When files show as "Missing", users don't know why. Could be: pattern mismatch, outside time window, file never uploaded, etc.

**Solution:**
- Add `match_failure_reason` field to file_tracking
- Log specific reasons when matching fails:
  - "No file matching pattern found in S3"
  - "File found but outside time window"
  - "File found but already matched to another record"
- Display reason in UI tooltip or expanded row

---

### 6. Enhanced Monitoring & Alerts
**Priority:** 🟡 MEDIUM
**Effort:** 2-3 days
**Business Value:** Proactive alerting before SLA breach

**Problem:**
Alerts only trigger after SLA breach. No early warning system.

**Solution:**
- Add "At Risk" status for files approaching deadline
- Configurable warning threshold (e.g., alert if within 10 minutes of SLA)
- Email/Slack notifications for at-risk files
- Dashboard showing at-risk count

---

## 🟢 Backlog - Low Priority

### 7. Ad-Hoc File Support
**Priority:** 🟢 LOW
**Effort:** 3-5 days
**Business Value:** Handles unscheduled files

**Problem:**
Must define exact schedule upfront. Can't track files with variable/unknown schedules.

**Solution:**
- Add "Monitor All Files" mode to watchers
- Create tracking records dynamically when new files arrive
- Don't require pre-defined schedule
- Still track SLA against first detection time

**Questions to Answer:**
- How common are unscheduled files?
- What should "expected_at" be for ad-hoc files?
- How to handle SLA for files without defined schedules?

---

### 8. Outbound File Tracking
**Priority:** 🟢 LOW (TBD based on customer feedback)
**Effort:** 5-7 days
**Business Value:** Track files you send to partners, not just receive

**Problem:**
Currently only tracks inbound files. User mentioned need for "inbound and outbound" tracking.

**Solution:**
- Add `direction` field to watchers (inbound/outbound)
- For outbound:
  - Track when files were uploaded by your system
  - Alert if file wasn't uploaded on time
  - Monitor if partner retrieved the file
- Adapt UI to show both directions

**Questions to Answer:**
- Is this a must-have for v1 or can wait for v2?
- How do you track if a partner retrieved a file?
- Different SLA metrics for outbound vs inbound?

---

### 9. Configurable Matching Logic
**Priority:** 🟢 LOW
**Effort:** 2-3 days
**Business Value:** More flexible file matching

**Problem:**
Matching logic is hardcoded. Some customers might have special requirements.

**Solution:**
- Make matching rules configurable:
  - Time window size (already planned)
  - Allow multiple patterns per watcher
  - Custom matching logic via JavaScript expressions
  - File size or content-based matching

---

### 10. Predictive "At Risk" Alerts
**Priority:** 🟢 LOW
**Effort:** 1 week
**Business Value:** Differentiation - predicts issues before they happen

**Problem:**
Reactive system - only alerts after problems occur.

**Solution:**
- Analyze historical patterns per watcher
- Predict if file is likely to be late based on:
  - Time of day
  - Day of week
  - Historical delay patterns
- Alert proactively: "File X is usually late on Fridays"

---

### 11. Bulk File Upload/Import
**Priority:** 🟢 LOW
**Effort:** 1-2 days
**Business Value:** Easier to set up multiple watchers

**Problem:**
Must create watchers one by one. Tedious for customers with many partners.

**Solution:**
- CSV/Excel import for watcher definitions
- Bulk create from template
- Clone existing watcher
- API endpoint for programmatic creation

---

### 12. File Content Validation
**Priority:** 🟢 LOW
**Effort:** 1-2 weeks
**Business Value:** Ensures files are not just present, but valid

**Problem:**
System only checks if file arrived. Doesn't validate file is correct/complete.

**Solution:**
- Add validation rules per watcher:
  - File size range (min/max)
  - Row count for CSV files
  - Schema validation (column names, data types)
  - Checksum verification
- Mark files as "arrived but invalid" if validation fails

---

## 📊 Metrics to Track

After implementing priority features, track these metrics to guide future work:

1. **Adoption Metrics:**
   - Number of active watchers
   - Number of tracked files per day
   - Number of unique users

2. **Performance Metrics:**
   - SLA compliance rate (overall and per-partner)
   - Average delay time
   - False positive rate (files marked missing but were present)

3. **User Behavior:**
   - How often is manual override used?
   - What poll_interval_minutes do users choose?
   - Which alerts are most useful?

4. **System Health:**
   - Polling worker performance
   - S3/SFTP API call costs
   - Database query performance

---

## 🔄 Review Cycle

This backlog should be reviewed:
- **Weekly:** During sprint planning to prioritize next tasks
- **Monthly:** With customer feedback to re-prioritize based on pain points
- **Quarterly:** Strategic review of product direction

---

## 📝 Notes

- Features marked 🔴 CRITICAL must be completed before customer launch
- Features marked 🟠 HIGH should be in v1 if possible
- Features marked 🟡 MEDIUM can be v2
- Features marked 🟢 LOW are nice-to-have differentiation

**Last Updated:** December 4, 2025
