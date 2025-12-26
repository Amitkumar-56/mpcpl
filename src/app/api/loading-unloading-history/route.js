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

    // Get shipment records
    const shipmentQuery = `
      SELECT * FROM shipment_records 
      ORDER BY created_at DESC
    `;
    const shipmentResult = await executeQuery(shipmentQuery) || [];

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
      SELECT module_name, can_view, can_edit, can_delete, can_create 
      FROM role_permissions 
      WHERE employee_id = ? AND module_name = ?
    `;
    let permissionResult = await executeQuery(permissionQuery, [userId, moduleName]);

    // If no employee-specific permission found, check role-based permissions
    if (permissionResult.length === 0) {
      permissionQuery = `
        SELECT module_name, can_view, can_edit, can_delete, can_create 
        FROM role_permissions 
        WHERE role = ? AND module_name = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissionResult = await executeQuery(permissionQuery, [userRole, moduleName]);
    }

    // ✅ FIX: Also check if employee_id matches AND role matches
    if (permissionResult.length === 0) {
      permissionQuery = `
        SELECT module_name, can_view, can_edit, can_delete, can_create 
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
        can_delete: 1,
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

    // Get summary data
    const totalQuery = "SELECT COUNT(*) as total FROM shipment_records";
    const totalResult = await executeQuery(totalQuery) || [{ total: 0 }];

    const completedQuery = "SELECT COUNT(*) as completed FROM shipment_records WHERE net_weight_loading > 0";
    const completedResult = await executeQuery(completedQuery) || [{ completed: 0 }];

    const pendingQuery = "SELECT COUNT(*) as pending FROM shipment_records WHERE net_weight_loading = 0 OR net_weight_loading IS NULL";
    const pendingResult = await executeQuery(pendingQuery) || [{ pending: 0 }];

    const driversQuery = "SELECT COUNT(DISTINCT driver) as drivers FROM shipment_records";
    const driversResult = await executeQuery(driversQuery) || [{ drivers: 0 }];

    return NextResponse.json({
      shipments: shipmentResult,
      permissions: permissionResult[0] || { can_view: 0, can_edit: 0, can_delete: 0, can_create: 0 },
      summary: {
        total: totalResult[0]?.total || 0,
        completed: completedResult[0]?.completed || 0,
        pending: pendingResult[0]?.pending || 0,
        drivers: driversResult[0]?.drivers || 0
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}