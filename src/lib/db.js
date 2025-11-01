// src/lib/db.js
import mysql from "mysql2/promise";

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Amit@3203",
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

export default pool;
