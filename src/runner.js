import { getDb } from './db.js';
import { postFields } from './zoom.js';
import { logger } from './logger.js';

/**
 * Run an array of query modules and post each result as a single Zoom fields card.
 * Each query module must export default: { name, sql, format(rows, params) → object }
 * SQL may use :today and :yesterday as named placeholders.
 */
export async function runQueries(queryModules) {
  const db = await getDb();

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const params    = { today, yesterday };

  for (const mod of queryModules) {
    const q = mod.default ?? mod;
    try {
      logger.info(`Running query: ${q.name}`);
      const sql  = interpolate(q.sql, params);
      const [rows] = await db.execute(sql);
      logger.info(`  → ${rows.length} row(s) returned`);

      const fields = q.format(rows, params);
      await postFields(fields);

    } catch (err) {
      logger.error(`Query "${q.name}" failed:`, err.message);
      await postFields({ [`⚠️ ${q.name}`]: `Error: ${err.message}` });
    }
  }

  logger.info('All queries posted to Zoom.');
}

function interpolate(sql, params) {
  return sql
    .replace(/:today/g,     `'${params.today}'`)
    .replace(/:yesterday/g, `'${params.yesterday}'`);
}
