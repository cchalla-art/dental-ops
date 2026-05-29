/**
 * Diagnostic: shows all ClaimStatus values in your DB for PreAuth claims.
 * Run: node test-preauth-status.js
 *
 * This tells us exactly what numbers OpenDental is storing so we can
 * map them to the correct labels.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

console.log('\n── PreAuth ClaimStatus values in your database ──────────────\n');

// 1. Show all distinct status values + count
const [statuses] = await conn.execute(`
  SELECT
    ClaimStatus,
    COUNT(*) AS Count
  FROM claim
  WHERE ClaimType = 'PreAuth'
  GROUP BY ClaimStatus
  ORDER BY ClaimStatus
`);

console.log('All PreAuth statuses found:');
console.table(statuses);

// 2. Show 5 sample claims that YOU say are "Sent" so we can see the real status
console.log('\nMost recent 10 PreAuth claims (any status) — last 30 days:');
const [recent] = await conn.execute(`
  SELECT
    c.ClaimNum,
    c.ClaimStatus,
    DATE_FORMAT(c.DateSent, '%m/%d/%Y') AS DateSent,
    DATE_FORMAT(c.SecDateEntry, '%m/%d/%Y %h:%i %p') AS EnteredOn,
    p.LName,
    p.FName
  FROM claim c
  JOIN patient p ON c.PatNum = p.PatNum
  WHERE c.ClaimType = 'PreAuth'
    AND c.SecDateEntry >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  ORDER BY c.SecDateEntry DESC
  LIMIT 10
`);

console.table(recent);

await conn.end();

console.log('\nLook at the ClaimStatus column above.');
console.log('Find a claim you KNOW is "Sent" in OpenDental and note its ClaimStatus number.');
console.log('Share the output and I will fix the status labels.\n');
