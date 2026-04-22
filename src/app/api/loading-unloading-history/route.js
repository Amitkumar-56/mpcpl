// src/app/api/loading-unloading-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('🔍 Loading-Unloading History API Called');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('role');

    const shipmentIdFilter = searchParams.get('shipment_id');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 10, 1), 100); // Between 1-100
    const offset = Math.max((page - 1) * limit, 0); // Ensure non-negative
    
    console.log('🔢 Pagination values:', { page, limit, offset, shipmentIdFilter });
    console.log('📊 Request Params:', { userId, userRole, shipmentIdFilter, page, limit });

    // Check if user is authenticated
    if (!userId) {
      console.log('❌ No user_id provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ FIX: Get user's role from employee_profile
    const userQuery = `SELECT id, role FROM employee_profile WHERE id = ?`;
    const userResult = await executeQuery(userQuery, [userId]);
    
    if (userResult.length === 0) {
      console.log('❌ User not found in employee_profile:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const employeeId = userResult[0].id;
    const employeeRole = userResult[0].role;
    console.log('👤 User Details:', { employeeId, employeeRole });

    // ✅ FIX: SIMPLIFIED Permission check
    let finalPermissions = { can_view: 0, can_edit: 0, can_create: 0 };

    // Admin (role 5) has full access
    if (employeeRole == 5) {
      console.log('👑 Admin access granted');
      finalPermissions = { can_view: 1, can_edit: 1, can_create: 1 };
    } else {
      // Check permissions for Loading modules - SIMPLIFIED
      console.log('🔍 Checking permissions for non-admin user...');
      
      try {
        // Direct permission check for Loading & Unloading module
        const permQuery = `
          SELECT can_view, can_edit, can_create 
          FROM role_permissions 
          WHERE (module_name = 'Loading & Unloading' OR module_name LIKE '%Loading%') 
            AND (employee_id = ? OR role = ?)
          ORDER BY 
            CASE 
              WHEN module_name = 'Loading & Unloading' THEN 1
              WHEN module_name LIKE '%Loading%' THEN 2
              ELSE 3
            END
          LIMIT 1
        `;
        
        const permResult = await executeQuery(permQuery, [employeeId, employeeRole]);
        
        if (permResult.length > 0) {
          console.log('✅ Found permissions:', permResult[0]);
          finalPermissions = {
            can_view: permResult[0].can_view || 0,
            can_edit: permResult[0].can_edit || 0,
            can_create: permResult[0].can_create || 0
          };
        } else {
          console.log('⚠️ No permissions found, trying fallback...');
          
          // Fallback: Check if user has any Loading-related permission
          const fallbackQuery = `
            SELECT can_view, can_edit, can_create 
            FROM role_permissions 
            WHERE module_name LIKE '%Loading%' 
            LIMIT 1
          `;
          
          const fallbackResult = await executeQuery(fallbackQuery);
          
          if (fallbackResult.length > 0) {
            console.log('✅ Fallback permissions found:', fallbackResult[0]);
            finalPermissions = {
              can_view: fallbackResult[0].can_view || 0,
              can_edit: fallbackResult[0].can_edit || 0,
              can_create: fallbackResult[0].can_create || 0
            };
          }
        }
      } catch (permErr) {
        console.error('❌ Permission query error:', permErr);
      }
    }

    // Check if user has any permission
    const isAllowed = finalPermissions.can_view == 1 || 
                     finalPermissions.can_edit == 1 || 
                     finalPermissions.can_create == 1;
    
    console.log('🔐 Permission Result:', {
      employeeId,
      employeeRole,
      finalPermissions,
      isAllowed
    });

    if (!isAllowed && employeeRole != 5) {
      console.log('❌ Access denied');
      return NextResponse.json({ 
        error: 'You do not have permission to access this page.',
        details: 'Please contact administrator for access rights.'
      }, { status: 403 });
    }

    // ✅ Get shipment records - SIMPLIFIED QUERY
    let shipmentResult = [];
    try {
      console.log('📦 Fetching shipment records...');
      
      let shipmentQuery = `
        SELECT 
          shipment_id as id,
          shipment_id,
          lr_no,
          tanker,
          driver,
          dispatch,
          driver_mobile,
          consignee,
          empty_weight_loading,
          loaded_weight_loading,
          net_weight_loading,
          final_loading_datetime,
          entered_by_loading,
          empty_weight_unloading,
          loaded_weight_unloading,
          net_weight_unloading,
          final_unloading_datetime,
          created_at
        FROM shipment_records
      `;
      const params = [];
      if (shipmentIdFilter) {
        shipmentQuery += ` WHERE shipment_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        params.push(parseInt(shipmentIdFilter));
      } else {
        shipmentQuery += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        // No params needed for this case
      }
      
      console.log('Final Query:', shipmentQuery);
      console.log('Final Params:', params);
      shipmentResult = await executeQuery(shipmentQuery, params) || [];
      console.log(`Found ${shipmentResult.length} shipment records for page ${page}`);
      
      // If no results, try basic query with pagination
      if (shipmentResult.length === 0) {
        const basicQuery = `SELECT * FROM shipment_records ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        console.log('Basic Query:', basicQuery);
        shipmentResult = await executeQuery(basicQuery, []) || [];
      }
    } catch (err) {
      console.error('❌ Error in shipment query:', err);
      shipmentResult = [];
    }

    // Get total count for pagination
    let totalCount = 0;
    try {
      let countQuery = "SELECT COUNT(*) as total FROM shipment_records";
      const countParams = [];
      if (shipmentIdFilter) {
        countQuery += " WHERE shipment_id = ?";
        countParams.push(parseInt(shipmentIdFilter));
      }
      const countResult = await executeQuery(countQuery, countParams);
      if (countResult && countResult.length > 0) {
        totalCount = parseInt(countResult[0].total) || 0;
      }
    } catch (err) {
      console.error('Error in total count:', err);
    }

    // Get summary data
    const summary = { total: totalCount, completed: 0, pending: 0, drivers: 0 };

    try {
      const completedQuery = `
        SELECT COUNT(*) as completed 
        FROM shipment_records 
        WHERE net_weight_loading > 0 OR net_weight_unloading > 0
      `;
      const completedResult = await executeQuery(completedQuery);
      if (completedResult && completedResult.length > 0) {
        summary.completed = parseInt(completedResult[0].completed) || 0;
      }
    } catch (err) {
      console.error('Error in completed count:', err);
    }

    try {
      const pendingQuery = `
        SELECT COUNT(*) as pending 
        FROM shipment_records 
        WHERE (net_weight_loading = 0 OR net_weight_loading IS NULL) 
          AND (net_weight_unloading = 0 OR net_weight_unloading IS NULL)
      `;
      const pendingResult = await executeQuery(pendingQuery);
      if (pendingResult && pendingResult.length > 0) {
        summary.pending = parseInt(pendingResult[0].pending) || 0;
      }
    } catch (err) {
      console.error('Error in pending count:', err);
    }

    try {
      const driversQuery = `
        SELECT COUNT(DISTINCT driver) as drivers 
        FROM shipment_records 
        WHERE driver IS NOT NULL AND driver != ''
      `;
      const driversResult = await executeQuery(driversQuery);
      if (driversResult && driversResult.length > 0) {
        summary.drivers = parseInt(driversResult[0].drivers) || 0;
      }
    } catch (err) {
      console.error('Error in drivers count:', err);
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalCount,
      recordsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    console.log('📊 Final Response:', {
      shipmentsCount: shipmentResult.length,
      summary,
      permissions: finalPermissions,
      pagination
    });

    return NextResponse.json({
      success: true,
      shipments: shipmentResult,
      permissions: finalPermissions,
      summary: summary,
      pagination: pagination
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }, { status: 500 });
  }
}
