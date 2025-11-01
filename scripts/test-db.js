// Database connection test script
import { getConnection, executeQuery } from "../src/lib/db.js";

async function testDatabase() {
  try {
    console.log("🔄 Testing database connection...");

    // Test basic connection
    const connection = await getConnection();
    console.log("✅ Database connection successful");
    connection.release();

    // Test query execution
    console.log("🔄 Testing query execution...");
    const tables = await executeQuery("SHOW TABLES");
    console.log(`✅ Found ${tables.length} tables in database:`);

    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    // Test a specific table
    console.log("🔄 Testing agents table...");
    const agents = await executeQuery("SELECT COUNT(*) as count FROM agents");
    console.log(`✅ Agents table has ${agents[0].count} records`);

    console.log("🎉 Database test completed successfully!");
  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

testDatabase();
