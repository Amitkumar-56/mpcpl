// Test script for credit days functionality
import { executeQuery } from "../src/lib/db.js";
import {
  checkCreditDaysOverdue,
  resetCreditDaysLimit,
  canMakeCreditRequest,
} from "../src/lib/creditDaysUtils.js";

async function testCreditDaysFunctionality() {
  try {
    console.log("🔄 Testing Credit Days Functionality...\n");

    // Test 1: Check if we can create a credit days customer
    console.log("1. Testing customer creation with credit days...");

    const testCustomer = {
      name: "Test Credit Customer",
      phone: "9999999999",
      email: "test.credit@example.com",
      credit_days: 10,
      billing_type: 1,
      amtlimit: 50000,
    };

    // Insert test customer
    const customerResult = await executeQuery(
      `INSERT INTO customers (name, phone, email, roleid, billing_type, amtlimit, credit_days) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        testCustomer.name,
        testCustomer.phone,
        testCustomer.email,
        3,
        testCustomer.billing_type,
        testCustomer.amtlimit,
        testCustomer.credit_days,
      ]
    );

    const customerId = customerResult.insertId;
    console.log(`✅ Created test customer with ID: ${customerId}`);

    // Insert customer balance with credit days
    const limitExpiry = new Date(
      Date.now() + testCustomer.credit_days * 24 * 60 * 60 * 1000
    );
    await executeQuery(
      `INSERT INTO customer_balances (com_id, balance, amtlimit, cst_limit, validity_days, limit_expiry) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        0,
        testCustomer.amtlimit,
        testCustomer.amtlimit,
        testCustomer.credit_days,
        limitExpiry.toISOString().split("T")[0],
      ]
    );

    console.log(
      `✅ Created customer balance with ${testCustomer.credit_days} days credit period`
    );

    // Test 2: Check overdue status (should not be overdue initially)
    console.log("\n2. Testing overdue check for new customer...");
    const overdueStatus = await checkCreditDaysOverdue(customerId);
    console.log(`✅ Overdue status:`, overdueStatus);

    // Test 3: Check if customer can make requests
    console.log("\n3. Testing request eligibility...");
    const eligibility = await canMakeCreditRequest(customerId, 10000);
    console.log(`✅ Request eligibility:`, eligibility);

    // Test 4: Simulate expired credit days
    console.log("\n4. Testing expired credit days scenario...");
    const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    await executeQuery(
      `UPDATE customer_balances SET limit_expiry = ?, balance = -25000 WHERE com_id = ?`,
      [expiredDate.toISOString().split("T")[0], customerId]
    );

    const expiredOverdueStatus = await checkCreditDaysOverdue(customerId);
    console.log(`✅ Expired overdue status:`, expiredOverdueStatus);

    const expiredEligibility = await canMakeCreditRequest(customerId, 5000);
    console.log(`✅ Expired request eligibility:`, expiredEligibility);

    // Test 5: Test payment and credit reset
    console.log("\n5. Testing payment and credit reset...");
    const paymentAmount = 30000;
    const resetResult = await resetCreditDaysLimit(customerId, paymentAmount);
    console.log(`✅ Credit reset result: ${resetResult}`);

    if (resetResult) {
      const afterPaymentStatus = await checkCreditDaysOverdue(customerId);
      console.log(`✅ Status after payment:`, afterPaymentStatus);
    }

    // Test 6: Verify customer data
    console.log("\n6. Verifying final customer data...");
    const finalCustomerData = await executeQuery(
      `SELECT c.*, cb.balance, cb.limit_expiry, cb.validity_days 
       FROM customers c 
       LEFT JOIN customer_balances cb ON c.id = cb.com_id 
       WHERE c.id = ?`,
      [customerId]
    );
    console.log(`✅ Final customer data:`, finalCustomerData[0]);

    // Cleanup
    console.log("\n7. Cleaning up test data...");
    await executeQuery(`DELETE FROM customer_balances WHERE com_id = ?`, [
      customerId,
    ]);
    await executeQuery(`DELETE FROM limit_history WHERE com_id = ?`, [
      customerId,
    ]);
    await executeQuery(`DELETE FROM customers WHERE id = ?`, [customerId]);
    console.log(`✅ Test data cleaned up`);

    console.log("\n🎉 All credit days tests completed successfully!");
  } catch (error) {
    console.error("❌ Credit days test failed:", error);
    process.exit(1);
  }
}

// Run the test
testCreditDaysFunctionality();
