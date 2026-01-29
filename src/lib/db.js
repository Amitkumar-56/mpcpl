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
};

// Create pool
const pool = mysql.createPool(dbConfig);

export async function getConnection() {
  return await pool.getConnection();
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
