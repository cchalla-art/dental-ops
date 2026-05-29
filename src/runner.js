import { getDb } from './db.js';
import { postMessage, postFields, today } from './zoom.js';
import { logger } from './logger.js';

/**
 * Run an array of query modules and post each result to Zoom.
 *
 * Each query module must export default:
 *   { name, sql, format(rows, params) → object { "Label": "Value", ... } }
 *
 * SQL may use :today and :yesterday as placeholders — injected automatically.
 */
export async function runQueries(queryModules, reportTitle = 'Daily Report') {
  const db = await getDb();

  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const params = { today: todayStr, yesterday: yesterdayStr };

  // Post report header
  await postMessage(`📋 ${reportTitle} — ${today()}`);

  for (const mod of queryModules) {
    const q = mod.default ?? mod;
    try {
      logger.info(`Running query: ${q.name}`);
      const sql = interpolate(q.sql, params);
      const [rows] = await db.execute(sql);
      logger.info(`  → ${rows.length} row(s) returned`);

      const fields = q.format(rows, params);

      // format() should return a plain object { label: value }
      // If it returns a string (legacy), wrap it
      if (typeof fields === 'string') {
        await postFields({ [q.name]: fields });
      } else {
        await postMessage(`— ${q.name} —`);
        await postFields(fields);
      }

    } catch (err) {
      logger.error(`Query "${q.name}" failed:`, err.message);
      await postFields({ [`⚠️ ${q.name}`]: `Error: ${err.message}` });
    }
  }

  logger.info('All queries posted to Zoom.');
}

// Replace :today / :yesterday with actual date strings
function interpolate(sql, params) {
  return sql
    .replace(/:today/g,     `'${params.today}'`)
    .replace(/:yesterday/g, `'${params.yesterday}'`);
}
