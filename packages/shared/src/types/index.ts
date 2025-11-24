/**
 * Shared Types Index
 * Export all type definitions
 */

export * from './common.types';
export * from './fileSource.types';
export * from './inwardFile.types';

// New schema types (selective exports to avoid conflicts)
export * from './sourceConnection.types';
export * from './schedule.types';
export * from './watcher.types';
export * from './watcherLog.types';
export * from './refData.types';

// FileTracking types - export explicitly to avoid conflict with inwardFile.types
export type {
  TrackingStatus,
  AlertType,
  FileTracking as NewFileTracking, // Alias to avoid conflict
  CreateFileTrackingRequest,
  FileArrivedRequest,
  FileTrackingQueryOptions,
  SLADashboardSummary,
  FileTrackingWithWatcher,
  MissingFileAlert,
} from './fileTracking.types';

// export * from './notification.types'; // TODO: Add later
// export * from './user.types'; // TODO: Add later
