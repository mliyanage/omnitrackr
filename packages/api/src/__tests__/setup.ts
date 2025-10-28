/**
 * Jest Test Setup
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_NAME = 'omnitrackr_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = '93W4tQcwoKaKi9c4dWKh';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Set longer timeout for database operations
jest.setTimeout(10000);
