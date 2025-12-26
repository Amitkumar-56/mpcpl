import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // ✅ FIX: Get actual logged-in user
    let userId = null;
    let userRole = null;
    
    try {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.userId) {
        userId = currentUser.userId;
        userRole = currentUser.role;
      } else {
        // Fallback: Try to get from token directly
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const { verifyToken } = await import('@/lib/auth');
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            // Get role from database
            const userQuery = `SELECT role FROM employee_profile WHERE id = ?`;
            const users = await executeQuery(userQuery, [userId]);
            if (users.length > 0) {
              userRole = users[0].role;
            }
          }
        }
      }
    } catch (authError) {
      console.error('Error getting current user:', authError);
    }

    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized. Please login again.' 
      }, { status: 401 });
    }

    // ✅ FIX: Check permissions - try employee-specific first, then role-based
    const module_name = 'lr_management'; // Use lowercase with underscore
    
    // First try employee-specific permissions
    let permissionQuery = `
      SELECT module_name, can_view, can_edit, can_delete, can_create 
      FROM role_permissions 
      WHERE module_name = ? AND employee_id = ?
    `;
    let permissions = await executeQuery(permissionQuery, [module_name, userId]);

    // If no employee-specific permissions, try role-based (only if userRole exists)
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT module_name, can_view, can_edit, can_delete, can_create 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissions = await executeQuery(permissionQuery, [module_name, userRole]);
    }

    // If still no permissions, try alternative module name
    if (permissions.length === 0) {
      const altModuleName = 'LR Management';
      if (userRole) {
        permissionQuery = `
          SELECT module_name, can_view, can_edit, can_delete, can_create 
          FROM role_permissions 
          WHERE module_name = ? AND (employee_id = ? OR role = ?)
        `;
        permissions = await executeQuery(permissionQuery, [altModuleName, userId, userRole]);
      } else {
        permissionQuery = `
          SELECT module_name, can_view, can_edit, can_delete, can_create 
          FROM role_permissions 
          WHERE module_name = ? AND employee_id = ?
        `;
        permissions = await executeQuery(permissionQuery, [altModuleName, userId]);
      }
    }

    // Default permissions if none found - allow access if no permissions exist (for backward compatibility)
    let permissionData = {
      can_view: 1, // Default allow view if no permissions found
      can_edit: 0,
      can_delete: 0,
      can_create: 0
    };

    if (permissions.length > 0) {
      permissionData = permissions[0];
    }

    // Check if user has view permission (only if permissions exist)
    if (permissions.length > 0 && permissionData.can_view !== 1 && permissionData.can_view !== true) {
      return NextResponse.json({ 
        error: 'You are not allowed to access this page.' 
      }, { status: 403 });
    }

    // Fetch shipments data
    const shipmentQuery = `
      SELECT id, lr_id, consigner, consignee, from_location, to_location, tanker_no 
      FROM shipment 
      ORDER BY id DESC
    `;
    const shipments = await executeQuery(shipmentQuery);

    // ✅ Ensure permissions are returned as numbers (0 or 1) for consistency
    const formattedPermissions = {
      can_view: permissionData.can_view === 1 || permissionData.can_view === true ? 1 : 0,
      can_edit: permissionData.can_edit === 1 || permissionData.can_edit === true ? 1 : 0,
      can_delete: permissionData.can_delete === 1 || permissionData.can_delete === true ? 1 : 0,
      can_create: permissionData.can_create === 1 || permissionData.can_create === true ? 1 : 0
    };

    return NextResponse.json({ 
      success: true,
      shipments: shipments || [],
      permissions: formattedPermissions
    });

  } catch (error) {
    console.error('Error in LR Management API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Mock session check
    const mockSession = {
      user_id: 1,
      role: 5
    };

    // Check delete permissions
    const module_name = 'lr_management';
    const permissionQuery = `
      SELECT can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND role = ?
    `;
    const permissions = await executeQuery(permissionQuery, [module_name, mockSession.role]);

    if (permissions.length === 0 || permissions[0].can_delete !== 1) {
      return NextResponse.json({ 
        error: 'You are not allowed to delete shipments.' 
      }, { status: 403 });
    }

    const deleteQuery = `DELETE FROM shipment WHERE id = ?`;
    await executeQuery(deleteQuery, [id]);
    
    return NextResponse.json({ message: 'Shipment deleted successfully' });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}