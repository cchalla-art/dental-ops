import fs from 'fs';
import path from 'path';

// Logs go to  <project-root>/logs/YYYY-MM-DD.log
// Keeps the last 30 log files automatically.

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const MAX_FILES = 30;

function getLogFile() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}.log`);
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function write(level, ...args) {
  ensureLogDir();
  const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
  const line = `[${timestamp()}] [${level}] ${message}\n`;

  // Write to file
  fs.appendFileSync(getLogFile(), line);

  // Also print to console (Task Scheduler captures this too if redirected)
  if (level === 'ERROR') process.stderr.write(line);
  else process.stdout.write(line);
}

function pruneOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.log'))
      .map(f => ({ name: f, time: fs.statSync(path.join(LOG_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time); // newest first

    files.slice(MAX_FILES).forEach(f => {
      fs.unlinkSync(path.join(LOG_DIR, f.name));
    });
  } catch { /* non-fatal */ }
}

export const logger = {
  info:  (...args) => write('INFO ', ...args),
  warn:  (...args) => write('WARN ', ...args),
  error: (...args) => write('ERROR', ...args),
  prune: pruneOldLogs,
  dir:   LOG_DIR,
};
