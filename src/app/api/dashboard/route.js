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

      // ✅ 5. TOTAL CLIENTS
      console.log('🔄 Counting total clients...');
      const totalClientsQuery = `
        SELECT COUNT(DISTINCT cl_id) as count 
        FROM filling_history 
        WHERE cl_id IS NOT NULL
      `;
      const totalClientsResult = await executeQuery(totalClientsQuery);
      totalClients = parseInt(totalClientsResult[0]?.count) || 0;
      console.log('✅ Total Clients:', totalClients);

      // ✅ 6. TOTAL TRANSACTIONS
      console.log('🔄 Counting total transactions...');
      const totalTransactionsQuery = `
        SELECT COUNT(*) as count 
        FROM filling_history 
        WHERE new_amount > 0
          AND cl_id IS NOT NULL
      `;
      const totalTransactionsResult = await executeQuery(totalTransactionsQuery);
      totalTransactions = parseInt(totalTransactionsResult[0]?.count) || 0;
      console.log('✅ Total Transactions:', totalTransactions);

    } catch (error) {
      console.error('❌ Database query error:', error);
      
      // Ultimate fallback - use filling_history only
      console.log('🔄 Using ultimate fallback with filling_history only...');
      try {
        const todaySimpleQuery = `
          SELECT COALESCE(SUM(new_amount), 0) as total 
          FROM filling_history 
          WHERE DATE(created_at) = ?
            AND new_amount > 0
            AND cl_id IS NOT NULL
        `;
        const todaySimpleResult = await executeQuery(todaySimpleQuery, [todayFormatted]);
        clientTodayOutstanding = parseFloat(todaySimpleResult[0]?.total) || 0;
        
        const yesterdaySimpleQuery = `
          SELECT COALESCE(SUM(new_amount), 0) as total 
          FROM filling_history 
          WHERE DATE(created_at) < ?
            AND new_amount > 0
            AND cl_id IS NOT NULL
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
      if (totalTransactions > 0) {
        const paymentStatusQuery = `
          SELECT 
            SUM(CASE WHEN (status != 'Completed' OR payment_status IN (0, 2)) THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'Completed' AND payment_status = 1 THEN 1 ELSE 0 END) as completed
          FROM filling_requests 
          WHERE status = 'Completed'
            AND cid IS NOT NULL
        `;
        const paymentStatusResult = await executeQuery(paymentStatusQuery);
        const payData = paymentStatusResult[0];
        
        pendingPayments = parseInt(payData?.pending) || 0;
        clearedPayments = parseInt(payData?.completed) || 0;
      }
      console.log('✅ Payment Status:', { 
        pending: pendingPayments, 
        cleared: clearedPayments 
      });
    } catch (paymentError) {
      console.log('Payment status error:', paymentError);
    }

    // ✅ 9. CALCULATE CHANGES
    const clientChange = clientTodayOutstanding;

    // ✅ 10. PREPARE FINAL RESPONSE
    const responseData = {
      vendorYesterdayOutstanding: 0,
      vendorTodayOutstanding: 0,
      clientYesterdayOutstanding: Math.round(clientYesterdayOutstanding),
      clientTodayOutstanding: Math.round(clientTodayOutstanding),
      totalVendors: 0,
      totalClients: totalClients,
      totalTransactions: totalTransactions,
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