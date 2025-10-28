import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const details = error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {} as Record<string, string>);

      return next(new ValidationError('Validation failed', details));
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * S3 File Source Creation Schema
 */
export const createS3FileSourceSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).required()
    .messages({
      'string.min': 'Name must be at least 3 characters',
      'string.max': 'Name must not exceed 255 characters',
      'any.required': 'Name is required',
    }),

  department: Joi.string().trim().min(2).max(100).required()
    .messages({
      'string.min': 'Department must be at least 2 characters',
      'any.required': 'Department is required',
    }),

  // AWS Credentials
  awsAccessKeyId: Joi.string().trim().required()
    .pattern(/^[A-Z0-9]{20}$/)
    .messages({
      'string.pattern.base': 'Invalid AWS Access Key ID format',
      'any.required': 'AWS Access Key ID is required',
    }),

  awsSecretAccessKey: Joi.string().trim().required()
    .min(40)
    .messages({
      'string.min': 'Invalid AWS Secret Access Key',
      'any.required': 'AWS Secret Access Key is required',
    }),

  // S3 Configuration
  bucketName: Joi.string().trim().required()
    .pattern(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/)
    .min(3).max(63)
    .messages({
      'string.pattern.base': 'Invalid S3 bucket name format',
      'any.required': 'Bucket name is required',
    }),

  bucketRegion: Joi.string().trim().required()
    .messages({
      'any.required': 'Bucket region is required',
    }),

  monitorPath: Joi.string().trim().required()
    .messages({
      'any.required': 'Monitor path is required',
    }),

  // Pattern Matching
  fileNamePattern: Joi.string().trim().required()
    .messages({
      'any.required': 'File name pattern is required',
    }),

  matchRule: Joi.string().valid('partial', 'exact', 'regex').required()
    .messages({
      'any.only': 'Match rule must be one of: partial, exact, regex',
      'any.required': 'Match rule is required',
    }),

  // Schedule
  schedule: Joi.string().trim().required()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .messages({
      'string.pattern.base': 'Schedule must be in HH:MM format (24-hour)',
      'any.required': 'Schedule is required',
    }),

  timezone: Joi.string().trim().required()
    .messages({
      'any.required': 'Timezone is required',
    }),

  // SLA
  slaThreshold: Joi.number().integer().min(1).max(10080).required()
    .messages({
      'number.min': 'SLA threshold must be at least 1 minute',
      'number.max': 'SLA threshold must not exceed 10080 minutes (1 week)',
      'any.required': 'SLA threshold is required',
    }),

  // Direction
  direction: Joi.string().valid('inward', 'outward', 'bidirectional').required()
    .messages({
      'any.only': 'Direction must be one of: inward, outward, bidirectional',
      'any.required': 'Direction is required',
    }),
});

/**
 * Test S3 Connection Schema
 */
export const testS3ConnectionSchema = Joi.object({
  awsAccessKeyId: Joi.string().trim().required(),
  awsSecretAccessKey: Joi.string().trim().required(),
  bucketName: Joi.string().trim().required(),
  bucketRegion: Joi.string().trim().required(),
  monitorPath: Joi.string().trim().required(),
});

/**
 * Update File Source Schema
 */
export const updateFileSourceSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255),
  enabled: Joi.boolean(),
  fileNamePattern: Joi.string().trim(),
  matchRule: Joi.string().valid('partial', 'exact', 'regex'),
  schedule: Joi.string().trim().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  timezone: Joi.string().trim(),
  slaThreshold: Joi.number().integer().min(1).max(10080),
  pollFrequencyMinutes: Joi.number().integer().min(1).max(1440),
}).min(1); // At least one field must be provided

/**
 * Pagination Query Schema
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  department: Joi.string().trim().optional(),
});
