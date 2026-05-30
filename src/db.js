import mysql from 'mysql2/promise';

let pool;

function createPool() {
  return mysql.createPool({
    host:               process.env.DB_HOST,
    port:               parseInt(process.env.DB_PORT || '3306'),
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:    5,
    queueLimit:         0,
    enableKeepAlive:    true,   // keep connections alive
    keepAliveInitialDelay: 10000,
  });
}

// Always return a live pool — recreate if it was closed
export function getDb() {
  if (!pool) pool = createPool();
  return pool;
}

export async function closeDb() {
  if (pool) {
    try { await pool.end(); } catch { /* ignore */ }
    pool = null;
  }
}
