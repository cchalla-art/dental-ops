/**
 * Local dashboard server.
 * Usage:  node server.js
 * Open:   http://localhost:3001
 */

import 'dotenv/config';
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, closeDb } from './src/db.js';
import { logger } from './src/logger.js';

import testQuery          from './queries/00-test-query.js';
import preauthsPending    from './queries/01-preauths-pending.js';
import preauthLastChecked from './queries/02-preauth-last-checked.js';
import preauthLastLog     from './queries/03-preauth-last-log.js';

const PORT = process.env.PORT || 3001;
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const GROUPS = {
  test:     { title: 'Pipeline Test',            queries: [testQuery] },
  preauths: { title: 'Pre-Authorization Report',  queries: [preauthsPending, preauthLastChecked, preauthLastLog] },
  all:      { title: 'All Reports',               queries: [testQuery, preauthsPending, preauthLastChecked, preauthLastLog] },
};

// ── Report persistence ────────────────────────────────────────────────────────

function saveReport(groupKey, data) {
  // Filename sortable by time: preauths_2026-05-30T08-00-00.json
  const ts = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const filename = `${groupKey}_${ts}.json`;
  fs.writeFileSync(path.join(REPORTS_DIR, filename), JSON.stringify(data));
  return filename;
}

function listReports(groupKey, limit = 25) {
  try {
    return fs.readdirSync(REPORTS_DIR)
      .filter(f => f.startsWith(`${groupKey}_`) && f.endsWith('.json'))
      .sort().reverse()          // newest first (ISO strings sort lexicographically)
      .slice(0, limit);
  } catch { return []; }
}

function loadReport(filename) {
  return JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, filename), 'utf8'));
}

// ── Run queries ───────────────────────────────────────────────────────────────

async function runGroup(groupKey) {
  const group = GROUPS[groupKey];
  const db    = getDb();
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  const results = [];
  for (const q of group.queries) {
    const query = q.default ?? q;
    try {
      const sql = query.sql
        .replace(/:today/g,     `'${today}'`)
        .replace(/:yesterday/g, `'${yesterday}'`);
      const [rows] = await db.execute(sql);
      results.push({ name: query.name, rows, error: null });
    } catch (err) {
      logger.error(`Query "${query.name}" failed:`, err.message);
      results.push({ name: query.name, rows: [], error: err.message });
    }
  }
  return {
    title:  group.title,
    results,
    ranAt:  new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }),
  };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function escHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(title)} — Dental Ops</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f0f4f8; color: #1a202c; min-height: 100vh; }
    header { background: #1a56db; color: white; padding: 16px 32px;
             display: flex; align-items: center; gap: 12px; }
    header h1 { font-size: 1.2rem; font-weight: 600; }
    header span { font-size: 1.5rem; }
    .container { max-width: 960px; margin: 32px auto; padding: 0 16px; }
    .card { background: white; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,.1);
            padding: 24px; margin-bottom: 20px; }
    .card h2 { font-size: 1rem; font-weight: 600; color: #4a5568; margin-bottom: 16px;
               text-transform: uppercase; letter-spacing: .05em; }
    .btn-group { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 10px 22px; border-radius: 6px; font-size: .9rem;
           font-weight: 500; text-decoration: none; cursor: pointer; border: none;
           transition: background .15s; }
    .btn-primary   { background: #1a56db; color: white; }
    .btn-primary:hover { background: #1e40af; }
    .btn-secondary { background: #e2e8f0; color: #2d3748; }
    .btn-secondary:hover { background: #cbd5e0; }
    .btn-green  { background: #38a169; color: white; }
    .btn-green:hover  { background: #276749; }
    .result-block { border-left: 4px solid #1a56db; padding: 14px 18px;
                    background: #f7fafc; border-radius: 0 8px 8px 0; margin-bottom: 14px; }
    .result-block.error { border-left-color: #e53e3e; background: #fff5f5; }
    .result-block h3 { font-size: .85rem; font-weight: 700; color: #2b6cb0;
                       margin-bottom: 8px; text-transform: uppercase; }
    .result-block.error h3 { color: #c53030; }
    .result-block p { font-size: .9rem; line-height: 1.7; color: #2d3748; }
    .meta { font-size: .8rem; color: #718096; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px;
             font-size: .75rem; font-weight: 600; margin-left: 8px; }
    .badge-ok  { background: #c6f6d5; color: #276749; }
    .badge-err { background: #fed7d7; color: #9b2c2c; }
    .data-table { width: 100%; border-collapse: collapse; font-size: .82rem; margin-top: 12px; }
    .data-table th { background: #edf2f7; text-align: left; padding: 6px 10px;
                     font-weight: 600; color: #4a5568; white-space: nowrap; border-bottom: 2px solid #cbd5e0; }
    .data-table td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748; vertical-align: top; }
    .data-table tr:hover td { background: #ebf8ff; }
    details { margin-top: 8px; }
    details summary { cursor: pointer; display: inline-block; padding: 5px 14px;
                      font-size: .82rem; font-weight: 500; border-radius: 5px;
                      background: #e2e8f0; color: #2d3748; list-style: none;
                      user-select: none; margin-bottom: 6px; }
    details summary::-webkit-details-marker { display: none; }
    details summary:hover  { background: #cbd5e0; }
    details[open] summary  { background: #cbd5e0; }
    .details-table { margin-top: 0; }
    .card-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; align-items: center; }
    .btn-xs { padding: 5px 14px; font-size: .82rem; border-radius: 5px; border: none;
              cursor: pointer; font-weight: 500; transition: all .15s; }
    .btn-copy { background: #ebf8ff; color: #2b6cb0; border: 1px solid #bee3f8; }
    .btn-copy:hover { background: #bee3f8; }
    /* History list */
    .hist-row { display: flex; align-items: center; justify-content: space-between;
                padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .hist-row:last-child { border-bottom: none; }
    .hist-time { font-weight: 500; color: #2d3748; }
    .hist-meta { font-size: .78rem; color: #a0aec0; margin-top: 2px; }
    /* Copy modal */
    #copy-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5);
                  z-index:9999; align-items:center; justify-content:center; }
    #copy-modal.open { display:flex; }
    #copy-box { background:white; border-radius:10px; padding:20px; width:90%; max-width:700px; }
    #copy-box h4 { margin-bottom:10px; color:#2d3748; }
    #copy-box textarea { width:100%; height:280px; font-family:monospace; font-size:.8rem;
                         border:1px solid #cbd5e0; border-radius:6px; padding:8px; resize:vertical; }
    #copy-box .actions { display:flex; gap:8px; margin-top:10px; justify-content:flex-end; }
  </style>
</head>
<body>
  <header>
    <a href="/" style="display:flex;align-items:center;gap:12px;text-decoration:none;color:white">
      <span>🦷</span>
      <h1>Dental Ops — Local Dashboard</h1>
    </a>
  </header>
  <div class="container">${body}</div>

  <!-- Copy modal -->
  <div id="copy-modal">
    <div id="copy-box">
      <h4>📋 Copy data — select all then Ctrl+C</h4>
      <textarea id="copy-text" readonly></textarea>
      <div class="actions">
        <button class="btn btn-secondary" onclick="document.getElementById('copy-modal').classList.remove('open')">Close</button>
        <button class="btn btn-primary"   onclick="document.getElementById('copy-text').select()">Select All</button>
      </div>
    </div>
  </div>

  <script>
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('btn-copy')) {
        var block  = e.target.closest('.result-block');
        var source = block && block.querySelector('.tsv-data');
        var text   = source ? source.value : '';
        var modal  = document.getElementById('copy-modal');
        var ta     = document.getElementById('copy-text');
        ta.value   = text;
        modal.classList.add('open');
        setTimeout(function() { ta.focus(); ta.select(); }, 50);
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function(){});
        return;
      }
      if (e.target.id === 'copy-modal') e.target.classList.remove('open');
    });
  </script>
</body>
</html>`;
}

// ── Shared result-block renderer (used by both live run and saved view) ───────

function renderResultBlocks(results, runDate) {
  return results.map(r => {
    const isErr = !!r.error;
    const cls   = isErr ? 'result-block error' : 'result-block';
    const badge = isErr
      ? `<span class="badge badge-err">ERROR</span>`
      : `<span class="badge badge-ok">${r.rows.length} row${r.rows.length !== 1 ? 's' : ''}</span>`;

    let content;
    if (isErr) {
      content = `<p style="color:#c53030">${escHtml(r.error)}</p>`;
    } else if (!r.rows || r.rows.length === 0) {
      content = `<p style="color:#718096;font-size:.9rem">No results.</p>`;
    } else {
      const cols  = Object.keys(r.rows[0]).filter(k => !k.endsWith('Raw') && k !== 'LastAdded');
      const thead = `<tr>${cols.map(c => `<th>${escHtml(c)}</th>`).join('')}</tr>`;

      const makeRow = row => {
        const cells = cols.map(c => {
          const raw = row[c] ?? '';
          if (String(c).toLowerCase().includes('phone') && raw) {
            return `<td><a href="tel:${escHtml(raw)}" style="color:#2b6cb0">${escHtml(raw)}</a></td>`;
          }
          return `<td>${escHtml(raw)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      };

      const firstRows = r.rows.slice(0, 10).map(makeRow).join('');
      const extraRows = r.rows.slice(10).map(makeRow).join('');
      const extra     = r.rows.length - 10;

      const detailsHtml = extra > 0 ? `
        <details>
          <summary>▼ Show ${extra} more row${extra !== 1 ? 's' : ''}</summary>
          <table class="data-table details-table">
            <thead>${thead}</thead>
            <tbody>${extraRows}</tbody>
          </table>
        </details>` : '';

      // Pre-build TSV (tab-separated) for copy — embedded server-side so JS just reads .value
      const tsv = [
        cols.join('\t'),
        ...r.rows.map(row => cols.map(c => row[c] ?? '').join('\t')),
      ].join('\n');

      content = `
        <table class="data-table"><thead>${thead}</thead><tbody>${firstRows}</tbody></table>
        ${detailsHtml}
        <div class="card-actions">
          <button class="btn-xs btn-copy">📋 Copy all (${r.rows.length} rows)</button>
        </div>
        <textarea class="tsv-data" readonly
          style="position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;left:-9999px"
          >${escHtml(tsv)}</textarea>`;
    }

    return `<div class="${cls}">
      <h3>${escHtml(r.name)}${badge}
        <span style="font-size:.75rem;font-weight:400;color:#718096;margin-left:10px">🕒 ${escHtml(runDate)}</span>
      </h3>
      ${content}
    </div>`;
  }).join('');
}

// ── Request handler ───────────────────────────────────────────────────────────

const NC = { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' };   // no-cache headers

const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── Home ──────────────────────────────────────────────────────────────────
  if (pathname === '/') {
    const cards = Object.entries(GROUPS).map(([key, g]) => {
      const saved = listReports(key);
      const savedNote = saved.length
        ? `<span style="font-size:.75rem;color:#a0aec0;margin-left:10px">${saved.length} saved run${saved.length !== 1 ? 's' : ''}</span>`
        : `<span style="font-size:.75rem;color:#a0aec0;margin-left:10px">No runs yet</span>`;

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:14px 0;border-bottom:1px solid #e2e8f0;">
          <div>
            <a href="/history/${key}"
               style="font-weight:600;color:#1a56db;text-decoration:none;font-size:1rem"
               >${escHtml(g.title)}</a>
            <span style="color:#718096;font-size:.85rem;margin-left:8px">
              ${g.queries.length} quer${g.queries.length === 1 ? 'y' : 'ies'}
            </span>
            ${savedNote}
          </div>
          <div class="btn-group">
            <a class="btn btn-secondary" href="/run/${key}">▶ Run</a>
            <a class="btn btn-green"     href="/run/${key}?zoom=1">▶ Run + Zoom</a>
          </div>
        </div>`;
    }).join('');

    const body = `
      <div class="card">
        <h2>Report Groups</h2>
        <p style="font-size:.82rem;color:#718096;margin-bottom:12px">
          Click a report name to browse saved runs, or ▶ Run to generate a fresh one.
        </p>
        ${cards}
      </div>
      <div class="card">
        <h2>Quick Links</h2>
        <div class="btn-group">
          <a class="btn btn-primary" href="/run/all">▶ Run All Reports</a>
          <a class="btn btn-green"   href="/run/all?zoom=1">▶ Run All + Post to Zoom</a>
        </div>
      </div>`;

    res.writeHead(200, NC);
    res.end(page('Dashboard', body));
    return;
  }

  // ── History: /history/:group ──────────────────────────────────────────────
  const histMatch = pathname.match(/^\/history\/(\w+)$/);
  if (histMatch) {
    const groupKey = histMatch[1];
    const group    = GROUPS[groupKey];
    if (!group) {
      res.writeHead(404, NC);
      res.end(page('Not Found', '<div class="card"><p>Unknown report group.</p></div>'));
      return;
    }

    const files = listReports(groupKey);

    const rows = files.map(filename => {
      // Try to read ranAt from JSON; fall back to parsing filename timestamp
      let ranAt = filename;
      let zoom  = '';
      try {
        const d = loadReport(filename);
        ranAt   = d.ranAt || ranAt;
        zoom    = d.zoomStatus === 'success'
          ? `<span style="font-size:.75rem;color:#276749;margin-left:8px">✅ Zoom posted</span>`
          : '';
      } catch {}

      return `
        <div class="hist-row">
          <div>
            <div class="hist-time">${escHtml(ranAt)}${zoom}</div>
            <div class="hist-meta">${escHtml(filename)}</div>
          </div>
          <a class="btn btn-secondary" href="/view/${encodeURIComponent(filename)}"
             style="font-size:.82rem;padding:6px 16px;white-space:nowrap">View →</a>
        </div>`;
    }).join('');

    const emptyMsg = `<p style="color:#718096;padding:12px 0">
      No saved reports yet. Click <strong>Run</strong> to generate the first one.
    </p>`;

    const body = `
      <div class="card">
        <h2>${escHtml(group.title)} — Run History</h2>
        ${files.length ? rows : emptyMsg}
      </div>
      <div class="btn-group">
        <a class="btn btn-secondary" href="/">← Home</a>
        <a class="btn btn-primary"   href="/run/${groupKey}">▶ Run Now</a>
        <a class="btn btn-green"     href="/run/${groupKey}?zoom=1">▶ Run + Zoom</a>
      </div>`;

    res.writeHead(200, NC);
    res.end(page(`History — ${group.title}`, body));
    return;
  }

  // ── View saved report: /view/:filename ───────────────────────────────────
  const viewMatch = pathname.match(/^\/view\/([^/]+\.json)$/);
  if (viewMatch) {
    const filename = decodeURIComponent(viewMatch[1]);
    // Safety: only allow simple filenames, no path traversal
    if (filename.includes('/') || filename.includes('..')) {
      res.writeHead(400, NC); res.end('Bad request'); return;
    }
    try {
      const data     = loadReport(filename);
      const groupKey = filename.split('_')[0];

      const zoomBanner = data.zoomStatus === 'success'
        ? `<div style="background:#c6f6d5;color:#276749;padding:10px 16px;border-radius:8px;margin-bottom:16px">✅ Zoom posted at time of run.</div>`
        : '';

      const body = `
        <div class="card">
          <h2>${escHtml(data.title)}</h2>
          <p class="meta">Saved run — ${escHtml(data.ranAt)}</p>
          ${zoomBanner}
          ${renderResultBlocks(data.results, data.ranAt)}
          <div class="btn-group" style="margin-top:16px">
            <a class="btn btn-secondary" href="/history/${groupKey}">← History</a>
            <a class="btn btn-secondary" href="/">🏠 Home</a>
            <a class="btn btn-primary"   href="/run/${groupKey}">▶ Run Again</a>
            <a class="btn btn-green"     href="/run/${groupKey}?zoom=1">▶ Run + Zoom</a>
          </div>
        </div>`;

      res.writeHead(200, NC);
      res.end(page(data.title, body));
    } catch (err) {
      res.writeHead(404, NC);
      res.end(page('Not Found', `
        <div class="card">
          <p style="color:#c53030">Could not load report: ${escHtml(err.message)}</p>
          <a class="btn btn-secondary" href="/" style="margin-top:16px;display:inline-block">← Home</a>
        </div>`));
    }
    return;
  }

  // ── Run: /run/:group  [?zoom=1] ──────────────────────────────────────────
  const runMatch = pathname.match(/^\/run\/(\w+)$/);
  if (runMatch) {
    const groupKey  = runMatch[1];
    const postZoom  = url.searchParams.get('zoom') === '1';

    if (!GROUPS[groupKey]) {
      res.writeHead(404, NC);
      res.end(page('Not Found', '<div class="card"><p>Unknown report group.</p></div>'));
      return;
    }

    try {
      const { title, results, ranAt } = await runGroup(groupKey);

      let zoomStatus = null;
      if (postZoom) {
        try {
          const { runQueries } = await import('./src/runner.js');
          await runQueries(GROUPS[groupKey].queries);
          zoomStatus = 'success';
        } catch (err) {
          zoomStatus = err.message;
        }
      }

      // Persist to disk
      const savedFilename = saveReport(groupKey, { title, results, ranAt, zoomStatus });
      logger.info(`Report saved: ${savedFilename}`);

      const zoomBanner = zoomStatus === null ? '' :
        zoomStatus === 'success'
          ? `<div style="background:#c6f6d5;color:#276749;padding:10px 16px;border-radius:8px;margin-bottom:16px">✅ Posted to Zoom successfully.</div>`
          : `<div style="background:#fed7d7;color:#9b2c2c;padding:10px 16px;border-radius:8px;margin-bottom:16px">❌ Zoom error: ${escHtml(zoomStatus)}</div>`;

      const body = `
        <div class="card">
          <h2>${escHtml(title)}</h2>
          <p class="meta">Run at: ${escHtml(ranAt)}</p>
          ${zoomBanner}
          ${renderResultBlocks(results, ranAt)}
          <div class="btn-group" style="margin-top:16px">
            <a class="btn btn-secondary" href="/history/${groupKey}">📋 History</a>
            <a class="btn btn-secondary" href="/">🏠 Home</a>
            <a class="btn btn-primary"   href="/run/${groupKey}">↻ Re-run</a>
            <a class="btn btn-green"     href="/run/${groupKey}?zoom=1">↻ Re-run + Zoom</a>
          </div>
        </div>`;

      res.writeHead(200, NC);
      res.end(page(title, body));
    } catch (err) {
      res.writeHead(500, NC);
      res.end(page('Error', `
        <div class="card">
          <p style="color:red">${escHtml(err.message)}</p>
          <a class="btn btn-secondary" style="margin-top:16px;display:inline-block" href="/">← Back</a>
        </div>`));
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  logger.info(`Dashboard running at http://localhost:${PORT}`);
  console.log(`\n🦷  Dental Ops Dashboard`);
  console.log(`    Open: http://localhost:${PORT}\n`);
});

process.on('SIGINT', async () => {
  await closeDb();
  server.close();
  process.exit(0);
});
