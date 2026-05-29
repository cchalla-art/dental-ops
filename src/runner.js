import { getDb } from './db.js';
import { postToZoom, header } from './zoom.js';
import { logger } from './logger.js';

/**
 * Run an array of query modules and post each result to Zoom.
 * Each query module must export default: { name, description, sql, format(rows) }
 * SQL may use :today and :yesterday as named placeholders — they are injected automatically.
 */
export async function runQueries(queryModules, reportTitle = 'Daily Report') {
  const db = await getDb();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const params = { today, yesterday };

  const sections = [header(reportTitle)];

  for (const mod of queryModules) {
    const q = mod.default ?? mod;
    try {
      logger.info(`Running query: ${q.name}`);
      const sql = interpolate(q.sql, params);
      const [rows] = await db.execute(sql);
      logger.info(`  → ${rows.length} row(s) returned`);
      sections.push(q.format(rows, { today, yesterday }));
    } catch (err) {
      logger.error(`Query "${q.name}" failed:`, err.message);
      sections.push(`⚠️ *${q.name}* — query error: ${err.message}`);
    }
  }

  const message = sections.join('\n\n');
  await postToZoom(message);
  console.log('Posted to Zoom.');
}

// Replace :today / :yesterday with actual date strings
function interpolate(sql, params) {
  return sql
    .replace(/:today/g, `'${params.today}'`)
    .replace(/:yesterday/g, `'${params.yesterday}'`);
}
