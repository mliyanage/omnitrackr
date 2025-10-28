import { FileSourceRepository } from '@omnitrackr/shared';
import { FileSource, CreateS3FileSourceRequest, TestConnectionRequest, TestConnectionResponse } from '@omnitrackr/shared';
import { db } from '../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, CreateSecretCommand } from '@aws-sdk/client-secrets-manager';

/**
 * File Source Service
 * Business logic for managing file sources
 */
export class FileSourceService {
  private fileSourceRepo: FileSourceRepository;

  constructor() {
    this.fileSourceRepo = new FileSourceRepository(db);
  }

  /**
   * Get all file sources with pagination
   */
  async getAll(page: number = 1, limit: number = 20, department?: string) {
    const filters = department ? { department } : undefined;
    return this.fileSourceRepo.paginate({ page, limit, filters });
  }

  /**
   * Get file source by ID
   */
  async getById(id: number): Promise<FileSource> {
    const fileSource = await this.fileSourceRepo.findById(id);
    if (!fileSource) {
      throw new NotFoundError('File Source', id);
    }
    return fileSource as FileSource;
  }

  /**
   * Test S3 connection
   */
  async testS3Connection(request: TestConnectionRequest): Promise<TestConnectionResponse> {
    const { awsAccessKeyId, awsSecretAccessKey, bucketName, bucketRegion, monitorPath } = request;

    const s3Client = new S3Client({
      region: bucketRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    const response: TestConnectionResponse = {
      success: false,
      canAuthenticate: false,
      canAccessBucket: false,
      canListObjects: false,
    };

    try {
      // Test 1: Can we authenticate and access the bucket?
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      response.canAuthenticate = true;
      response.canAccessBucket = true;

      // Test 2: Can we list objects in the monitor path?
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: monitorPath.startsWith('/') ? monitorPath.substring(1) : monitorPath,
        MaxKeys: 5,
      });

      const listResponse = await s3Client.send(listCommand);
      response.canListObjects = true;
      response.success = true;

      // Include sample files
      response.sampleFiles = (listResponse.Contents || [])
        .map(obj => obj.Key || '')
        .filter(key => key.length > 0);

    } catch (error: any) {
      response.errorMessage = error.message || 'Unknown error occurred';

      if (error.name === 'InvalidAccessKeyId' || error.name === 'SignatureDoesNotMatch') {
        response.errorMessage = 'Authentication failed: Invalid AWS credentials';
      } else if (error.name === 'NoSuchBucket') {
        response.canAuthenticate = true;
        response.errorMessage = `Bucket '${bucketName}' does not exist`;
      } else if (error.name === 'AccessDenied' || error.name === 'Forbidden') {
        response.canAuthenticate = true;
        response.errorMessage = `Access denied to bucket '${bucketName}'`;
      }
    }

    return response;
  }

  /**
   * Create S3 file source
   */
  async createS3FileSource(request: CreateS3FileSourceRequest, createdBy?: string): Promise<FileSource> {
    // Test connection first
    const connectionTest = await this.testS3Connection({
      awsAccessKeyId: request.awsAccessKeyId,
      awsSecretAccessKey: request.awsSecretAccessKey,
      bucketName: request.bucketName,
      bucketRegion: request.bucketRegion,
      monitorPath: request.monitorPath,
    });

    if (!connectionTest.success) {
      throw new ValidationError(
        'Connection test failed: ' + connectionTest.errorMessage,
        connectionTest
      );
    }

    // Store credentials securely (AWS Secrets Manager or encrypted DB)
    const credentialId = await this.storeCredentials({
      awsAccessKeyId: request.awsAccessKeyId,
      awsSecretAccessKey: request.awsSecretAccessKey,
    });

    // Create file source
    const fileSource = await this.fileSourceRepo.create({
      name: request.name,
      type: 'S3',
      status: 'pending',
      enabled: true,
      connection_config: {
        sourceType: 'S3',
        bucketName: request.bucketName,
        bucketRegion: request.bucketRegion,
        monitorPath: request.monitorPath,
        credentialId,
        lastValidation: {
          timestamp: new Date().toISOString(),
          canAuthenticate: true,
          canAccessBucket: true,
          canListObjects: true,
        },
      },
      file_name_pattern: request.fileNamePattern,
      match_rule: request.matchRule,
      schedule: request.schedule,
      timezone: request.timezone,
      sla_threshold: request.slaThreshold,
      direction: request.direction,
      department: request.department,
      success_rate: 100,
      files_processed: 0,
      created_by: createdBy,
    });

    return fileSource as unknown as FileSource;
  }

  /**
   * Update file source
   */
  async update(id: number, updates: Partial<FileSource>, updatedBy?: string): Promise<FileSource> {
    const existing = await this.getById(id);

    return this.fileSourceRepo.update(id, {
      ...updates,
      updated_by: updatedBy,
    });
  }

  /**
   * Delete file source
   */
  async delete(id: number): Promise<void> {
    await this.getById(id); // Ensure it exists
    await this.fileSourceRepo.delete(id);
  }

  /**
   * Enable/disable file source
   */
  async toggleEnabled(id: number, enabled: boolean): Promise<FileSource> {
    return this.fileSourceRepo.update(id, { enabled }) as Promise<FileSource>;
  }

  /**
   * Get file source statistics
   * TODO: Implement this once InwardFileRepository is created
   */
  // async getStatistics(id: number) {
  //   const fileSource = await this.getById(id);
  //   const inwardFileStats = await this.inwardFileRepo.getSourceStatistics(id);
  //
  //   return {
  //     fileSource: {
  //       id: fileSource.id,
  //       name: fileSource.name,
  //       status: fileSource.status,
  //       lastSync: fileSource.last_sync,
  //       successRate: fileSource.success_rate,
  //     },
  //     files: inwardFileStats,
  //   };
  // }

  /**
   * Store credentials securely
   * In production, this should use AWS Secrets Manager or similar
   */
  private async storeCredentials(credentials: {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
  }): Promise<string> {
    // For now, return a placeholder UUID
    // TODO: Implement actual credential storage using AWS Secrets Manager or encrypted DB
    const uuid = crypto.randomUUID();
    console.log('TODO: Store credentials securely', uuid);
    return uuid;
  }
}
