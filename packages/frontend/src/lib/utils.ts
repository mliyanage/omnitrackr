import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date as relative time (e.g., "5m ago", "2h ago", "Never")
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Format date for detailed display (e.g., "Nov 30, 2025 at 2:30 PM")
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format file size in human-readable format (e.g., "1.23 MB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Calculate delay in minutes (negative = early, positive = late)
 */
export function calculateDelay(arrivedAt: string, expectedAt: string): number {
  const arrived = new Date(arrivedAt).getTime();
  const expected = new Date(expectedAt).getTime();
  return Math.floor((arrived - expected) / 60000);
}

/**
 * Format delay as human-readable string (e.g., "2h 15m late", "30m early")
 */
export function formatDelay(arrivedAt: string, expectedAt: string): string {
  const delayMins = calculateDelay(arrivedAt, expectedAt);

  if (delayMins === 0) return 'On time';
  if (delayMins < 0) {
    const early = Math.abs(delayMins);
    if (early < 60) return `${early}m early`;
    const hours = Math.floor(early / 60);
    const mins = early % 60;
    return mins > 0 ? `${hours}h ${mins}m early` : `${hours}h early`;
  }

  // Late
  if (delayMins < 60) return `${delayMins}m late`;
  const hours = Math.floor(delayMins / 60);
  const mins = delayMins % 60;
  return mins > 0 ? `${hours}h ${mins}m late` : `${hours}h late`;
}

/**
 * Check if a pending record is at risk (within 30 mins of SLA deadline)
 */
export function isAtRisk(record: {
  tracking_status: string;
  sla_deadline: string;
}): boolean {
  if (record.tracking_status !== 'pending') return false;

  const now = new Date().getTime();
  const deadline = new Date(record.sla_deadline).getTime();
  const minutesUntilDeadline = (deadline - now) / 60000;

  return minutesUntilDeadline > 0 && minutesUntilDeadline <= 30;
}
