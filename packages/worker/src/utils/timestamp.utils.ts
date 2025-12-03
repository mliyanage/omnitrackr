/**
 * Timestamp Utilities
 * Provides consistent timestamp formatting across the worker package
 */

/**
 * Get current timestamp in UTC ISO 8601 format
 * Returns: "2025-12-02T09:06:55.758Z"
 *
 * Use this for:
 * - Logging
 * - Console output
 * - Debugging
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format a Date object to UTC ISO 8601 format
 * Returns: "2025-12-02T09:06:55.758Z"
 */
export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Get current date for database operations
 * Returns a Date object that will be stored as timestamptz in PostgreSQL
 *
 * Note: PostgreSQL will store this as UTC internally and format it
 * as "YYYY-MM-DD HH:MM:SS.sss+00" when retrieved
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Parse a date string or Date object and return a UTC ISO timestamp string
 */
export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }

  return date.toISOString();
}

/**
 * Calculate time difference in milliseconds
 */
export function timeDiff(start: Date, end: Date = new Date()): number {
  return end.getTime() - start.getTime();
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}
