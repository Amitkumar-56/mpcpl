// src/lib/db.js
import mysql from "mysql2/promise";

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "masafipetro_dev",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
};

// Create pool
const pool = mysql.createPool(dbConfig);

export async function getConnection() {
  return await pool.getConnection();
}

export async function executeQuery(query, params = []) {
  let connection;
  let retries = 3;
  
  while (retries > 0) {
    try {
      connection = await getConnection();
      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('Database query failed after retries:', error);
        throw error;
      }
      console.warn(`Database query failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
    } finally {
      if (connection) {
        connection.release();
      }
    }
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
