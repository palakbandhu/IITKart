/**
 * Jest Setup File
 * Runs before all tests to configure global test environment
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Suppress console logs during tests (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests:
  // log: jest.fn(),
  // debug: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';

// Use the DATABASE_URL from .env, don't override it
// This allows tests to use the existing database configuration
// If you want separate test DB, set DATABASE_URL_TEST in .env or create .env.test

// Set timeout for all tests
jest.setTimeout(30000);
