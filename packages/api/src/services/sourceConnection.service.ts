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
   * Get all connections with pagination
   */
  async getAll(
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
      page,
      limit,
    });
  }

  /**
   * Get connection by ID
   */
  async getById(id: number): Promise<SourceConnection> {
    const connection = await this.repo.findById<SourceConnection>(id);
    if (!connection || connection.deleted_at) {
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
    const { region, bucket, access_key_id, secret_access_key } = config;

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: access_key_id,
        secretAccessKey: secret_access_key,
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
   * Create connection
   * If a soft-deleted connection with the same name exists, restore and update it
   */
  async create(
    request: CreateSourceConnectionRequest,
    createdBy?: string
  ): Promise<SourceConnection> {
    // Test connection first
    const testResult = await this.testConnection({
      type: request.type,
      connection_config: request.connection_config,
    });

    const connectionStatus: ConnectionStatus = testResult.success ? 'healthy' : 'failed';

    // Check if a soft-deleted connection with this name exists
    const deletedConnection = await this.repo.findDeletedByName(request.name);

    if (deletedConnection) {
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
      created_by: createdBy,
    });

    return connection;
  }

  /**
   * Update connection
   */
  async update(
    id: number,
    request: UpdateSourceConnectionRequest,
    updatedBy?: string
  ): Promise<SourceConnection> {
    await this.getById(id); // Ensure exists

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
    return this.getById(id);
  }

  /**
   * Delete connection (soft delete)
   */
  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.repo.softDelete(id);
  }

  /**
   * Check connection health
   */
  async checkHealth(id: number): Promise<ConnectionHealthCheckResult> {
    const connection = await this.getById(id);

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
  async toggleEnabled(id: number, enabled: boolean): Promise<SourceConnection> {
    await this.getById(id);
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
