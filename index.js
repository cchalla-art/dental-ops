import 'dotenv/config';
import { runQueries } from './src/runner.js';
import { logger } from './src/logger.js';

// ── Active queries ────────────────────────────────────────────────────────────
// Add or remove imports here to control what runs in each report.
// To add a new query: create a file in /queries/, import it below, add to the
// relevant array, and it will appear in the next Zoom notification.
// ─────────────────────────────────────────────────────────────────────────────

import testQuery             from './queries/00-test-query.js';
import preauthsPending        from './queries/01-preauths-pending.js';
import preauthLastChecked     from './queries/02-preauth-last-checked.js';
import preauthLastLog         from './queries/03-preauth-last-log.js';
import preauthReceivedNoAppt  from './queries/06-preauth-received-no-appt.js';

// "For later" — uncomment to enable:
// import seenYesterdayNoAppt from './queries/04-seen-yesterday-no-appt.js';
// import recallDueToday      from './queries/05-recall-due-today.js';

const REPORT_GROUPS = {
  test: {
    title: 'End-to-End Pipeline Test',
    queries: [testQuery],
  },
  preauths: {
    title: 'Pre-Authorization Report',
    // preauthReceivedNoAppt first — most actionable (need to call these patients)
    queries: [preauthReceivedNoAppt, preauthsPending, preauthLastChecked, preauthLastLog],
  },
  // Uncomment when ready:
  // followups: {
  //   title: 'Follow-Up Report',
  //   queries: [seenYesterdayNoAppt, recallDueToday],
  // },
  all: {
    title: 'Daily Dental Operations Report',
    queries: [preauthReceivedNoAppt, preauthsPending, preauthLastChecked, preauthLastLog],
  },
};

// ── Run ───────────────────────────────────────────────────────────────────────

const group = process.argv[2] || 'all';

if (!REPORT_GROUPS[group]) {
  console.error(`Unknown report group: "${group}". Available: ${Object.keys(REPORT_GROUPS).join(', ')}`);
  process.exit(1);
}

const { title, queries } = REPORT_GROUPS[group];

logger.prune(); // remove log files older than 30 days
logger.info(`Starting report: "${title}" (${queries.length} queries)`);
logger.info(`Logs folder: ${logger.dir}`);

runQueries(queries, title)
  .catch(err => {
    logger.error('Fatal error:', err.message, err.stack);
    process.exit(1);
  })
  .finally(() => process.exit(0));  // let Node exit naturally, pool closes with process
