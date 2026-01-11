/**
 * Database Configuration
 * Neon PostgreSQL connection
 */

import { neon } from '@neondatabase/serverless';

// Check NEON_DATABASE_URL first (preferred), then fallback to DATABASE_URL
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[DB] No database URL set - database features will be unavailable');
}

export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export function isDatabaseAvailable(): boolean {
  return sql !== null;
}
