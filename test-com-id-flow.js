// test-com-id-flow.js
// Test script to verify com_id flow in customer creation and user fetching

const { executeQuery } = require('./src/lib/db');

async function testComIdFlow() {
  console.log('🧪 Testing com_id flow...\n');

  try {
    // 1. Check existing customers and their com_id
    console.log('📋 Step 1: Checking existing customers...');
    const customers = await executeQuery('SELECT id, name, com_id FROM customers ORDER BY id DESC LIMIT 5');
    console.log('Recent customers:');
    customers.forEach(c => {
      console.log(`  ID: ${c.id}, Name: ${c.name}, com_id: ${c.com_id}`);
    });

    // 2. Test user fetching with different com_id values
    console.log('\n🔍 Step 2: Testing user fetching...');
    
    for (const customer of customers) {
      if (customer.com_id) {
        console.log(`\n  Testing com_id: ${customer.com_id}`);
        const users = await executeQuery(
          'SELECT id, name, com_id FROM customers WHERE com_id = ? ORDER BY id DESC',
          [customer.com_id]
        );
        console.log(`  Found ${users.length} users for com_id ${customer.com_id}:`);
        users.forEach(u => {
          console.log(`    - User ID: ${u.id}, Name: ${u.name}, com_id: ${u.com_id}`);
        });
      }
    }

    // 3. Check customer_balances table
    console.log('\n💰 Step 3: Checking customer_balances...');
    const balances = await executeQuery('SELECT com_id, balance FROM customer_balances LIMIT 5');
    console.log('Customer balances:');
    balances.forEach(b => {
      console.log(`  com_id: ${b.com_id}, Balance: ${b.balance}`);
    });

    // 4. Test the complete flow with a sample
    console.log('\n🔄 Step 4: Testing complete flow...');
    if (customers.length > 0) {
      const testCustomer = customers[0];
      console.log(`Testing with customer ID: ${testCustomer.id}, com_id: ${testCustomer.com_id}`);
      
      // This simulates what happens when a customer tries to fetch their users
      const userFetchResult = await executeQuery(
        'SELECT * FROM customers WHERE com_id = ? ORDER BY created_at DESC',
        [testCustomer.com_id || testCustomer.id] // fallback to id if com_id is null
      );
      
      console.log(`✅ Fetch result: Found ${userFetchResult.length} users`);
      userFetchResult.forEach(u => {
        console.log(`    - ${u.name} (ID: ${u.id}, com_id: ${u.com_id})`);
      });
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testComIdFlow().then(() => {
  console.log('\n🏁 Test script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script error:', error);
  process.exit(1);
});
