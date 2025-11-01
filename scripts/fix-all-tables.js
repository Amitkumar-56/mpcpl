// Script to fix all table structures for AUTO_INCREMENT
import { executeQuery } from "../src/lib/db.js";

async function fixAllTables() {
  try {
    console.log("🔄 Fixing all table structures...");

    // List of tables that need AUTO_INCREMENT on id column
    const tablesToFix = [
      'customers',
      'customer_balances', 
      'customer_permissions',
      'agents',
      'agent_customers',
      'agent_history',
      'filling_requests',
      'filling_stations',
      'filling_station_stocks',
      'filling_history',
      'filling_logs',
      'filling_status_history',
      'products',
      'product_codes',
      'deal_price',
      'employee_profile',
      'expenses',
      'invoices',
      'limit_history',
      'nb_expense',
      'non_billing_stocks',
      'purchases',
      'purchase_for_use'
    ];

    for (const tableName of tablesToFix) {
      try {
        console.log(`\n📋 Checking ${tableName} table...`);
        
        const tableInfo = await executeQuery(`DESCRIBE ${tableName}`);
        const idColumn = tableInfo.find(col => col.Field === 'id');
        
        if (idColumn) {
          console.log(`  ID column: ${idColumn.Type} ${idColumn.Extra}`);
          
          if (!idColumn.Extra.includes('auto_increment')) {
            console.log(`🔧 Fixing ${tableName} ID column to be AUTO_INCREMENT...`);
            
            // Different tables might have different id column types
            let columnDef = 'int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY';
            if (tableName === 'customer_balances' || tableName === 'customer_permissions') {
              columnDef = 'int(10) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
            } else if (tableName === 'purchases') {
              columnDef = 'bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
            }
            
            await executeQuery(`
              ALTER TABLE ${tableName} 
              MODIFY COLUMN id ${columnDef}
            `);
            
            console.log(`✅ Fixed ${tableName} ID column`);
          } else {
            console.log(`✅ ${tableName} ID column already has AUTO_INCREMENT`);
          }
        } else {
          console.log(`⚠️ ${tableName} table doesn't have an id column`);
        }
        
      } catch (error) {
        if (error.message.includes("doesn't exist")) {
          console.log(`⚠️ ${tableName} table doesn't exist, skipping...`);
        } else {
          console.log(`❌ Error fixing ${tableName}: ${error.message}`);
        }
      }
    }

    // Add missing columns to specific tables
    console.log("\n🔧 Adding missing columns...");

    // Add credit_days to customers table
    try {
      const customersInfo = await executeQuery("DESCRIBE customers");
      const creditDaysColumn = customersInfo.find(col => col.Field === 'credit_days');
      
      if (!creditDaysColumn) {
        console.log("🔧 Adding credit_days column to customers...");
        await executeQuery(`
          ALTER TABLE customers 
          ADD COLUMN credit_days INT DEFAULT 7 COMMENT 'Number of credit days for credit customers'
        `);
        console.log("✅ Added credit_days column");
      } else {
        console.log("✅ credit_days column already exists");
      }
    } catch (error) {
      console.log("⚠️ Could not add credit_days column:", error.mess