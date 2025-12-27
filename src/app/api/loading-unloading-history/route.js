// src/app/api/loading-unloading-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const role = searchParams.get('role');

    // Check if user is authenticated (you'll need to implement proper auth)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get shipment records - handle both id and shipment_id columns
    let shipmentResult = [];
    try {
      const shipmentQuery = `
        SELECT 
          COALESCE(shipment_id, id) as id,
          tanker, tanker_number,
          driver, driver_name,
          dispatch, dispatch_from,
          driver_mobile,
          empty_weight_loading,
          loaded_weight_loading, loaded_weight,
          net_weight_loading, net_weight,
          final_loading_datetime,
          entered_by_loading,
          seal1_loading,
          seal2_loading,
          seal_datetime_loading,
          sealed_by_loading,
          density_loading,
          temperature_loading,
          timing_loading,
          consignee, customer_name,
          empty_weight_unloading,
          loaded_weight_unloading,
          net_weight_unloading,
          final_unloading_datetime,
          entered_by_unloading,
          seal1_unloading,
          seal2_unloading,
          seal_datetime_unloading,
          sealed_by_unloading,
          density_unloading,
          temperature_unloading,
          timing_unloading,
          created_at,
          updated_at
        FROM shipment_records 
        ORDER BY created_at DESC
      `;
      shipmentResult = await executeQuery(shipmentQuery) || [];
    } catch (err) {
      console.error('Error fetching shipment records:', err);
      // Return empty array if query fails, but log the error
      shipmentResult = [];
    }

    // ✅ FIX: Get user's role from employee_profile first
    const userQuery = `SELECT role FROM employee_profile WHERE id = ?`;
    const userResult = await executeQuery(userQuery, [userId]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userRole = userResult[0].role;

    // ✅ FIX: Use exact module name as stored in database: "Loading History"
    const moduleName = 'Loading History';
    
    // ✅ FIX: Check permissions with employee_id AND role (as per database structure)
    // First check for employee-specific permissions
    let permissionQuery = `
      SELECT module_name, can_view, can_edit, can_create 
      FROM role_permissions 
      WHERE employee_id = ? AND module_name = ?
    `;
    let permissionResult = await executeQuery(permissionQuery, [userId, moduleName]);

    // If no employee-specific permission found, check role-based permissions
    if (permissionResult.length === 0) {
      permissionQuery = `
        SELECT module_name, can_view, can_edit, can_create 
        FROM role_permissions 
        WHERE role = ? AND module_name = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissionResult = await executeQuery(permissionQuery, [userRole, moduleName]);
    }

    // ✅ FIX: Also check if employee_id matches AND role matches
    if (permissionResult.length === 0) {
      permissionQuery = `
        SELECT module_name, can_view, can_edit, can_create 
        FROM role_permissions 
        WHERE employee_id = ? AND role = ? AND module_name = ?
      `;
      permissionResult = await executeQuery(permissionQuery, [userId, userRole, moduleName]);
    }

    // Admin (role 5) has full access
    if (userRole === 5) {
      permissionResult = [{
        module_name: moduleName,
        can_view: 1,
        can_edit: 1,
        can_create: 1
      }];
    }

    // Check view permission
    if (permissionResult.length === 0 || permissionResult[0].can_view !== 1) {
      console.log('❌ Access denied - No permission for Loading History module', {
        userId,
        role: userRole,
        moduleName,
        permissionFound: permissionResult.length > 0
      });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get summary data - wrap in try-catch for each query
    let totalResult = [{ total: 0 }];
    let completedResult = [{ completed: 0 }];
    let pendingResult = [{ pending: 0 }];
    let driversResult = [{ drivers: 0 }];

    try {
      const totalQuery = "SELECT COUNT(*) as total FROM shipment_records";
      totalResult = await executeQuery(totalQuery) || [{ total: 0 }];
    } catch (err) {
      console.error('Error fetching total count:', err);
    }

    try {
      // Handle both net_weight_loading and net_weight columns
      const completedQuery = `
        SELECT COUNT(*) as completed 
        FROM shipment_records 
        WHERE (net_weight_loading > 0 OR net_weight > 0)
      `;
      completedResult = await executeQuery(completedQuery) || [{ completed: 0 }];
    } catch (err) {
      console.error('Error fetching completed count:', err);
    }

    try {
      const pendingQuery = `
        SELECT COUNT(*) as pending 
        FROM shipment_records 
        WHERE (net_weight_loading = 0 OR net_weight_loading IS NULL)
          AND (net_weight = 0 OR net_weight IS NULL)
      `;
      pendingResult = await executeQuery(pendingQuery) || [{ pending: 0 }];
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }

    try {
      // Handle both driver and driver_name columns
      const driversQuery = `
        SELECT COUNT(DISTINCT COALESCE(driver, driver_name, '')) as drivers 
        FROM shipment_records 
        WHERE (driver IS NOT NULL AND driver != '') 
           OR (driver_name IS NOT NULL AND driver_name != '')
      `;
      driversResult = await executeQuery(driversQuery) || [{ drivers: 0 }];
    } catch (err) {
      console.error('Error fetching drivers count:', err);
    }

    console.log('✅ Loading-Unloading History Data:', {
      shipmentsCount: shipmentResult.length,
      total: totalResult[0]?.total || 0,
      completed: completedResult[0]?.completed || 0,
      pending: pendingResult[0]?.pending || 0,
      drivers: driversResult[0]?.drivers || 0
    });

    return NextResponse.json({
      shipments: shipmentResult || [],
      permissions: permissionResult[0] || { can_view: 0, can_edit: 0, can_create: 0 },
      summary: {
        total: parseInt(totalResult[0]?.total) || 0,
        completed: parseInt(completedResult[0]?.completed) || 0,
        pending: parseInt(pendingResult[0]?.pending) || 0,
        drivers: parseInt(driversResult[0]?.drivers) || 0
      }
    });

  } catch (error) {
    console.error('❌ Loading-Unloading History API Error:', error);
    console.error('❌ Error Stack:', error.stack);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}