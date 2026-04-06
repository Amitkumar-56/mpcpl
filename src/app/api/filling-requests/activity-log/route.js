// src/app/api/filling-requests/activity-log/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Main query - including ALL fields from filling_logs
    const logs = await executeQuery(`
      SELECT 
        fl.id,
        fl.request_id,
        fl.created_by,
        fl.processed_by,
        fl.completed_by,
        fl.cancelled_by,
        fl.created_date,
        fl.processed_date,
        fl.completed_date,
        fl.cancelled_date,
        fl.updated_by,
        fl.updated_date,
        ep_created.name as created_by_name,
        ep_processed.name as processed_by_name,
        ep_completed.name as completed_by_name,
        ep_cancelled.name as cancelled_by_name,
        ep_updated.name as updated_by_name,
        c_created.name as customer_name,
        fr.cid as request_customer_id
      FROM filling_logs fl
      LEFT JOIN filling_requests fr ON fl.request_id = fr.id
      LEFT JOIN employee_profile ep_created ON ep_created.id = fl.created_by
      LEFT JOIN employee_profile ep_processed ON ep_processed.id = fl.processed_by
      LEFT JOIN employee_profile ep_completed ON ep_completed.id = fl.completed_by
      LEFT JOIN employee_profile ep_cancelled ON ep_cancelled.id = fl.cancelled_by
      LEFT JOIN employee_profile ep_updated ON ep_updated.id = fl.updated_by
      LEFT JOIN customers c_created ON c_created.id = fl.created_by
      ORDER BY COALESCE(fl.updated_date, fl.created_date, fl.processed_date, fl.completed_date) DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    // Get total count
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM filling_logs
    `);
    
    // Transform data for activity logs
    const activities = logs.map(log => ({
      id: log.id,
      requestId: log.request_id,
      description: `Filling Request ${log.request_id}`,
      customerDescription: log.customer_name ? `Customer: ${log.customer_name}` : null,
      
      // Created fields - prioritize customer name for CST requests
      createdAt: log.created_date,
      createdBy: log.customer_name || log.created_by_name || log.created_by,
      
      // Processed fields
      processedBy: log.processed_by_name || log.processed_by,
      processedDate: log.processed_date,
      
      // Completed fields
      completedBy: log.completed_by_name || log.completed_by,
      completedDate: log.completed_date,
      
      // Cancelled fields
      cancelledBy: log.cancelled_by_name || log.cancelled_by,
      cancelledDate: log.cancelled_date,
      
      // Updated fields
      updatedBy: log.updated_by_name || log.updated_by,
      updatedDate: log.updated_date,
      
      // Determine current status (priority: completed > cancelled > processed > created)
      status: log.completed_by ? 'completed' : 
              log.cancelled_by ? 'cancelled' :
              log.processed_by ? 'processed' :
              log.created_by ? 'created' : 'unknown',
              
      // Show current handler (who last acted on it)
      currentHandler: log.completed_by_name || log.cancelled_by_name || log.processed_by_name || log.updated_by_name || log.customer_name || log.created_by_name || log.completed_by || log.cancelled_by || log.processed_by || log.updated_by || log.created_by,
      
      // Last action date
      lastActionDate: log.updated_date || log.completed_date || log.cancelled_date || log.processed_date || log.created_date
    }));
    
    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        total: countResult[0].total,
        limit: limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching filling request activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs: ' + error.message },
      { status: 500 }
    );
  }
}