import mysql from 'mysql2/promise';

let connection;

export async function getDb() {
  if (!connection) {
    const config = process.env.DB_URL
      ? process.env.DB_URL
      : {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        };
    connection = await mysql.createConnection(config);
  }
  return connection;
}

export async function closeDb() {
  if (connection) {
    await connection.end();
    connection = null;
  }
}
