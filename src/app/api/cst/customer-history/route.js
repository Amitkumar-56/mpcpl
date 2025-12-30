// src/app/api/cst/customer-history/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pname = searchParams.get('pname');
    const cl_id = searchParams.get('cl_id');
    
    if (!cl_id) {
      return NextResponse.json({
        success: false,
        message: 'Customer ID (cl_id) is required'
      }, { status: 400 });
    }
    
    const customerId = parseInt(cl_id);
    
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
    let customerBalanceData;
    try {
      customerBalanceData = await executeQuery(
        'SELECT balance, amtlimit, cst_limit, day_limit, day_amount, total_day_amount FROM customer_balances WHERE com_id = ? AND is_active = 1',
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
    let dayAmount = 0;
    let totalDayAmount = 0;

    if (customerBalanceData && customerBalanceData.length > 0) {
      const balanceInfo = customerBalanceData[0];
      currentBalance = balanceInfo.balance || 0;
      amtLimit = balanceInfo.amtlimit || 0;
      totalLimit = balanceInfo.cst_limit || 0;
      dayLimit = balanceInfo.day_limit || 0;
      dayAmount = balanceInfo.day_amount || 0;
      totalDayAmount = balanceInfo.total_day_amount || 0;
    }

    // 3. Get filling_history data - FIXED SQL QUERY
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

    // 6. Calculate Yesterday's and Today's Outstandings based on cl_id
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayFormatted = today.toISOString().split('T')[0];
    const yesterdayFormatted = yesterday.toISOString().split('T')[0];

    // ✅ FIX: Today's outstanding (using completed_date only, not created_at)
    const todayOutstandingQuery = `
      SELECT COALESCE(SUM(fh.new_amount), 0) as total 
      FROM filling_history fh
      LEFT JOIN filling_requests fr ON fh.rid = fr.rid
      WHERE (fh.cl_id = ? OR fr.cid = ?)
        AND fh.new_amount > 0
        AND fr.completed_date IS NOT NULL
        AND DATE(fr.completed_date) = ?
    `;
    const todayOutstandingResult = await executeQuery(todayOutstandingQuery, [
      customerId, customerId, todayFormatted
    ]).catch(() => [{ total: 0 }]);
    const todayOutstanding = parseFloat(todayOutstandingResult[0]?.total) || 0;

    // ✅ FIX: Yesterday's outstanding (using completed_date only, not created_at)
    const yesterdayOutstandingQuery = `
      SELECT COALESCE(SUM(fh.new_amount), 0) as total 
      FROM filling_history fh
      LEFT JOIN filling_requests fr ON fh.rid = fr.rid
      WHERE (fh.cl_id = ? OR fr.cid = ?)
        AND fh.new_amount > 0
        AND fr.completed_date IS NOT NULL
        AND DATE(fr.completed_date) < ?
    `;
    const yesterdayOutstandingResult = await executeQuery(yesterdayOutstandingQuery, [
      customerId, customerId, todayFormatted
    ]).catch(() => [{ total: 0 }]);
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

    // 9. Calculate summary
    const totalCredit = finalTransactions
      .filter(t => t.trans_type === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalDebit = finalTransactions
      .filter(t => t.trans_type === 'debit')
      .reduce((sum, t) => sum + (Number(t.credit) || 0), 0);

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
        dayAmount: dayAmount,
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
