import {
  SourceConnectionRepository,
  SourceConnection,
  CreateSourceConnectionRequest,
  UpdateSourceConnectionRequest,
  TestSourceConnectionRequest,
  TestSourceConnectionResponse,
  ConnectionHealthCheckResult,
  SourceType,
  ConnectionStatus,
} from '@omnitrackr/shared';
import { db } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import SFTPClient from 'ssh2-sftp-client';

/**
 * Source Connection Service
 * Business logic for managing source connections
 */
export class SourceConnectionService {
  private repo: SourceConnectionRepository;

  constructor() {
    this.repo = new SourceConnectionRepository(db);
  }

  /**
   * Get all connections with pagination (filtered by organization)
   */
  async getAll(
    organizationId: number,
    page: number = 1,
    limit: number = 20,
    filters?: {
      type?: SourceType;
      connection_status?: ConnectionStatus;
      enabled?: boolean;
    }
  ) {
    return this.repo.findWithFilters({
      ...filters,
      organization_id: organizationId,
      page,
      limit,
    });
  }

  /**
   * Get connection by ID (with organization ownership validation)
   */
  async getById(id: number, organizationId: number): Promise<SourceConnection> {
    const connection = await this.repo.findById<SourceConnection>(id);
    if (!connection || connection.deleted_at) {
      throw new NotFoundError('Source Connection', id);
    }

    // Validate organization ownership
    if (connection.organization_id !== organizationId) {
      throw new NotFoundError('Source Connection', id);
    }

    return connection;
  }

  /**
   * Test connection
   */
  async testConnection(request: TestSourceConnectionRequest): Promise<TestSourceConnectionResponse> {
    const startTime = Date.now();

    switch (request.type) {
      case 'S3':
        return this.testS3Connection(request.connection_config, startTime);
      case 'SFTP':
        return this.testSFTPConnection(request.connection_config, startTime);
      // Add other connection types here
      default:
        return {
          success: false,
          canAuthenticate: false,
          canAccess: false,
          canList: false,
          errorMessage: `Connection type '${request.type}' not yet implemented`,
        };
    }
  }

  /**
   * Test S3 connection
   */
  private async testS3Connection(
    config: any,
    startTime: number
  ): Promise<TestSourceConnectionResponse> {
    // Support both camelCase (type definition) and snake_case (database storage)
    const region = config.region;
    const bucket = config.bucket;
    const accessKeyId = config.accessKeyId || config.access_key_id;
    const secretAccessKey = config.secretAccessKey || config.secret_access_key;

    console.log('[S3 Test] Config keys:', Object.keys(config));
    console.log('[S3 Test] Extracted accessKeyId:', accessKeyId ? '***' + accessKeyId.slice(-4) : 'undefined');
    console.log('[S3 Test] Extracted secretAccessKey:', secretAccessKey ? '***' + secretAccessKey.slice(-4) : 'undefined');

    if (!accessKeyId || !secretAccessKey) {
      return {
        success: false,
        canAuthenticate: false,
        canAccess: false,
        canList: false,
        errorMessage: 'Missing AWS credentials in configuration',
        latencyMs: Date.now() - startTime,
      };
    }

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const response: TestSourceConnectionResponse = {
      success: false,
      canAuthenticate: false,
      canAccess: false,
      canList: false,
    };

    try {
      // Test bucket access
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
      response.canAuthenticate = true;
      response.canAccess = true;

      // Test listing
      const listResponse = await s3Client.send(
        new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 })
      );
      response.canList = true;
      response.success = true;
      response.sampleItems = (listResponse.Contents || [])
        .map((obj) => obj.Key || '')
        .filter((key) => key.length > 0);

      response.latencyMs = Date.now() - startTime;
    } catch (error: any) {
      response.errorMessage = error.message || 'Unknown error';
      response.latencyMs = Date.now() - startTime;

      if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
        response.errorMessage = 'Authentication failed: Invalid credentials';
      } else if (error.name === 'NoSuchBucket') {
        response.canAuthenticate = true;
        response.errorMessage = `Bucket '${bucket}' does not exist`;
      } else if (error.name === 'AccessDenied') {
        response.canAuthenticate = true;
        response.errorMessage = `Access denied to bucket '${bucket}'`;
      }
    }

    return response;
  }

  /**
   * Test SFTP connection
   */
  private async testSFTPConnection(
    config: any,
    startTime: number
  ): Promise<TestSourceConnectionResponse> {
    // Parse config (support both camelCase and snake_case)
    const host = config.host;
    const port = config.port || 22;
    const username = config.username;
    const password = config.password;
    const privateKey = config.privateKey || config.private_key;
    const passphrase = config.passphrase;
    const pathPrefix = config.pathPrefix || config.path_prefix || '/';

    // Validate required fields
    if (!host || !username) {
      return {
        success: false,
        canAuthenticate: false,
        canAccess: false,
        canList: false,
        errorMessage: 'Missing required SFTP configuration (host or username)',
        latencyMs: Date.now() - startTime,
      };
    }

    // Validate auth method
    if (!password && !privateKey) {
      return {
        success: false,
        canAuthenticate: false,
        canAccess: false,
        canList: false,
        errorMessage: 'Either password or private key must be provided',
        latencyMs: Date.now() - startTime,
      };
    }

    const sftp = new SFTPClient();
    const response: TestSourceConnectionResponse = {
      success: false,
      canAuthenticate: false,
      canAccess: false,
      canList: false,
    };

    try {
      // Build connection config
      const connectConfig: any = { host, port, username, readyTimeout: 20000 };

      // Add auth credentials
      if (privateKey) {
        connectConfig.privateKey = privateKey;
        if (passphrase) connectConfig.passphrase = passphrase;
      } else {
        connectConfig.password = password;
      }

      // Test connection
      await sftp.connect(connectConfig);
      response.canAuthenticate = true;

      // Test directory listing
      const fileList = await sftp.list(pathPrefix);
      response.canAccess = true;
      response.canList = true;
      response.success = true;
      response.sampleItems = fileList.slice(0, 5).map((item) => item.name);
      response.latencyMs = Date.now() - startTime;

    } catch (error: any) {
      response.latencyMs = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      // Parse common errors
      if (errorMessage.includes('All configured authentication methods failed')) {
        response.errorMessage = 'Authentication failed: Invalid credentials';
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('EHOSTUNREACH')) {
        response.errorMessage = `Host '${host}' is unreachable`;
      } else if (errorMessage.includes('ECONNREFUSED')) {
        response.errorMessage = `Connection refused on port ${port}`;
      } else if (errorMessage.includes('ETIMEDOUT')) {
        response.errorMessage = `Connection timeout to '${host}:${port}'`;
      } else if (errorMessage.includes('Permission denied')) {
        response.canAuthenticate = true;
        response.errorMessage = `Permission denied accessing path '${pathPrefix}'`;
      } else if (errorMessage.includes('privateKey') || errorMessage.includes('Cannot parse privateKey')) {
        response.errorMessage = 'Invalid private key format or passphrase';
      } else if (errorMessage.includes('No such file')) {
        response.canAuthenticate = true;
        response.errorMessage = `Path '${pathPrefix}' does not exist`;
      } else {
        response.errorMessage = `SFTP connection failed: ${errorMessage}`;
      }
    } finally {
      await sftp.end().catch(() => {});
    }

    return response;
  }

  /**
   * Create connection
   * If a soft-deleted connection with the same name exists, restore and update it
   */
  async create(
    organizationId: number,
    request: CreateSourceConnectionRequest,
    createdBy?: string
  ): Promise<SourceConnection> {
    // Test connection first
    const testResult = await this.testConnection({
      type: request.type,
      connection_config: request.connection_config,
    });

    const connectionStatus: ConnectionStatus = testResult.success ? 'healthy' : 'failed';

    // Check if a soft-deleted connection with this name exists in this organization
    const deletedConnection = await this.repo.findDeletedByName(request.name);

    if (deletedConnection && deletedConnection.organization_id === organizationId) {
      // Restore the soft-deleted connection and update it with new values
      return this.repo.restore(deletedConnection.id, {
        type: request.type,
        description: request.description,
        connection_config: request.connection_config,
        connection_status: connectionStatus,
        last_health_check: new Date(),
        last_successful_connection: testResult.success ? new Date() : null,
        health_check_error: testResult.errorMessage || null,
        enabled: testResult.success ? (request.enabled ?? true) : false,
        updated_by: createdBy,
      });
    }

    // No deleted connection found, create a new one
    const connection = await this.repo.create<SourceConnection>({
      name: request.name,
      type: request.type,
      description: request.description,
      connection_config: request.connection_config,
      connection_status: connectionStatus,
      last_health_check: new Date(),
      last_successful_connection: testResult.success ? new Date() : null,
      health_check_error: testResult.errorMessage || null,
      enabled: testResult.success ? (request.enabled ?? true) : false,
      organization_id: organizationId,
      created_by: createdBy,
    });

    return connection;
  }

  /**
   * Update connection
   */
  async update(
    id: number,
    organizationId: number,
    request: UpdateSourceConnectionRequest,
    updatedBy?: string
  ): Promise<SourceConnection> {
    await this.getById(id, organizationId); // Ensure exists and validate ownership

    // Update connection details
    const updated = await this.repo.update<SourceConnection>(id, {
      ...request,
      updated_by: updatedBy,
    });

    // Test connection and update health status
    const testResult = await this.testConnection({
      type: updated.type,
      connection_config: updated.connection_config,
    });

    const healthResult: ConnectionHealthCheckResult = {
      connection_status: testResult.success ? 'healthy' : 'failed',
      last_health_check: new Date(),
      last_successful_connection: testResult.success
        ? new Date()
        : updated.last_successful_connection || undefined,
      health_check_error: testResult.errorMessage,
    };

    await this.repo.updateHealthStatus(id, healthResult);

    // Return the updated connection with health status
    return this.getById(id, organizationId);
  }

  /**
   * Delete connection (soft delete)
   */
  async delete(id: number, organizationId: number): Promise<void> {
    await this.getById(id, organizationId); // Validate ownership
    await this.repo.softDelete(id);
  }

  /**
   * Check connection health
   */
  async checkHealth(id: number, organizationId: number): Promise<ConnectionHealthCheckResult> {
    const connection = await this.getById(id, organizationId);

    const testResult = await this.testConnection({
      type: connection.type,
      connection_config: connection.connection_config,
    });

    const result: ConnectionHealthCheckResult = {
      connection_status: testResult.success ? 'healthy' : 'failed',
      last_health_check: new Date(),
      last_successful_connection: testResult.success ? new Date() : connection.last_successful_connection || undefined,
      health_check_error: testResult.errorMessage,
    };

    await this.repo.updateHealthStatus(id, result);

    return result;
  }

  /**
   * Toggle enabled status
   */
  async toggleEnabled(id: number, organizationId: number, enabled: boolean): Promise<SourceConnection> {
    await this.getById(id, organizationId); // Validate ownership
    return this.repo.update<SourceConnection>(id, { enabled });
  }

  /**
   * Get unhealthy connections
   */
  async getUnhealthy(): Promise<SourceConnection[]> {
    return this.repo.findUnhealthy();
  }

  /**
   * Get connections with expiring credentials
   */
  async getExpiringCredentials(withinDays: number = 30): Promise<SourceConnection[]> {
    return this.repo.findExpiringCredentials(withinDays);
  }
}
