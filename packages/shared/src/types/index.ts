/**
 * Shared Types Index
 * Export all type definitions
 */

export * from './common.types';
export * from './fileSource.types';

// Export old inward file types with aliases to avoid conflicts
export type {
  InwardFile as OldInwardFile,
  FileTracking as OldFileTracking,
  SLAStatus,
  ProcessingStatus,
  S3Metadata,
} from './inwardFile.types';

// New schema types (these are the primary exports)
export * from './sourceConnection.types';
export * from './schedule.types';
export * from './watcher.types';
export * from './watcherLog.types';
export * from './refData.types';

// FileTracking types - export the NEW ones as the default
export type {
  TrackingStatus,
  AlertType,
  FileTracking,
  CreateFileTrackingRequest,
  FileArrivedRequest,
  FileTrackingQueryOptions,
  SLADashboardSummary,
  FileTrackingWithWatcher,
  MissingFileAlert,
} from './fileTracking.types';

// Dashboard types
export * from './dashboard.types';

// Alert configuration types
export * from './alert.types';

// export * from './notification.types'; // TODO: Add later
// export * from './user.types'; // TODO: Add later
