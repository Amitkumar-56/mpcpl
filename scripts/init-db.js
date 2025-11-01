// Database initialization script
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Amit@3203",
  multipleStatements: true,
};

async function initializeDatabase() {
  let connection;

  try {
    console.log("🔄 Connecting to MySQL server...");

    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection(dbConfig);

    console.log("✅ Connected to MySQL server");

    // Create database if it doesn't exist
    const databaseName = process.env.DB_NAME || "masafipetro_dev";
    console.log(`🔄 Creating database: ${databaseName}`);

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    console.log(`✅ Database '${databaseName}' created or already exists`);

    // Close current connection and reconnect with database specified
    await connection.end();

    // Reconnect with the database specified
    const dbConfigWithDB = {
      ...dbConfig,
      database: databaseName,
    };

    connection = await mysql.createConnection(dbConfigWithDB);
    console.log(`✅ Connected to database: ${databaseName}`);

    // Read and execute SQL file
    const sqlFilePath = path.join(__dirname, "../src/lib/masafipetro_dev.sql");
    console.log(`🔄 Reading SQL file: ${sqlFilePath}`);

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");
    console.log("✅ SQL file read successfully");

    console.log("🔄 Executing SQL statements...");

    // Execute the entire SQL content at once using query instead of execute
    try {
      await connection.query(sqlContent);
      console.log("✅ SQL file executed successfully");
    } catch (error) {
      // If bulk execution fails, try statement by statement
      console.log(
        "⚠️  Bulk execution failed, trying statement by statement..."
      );

      const statements = sqlContent
        .split(";")
        .map((stmt) => stmt.trim())
        .filter(
          (stmt) =>
            stmt.length > 0 && !stmt.startsWith("--") && !stmt.startsWith("/*")
        );

      let executedCount = 0;
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.query(statement);
            executedCount++;
          } catch (error) {
            // Skip errors for statements that might already exist or are comments
            if (
              !error.message.includes("already exists") &&
              !error.message.includes("Duplicate entry") &&
              !error.message.includes("Unknown table")
            ) {
              console.warn(`⚠️  Warning executing statement: ${error.message}`);
            }
          }
        }
      }
      console.log(`✅ Executed ${executedCount} SQL statements individually`);
    }

    console.log("🎉 Database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the initialization
initializeDatabase();
