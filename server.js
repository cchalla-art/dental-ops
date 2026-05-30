/**
 * Local dashboard server.
 * Usage:  node server.js
 * Open:   http://localhost:3001
 */

import 'dotenv/config';
import http from 'http';
import { getDb, closeDb } from './src/db.js';
import { logger } from './src/logger.js';

import testQuery          from './queries/00-test-query.js';
import preauthsPending    from './queries/01-preauths-pending.js';
import preauthLastChecked from './queries/02-preauth-last-checked.js';
import preauthLastLog     from './queries/03-preauth-last-log.js';

const PORT = process.env.PORT || 3001;

const GROUPS = {
  test:     { title: 'Pipeline Test',          queries: [testQuery] },
  preauths: { title: 'Pre-Authorization Report', queries: [preauthsPending, preauthLastChecked, preauthLastLog] },
  all:      { title: 'All Reports',             queries: [testQuery, preauthsPending, preauthLastChecked, preauthLastLog] },
};

// ── Run queries and return structured results ─────────────────────────────────

async function runGroup(groupKey) {
  const group = GROUPS[groupKey];
  const db = getDb();   // pool — no await needed
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
      results.push({ name: query.name, rows, formatted: query.format(rows, { today, yesterday }), error: null  });
    } catch (err) {
      logger.error(`Query "${query.name}" failed:`, err.message);
      results.push({ name: query.name, rows: [], formatted: null, error: err.message });
    }
  }
  return { title: group.title, results, ranAt: new Date().toLocaleString() };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function formatText(text) {
  // Convert *bold* and newlines to HTML
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Dental Ops</title>
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
    .btn-primary { background: #1a56db; color: white; }
    .btn-primary:hover { background: #1e40af; }
    .btn-secondary { background: #e2e8f0; color: #2d3748; }
    .btn-secondary:hover { background: #cbd5e0; }
    .btn-green { background: #38a169; color: white; }
    .btn-green:hover { background: #276749; }
    .result-block { border-left: 4px solid #1a56db; padding: 14px 18px;
                    background: #f7fafc; border-radius: 0 8px 8px 0; margin-bottom: 14px; }
    .result-block.error { border-left-color: #e53e3e; background: #fff5f5; }
    .result-block h3 { font-size: .85rem; font-weight: 700; color: #2b6cb0;
                       margin-bottom: 8px; text-transform: uppercase; }
    .result-block.error h3 { color: #c53030; }
    .result-block p { font-size: .9rem; line-height: 1.7; color: #2d3748; }
    .meta { font-size: .8rem; color: #718096; margin-bottom: 20px; }
    .spinner { display: none; }
    form { display: inline; }
    .ran-at { font-size: .8rem; color: #718096; margin-top: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px;
             font-size: .75rem; font-weight: 600; margin-left: 8px; }
    .badge-ok  { background: #c6f6d5; color: #276749; }
    .badge-err { background: #fed7d7; color: #9b2c2c; }
    .data-table { width: 100%; border-collapse: collapse; font-size: .82rem; margin-top: 12px; }
    .data-table th { background: #edf2f7; text-align: left; padding: 6px 10px;
                     font-weight: 600; color: #4a5568; white-space: nowrap; border-bottom: 2px solid #cbd5e0; }
    .data-table td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; color: #2d3748; vertical-align: top; }
    .data-table tr:hover td { background: #ebf8ff; }
    .extra-row { display: none; }
    .rows-expanded .extra-row { display: table-row; }
    .card-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .btn-xs { padding: 5px 14px; font-size: .82rem; border-radius: 5px; border: none;
              cursor: pointer; font-weight: 500; transition: all .15s; }
    .btn-expand { background: #e2e8f0; color: #2d3748; }
    .btn-expand:hover { background: #cbd5e0; }
    .btn-copy   { background: #ebf8ff; color: #2b6cb0; border: 1px solid #bee3f8; }
    .btn-copy:hover { background: #bee3f8; }
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
  <script>
    function toggleRows(btn) {
      var block = btn.closest('.result-block');
      var expanded = block.classList.toggle('rows-expanded');
      btn.textContent = expanded
        ? '▲ Show less'
        : '▼ Show ' + btn.getAttribute('data-count') + ' more';
    }
    function flash(btn, orig) {
      btn.textContent = '✓ Copied!';
      btn.style.background = '#c6f6d5';
      btn.style.color = '#276749';
      setTimeout(function() {
        btn.textContent = orig;
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    }
    function copyCard(btn) {
      var orig = btn.textContent;
      var block = btn.closest('.result-block');
      var trs = block.querySelectorAll('.data-table tr');
      var lines = [];
      for (var i = 0; i < trs.length; i++) {
        var cells = trs[i].querySelectorAll('th, td');
        var row = [];
        for (var j = 0; j < cells.length; j++) {
          row.push(cells[j].innerText.trim());
        }
        lines.push(row.join('\t'));
      }
      var text = lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { flash(btn, orig); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); flash(btn, orig); } catch(e) {}
        document.body.removeChild(ta);
      }
    }
  </script>
</body>
</html>`;
}

// ── Request handler ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // Home page
  if (path === '/') {
    const cards = Object.entries(GROUPS).map(([key, g]) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
        <div>
          <strong>${g.title}</strong>
          <span style="color:#718096; font-size:.85rem; margin-left:8px">${g.queries.length} quer${g.queries.length === 1 ? 'y' : 'ies'}</span>
        </div>
        <div class="btn-group">
          <a class="btn btn-secondary" href="/run/${key}">▶ Run</a>
          <a class="btn btn-green"     href="/run/${key}?zoom=1">▶ Run + Zoom</a>
        </div>
      </div>`).join('');

    const body = `
      <div class="card">
        <h2>Report Groups</h2>
        ${cards}
      </div>
      <div class="card">
        <h2>Quick Links</h2>
        <div class="btn-group">
          <a class="btn btn-primary" href="/run/all">▶ Run All Reports</a>
          <a class="btn btn-green"   href="/run/all?zoom=1">▶ Run All + Post to Zoom</a>
        </div>
      </div>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(page('Dashboard', body));
    return;
  }

  // Run a group: /run/:group  or  /run/:group?zoom=1
  const match = path.match(/^\/run\/(\w+)$/);
  if (match) {
    const groupKey = match[1];
    const postToZoom = url.searchParams.get('zoom') === '1';

    if (!GROUPS[groupKey]) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(page('Not Found', '<div class="card"><p>Unknown report group.</p></div>'));
      return;
    }

    try {
      const { title, results, ranAt } = await runGroup(groupKey);

      // Optionally post to Zoom
      let zoomStatus = null;
      if (postToZoom) {
        try {
          const { runQueries } = await import('./src/runner.js');
          await runQueries(GROUPS[groupKey].queries, GROUPS[groupKey].title);
          zoomStatus = 'success';
        } catch (err) {
          zoomStatus = err.message;
        }
      }

      const runDate = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });

      const blocks = results.map(r => {
        const cls = r.error ? 'result-block error' : 'result-block';
        const badge = r.error
          ? `<span class="badge badge-err">ERROR</span>`
          : `<span class="badge badge-ok">${r.rows.length} row${r.rows.length !== 1 ? 's' : ''}</span>`;

        let content;
        if (r.error) {
          content = `<p style="color:#c53030">${r.error}</p>`;
        } else if (r.rows.length === 0) {
          content = `<p style="color:#718096;font-size:.9rem">No results.</p>`;
        } else {
          // Build full data table from raw rows (skip *Raw helper columns)
          const cols = Object.keys(r.rows[0]).filter(k => !k.endsWith('Raw') && k !== 'LastAdded');
          const thead = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
          const tbody = r.rows.map((row, i) => {
            const cells = cols.map(c => {
              let val = row[c] ?? '';
              // Make phone numbers look clickable
              if (String(c).toLowerCase().includes('phone') && val) {
                val = `<a href="tel:${val}" style="color:#2b6cb0">${val}</a>`;
              }
              return `<td>${val}</td>`;
            }).join('');
            const cls2 = i >= 10 ? 'extra-row' : '';
            return `<tr class="${cls2}">${cells}</tr>`;
          }).join('');

          const extra = r.rows.length > 10 ? r.rows.length - 10 : 0;
          const expandBtn = extra > 0
            ? `<button class="btn-xs btn-expand" onclick="toggleRows(this)" data-count="${extra}">▼ Show ${extra} more</button>`
            : '';

          content = `
            <table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>
            <div class="card-actions">
              ${expandBtn}
              <button class="btn-xs btn-copy" onclick="copyCard(this)">📋 Copy all</button>
            </div>`;
        }

        return `<div class="${cls}">
          <h3>${r.name}${badge}<span style="font-size:.75rem;font-weight:400;color:#718096;margin-left:10px">🕒 ${runDate}</span></h3>
          ${content}
        </div>`;
      }).join('');

      const zoomBanner = zoomStatus === null ? '' :
        zoomStatus === 'success'
          ? `<div style="background:#c6f6d5;color:#276749;padding:10px 16px;border-radius:8px;margin-bottom:16px">✅ Posted to Zoom successfully.</div>`
          : `<div style="background:#fed7d7;color:#9b2c2c;padding:10px 16px;border-radius:8px;margin-bottom:16px">❌ Zoom error: ${zoomStatus}</div>`;

      const body = `
        <div class="card">
          <h2>${title}</h2>
          <p class="meta">Run at: ${ranAt}</p>
          ${zoomBanner}
          ${blocks}
          <div class="btn-group" style="margin-top:16px">
            <a class="btn btn-secondary" href="/">← Back</a>
            <a class="btn btn-primary"   href="/run/${groupKey}">↻ Re-run</a>
            <a class="btn btn-green"     href="/run/${groupKey}?zoom=1">↻ Re-run + Zoom</a>
          </div>
        </div>`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(page(title, body));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(page('Error', `<div class="card"><p style="color:red">${err.message}</p><a class="btn btn-secondary" style="margin-top:16px;display:inline-block" href="/">← Back</a></div>`));
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
