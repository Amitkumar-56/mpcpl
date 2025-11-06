import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pname = searchParams.get('pname');
    const cl_id = searchParams.get('cl_id');
    const customerId = cl_id || 1; // Use parameter or default to 1

    // 1. Check customer exists
    const customerCheck = await executeQuery(
      'SELECT id, name FROM customers WHERE id = ?',
      [customerId]
    );

    if (!customerCheck.success) {
      return NextResponse.json({
        success: false,
        message: 'Customer query failed: ' + customerCheck.error
      }, { status: 500 });
    }

    if (customerCheck.data.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found with ID: ' + customerId
      }, { status: 404 });
    }

    const customer = customerCheck.data[0];

    // 2. Build main query - filling_history से data fetch करें
    let sql = `
      SELECT 
        fh.id,
        fh.filling_date,
        fh.trans_type,
        fh.filling_qty,
        fh.amount,
        fh.credit,
        fh.credit_date,
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

    const result = await executeQuery(sql, params);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch transactions: ' + result.error
      }, { status: 500 });
    }

    const transactions = result.data || [];

    // 3. Get products for filter dropdown
    const productsResult = await executeQuery(
      `SELECT DISTINCT p.pname 
       FROM products p
       INNER JOIN filling_history fh ON p.id = fh.product_id
       WHERE fh.cl_id = ?
       ORDER BY p.pname`,
      [customerId]
    );

    const products = productsResult.success ? productsResult.data.map(p => p.pname) : [];

    // 4. Get customer balance from customers table
    const balanceResult = await executeQuery(
      'SELECT balance FROM customers WHERE id = ?',
      [customerId]
    );

    const balance = balanceResult.success && balanceResult.data.length > 0 
      ? balanceResult.data[0].balance 
      : 0;

    // 5. Calculate running balance
    let runningBalance = Number(balance);
    const transactionsWithBalance = [];

    // Process from oldest to newest for running balance
    const chronologicalTransactions = [...transactions].reverse();

    chronologicalTransactions.forEach((transaction) => {
      if (transaction.trans_type === 'credit') {
        runningBalance += Number(transaction.amount) || 0;
      } else {
        runningBalance -= Number(transaction.credit) || 0;
      }

      transactionsWithBalance.push({
        ...transaction,
        running_balance: runningBalance
      });
    });

    // Reverse back to show newest first
    const finalTransactions = transactionsWithBalance.reverse();

    return NextResponse.json({
      success: true,
      transactions: finalTransactions,
      products: products,
      balance: balance,
      openingBalance: finalTransactions.length > 0 
        ? finalTransactions[finalTransactions.length - 1].running_balance 
        : balance,
      customer: {
        name: customer.name,
        id: customer.id
      },
      summary: {
        totalTransactions: finalTransactions.length,
        filteredBy: pname || 'All Products'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error: ' + error.message
    }, { status: 500 });
  }
}