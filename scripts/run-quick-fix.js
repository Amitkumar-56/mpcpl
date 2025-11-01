// Quick fix script to run SQL commands
import { executeQuery } from "../src/lib/db.js";

async function runQuickFix() {
  try {
    console.log("🔄 Running database quick fix...");

    const commands = [
      // Fix AUTO_INCREMENT for all tables
      "ALTER TABLE customers MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE customer_balances MODIFY COLUMN id int(10) UNSIGNED NOT NULL AUTO_INCREMENT",
      "ALTER TABLE customer_permissions MODIFY COLUMN id int(10) UNSIGNED NOT NULL AUTO_INCREMENT",
      "ALTER TABLE filling_requests MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE filling_logs MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE filling_history MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE agents MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE agent_customers MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE agent_history MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE invoices MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE expenses MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",
      "ALTER TABLE purchases MODIFY COLUMN id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT",
      "ALTER TABLE employee_profile MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT",

      // Add new columns for credit days feature
      "ALTER TABLE customers ADD COLUMN credit_days INT DEFAULT 7",
      "ALTER TABLE customer_balances ADD COLUMN limit_expiry DATE NULL",
      "ALTER TABLE customer_balances ADD COLUMN validity_days INT DEFAULT 7",
      "ALTER TABLE customer_balances ADD COLUMN last_reset_date DATETIME DEFAULT CURRENT_TIMESTAMP",
    ];

    for (let i = 0; i < commands.length; i++) {
      try {
        console.log(`${i + 1}. ${commands[i]}`);
        await executeQuery(commands[i]);
        console.log("   ✅ Success");
      } catch (error) {
        if (error.message.includes("Duplicate column")) {
          console.log("   ⚠️ Column already exists, skipping");
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }

    console.log("\n🎉 Quick fix completed!");
    console.log("You can now create customers with credit days!");
  } catch (error) {
    console.error("❌ Quick fix failed:", error);
  }
}

runQuickFix();
