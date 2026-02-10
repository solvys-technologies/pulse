/**
 * Database Configuration
 * Supports both Neon (cloud) and local PostgreSQL
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import pg from 'pg';

// Check NEON_DATABASE_URL first (preferred), then fallback to DATABASE_URL
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[DB] No database URL set - database features will be unavailable');
}

// Detect if this is a Neon URL (contains .neon.tech) or local
const isNeonUrl = DATABASE_URL?.includes('.neon.tech') || DATABASE_URL?.includes('neon.tech');

// For Neon, use the serverless driver. For local, use pg Pool.
let neonSql: NeonQueryFunction<false, false> | null = null;
let pgPool: pg.Pool | null = null;

if (DATABASE_URL) {
  if (isNeonUrl) {
    neonSql = neon(DATABASE_URL);
    console.log('[DB] Using Neon serverless driver');
  } else {
    pgPool = new pg.Pool({ connectionString: DATABASE_URL });
    console.log('[DB] Using pg Pool for local PostgreSQL');
  }
}

// Unified SQL function that works with both drivers
// Returns any[] to match Neon's behavior and allow type assertions
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<any[]> {
  if (neonSql) {
    const result = await neonSql(strings, ...values);
    return result as any[];
  }

  if (pgPool) {
    // Convert template literal to parameterized query
    let query = '';
    const params: unknown[] = [];
    strings.forEach((str, i) => {
      query += str;
      if (i < values.length) {
        params.push(values[i]);
        query += `$${params.length}`;
      }
    });

    const result = await pgPool.query(query, params);
    return result.rows;
  }

  throw new Error('Database not configured');
}

export function isDatabaseAvailable(): boolean {
  return neonSql !== null || pgPool !== null;
}
