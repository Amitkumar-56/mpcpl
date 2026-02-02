import { getCurrentUser } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
        console.log('✅ [LR List] User authenticated via getCurrentUser:', { userId, userRole });
      }
    } catch (getUserError) {
      console.warn('⚠️ [LR List] getCurrentUser failed, trying token fallback:', getUserError.message);
    }

    // Fallback: Try token-based authentication if getCurrentUser failed
    if (!userId) {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (token) {
          const { verifyToken } = await import('@/lib/auth');
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            console.log('✅ [LR List] User authenticated via token:', userId);

            // Get role from database
            if (userId) {
              try {
                const userQuery = `SELECT role FROM employee_profile WHERE id = ?`;
                const users = await executeQuery(userQuery, [userId]);
                if (users.length > 0) {
                  userRole = users[0].role;
                  console.log('✅ [LR List] User role fetched:', userRole);
                }
              } catch (roleError) {
                console.warn('⚠️ [LR List] Failed to fetch role:', roleError.message);
              }
            }
          }
        }
      } catch (tokenError) {
        console.error('❌ [LR List] Token fallback failed:', tokenError.message);
      }
    }

    if (!userId) {
      return NextResponse.json({
        error: 'Unauthorized. Please login again.'
      }, { status: 401 });
    }

    // ✅ FIX: Check permissions - try employee-specific first, then role-based
    const module_name = 'lr_management';

    // First try employee-specific permissions
    let permissionQuery = `
      SELECT module_name, can_view, can_edit, can_create 
      FROM role_permissions 
      WHERE module_name = ? AND employee_id = ?
    `;
    let permissions = await executeQuery(permissionQuery, [module_name, userId]);

    // If no employee-specific permissions, try role-based (only if userRole exists)
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT module_name, can_view, can_edit, can_create 
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
          SELECT module_name, can_view, can_edit, can_create 
          FROM role_permissions 
          WHERE module_name = ? AND (employee_id = ? OR role = ?)
        `;
        permissions = await executeQuery(permissionQuery, [altModuleName, userId, userRole]);
      } else {
        permissionQuery = `
          SELECT module_name, can_view, can_edit, can_create 
          FROM role_permissions 
          WHERE module_name = ? AND employee_id = ?
        `;
        permissions = await executeQuery(permissionQuery, [altModuleName, userId]);
      }
    }

    // ✅ Check if user is admin (role 5) - admins have full access
    let permissionData = {
      can_view: 1, // Default allow view if no permissions found
      can_edit: 0,
      can_create: 0
    };

    if (userRole && Number(userRole) === 5) {
      // Admin has full access
      permissionData = {
        can_view: 1,
        can_edit: 1,
        can_create: 1
      };
    } else if (permissions.length > 0) {
      permissionData = permissions[0];
    }

    // Check if user has view permission (only if permissions exist and user is not admin)
    if (!(userRole && Number(userRole) === 5) && permissions.length > 0 && permissionData.can_view !== 1 && permissionData.can_view !== true) {
      return NextResponse.json({
        error: 'You are not allowed to access this page.'
      }, { status: 403 });
    }

    // Fetch shipments data with Creator and Editor names from Audit Logs
    const shipmentQuery = `
      SELECT 
        s.id, s.lr_id, s.consigner, s.consignee, s.from_location, s.to_location, s.tanker_no,
        (SELECT user_name FROM audit_log WHERE record_type = 'lr' AND record_id = s.id AND action = 'add' ORDER BY id LIMIT 1) as created_by_name,
        (SELECT created_at FROM audit_log WHERE record_type = 'lr' AND record_id = s.id AND action = 'add' ORDER BY id LIMIT 1) as created_at,
        (SELECT user_name FROM audit_log WHERE record_type = 'lr' AND record_id = s.id AND action = 'edit' ORDER BY id DESC LIMIT 1) as updated_by_name,
        (SELECT created_at FROM audit_log WHERE record_type = 'lr' AND record_id = s.id AND action = 'edit' ORDER BY id DESC LIMIT 1) as updated_at
      FROM shipment s
      ORDER BY s.id DESC
    `;
    const shipments = await executeQuery(shipmentQuery);

    // ✅ Ensure permissions are returned as numbers (0 or 1) for consistency
    const formattedPermissions = {
      can_view: permissionData.can_view === 1 || permissionData.can_view === true ? 1 : 0,
      can_edit: permissionData.can_edit === 1 || permissionData.can_edit === true ? 1 : 0,
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

// DELETE endpoint tamamen kaldırıldı