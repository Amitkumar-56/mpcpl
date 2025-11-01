// Database migration script to add credit_days column
import { executeQuery } from "../src/lib/db.js";

async function addCreditDaysColumn() {
  try {
    console.log("🔄 Adding credit_days column to customers table...");

    // Check if column already exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'customers' 
      AND COLUMN_NAME = 'credit_days'
    `;

    const columnExists = await executeQuery(checkColumnQuery);

    if (columnExists.length > 0) {
      console.log("✅ credit_days column already exists");
      return;
    }

    // Add credit_days column to customers table
    const addColumnQuery = `
      ALTER TABLE customers 
      ADD COLUMN credit_days INT DEFAULT 7 COMMENT 'Number of credit days for credit customers'
    `;

    await executeQuery(addColumnQuery);
    console.log("✅ Successfully added credit_days column to customers table");

    // Check if limit_expiry column exists in customer_balances
    const checkLimitExpiryQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'customer_balances' 
      AND COLUMN_NAME = 'limit_expiry'
    `;

    const limitExpiryExists = await executeQuery(checkLimitExpiryQuery);

    if (limitExpiryExists.length === 0) {
      console.log(
        "🔄 Adding limit_expiry column to customer_balances table..."
      );
      const addLimitExpiryQuery = `
        ALTER TABLE customer_balances 
        ADD COLUMN limit_expiry DATE NULL COMMENT 'Credit limit expiry date for credit days customers'
      `;

      await executeQuery(addLimitExpiryQuery);
      console.log(
        "✅ Successfully added limit_expiry column to customer_balances table"
      );
    } else {
      console.log(
        "✅ limit_expiry column already exists in customer_balances table"
      );
    }

    // Check if last_reset_date column exists in customer_balances
    const checkLastResetQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'customer_balances' 
      AND COLUMN_NAME = 'last_reset_date'
    `;

    const lastResetExists = await executeQuery(checkLastResetQuery);

    if (lastResetExists.length === 0) {
      console.log(
        "🔄 Adding last_reset_date column to customer_balances table..."
      );
      const addLastResetQuery = `
        ALTER TABLE customer_balances 
        ADD COLUMN last_reset_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Last time credit was reset'
      `;

      await executeQuery(addLastResetQuery);
      console.log(
        "✅ Successfully added last_reset_date column to customer_balances table"
      );
    } else {
      console.log(
        "✅ last_reset_date column already exists in customer_balances table"
      );
    }

    console.log("🎉 Database migration completed successfully!");
    console.log("\nYou can now create credit days customers!");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
addCreditDaysColumn();
