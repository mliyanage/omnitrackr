import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

interface BadgeConfig {
  variant: BadgeVariant;
  label: string;
}

/**
 * Get badge for source connection status
 * Maps: healthy, degraded, failed, untested, disabled
 */
export function getConnectionStatusBadge(
  status: string | undefined,
  enabled?: boolean
): BadgeConfig {
  if (enabled === false) {
    return { variant: 'secondary', label: 'Disabled' };
  }

  switch (status) {
    case 'healthy':
      return { variant: 'success', label: 'Healthy' };
    case 'degraded':
      return { variant: 'warning', label: 'Degraded' };
    case 'failed':
      return { variant: 'destructive', label: 'Failed' };
    case 'untested':
      return { variant: 'outline', label: 'Untested' };
    default:
      return { variant: 'outline', label: 'Unknown' };
  }
}

/**
 * Get badge for watcher status
 * Maps: active, inactive, error
 */
export function getWatcherStatusBadge(status: string | undefined): BadgeConfig {
  switch (status) {
    case 'active':
      return { variant: 'success', label: 'Active' };
    case 'inactive':
      return { variant: 'secondary', label: 'Inactive' };
    case 'error':
      return { variant: 'destructive', label: 'Error' };
    default:
      return { variant: 'outline', label: 'Unknown' };
  }
}

/**
 * Get badge for poll status
 * Maps: success, failed, in_progress, skipped
 */
export function getPollStatusBadge(status: string | null | undefined): BadgeConfig {
  switch (status) {
    case 'success':
      return { variant: 'success', label: 'Success' };
    case 'failed':
      return { variant: 'destructive', label: 'Failed' };
    case 'in_progress':
      return { variant: 'warning', label: 'In Progress' };
    case 'skipped':
      return { variant: 'secondary', label: 'Skipped' };
    default:
      return { variant: 'outline', label: 'Never' };
  }
}

/**
 * Get badge for enabled/disabled state
 */
export function getEnabledStatusBadge(enabled: boolean | undefined): BadgeConfig {
  return enabled
    ? { variant: 'success', label: 'Enabled' }
    : { variant: 'secondary', label: 'Disabled' };
}

/**
 * Get badge for active/inactive state (departments)
 */
export function getActiveStatusBadge(isActive: boolean | undefined): BadgeConfig {
  const active = isActive ?? true;
  return active
    ? { variant: 'success', label: 'Active' }
    : { variant: 'secondary', label: 'Inactive' };
}

/**
 * Get badge for file tracking status
 * Maps: pending, arrived, late, missing
 */
export function getTrackingStatusBadge(status: string | undefined): BadgeConfig {
  switch (status) {
    case 'pending':
      return { variant: 'secondary', label: 'Pending' };
    case 'arrived':
      return { variant: 'success', label: 'Arrived' };
    case 'late':
      return { variant: 'warning', label: 'Late' };
    case 'missing':
      return { variant: 'destructive', label: 'Missing' };
    default:
      return { variant: 'outline', label: 'Unknown' };
  }
}

/**
 * Get badge for alert type
 * Maps: sla_at_risk, sla_breached, file_arrived
 */
export function getAlertTypeBadge(alertType: string | undefined): BadgeConfig {
  switch (alertType) {
    case 'sla_at_risk':
      return { variant: 'warning', label: 'At Risk' };
    case 'sla_breached':
      return { variant: 'destructive', label: 'SLA Breached' };
    case 'file_arrived':
      return { variant: 'success', label: 'Arrived' };
    default:
      return { variant: 'outline', label: 'Alert' };
  }
}
