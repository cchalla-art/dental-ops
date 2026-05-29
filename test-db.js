/**
 * OpenDental MySQL connection test.
 * Usage:  node test-db.js
 *
 * Requires in .env:
 *   DB_HOST=localhost
 *   DB_PORT=3306
 *   DB_USER=your_user
 *   DB_PASSWORD=your_password
 *   DB_NAME=opendental
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Check all required fields are set
const missing = ['DB_HOST','DB_PORT','DB_USER','DB_PASSWORD','DB_NAME']
  .filter(k => !process.env[k]);

if (missing.length) {
  console.error('❌  Missing required .env values:', missing.join(', '));
  process.exit(1);
}

console.log('🔌  Connecting to OpenDental database...');
console.log(`    Host:     ${DB_HOST}:${DB_PORT}`);
console.log(`    Database: ${DB_NAME}`);
console.log(`    User:     ${DB_USER}\n`);

let conn;
try {
  conn = await mysql.createConnection({
    host:     DB_HOST,
    port:     Number(DB_PORT),
    user:     DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectTimeout: 10_000,
  });

  console.log('✅  Connected!\n');

  // 1. Basic ping
  await conn.ping();
  console.log('  ✓  Ping OK');

  // 2. Check OpenDental version
  const [[ver]] = await conn.execute(
    `SELECT ValueString AS version FROM preference WHERE PrefName = 'ProgramVersion' LIMIT 1`
  );
  console.log(`  ✓  OpenDental version: ${ver?.version ?? 'unknown'}`);

  // 3. Patient count
  const [[pts]] = await conn.execute(
    `SELECT COUNT(*) AS total FROM patient WHERE PatStatus = 0`
  );
  console.log(`  ✓  Active patients: ${pts.total.toLocaleString()}`);

  // 4. Check pre-auth table access
  const [[claims]] = await conn.execute(
    `SELECT COUNT(*) AS total FROM claim WHERE ClaimType = 'PreAuth'`
  );
  console.log(`  ✓  Pre-auth claims found: ${claims.total.toLocaleString()}`);

  // 5. Today's appointments
  const [[appts]] = await conn.execute(
    `SELECT COUNT(*) AS total FROM appointment
     WHERE DATE(AptDateTime) = CURDATE() AND AptStatus NOT IN (5,6)`
  );
  console.log(`  ✓  Today's appointments: ${appts.total.toLocaleString()}`);

  console.log('\n🎉  All checks passed — database is ready!');

} catch (err) {
  console.error('❌  Connection failed:', err.message);
  console.error('\n    Things to check:');
  console.error('    1. Is OpenDental running on this machine?');
  console.error('    2. Is MySQL running? (check Windows Services for "MySQL")');
  console.error('    3. Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
  console.error('    4. Make sure the DB user has SELECT permissions on the opendental database');
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
