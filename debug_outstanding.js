const { executeQuery } = require('./src/lib/db.js');

async function debugOutstanding() {
  try {
    console.log('🔍 Checking for any transactions...');
    
    // Check if there are any transactions at all
    const allTransactions = await executeQuery('SELECT COUNT(*) as count FROM filling_history');
    console.log('Total transactions in filling_history:', allTransactions[0].count);
    
    // Check for any filling requests
    const allRequests = await executeQuery('SELECT COUNT(*) as count FROM filling_requests');
    console.log('Total filling_requests:', allRequests[0].count);
    
    // Check for any customers
    const allCustomers = await executeQuery('SELECT COUNT(*) as count FROM customers');
    console.log('Total customers:', allCustomers[0].count);
    
    // Check for any completed requests
    const completedRequests = await executeQuery('SELECT COUNT(*) as count FROM filling_requests WHERE status = "Completed" AND completed_date IS NOT NULL');
    console.log('Completed requests with dates:', completedRequests[0].count);
    
    // Sample some recent transactions
    const recentTransactions = await executeQuery('SELECT * FROM filling_history ORDER BY id DESC LIMIT 5');
    console.log('Recent transactions:', recentTransactions);
    
    // Check for customer 1 specifically
    const customer1Transactions = await executeQuery('SELECT COUNT(*) as count FROM filling_history WHERE cl_id = 1');
    console.log('Customer 1 transactions:', customer1Transactions[0].count);
    
    // Check filling_requests for customer 1
    const customer1Requests = await executeQuery('SELECT COUNT(*) as count, SUM(new_amount) as total FROM filling_requests WHERE cid = 1 AND status = "Completed"');
    console.log('Customer 1 completed requests:', customer1Requests[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugOutstanding();
