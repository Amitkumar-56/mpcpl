// src/app/api/cst/customer-history/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pname = searchParams.get('pname');
    const cl_id = searchParams.get('cl_id');
    const customerId = cl_id || 1;

    console.log('🔍 API Called - Customer ID:', customerId);

    // 1. Check customer exists
    let customerData;
    try {
      customerData = await executeQuery(
        'SELECT id, name, balance, client_type FROM customers WHERE id = ?',
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

    // 2. Get customer balance from customer_balances table
    let customerBalanceData;
    try {
      customerBalanceData = await executeQuery(
        'SELECT balance, amtlimit, day_limit, day_amount, total_day_amount FROM customer_balances WHERE com_id = ? AND is_active = 1',
        [customerId]
      );
    } catch (error) {
      console.error('❌ Customer Balance Query Error:', error);
      customerBalanceData = [];
    }

    let currentBalance = 0;
    let amtLimit = 0;
    let dayLimit = 0;
    let dayAmount = 0;
    let totalDayAmount = 0;

    if (customerBalanceData && customerBalanceData.length > 0) {
      const balanceInfo = customerBalanceData[0];
      currentBalance = balanceInfo.balance || 0;
      amtLimit = balanceInfo.amtlimit || 0;
      dayLimit = balanceInfo.day_limit || 0;
      dayAmount = balanceInfo.day_amount || 0;
      totalDayAmount = balanceInfo.total_day_amount || 0;
    }

    // 3. Get filling_history data - FIXED SQL QUERY
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
      WHERE fh.cl_id = ?
    `;

    let params = [customerId];

    if (pname && pname !== '') {
      sql += ' AND p.pname = ?';
      params.push(pname);
    }

    sql += ' ORDER BY fh.filling_date DESC, fh.id DESC';

    console.log('🔍 Executing SQL:', sql);
    console.log('🔍 With params:', params);

    let transactions;
    try {
      transactions = await executeQuery(sql, params);
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
         WHERE fh.cl_id = ?
         ORDER BY p.pname`,
        [customerId]
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

    // 6. Prepare transactions - WITH outstanding (new_amount)
    const finalTransactions = transactions.map((transaction) => ({
      ...transaction,
      outstanding: transaction.new_amount, // new_amount as Outstanding
      remaining_limit: transaction.remaining_limit
    }));

    // 7. Calculate summary
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