// src/lib/db.js
import mysql from "mysql2/promise";

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "masafipetro_dev",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10000"),
};

// Create pool
const pool = mysql.createPool(dbConfig);

export async function getConnection() {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const conn = await pool.getConnection();
      return conn;
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || "");
      const code = String(err?.code || "");
      if (msg.includes("ETIMEDOUT") || code === "PROTOCOL_CONNECTION_LOST" || code === "ECONNRESET") {
        await new Promise((res) => setTimeout(res, 500));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function executeQuery(query, params = []) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return rows;
  } finally {
    connection.release();
  }
}

// Transaction helper - uses a single connection for all operations
export async function executeTransaction(callback) {
  const connection = await getConnection();
  try {
    // Use query() instead of execute() for transaction commands
    await connection.query('START TRANSACTION');
    
    try {
      const result = await callback(connection);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    }
  } finally {
    connection.release();
  }
}

export default pool;
