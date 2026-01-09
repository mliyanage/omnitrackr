import type {
  SourceConnection,
  Schedule,
  Watcher,
  S3ConnectionConfig,
} from '@/types/watcher.types';
import type { Department } from '@/types';

// Mock S3 Connection
export const mockConnection: SourceConnection = {
  id: 1,
  name: 'Test S3 Connection',
  description: 'Test connection for unit tests',
  type: 'S3',
  enabled: true,
  connection_status: 'healthy',
  connection_config: {
    bucket: 'test-bucket',
    region: 'us-east-1',
    path_prefix: '/data',
    access_key_id: 'AKIAIOSFODNN7EXAMPLE',
    secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  } as S3ConnectionConfig,
  last_health_check: new Date().toISOString(),
  last_successful_connection: new Date().toISOString(),
  health_check_error: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: '1',
  updated_by: null,
};

// Mock Schedule
export const mockSchedule: Schedule = {
  id: 1,
  name: 'Daily 2 AM',
  description: 'Daily schedule at 2 AM EST',
  enabled: true,
  frequency_type: 'daily',
  interval: 1,
  execution_times: ['02:00'],
  timezone: 'America/New_York',
  days_of_week: null,
  day_of_month: null,
  week_of_month: null,
  valid_from: null,
  valid_until: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: '1',
  updated_by: null,
};

// Mock Department
export const mockDepartment: Department = {
  id: 1,
  organization_id: 1,
  name: 'Finance',
  code: 'FIN',
  description: 'Finance department',
  status: 'active',
  settings: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: '1',
  updated_by: null,
  deleted_at: null,
};

// Mock Watcher
export const mockWatcher: Watcher = {
  id: 1,
  name: 'Test Watcher',
  description: 'Test watcher for unit tests',
  source_connection_id: 1,
  schedule_id: 1,
  department_code: 'DEPARTMENT:Finance',
  status: 'active',
  file_name_pattern: '*.csv',
  file_path_pattern: '/data/',
  match_rule: 'partial',
  direction: 'inward',
  sla_enabled: true,
  sla_threshold_minutes: 60,
  poll_interval_minutes: 60,
  last_check_at: new Date().toISOString(),
  last_check_status: 'success',
  last_files_detected: 5,
  total_files_detected: 100,
  total_polls_succeeded: 50,
  total_polls_failed: 2,
  success_rate: 96.15,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: '1',
  updated_by: null,
};

// Factory functions for creating mock data with overrides
export const createMockConnection = (
  overrides?: Partial<SourceConnection>
): SourceConnection => ({
  ...mockConnection,
  ...overrides,
});

export const createMockSchedule = (overrides?: Partial<Schedule>): Schedule => ({
  ...mockSchedule,
  ...overrides,
});

export const createMockDepartment = (overrides?: Partial<Department>): Department => ({
  ...mockDepartment,
  ...overrides,
});

export const createMockWatcher = (overrides?: Partial<Watcher>): Watcher => ({
  ...mockWatcher,
  ...overrides,
});

// Multiple mock items for list tests
export const mockConnections: SourceConnection[] = [
  mockConnection,
  createMockConnection({
    id: 2,
    name: 'SFTP Connection',
    type: 'SFTP',
    connection_config: {
      host: 'sftp.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass',
      path_prefix: '/uploads',
    },
  }),
];

export const mockSchedules: Schedule[] = [
  mockSchedule,
  createMockSchedule({
    id: 2,
    name: 'Every 6 Hours',
    description: 'Runs every 6 hours',
    frequency_type: 'hourly',
    interval: 6,
    execution_times: ['00:00', '06:00', '12:00', '18:00'],
  }),
];

export const mockDepartments: Department[] = [
  mockDepartment,
  createMockDepartment({
    id: 2,
    organization_id: 1,
    name: 'Information Technology',
    code: 'IT',
    description: 'IT department',
    status: 'active',
  }),
];

export const mockWatchers: Watcher[] = [
  mockWatcher,
  createMockWatcher({
    id: 2,
    name: 'Sales Report Watcher',
    description: 'Watches for daily sales reports',
    file_name_pattern: 'sales_report_*.xlsx',
    direction: 'outward',
  }),
];
