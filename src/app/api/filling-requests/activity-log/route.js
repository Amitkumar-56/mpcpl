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
        fr.cid as request_customer_id
      FROM filling_logs fl
      LEFT JOIN filling_requests fr ON fl.request_id = fr.id
      ORDER BY COALESCE(fl.updated_date, fl.created_date, fl.processed_date, fl.completed_date) DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `);
    
    // Get total count
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM filling_logs
    `);
    
    // Transform data for activity logs
    const activities = [];
    for (const log of logs) {
      // Fetch names for each ID type
      let createdByName = null;
      let processedByName = null;
      let completedByName = null;
      let cancelledByName = null;
      let updatedByName = null;
      let customerName = null;

      // Check if created_by is a customer or employee
      if (log.created_by) {
        // Try customer first
        const customerResult = await executeQuery(
          `SELECT name FROM customers WHERE id = ${log.created_by}`
        );
        if (customerResult.length > 0) {
          customerName = customerResult[0].name;
          createdByName = customerName;
        } else {
          // Try employee
          const employeeResult = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ${log.created_by}`
          );
          if (employeeResult.length > 0) {
            createdByName = employeeResult[0].name;
          }
        }
      }

      // Get other names (employees only)
      if (log.processed_by) {
        const result = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ${log.processed_by}`
        );
        processedByName = result.length > 0 ? result[0].name : null;
      }

      if (log.completed_by) {
        const result = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ${log.completed_by}`
        );
        completedByName = result.length > 0 ? result[0].name : null;
      }

      if (log.cancelled_by) {
        const result = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ${log.cancelled_by}`
        );
        cancelledByName = result.length > 0 ? result[0].name : null;
      }

      if (log.updated_by) {
        const result = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ${log.updated_by}`
        );
        updatedByName = result.length > 0 ? result[0].name : null;
      }

      activities.push({
        id: log.id,
        requestId: log.request_id,
        description: `Filling Request ${log.request_id}`,
        customerDescription: customerName ? `Customer: ${customerName}` : null,
        
        // Created fields - prioritize customer name for CST requests
        createdAt: log.created_date,
        createdBy: customerName || createdByName || log.created_by,
        
        // Processed fields
        processedBy: processedByName || log.processed_by,
        processedDate: log.processed_date,
        
        // Completed fields
        completedBy: completedByName || log.completed_by,
        completedDate: log.completed_date,
        
        // Cancelled fields
        cancelledBy: cancelledByName || log.cancelled_by,
        cancelledDate: log.cancelled_date,
        
        // Updated fields
        updatedBy: updatedByName || log.updated_by,
        updatedDate: log.updated_date,
        
        // Determine current status (priority: completed > cancelled > processed > created)
        status: log.completed_by ? 'completed' : 
                log.cancelled_by ? 'cancelled' :
                log.processed_by ? 'processed' :
                log.created_by ? 'created' : 'unknown',
                
        // Show current handler (who last acted on it)
        currentHandler: completedByName || cancelledByName || processedByName || updatedByName || customerName || createdByName || log.completed_by || log.cancelled_by || log.processed_by || log.updated_by || log.created_by,
        
        // Last action date
        lastActionDate: log.updated_date || log.completed_date || log.cancelled_date || log.processed_date || log.created_date
      });
    }
    
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