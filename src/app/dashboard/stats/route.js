// app/api/dashboard/stats/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate dates for today and yesterday
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log('Calculating stats for:', { today: todayStr, yesterday: yesterdayStr });

    // Get all required data
    const [
      vendorYesterdayOutstanding,
      vendorTodayOutstanding,
      clientYesterdayOutstanding,
      clientTodayOutstanding,
      totalVendors,
      totalClients,
      totalTransactions
    ] = await Promise.all([
      calculateVendorOutstanding(yesterdayStr),
      calculateVendorOutstanding(todayStr),
      calculateClientOutstanding(yesterdayStr),
      calculateClientOutstanding(todayStr),
      getTotalVendors(),
      getTotalClients(),
      getTotalTransactions(todayStr)
    ]);

    const stats = {
      vendorYesterdayOutstanding: vendorYesterdayOutstanding.total,
      vendorTodayOutstanding: vendorTodayOutstanding.total,
      clientYesterdayOutstanding: clientYesterdayOutstanding.total,
      clientTodayOutstanding: clientTodayOutstanding.total,
      totalVendors: totalVendors,
      totalClients: totalClients,
      totalTransactions: totalTransactions,
      collectionEfficiency: calculateCollectionEfficiency(
        clientYesterdayOutstanding.total,
        clientTodayOutstanding.total
      ),
      pendingPayments: vendorTodayOutstanding.pending + clientTodayOutstanding.pending,
      clearedPayments: vendorTodayOutstanding.cleared + clientTodayOutstanding.cleared,
      timestamp: new Date().toISOString()
    };

    console.log('Final stats:', stats);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Calculate Vendor Outstanding for a specific date
async function calculateVendorOutstanding(date) {
  try {
    // Get vendor transactions from filling_history
    const vendorQuery = `
      SELECT 
        SUM(amount) as total_amount,
        SUM(credit) as total_credit,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT cl_id) as vendor_count
      FROM filling_history 
      WHERE trans_type LIKE '%vendor%' 
        AND filling_date = ?
        AND credit > 0
    `;
    const vendorResults = await executeQuery(vendorQuery, [date]);

    // Get pending vendor requests from filling_requests
    const pendingQuery = `
      SELECT COUNT(*) as pending_count
      FROM filling_requests 
      WHERE request_type LIKE '%vendor%' 
        AND status = 'pending'
        AND DATE(created_at) = ?
    `;
    const pendingVendors = await executeQuery(pendingQuery, [date]);

    // Get cleared vendor requests
    const clearedQuery = `
      SELECT COUNT(*) as cleared_count
      FROM filling_requests 
      WHERE request_type LIKE '%vendor%' 
        AND status = 'completed'
        AND DATE(created_at) = ?
    `;
    const clearedVendors = await executeQuery(clearedQuery, [date]);

    const result = vendorResults[0] || {};
    
    return {
      total: parseFloat(result.total_amount) || 0,
      credit: parseFloat(result.total_credit) || 0,
      transactions: result.transaction_count || 0,
      vendors: result.vendor_count || 0,
      pending: pendingVendors[0]?.pending_count || 0,
      cleared: clearedVendors[0]?.cleared_count || 0
    };
  } catch (error) {
    console.error('Error calculating vendor outstanding:', error);
    return { total: 0, credit: 0, transactions: 0, vendors: 0, pending: 0, cleared: 0 };
  }
}

// Calculate Client Outstanding for a specific date
async function calculateClientOutstanding(date) {
  try {
    // Get client transactions from filling_history
    const clientQuery = `
      SELECT 
        SUM(amount) as total_amount,
        SUM(credit) as total_credit,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT cl_id) as client_count
      FROM filling_history 
      WHERE trans_type LIKE '%client%' 
        AND filling_date = ?
        AND credit > 0
    `;
    const clientResults = await executeQuery(clientQuery, [date]);

    // Get pending client requests from filling_requests
    const pendingQuery = `
      SELECT COUNT(*) as pending_count
      FROM filling_requests 
      WHERE request_type LIKE '%client%' 
        AND status = 'pending'
        AND DATE(created_at) = ?
    `;
    const pendingClients = await executeQuery(pendingQuery, [date]);

    // Get cleared client requests
    const clearedQuery = `
      SELECT COUNT(*) as cleared_count
      FROM filling_requests 
      WHERE request_type LIKE '%client%' 
        AND status = 'completed'
        AND DATE(created_at) = ?
    `;
    const clearedClients = await executeQuery(clearedQuery, [date]);

    const result = clientResults[0] || {};
    
    return {
      total: parseFloat(result.total_amount) || 0,
      credit: parseFloat(result.total_credit) || 0,
      transactions: result.transaction_count || 0,
      clients: result.client_count || 0,
      pending: pendingClients[0]?.pending_count || 0,
      cleared: clearedClients[0]?.cleared_count || 0
    };
  } catch (error) {
    console.error('Error calculating client outstanding:', error);
    return { total: 0, credit: 0, transactions: 0, clients: 0, pending: 0, cleared: 0 };
  }
}

// Get total active vendors (last 30 days)
async function getTotalVendors() {
  try {
    const query = `
      SELECT COUNT(DISTINCT cl_id) as vendor_count
      FROM filling_history 
      WHERE trans_type LIKE '%vendor%' 
        AND filling_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    const result = await executeQuery(query);
    return result[0]?.vendor_count || 0;
  } catch (error) {
    console.error('Error getting total vendors:', error);
    return 0;
  }
}

// Get total active clients (last 30 days)
async function getTotalClients() {
  try {
    const query = `
      SELECT COUNT(DISTINCT cl_id) as client_count
      FROM filling_history 
      WHERE trans_type LIKE '%client%' 
        AND filling_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    const result = await executeQuery(query);
    return result[0]?.client_count || 0;
  } catch (error) {
    console.error('Error getting total clients:', error);
    return 0;
  }
}

// Get total transactions for today
async function getTotalTransactions(date) {
  try {
    const query = `
      SELECT COUNT(*) as transaction_count
      FROM filling_history 
      WHERE filling_date = ?
    `;
    const result = await executeQuery(query, [date]);
    return result[0]?.transaction_count || 0;
  } catch (error) {
    console.error('Error getting total transactions:', error);
    return 0;
  }
}

// Calculate collection efficiency
function calculateCollectionEfficiency(yesterdayAmount, todayAmount) {
  if (!yesterdayAmount || yesterdayAmount === 0) return 100;
  
  const collected = yesterdayAmount - todayAmount;
  if (collected <= 0) return 0;
  
  const efficiency = (collected / yesterdayAmount) * 100;
  return Math.min(100, Math.max(0, parseFloat(efficiency.toFixed(2))));
}