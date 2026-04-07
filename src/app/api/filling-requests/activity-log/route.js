// src/app/api/filling-requests/activity-log/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
export async function GET(request) {
  try {
    const startTime = Date.now();
    console.log('🚀 Activity Log API called at:', new Date().toISOString());
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Extract filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const handler = searchParams.get('handler') || 'all';
    const createdBy = searchParams.get('createdBy') || 'all';
    const processedBy = searchParams.get('processedBy') || 'all';
    const completedBy = searchParams.get('completedBy') || 'all';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    
    console.log('📊 Filters:', { search, status, handler, createdBy, processedBy, completedBy, dateFrom, dateTo });
    
    // Build WHERE conditions
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(`fl.request_id LIKE '%${search}%'`);
    }
    
    if (status !== 'all') {
      switch (status) {
        case 'created':
          whereConditions.push('fl.created_by IS NOT NULL AND fl.processed_by IS NULL AND fl.completed_by IS NULL AND fl.cancelled_by IS NULL');
          break;
        case 'processed':
          whereConditions.push('fl.processed_by IS NOT NULL AND fl.completed_by IS NULL AND fl.cancelled_by IS NULL');
          break;
        case 'completed':
          whereConditions.push('fl.completed_by IS NOT NULL');
          break;
        case 'cancelled':
          whereConditions.push('fl.cancelled_by IS NOT NULL');
          break;
      }
    }
    
    // Simplified filtering - use employee names from employee_profile
    if (handler !== 'all' && handler !== 'All Handlers') {
      whereConditions.push(`(
        fl.created_by IN (SELECT id FROM employee_profile WHERE name = '${handler}') OR
        fl.processed_by IN (SELECT id FROM employee_profile WHERE name = '${handler}') OR
        fl.completed_by IN (SELECT id FROM employee_profile WHERE name = '${handler}') OR
        fl.cancelled_by IN (SELECT id FROM employee_profile WHERE name = '${handler}') OR
        fl.updated_by IN (SELECT id FROM employee_profile WHERE name = '${handler}')
      )`);
    }
    
    if (createdBy !== 'all' && createdBy !== 'All Creators') {
      whereConditions.push(`fl.created_by IN (SELECT id FROM employee_profile WHERE name = '${createdBy}')`);
    }
    
    if (processedBy !== 'all' && processedBy !== 'All Processors') {
      whereConditions.push(`fl.processed_by IN (SELECT id FROM employee_profile WHERE name = '${processedBy}')`);
    }
    
    if (completedBy !== 'all' && completedBy !== 'All Completers') {
      whereConditions.push(`fl.completed_by IN (SELECT id FROM employee_profile WHERE name = '${completedBy}')`);
    }
    
    if (dateFrom) {
      whereConditions.push(`DATE(fl.created_date) >= '${dateFrom}'`);
    }
    
    if (dateTo) {
      whereConditions.push(`DATE(fl.created_date) <= '${dateTo}'`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    console.log('🔍 WHERE clause:', whereClause);
    
    // Simplified main query - use basic columns (name columns don't exist yet)
    const queryStartTime = Date.now();
    const logs = await executeQuery(`
      SELECT 
        fl.id,
        fl.request_id,
        fl.created_by,
        fl.processed_by,
        fl.completed_by,
        fl.cancelled_by,
        fl.updated_by,
        fl.created_date,
        fl.processed_date,
        fl.completed_date,
        fl.cancelled_date,
        fl.updated_date
      FROM filling_logs fl
      ${whereClause}
      ORDER BY COALESCE(fl.updated_date, fl.created_date, fl.processed_date, fl.completed_date) DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `);
    
    console.log(`⏱️ Main query took: ${Date.now() - queryStartTime}ms for ${logs.length} records`);
    
    // Get total count
    const countStartTime = Date.now();
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM filling_logs fl
      ${whereClause}
    `);
    console.log(`⏱️ Count query took: ${Date.now() - countStartTime}ms`);
    
    // Transform data for activity logs - fetch employee names
    const transformStartTime = Date.now();
    const activities = [];
    
    // Batch fetch all employee names
    const allUserIds = new Set();
    logs.forEach(log => {
      if (log.created_by) allUserIds.add(log.created_by);
      if (log.processed_by) allUserIds.add(log.processed_by);
      if (log.completed_by) allUserIds.add(log.completed_by);
      if (log.cancelled_by) allUserIds.add(log.cancelled_by);
      if (log.updated_by) allUserIds.add(log.updated_by);
    });
    
    const userIdsArray = Array.from(allUserIds);
    const employeeNameMap = {};
    
    if (userIdsArray.length > 0) {
      const employees = await executeQuery(
        `SELECT id, name FROM employee_profile WHERE id IN (${userIdsArray.join(',')})`
      );
      employees.forEach(emp => {
        employeeNameMap[emp.id] = emp.name;
      });
    }
    
    // Transform records using fetched employee names
    logs.forEach(log => {
      const createdByName = employeeNameMap[log.created_by];
      const processedByName = employeeNameMap[log.processed_by];
      const completedByName = employeeNameMap[log.completed_by];
      const cancelledByName = employeeNameMap[log.cancelled_by];
      const updatedByName = employeeNameMap[log.updated_by];
      
      // Debug logging for first few records
      if (activities.length < 5) {
        console.log(`Using fetched names for log ${log.request_id}:`, {
          logIds: {
            created_by: log.created_by,
            processed_by: log.processed_by,
            completed_by: log.completed_by,
            cancelled_by: log.cancelled_by,
            updated_by: log.updated_by
          },
          employeeNames: {
            created_by: employeeNameMap[log.created_by],
            processed_by: employeeNameMap[log.processed_by],
            completed_by: employeeNameMap[log.completed_by],
            cancelled_by: employeeNameMap[log.cancelled_by],
            updated_by: employeeNameMap[log.updated_by]
          },
          finalNames: {
            createdBy: createdByName,
            processedBy: processedByName,
            completedBy: completedByName,
            cancelledBy: cancelledByName,
            updatedBy: updatedByName
          }
        });
      }
      
      activities.push({
        id: log.id,
        requestId: log.request_id,
        description: `Filling Request ${log.request_id}`,
        customerDescription: null,
        
        // Created fields
        createdAt: log.created_date,
        createdBy: createdByName || log.created_by,
        
        // Processed fields - prioritize employee names
        processedBy: processedByName || log.processed_by,
        processedDate: log.processed_date,
        
        // Completed fields - prioritize employee names
        completedBy: completedByName || log.completed_by,
        completedDate: log.completed_date,
        
        // Cancelled fields - prioritize employee names
        cancelledBy: cancelledByName || log.cancelled_by,
        cancelledDate: log.cancelled_date,
        
        // Updated fields
        updatedBy: updatedByName || log.updated_by,
        updatedDate: log.updated_date,
        
        // Determine current status
        status: log.completed_by ? 'completed' : 
                log.cancelled_by ? 'cancelled' :
                log.processed_by ? 'processed' :
                log.created_by ? 'created' : 'unknown',
                
        // Show current handler - prioritize employee names for actions
        currentHandler: completedByName || cancelledByName || processedByName || updatedByName || createdByName || log.completed_by || log.cancelled_by || log.processed_by || log.updated_by || log.created_by,
        
        // Last action date
        lastActionDate: log.updated_date || log.completed_date || log.cancelled_date || log.processed_date || log.created_date
      });
    });
    
    console.log(`⏱️ Transform took: ${Date.now() - transformStartTime}ms`);
    console.log(`⏱️ Total API time: ${Date.now() - startTime}ms`);
    
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