import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AuditLogRepository } from '@omnitrackr/shared';
import { db } from '../config/database';

/**
 * Audit Log Middleware
 * Automatically logs CRUD operations (create, update, delete)
 * Skips GET requests (read operations)
 */
export const auditLog = () => {
  const auditLogRepo = new AuditLogRepository(db);

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip GET requests - we don't audit read operations
    if (req.method === 'GET') {
      return next();
    }

    // Get authenticated user
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    // Skip if no authenticated user (shouldn't happen on protected routes)
    if (!user) {
      return next();
    }

    // Store original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Capture response body
    let responseBody: any;

    // Override send function
    res.send = function (data: any): Response {
      responseBody = data;
      return originalSend.call(this, data);
    };

    // Override json function
    res.json = function (data: any): Response {
      responseBody = data;
      return originalJson.call(this, data);
    };

    // Store original end function
    const originalEnd = res.end;

    // Override end function to log after response is sent
    res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log asynchronously to not block response
        setImmediate(async () => {
          try {
            await logAuditEntry(
              req,
              user,
              responseBody,
              auditLogRepo
            );
          } catch (error) {
            // Don't break the request if audit logging fails
            console.error('Failed to log audit entry:', error);
          }
        });
      }

      // Call original end
      return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  };
};

/**
 * Log audit entry based on request method and route
 */
async function logAuditEntry(
  req: Request,
  user: AuthenticatedRequest['user'],
  responseBody: any,
  auditLogRepo: AuditLogRepository
): Promise<void> {
  // Determine action based on HTTP method
  let action: 'create' | 'update' | 'delete' | 'read';
  switch (req.method) {
    case 'POST':
      action = 'create';
      break;
    case 'PUT':
    case 'PATCH':
      action = 'update';
      break;
    case 'DELETE':
      action = 'delete';
      break;
    default:
      return; // Skip other methods
  }

  // Extract resource information from path and response
  const { resourceType, resourceId } = extractResourceInfo(req, responseBody);

  // Skip if we couldn't determine resource info
  if (!resourceType || !resourceId) {
    return;
  }

  // Prepare changes object (for updates)
  let changes: any = undefined;
  if (action === 'update' && req.body) {
    changes = {
      new: req.body,
      // Note: We don't have the old values here. For complete audit trails,
      // services should explicitly call audit logging with old/new values
    };
  }

  // Prepare metadata
  const metadata = {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    requestBody: sanitizeRequestBody(req.body),
  };

  // Get IP address
  const ipAddress = getClientIp(req);

  // Log the audit entry
  await auditLogRepo.log({
    user_id: user.id,
    organization_id: user.organizationId || undefined,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes,
    metadata,
    ip_address: ipAddress,
    user_agent: req.headers['user-agent'],
    request_id: (req as any).id, // If request ID middleware is used
  });
}

/**
 * Extract resource type and ID from request path and response
 */
function extractResourceInfo(
  req: Request,
  responseBody: any
): { resourceType: string | null; resourceId: string | null } {
  // Parse path to extract resource type
  // Format: /api/{resource-type}/{id} or /api/{resource-type}
  const pathParts = req.path.split('/').filter(p => p);

  // Skip 'api' prefix
  if (pathParts[0] === 'api') {
    pathParts.shift();
  }

  if (pathParts.length === 0) {
    return { resourceType: null, resourceId: null };
  }

  // First part is resource type (convert to singular)
  let resourceType = pathParts[0];

  // Convert plural to singular for consistency
  const pluralToSingular: Record<string, string> = {
    'users': 'user',
    'organizations': 'organization',
    'departments': 'department',
    'watchers': 'watcher',
    'schedules': 'schedule',
    'file-sources': 'file_source',
    'source-connections': 'source_connection',
    'file-tracking': 'file_tracking',
  };

  resourceType = pluralToSingular[resourceType] || resourceType;

  // Try to get ID from path (for PUT, PATCH, DELETE)
  let resourceId: string | null = null;

  if (pathParts.length > 1) {
    // Check if second part is a number or UUID
    const potentialId = pathParts[1];
    if (/^\d+$/.test(potentialId) || /^[0-9a-f-]{36}$/i.test(potentialId)) {
      resourceId = potentialId;
    }
  }

  // For POST (create), try to get ID from response
  if (!resourceId && req.method === 'POST' && responseBody) {
    try {
      const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;

      // Check common response structures
      if (parsed?.data?.id) {
        resourceId = String(parsed.data.id);
      } else if (parsed?.id) {
        resourceId = String(parsed.id);
      }
    } catch (error) {
      // Ignore JSON parse errors
    }
  }

  return { resourceType, resourceId };
}

/**
 * Sanitize request body to remove sensitive fields
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'password_hash',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'accessToken',
    'secret',
    'two_fa_secret',
    'backup_codes',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string | undefined {
  // Check X-Forwarded-For header (set by proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  // Fall back to req.ip or socket address
  return req.ip || req.socket.remoteAddress;
}
