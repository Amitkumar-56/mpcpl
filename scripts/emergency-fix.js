// Emergency fix for filling_requests table
import { executeQuery } from "../src/lib/db.js";

async function emergencyFix() {
  try {
    console.log("🚨 Emergency fix for filling_requests table...");

    // Check current table structure
    console.log("📋 Checking filling_requests table structure...");
    const tableInfo = await executeQuery("DESCRIBE filling_requests");

    console.log("Current filling_requests table:");
    tableInfo.forEach((col) => {
      console.log(
        `  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default} ${col.Extra}`
      );
    });

    const idColumn = tableInfo.find((col) => col.Field === "id");

    if (idColumn && !idColumn.Extra.includes("auto_increment")) {
      console.log("🔧 Fixing filling_requests id column...");

      await executeQuery(`
        ALTER TABLE filling_requests 
        MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
      `);

      console.log("✅ Fixed filling_requests table!");

      // Test insert
      console.log("🧪 Testing insert...");
      const testResult = await executeQuery(`
        INSERT INTO filling_requests (rid, fs_id, qty, created, status) 
        VALUES ('TEST001', 1, 100, NOW(), 'Pending')
      `);

      console.log(`✅ Test successful! Generated ID: ${testResult.insertId}`);

      // Clean up
      await executeQuery(`DELETE FROM filling_requests WHERE rid = 'TEST001'`);
      console.log("✅ Test data cleaned up");
    } else {
      console.log("✅ filling_requests id column already has AUTO_INCREMENT");
    }

    console.log("🎉 Emergency fix completed!");
  } catch (error) {
    console.error("❌ Emergency fix failed:", error);

    // Try alternative approach
    console.log("🔄 Trying alternative fix...");
    try {
      await executeQuery(`
        ALTER TABLE filling_requests 
        CHANGE id id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
      `);
      console.log("✅ Alternative fix successful!");
    } catch (altError) {
      console.error("❌ Alternative fix also failed:", altError);
    }
  }
}

emergencyFix();
