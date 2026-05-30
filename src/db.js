import mysql from 'mysql2/promise';

let pool;

function getConfig() {
  return {
    host:               process.env.DB_HOST,
    port:               parseInt(process.env.DB_PORT || '3306'),
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:    5,
    queueLimit:         0,
  };
}

export function getDb() {
  if (!pool) pool = mysql.createPool(getConfig());
  return pool;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
