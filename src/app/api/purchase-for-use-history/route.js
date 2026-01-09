// app/api/purchase-for-use-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching purchase history...');

    const purchases = await executeQuery(`
      SELECT 
        p.id,
        p.supplier_name,
        p.product_name,
        p.amount,
        p.quantity,
        p.invoice_date,
        p.fs_id,
        p.created_at,
        fs.station_name
      FROM purchase_for_use p
      LEFT JOIN filling_stations fs ON p.fs_id = fs.id
      ORDER BY p.created_at DESC
    `);

    // Fetch audit logs for each purchase
    const purchasesWithLogs = await Promise.all(
      purchases.map(async (purchase) => {
        try {
          const logs = await executeQuery(
            `SELECT 
              al.id,
              al.user_id,
              al.user_name,
              al.action,
              al.remarks,
              al.created_at,
              ep.name as employee_name,
              ep.employee_code
            FROM audit_log al
            LEFT JOIN employee_profile ep ON al.user_id = ep.id
            WHERE al.record_type = 'purchase_for_use' 
              AND al.record_id = ?
            ORDER BY al.created_at DESC`,
            [purchase.id]
          );

          return {
            ...purchase,
            audit_logs: logs || []
          };
        } catch (logError) {
          console.error(`Error fetching logs for purchase ${purchase.id}:`, logError);
          return {
            ...purchase,
            audit_logs: []
          };
        }
      })
    );

    // If no purchases found, return empty array
    if (!purchases || purchases.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No purchases found'
      });
    }

    // Format the data to ensure proper types
    const formattedPurchases = purchasesWithLogs.map(purchase => ({
      id: purchase.id,
      supplier_name: purchase.supplier_name || 'N/A',
      product_name: purchase.product_name || 'N/A',
      amount: parseFloat(purchase.amount) || 0,
      quantity: parseInt(purchase.quantity) || 0,
      invoice_date: purchase.invoice_date,
      created_at: purchase.created_at,
      fs_id: purchase.fs_id,
      station_name: purchase.station_name || 'N/A',
      audit_logs: (purchase.audit_logs || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        user_name: log.employee_name || log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'System'),
        employee_code: log.employee_code,
        action: log.action,
        remarks: log.remarks,
        created_at: log.created_at
      }))
    }));

    return NextResponse.json({
      success: true,
      data: formattedPurchases,
      count: formattedPurchases.length,
      message: 'Purchase history fetched successfully'
    });

  } catch (error) {
    console.error('Database error in purchase-for-use-history:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while fetching purchase history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      },
      { status: 500 }
    );
  }
}