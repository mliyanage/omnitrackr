/**
 * Source Connection Types
 * Shared types for reusable connection configurations
 */

// Enums matching database types
export type SourceType =
  | 'S3'
  | 'AZURE_BLOB'
  | 'GCS'
  | 'SFTP'
  | 'FTP'
  | 'FTPS'
  | 'SHAREPOINT'
  | 'REST_API'
  | 'DATABASE'
  | 'FILE_SHARE';

export type ConnectionStatus = 'healthy' | 'degraded' | 'failed' | 'untested';

/**
 * Base connection configuration interface
 */
export interface BaseSourceConnectionConfig {
  [key: string]: any;
}

/**
 * S3 Connection Configuration for source connections
 * Note: This is distinct from the legacy S3ConnectionConfig in fileSource.types
 */
export interface S3SourceConnectionConfig extends BaseSourceConnectionConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

/**
 * SFTP Connection Configuration
 */
export interface SFTPConnectionConfig extends BaseSourceConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  authMethod?: 'password' | 'privateKey';
}

/**
 * FTP Connection Configuration
 */
export interface FTPConnectionConfig extends BaseSourceConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean;
}

/**
 * Union type for all connection configs
 */
export type SourceConnectionConfig =
  | S3SourceConnectionConfig
  | SFTPConnectionConfig
  | FTPConnectionConfig
  | BaseSourceConnectionConfig;

/**
 * Source Connection Entity (database model)
 */
export interface SourceConnection {
  id: number;
  organization_id: number;
  name: string;
  type: SourceType;
  description?: string | null;

  // Connection Configuration (JSONB)
  connection_config: SourceConnectionConfig;

  // Connection Health
  connection_status: ConnectionStatus;
  last_health_check?: Date | null;
  last_successful_connection?: Date | null;
  health_check_error?: string | null;

  // Security
  credential_last_rotated?: Date | null;
  credential_expires_at?: Date | null;

  // Control
  enabled: boolean;

  // Audit
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: Date | null;
}

/**
 * Create Source Connection Request
 */
export interface CreateSourceConnectionRequest {
  name: string;
  type: SourceType;
  description?: string;
  connection_config: SourceConnectionConfig;
  enabled?: boolean;
}

/**
 * Update Source Connection Request
 */
export interface UpdateSourceConnectionRequest {
  name?: string;
  description?: string;
  connection_config?: SourceConnectionConfig;
  enabled?: boolean;
}

/**
 * Test Connection Request
 */
export interface TestSourceConnectionRequest {
  type: SourceType;
  connection_config: SourceConnectionConfig;
}

/**
 * Test Connection Response
 */
export interface TestSourceConnectionResponse {
  success: boolean;
  canAuthenticate: boolean;
  canAccess: boolean;
  canList: boolean;
  errorMessage?: string;
  latencyMs?: number;
  sampleItems?: string[];
}

/**
 * Health Check Result
 */
export interface ConnectionHealthCheckResult {
  connection_status: ConnectionStatus;
  last_health_check: Date;
  last_successful_connection?: Date;
  health_check_error?: string;
}
