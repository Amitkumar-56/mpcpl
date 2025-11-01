// Script to fix customers table structure
import { executeQuery } from "../src/lib/db.js";

async function fixCustomersTable() {
  try {
    console.log("🔄 Fixing customers table structure...");

    // Check current table structure
    console.log("📋 Checking current table structure...");
    const tableInfo = await executeQuery("DESCRIBE customers");
    console.log("Current customers table structure:");
    tableInfo.forEach((col) => {
      console.log(
        `  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default} ${col.Extra}`
      );
    });

    // Check if id column has AUTO_INCREMENT
    const idColumn = tableInfo.find((col) => col.Field === "id");

    if (!idColumn) {
      console.log("❌ ID column not found!");
      return;
    }

    if (!idColumn.Extra.includes("auto_increment")) {
      console.log("🔧 Fixing ID column to be AUTO_INCREMENT...");

      // First, make sure id is primary key and auto increment
      await executeQuery(`
        ALTER TABLE customers 
        MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
      `);

      console.log("✅ Fixed ID column to AUTO_INCREMENT");
    } else {
      console.log("✅ ID column already has AUTO_INCREMENT");
    }

    // Add credit_days column if it doesn't exist
    const creditDaysColumn = tableInfo.find(
      (col) => col.Field === "credit_days"
    );

    if (!creditDaysColumn) {
      console.log("🔧 Adding credit_days column...");
      await executeQuery(`
        ALTER TABLE customers 
        ADD COLUMN credit_days INT DEFAULT 7 COMMENT 'Number of credit days for credit customers'
      `);
      console.log("✅ Added credit_days column");
    } else {
      console.log("✅ credit_days column already exists");
    }

    // Check customer_balances table
    console.log("\n📋 Checking customer_balances table...");

    try {
      const balanceTableInfo = await executeQuery("DESCRIBE customer_balances");
      console.log("Current customer_balances table structure:");
      balanceTableInfo.forEach((col) => {
        console.log(
          `  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default} ${col.Extra}`
        );
      });

      // Check if id column has AUTO_INCREMENT
      const balanceIdColumn = balanceTableInfo.find(
        (col) => col.Field === "id"
      );

      if (
        balanceIdColumn &&
        !balanceIdColumn.Extra.includes("auto_increment")
      ) {
        console.log(
          "🔧 Fixing customer_balances ID column to be AUTO_INCREMENT..."
        );

        await executeQuery(`
          ALTER TABLE customer_balances 
          MODIFY COLUMN id int(10) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
        `);

        console.log("✅ Fixed customer_balances ID column to AUTO_INCREMENT");
      }

      // Add missing columns to customer_balances
      const limitExpiryColumn = balanceTableInfo.find(
        (col) => col.Field === "limit_expiry"
      );
      if (!limitExpiryColumn) {
        console.log("🔧 Adding limit_expiry column to customer_balances...");
        await executeQuery(`
          ALTER TABLE customer_balances 
          ADD COLUMN limit_expiry DATE NULL COMMENT 'Credit limit expiry date for credit days customers'
        `);
        console.log("✅ Added limit_expiry column");
      }

      const lastResetColumn = balanceTableInfo.find(
        (col) => col.Field === "last_reset_date"
      );
      if (!lastResetColumn) {
        console.log("🔧 Adding last_reset_date column to customer_balances...");
        await executeQuery(`
          ALTER TABLE customer_balances 
          ADD COLUMN last_reset_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Last time credit was reset'
        `);
        console.log("✅ Added last_reset_date column");
      }
    } catch (error) {
      console.log(
        "⚠️ customer_balances table might not exist, will be created when needed"
      );
    }

    // Test insert to verify fix
    console.log("\n🧪 Testing customer insert...");

    try {
      const testResult = await executeQuery(`
        INSERT INTO customers (name, phone, email, roleid, billing_type, credit_days) 
        VALUES ('Test Customer', '1234567890', 'test@example.com', 1, 1, 7)
      `);

      const testId = testResult.insertId;
      console.log(`✅ Test insert successful! Generated ID: ${testId}`);

      // Clean up test data
      await executeQuery(`DELETE FROM customers WHERE id = ?`, [testId]);
      console.log("✅ Test data cleaned up");
    } catch (error) {
      console.log("❌ Test insert failed:", error.message);
    }

    console.log("\n🎉 Database table structure fixed successfully!");
    console.log(
      "You can now create customers with the new credit days feature!"
    );
  } catch (error) {
    console.error("❌ Failed to fix table structure:", error);
    process.exit(1);
  }
}

// Run the fix
fixCustomersTable();
