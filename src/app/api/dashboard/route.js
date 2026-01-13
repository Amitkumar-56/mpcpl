// src/app/api/dashboard/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    // Get today and yesterday dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format dates for MySQL
    const todayFormatted = today.toISOString().split('T')[0];
    const yesterdayFormatted = yesterday.toISOString().split('T')[0];

    console.log('📅 Calculating for dates:', { 
      today: todayFormatted, 
      yesterday: yesterdayFormatted 
    });

    // DYNAMIC CLIENT OUTSTANDING CALCULATIONS
    let clientTodayOutstanding = 0;
    let clientYesterdayOutstanding = 0;
    let totalClients = 0;
    let totalTransactions = 0;

    try {
      // ✅ 1. TODAY'S CLIENT OUTSTANDING - USING CORRECT 'rid' COLUMN
      console.log('🔄 Calculating today\'s client outstanding with rid...');
      const todayClientQuery = `
        SELECT COALESCE(SUM(fh.new_amount), 0) as total 
        FROM filling_history fh
        LEFT JOIN filling_requests fr ON fh.rid = fr.rid
        WHERE (
          DATE(fr.completed_date) = ? 
          OR 
          DATE(fh.created_at) = ?
        )
        AND fh.new_amount > 0
        AND fh.cl_id IS NOT NULL
      `;
      const todayClientResult = await executeQuery(todayClientQuery, [todayFormatted, todayFormatted]);
      clientTodayOutstanding = parseFloat(todayClientResult[0]?.total) || 0;
      console.log('✅ Today Client Outstanding:', clientTodayOutstanding);

      // ✅ 2. YESTERDAY'S CLIENT OUTSTANDING - USING CORRECT 'rid' COLUMN
      console.log('🔄 Calculating yesterday\'s total outstanding with rid...');
      const yesterdayClientQuery = `
        SELECT COALESCE(SUM(fh.new_amount), 0) as total 
        FROM filling_history fh
        LEFT JOIN filling_requests fr ON fh.rid = fr.rid
        WHERE fh.cl_id IS NOT NULL
          AND fh.new_amount > 0
          AND (
            DATE(fh.created_at) < ? 
            OR 
            DATE(fr.completed_date) < ?
          )
      `;
      const yesterdayClientResult = await executeQuery(yesterdayClientQuery, [todayFormatted, todayFormatted]);
      clientYesterdayOutstanding = parseFloat(yesterdayClientResult[0]?.total) || 0;
      console.log('✅ Yesterday Client Outstanding (Total Pending):', clientYesterdayOutstanding);

      // ✅ 3. CHECK IF WE HAVE DATA
      const checkTodayDataQuery = `
        SELECT COUNT(*) as count 
        FROM filling_history fh
        LEFT JOIN filling_requests fr ON fh.rid = fr.rid
        WHERE (
          DATE(fr.completed_date) = ? 
          OR 
          DATE(fh.created_at) = ?
        )
        AND fh.new_amount > 0
        AND fh.cl_id IS NOT NULL
      `;
      const todayDataCheck = await executeQuery(checkTodayDataQuery, [todayFormatted, todayFormatted]);
      const hasTodayData = parseInt(todayDataCheck[0]?.count) > 0;

      const checkYesterdayDataQuery = `
        SELECT COUNT(*) as count 
        FROM filling_history fh
        LEFT JOIN filling_requests fr ON fh.rid = fr.rid
        WHERE fh.cl_id IS NOT NULL
          AND fh.new_amount > 0
          AND (
            DATE(fh.created_at) < ? 
            OR 
            DATE(fr.completed_date) < ?
          )
      `;
      const yesterdayDataCheck = await executeQuery(checkYesterdayDataQuery, [todayFormatted, todayFormatted]);
      const hasYesterdayData = parseInt(yesterdayDataCheck[0]?.count) > 0;

      console.log('📊 Data Availability:', {
        today: hasTodayData,
        yesterday: hasYesterdayData,
        todayAmount: clientTodayOutstanding,
        yesterdayAmount: clientYesterdayOutstanding
      });

      // ✅ 4. FALLBACK: If joins don't work, use filling_history only
      if (clientTodayOutstanding === 0 && clientYesterdayOutstanding === 0) {
        console.log('🔄 Using filling_history only as fallback...');
        
        // Today from filling_history
        const todaySimpleQuery = `
          SELECT COALESCE(SUM(new_amount), 0) as total 
          FROM filling_history 
          WHERE DATE(created_at) = ?
            AND new_amount > 0
            AND cl_id IS NOT NULL
        `;
        const todaySimpleResult = await executeQuery(todaySimpleQuery, [todayFormatted]);
        clientTodayOutstanding = parseFloat(todaySimpleResult[0]?.total) || 0;
        
        // Yesterday from filling_history (all before today)
        const yesterdaySimpleQuery = `
          SELECT COALESCE(SUM(new_amount), 0) as total 
          FROM filling_history 
          WHERE DATE(created_at) < ?
            AND new_amount > 0
            AND cl_id IS NOT NULL
        `;
        const yesterdaySimpleResult = await executeQuery(yesterdaySimpleQuery, [todayFormatted]);
        clientYesterdayOutstanding = parseFloat(yesterdaySimpleResult[0]?.total) || 0;
        
        console.log('✅ Fallback Results:', {
          today: clientTodayOutstanding,
          yesterday: clientYesterdayOutstanding
        });
      }

      // ✅ 5. TOTAL CLIENTS - Count from customers table (not filling_history)
      console.log('🔄 Counting total clients from customers table...');
      const totalClientsQuery = `
        SELECT COUNT(*) as count 
        FROM customers 
        WHERE roleid IN (1, 3)
      `;
      const totalClientsResult = await executeQuery(totalClientsQuery);
      totalClients = parseInt(totalClientsResult[0]?.count) || 0;
      console.log('✅ Total Clients (from customers table):', totalClients);

      // ✅ 6. TOTAL TRANSACTIONS - Count from filling_requests table (using completed_date)
      console.log('🔄 Counting total transactions from filling_requests...');
      const totalTransactionsQuery = `
        SELECT COUNT(*) as count 
        FROM filling_requests 
        WHERE cid IS NOT NULL
          AND status = 'Completed'
          AND completed_date IS NOT NULL
      `;
      const totalTransactionsResult = await executeQuery(totalTransactionsQuery);
      totalTransactions = parseInt(totalTransactionsResult[0]?.count) || 0;
      console.log('✅ Total Transactions (from filling_requests, using completed_date):', totalTransactions);

    } catch (error) {
      console.error('❌ Database query error:', error);
      
      // Ultimate fallback - use filling_history only
      console.log('🔄 Using ultimate fallback with filling_history only...');
      try {
        // ✅ FIX: Use completed_date from filling_requests via JOIN
        const todaySimpleQuery = `
          SELECT COALESCE(SUM(fh.new_amount), 0) as total 
          FROM filling_history fh
          LEFT JOIN filling_requests fr ON fh.rid = fr.rid
          WHERE DATE(fr.completed_date) = ?
            AND fh.new_amount > 0
            AND fh.cl_id IS NOT NULL
        `;
        const todaySimpleResult = await executeQuery(todaySimpleQuery, [todayFormatted]);
        clientTodayOutstanding = parseFloat(todaySimpleResult[0]?.total) || 0;
        
        // ✅ FIX: Use completed_date from filling_requests via JOIN
        const yesterdaySimpleQuery = `
          SELECT COALESCE(SUM(fh.new_amount), 0) as total 
          FROM filling_history fh
          LEFT JOIN filling_requests fr ON fh.rid = fr.rid
          WHERE DATE(fr.completed_date) < ?
            AND fh.new_amount > 0
            AND fh.cl_id IS NOT NULL
        `;
        const yesterdaySimpleResult = await executeQuery(yesterdaySimpleQuery, [todayFormatted]);
        clientYesterdayOutstanding = parseFloat(yesterdaySimpleResult[0]?.total) || 0;
        
        console.log('✅ Ultimate Fallback Results:', {
          today: clientTodayOutstanding,
          yesterday: clientYesterdayOutstanding
        });
        
      } catch (finalError) {
        console.log('❌ Ultimate fallback failed, using zeros');
        clientTodayOutstanding = 0;
        clientYesterdayOutstanding = 0;
        totalClients = 0;
        totalTransactions = 0;
      }
    }

    // ✅ 7. COLLECTION EFFICIENCY
    let collectionEfficiency = 0;
    try {
      if (totalTransactions > 0) {
        const efficiencyQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN payment_status = 1 THEN 1 ELSE 0 END) as completed
          FROM filling_history 
          WHERE new_amount > 0
            AND cl_id IS NOT NULL
        `;
        const efficiencyResult = await executeQuery(efficiencyQuery);
        const effData = efficiencyResult[0];
        
        if (effData && effData.total > 0) {
          collectionEfficiency = (effData.completed / effData.total) * 100;
        }
      }
      console.log('✅ Collection Efficiency:', collectionEfficiency);
    } catch (efficiencyError) {
      console.log('Efficiency calculation error:', efficiencyError);
      collectionEfficiency = 0;
    }

    // ✅ 8. PAYMENT STATUS COUNTS - Use filling_requests table which has status and payment_status
    let pendingPayments = 0;
    let clearedPayments = 0;
    try {
      // ✅ FIX: Count pending payments using completed_date
      const pendingQuery = `
        SELECT COUNT(*) as count 
        FROM filling_requests 
        WHERE status = 'Completed'
          AND cid IS NOT NULL
          AND completed_date IS NOT NULL
          AND (payment_status IS NULL OR payment_status IN (0, 2))
      `;
      const pendingResult = await executeQuery(pendingQuery);
      pendingPayments = parseInt(pendingResult[0]?.count) || 0;
      
      // ✅ FIX: Count cleared payments using completed_date
      const clearedQuery = `
        SELECT COUNT(*) as count 
        FROM filling_requests 
        WHERE status = 'Completed'
          AND cid IS NOT NULL
          AND completed_date IS NOT NULL
          AND payment_status = 1
      `;
      const clearedResult = await executeQuery(clearedQuery);
      clearedPayments = parseInt(clearedResult[0]?.count) || 0;
      
      console.log('✅ Payment Status:', { 
        pending: pendingPayments, 
        cleared: clearedPayments 
      });
    } catch (paymentError) {
      console.log('Payment status error:', paymentError);
      // Try alternative query if payment_status column doesn't exist
      try {
        const altPendingQuery = `
          SELECT COUNT(*) as count 
          FROM filling_requests 
          WHERE status = 'Completed'
            AND cid IS NOT NULL
        `;
        const altPendingResult = await executeQuery(altPendingQuery);
        pendingPayments = parseInt(altPendingResult[0]?.count) || 0;
        clearedPayments = 0;
      } catch (altError) {
        console.log('Alternative payment query also failed:', altError);
      }
    }

    // ✅ 9. STOCK HISTORY COUNT - Count from filling_history table
    let totalStockHistory = 0;
    try {
      console.log('🔄 Counting stock history records...');
      const stockHistoryQuery = `
        SELECT COUNT(*) as count 
        FROM filling_history 
        WHERE 1=1
      `;
      const stockHistoryResult = await executeQuery(stockHistoryQuery);
      totalStockHistory = parseInt(stockHistoryResult[0]?.count) || 0;
      console.log('✅ Total Stock History Records:', totalStockHistory);
    } catch (stockHistoryError) {
      console.log('⚠️ Stock history count error:', stockHistoryError);
      totalStockHistory = 0;
    }

    // Additional counts
    let totalStations = 0;
    let totalStocks = 0;
    let totalStockRequests = 0;
    try {
      const stationsResult = await executeQuery(`SELECT COUNT(*) as count FROM filling_stations`);
      totalStations = parseInt(stationsResult[0]?.count) || 0;
    } catch {}
    try {
      const stocksResult = await executeQuery(`SELECT COUNT(*) as count FROM stock`);
      totalStocks = parseInt(stocksResult[0]?.count) || 0;
    } catch {}
    try {
      const stockRequestsResult = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM filling_requests 
        WHERE cid IS NOT NULL
      `);
      totalStockRequests = parseInt(stockRequestsResult[0]?.count) || 0;
    } catch {}

    // ✅ 10. CALCULATE CHANGES
    const clientChange = clientTodayOutstanding;

    // ✅ 11. PREPARE FINAL RESPONSE
    const responseData = {
      vendorYesterdayOutstanding: 0,
      vendorTodayOutstanding: 0,
      clientYesterdayOutstanding: Math.round(clientYesterdayOutstanding),
      clientTodayOutstanding: Math.round(clientTodayOutstanding),
      totalVendors: 0,
      totalClients: totalClients,
      totalTransactions: totalTransactions,
      totalStockHistory: totalStockHistory,
      totalStations: totalStations,
      totalStocks: totalStocks,
      totalStockRequests: totalStockRequests,
      collectionEfficiency: Math.round(collectionEfficiency * 100) / 100,
      pendingPayments: pendingPayments,
      clearedPayments: clearedPayments,
      vendorChange: 0,
      clientChange: Math.round(clientChange)
    };

    console.log('🎯 FINAL Response Data with rid:', responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      lastUpdated: new Date().toISOString(),
      dataSource: 'corrected_rid_column',
      note: 'Using correct rid column for table joins'
    });

  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message,
      dataSource: 'error'
    }, { status: 500 });
  }
}
