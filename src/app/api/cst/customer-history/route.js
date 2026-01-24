// src/app/api/cst/customer-history/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pname = searchParams.get('pname');
    const cl_id = searchParams.get('cl_id');
    
    // Get customer ID from parameter or use logged-in customer logic
    let customerId;
    if (cl_id) {
      customerId = parseInt(cl_id);
    } else {
      // For CST users, we need to get the customer ID from the session
      // For now, we'll require cl_id parameter
      return NextResponse.json({
        success: false,
        message: 'Customer ID (cl_id) is required for customer history'
      }, { status: 400 });
    }
    
    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid customer ID'
      }, { status: 400 });
    }

    console.log('🔍 API Called - Customer ID:', customerId);

    // 1. Check customer exists - FIX: Get proper name from customers table
    let customerData;
    try {
      customerData = await executeQuery(
        'SELECT id, name, balance, client_type, email, phone FROM customers WHERE id = ?',
        [customerId]
      );
    } catch (error) {
      console.error('❌ Database Error:', error);
      return NextResponse.json({
        success: false,
        message: 'Database connection failed: ' + error.message
      }, { status: 500 });
    }

    if (!customerData || customerData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found with ID: ' + customerId
      }, { status: 404 });
    }

    const customer = customerData[0];
    
    // FIX: Ensure customer name is not null or empty
    if (!customer.name || customer.name.trim() === '' || customer.name === 'Unknown') {
      // Try to get name from email or use ID
      customer.name = customer.email ? customer.email.split('@')[0] : `Customer #${customer.id}`;
    }

    // 2. Get customer balance from customer_balances table
    // ✅ FIX: Remove day_amount column (doesn't exist in table)
    let customerBalanceData;
    try {
      customerBalanceData = await executeQuery(
        'SELECT balance, amtlimit, cst_limit, day_limit, total_day_amount FROM customer_balances WHERE com_id = ? AND is_active = 1',
        [customerId]
      );
    } catch (error) {
      console.error('❌ Customer Balance Query Error:', error);
      customerBalanceData = [];
    }

    let currentBalance = 0;
    let amtLimit = 0;
    let totalLimit = 0;
    let dayLimit = 0;
    let totalDayAmount = 0;

    if (customerBalanceData && customerBalanceData.length > 0) {
      const balanceInfo = customerBalanceData[0];
      currentBalance = balanceInfo.balance || 0;
      amtLimit = balanceInfo.amtlimit || 0;
      totalLimit = balanceInfo.cst_limit || 0;
      dayLimit = balanceInfo.day_limit || 0;
      totalDayAmount = balanceInfo.total_day_amount || 0;
    }

    // 3. Get filling_history data - FIXED SQL QUERY with correct inward/outward logic
    // First, let's debug what trans_types exist for this customer
    console.log('🔍 Debugging transaction types for customer:', customerId);
    const debugTypesQuery = `
      SELECT DISTINCT fh.trans_type, COUNT(*) as count
      FROM filling_history fh
      LEFT JOIN filling_requests fr ON fh.rid = fr.rid
      WHERE (fh.cl_id = ? OR fr.cid = ?)
      GROUP BY fh.trans_type
    `;
    const debugTypes = await executeQuery(debugTypesQuery, [customerId, customerId]);
    console.log('📊 Available transaction types:', debugTypes);

    // Check both fh.cl_id and fr.cid to handle cases where cl_id might be NULL
    let sql = `
      SELECT 
        fh.id,
        fh.filling_date,
        fh.trans_type,
        fh.filling_qty,
        fh.amount,
        fh.credit,
        fh.credit_date,
        fh.new_amount,
        fh.remaining_limit,
        fh.remaining_day_limit,
        CASE 
          WHEN fh.trans_type = 'credit' OR fh.trans_type = 'inward' THEN COALESCE(fh.credit, 0)
          ELSE NULL
        END AS in_amount,
        CASE 
          WHEN fh.trans_type = 'debit' OR fh.trans_type = 'outward' THEN COALESCE(fh.amount, 0)
          ELSE NULL
        END AS d_amount,
        COALESCE(p.pname, 'Unknown Product') as pname,
        COALESCE(fs.station_name, 'Unknown Station') as station_name,
        COALESCE(fr.vehicle_number, 'N/A') as vehicle_number
      FROM filling_history fh
      LEFT JOIN products p ON fh.product_id = p.id
      LEFT JOIN filling_stations fs ON fh.fs_id = fs.id
      LEFT JOIN filling_requests fr ON fh.rid = fr.rid
      WHERE (fh.cl_id = ? OR fr.cid = ?)
    `;

    let params = [customerId, customerId];

    if (pname && pname !== '') {
      sql += ' AND p.pname = ?';
      params.push(pname);
    }

    sql += ' ORDER BY fh.filling_date DESC, fh.id DESC';

    console.log('🔍 Executing SQL:', sql);
    console.log('🔍 With params:', params);
    console.log('🔍 Customer ID:', customerId);
    console.log('🔍 Customer Name:', customer.name);

    let transactions;
    try {
      transactions = await executeQuery(sql, params);
      console.log('✅ Transactions found:', transactions.length);
      
      // Debug: Show sample transactions with their amounts
      if (transactions.length > 0) {
        console.log('📋 Sample transactions:');
        transactions.slice(0, 3).forEach((t, i) => {
          console.log(`  ${i+1}. Type: ${t.trans_type}, Amount: ${t.amount}, Credit: ${t.credit}, In_amount: ${t.in_amount}, D_amount: ${t.d_amount}`);
        });
      }
      
      // Debug: Check if cl_id is NULL in filling_history
      if (transactions.length === 0) {
        const debugQuery = `
          SELECT COUNT(*) as total, 
                 COUNT(fh.cl_id) as with_cl_id,
                 COUNT(fr.cid) as with_cid
          FROM filling_history fh
          LEFT JOIN filling_requests fr ON fh.rid = fr.rid
          WHERE fh.cl_id = ? OR fr.cid = ?
        `;
        const debugResult = await executeQuery(debugQuery, [customerId, customerId]);
        console.log('🔍 Debug query result:', debugResult);
      }
    } catch (error) {
      console.error('❌ Filling History Query Error:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch transactions: ' + error.message
      }, { status: 500 });
    }

    // 4. Get products for filter dropdown
    let products = [];
    try {
      const productsData = await executeQuery(
        `SELECT DISTINCT p.pname 
         FROM products p
         INNER JOIN filling_history fh ON p.id = fh.product_id
         LEFT JOIN filling_requests fr ON fh.rid = fr.rid
         WHERE (fh.cl_id = ? OR fr.cid = ?)
         ORDER BY p.pname`,
        [customerId, customerId]
      );
      
      products = productsData.map(p => p.pname);
    } catch (error) {
      console.error('❌ Products Query Error:', error);
    }

    // 5. Calculate opening balance (oldest transaction's remaining_limit)
    let openingBalance = 0;
    if (transactions.length > 0) {
      const oldestTransaction = transactions[transactions.length - 1];
      openingBalance = oldestTransaction.remaining_limit || 0;
    } else {
      openingBalance = currentBalance;
    }

    // 6. Calculate Yesterday's and Today's Outstandings - FIXED LOGIC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayFormatted = today.toISOString().split('T')[0];
    const yesterdayFormatted = yesterday.toISOString().split('T')[0];

    // ✅ FIX: Today's outstanding (sum of new_amount from completed transactions today)
    const todayOutstandingQuery = `
      SELECT COALESCE(SUM(fr.new_amount), 0) as total 
      FROM filling_requests fr
      WHERE fr.cid = ?
        AND fr.new_amount > 0
        AND fr.status = 'Completed'
        AND fr.completed_date IS NOT NULL
        AND DATE(fr.completed_date) = ?
    `;
    console.log('🔍 Today outstanding query:', todayOutstandingQuery);
    console.log('🔍 Today outstanding params:', [customerId, todayFormatted]);
    
    const todayOutstandingResult = await executeQuery(todayOutstandingQuery, [
      customerId, todayFormatted
    ]).catch(() => [{ total: 0 }]);
    console.log('🔍 Today outstanding result:', todayOutstandingResult);
    const todayOutstanding = parseFloat(todayOutstandingResult[0]?.total) || 0;

    // ✅ FIX: Yesterday's outstanding (sum of new_amount from transactions before today)
    const yesterdayOutstandingQuery = `
      SELECT COALESCE(SUM(fr.new_amount), 0) as total 
      FROM filling_requests fr
      WHERE fr.cid = ?
        AND fr.new_amount > 0
        AND fr.status = 'Completed'
        AND fr.completed_date IS NOT NULL
        AND DATE(fr.completed_date) < ?
    `;
    console.log('🔍 Yesterday outstanding query:', yesterdayOutstandingQuery);
    console.log('🔍 Yesterday outstanding params:', [customerId, todayFormatted]);
    
    const yesterdayOutstandingResult = await executeQuery(yesterdayOutstandingQuery, [
      customerId, todayFormatted
    ]).catch(() => [{ total: 0 }]);
    console.log('🔍 Yesterday outstanding result:', yesterdayOutstandingResult);
    const yesterdayOutstanding = parseFloat(yesterdayOutstandingResult[0]?.total) || 0;

    // 7. Check for low balance notifications
    const lowBalanceThreshold = (totalLimit || 0) * 0.2;
    const isLowBalance = (totalLimit || 0) > 0 && (amtLimit || 0) <= lowBalanceThreshold;
    const balanceNotification = isLowBalance 
      ? "Your balance is low. Please recharge on time to continue services."
      : null;

    // Check if payment is overdue (for day limit customers)
    let paymentOverdue = false;
    let paymentNotification = null;
    if (dayLimit > 0) {
      const overdueCheck = await executeQuery(
        `SELECT COUNT(*) as count 
         FROM filling_requests fr
         WHERE fr.cid = ? 
           AND fr.status = 'Completed' 
           AND fr.payment_status = 0
           AND DATE(fr.completed_date) < DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
        [customerId, dayLimit]
      ).catch(() => [{ count: 0 }]);
      
      if (overdueCheck[0]?.count > 0) {
        paymentOverdue = true;
        paymentNotification = "Payment is overdue. Please recharge immediately to continue services.";
      }
    }

    // 8. Prepare transactions - WITH outstanding (new_amount)
    const finalTransactions = transactions.map((transaction) => ({
      ...transaction,
      outstanding: transaction.new_amount, // new_amount as Outstanding
      remaining_limit: transaction.remaining_limit
    }));

    // 9. Calculate summary - FIXED CREDIT/DEBIT LOGIC
    const totalCredit = finalTransactions
      .filter(t => t.trans_type === 'credit' || t.trans_type === 'inward')
      .reduce((sum, t) => sum + (Number(t.credit) || 0), 0);

    const totalDebit = finalTransactions
      .filter(t => t.trans_type === 'debit' || t.trans_type === 'outward')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalFillingQty = finalTransactions
      .reduce((sum, t) => sum + (Number(t.filling_qty) || 0), 0);

    return NextResponse.json({
      success: true,
      transactions: finalTransactions,
      products: products,
      balance: currentBalance,
      amtLimit: amtLimit,
      totalLimit: totalLimit,
      openingBalance: openingBalance,
      customer: {
        name: customer.name,
        id: customer.id,
        client_type: customer.client_type
      },
      dayLimitInfo: {
        hasDayLimit: dayLimit > 0,
        dayLimit: dayLimit,
        dayAmount: 0, // ✅ Removed - column doesn't exist in database
        totalDayAmount: totalDayAmount
      },
      outstandings: {
        yesterday: yesterdayOutstanding,
        today: todayOutstanding,
        total: yesterdayOutstanding + todayOutstanding
      },
      notifications: {
        lowBalance: isLowBalance,
        balanceNotification: balanceNotification,
        paymentOverdue: paymentOverdue,
        paymentNotification: paymentNotification
      },
      summary: {
        totalTransactions: finalTransactions.length,
        filteredBy: pname || 'All Products',
        totalCredit: totalCredit,
        totalDebit: totalDebit,
        totalFillingQty: totalFillingQty
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error: ' + error.message
    }, { status: 500 });
  }
}
