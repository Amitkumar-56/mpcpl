
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
    } else if (userRole && Number(userRole) === 4) {
      // Accountant (role 4) gets create and edit permissions by default
      permissionData = {
        can_view: 1,
        can_edit: 1,
        can_create: 1
      };
      console.log('✅ [LR List] Accountant role detected, granting full permissions');
    } else if (permissions.length > 0) {
      permissionData = permissions[0];
    }

    // Check if user has view permission (only if permissions exist and user is not admin or accountant)
    if (!(userRole && (Number(userRole) === 5 || Number(userRole) === 4)) && permissions.length > 0 && permissionData.can_view !== 1 && permissionData.can_view !== true) {
      return NextResponse.json({
        error: 'You are not allowed to access this page.'
      }, { status: 403 });
    }

    // Pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    const fetchAll = url.searchParams.get('all') === 'true';

    // Count total shipments for pagination
    const countQuery = `SELECT COUNT(*) as total FROM shipment`;
    const countResult = await executeQuery(countQuery);
    const total = countResult[0]?.total || 0;

    // Fetch shipments data with pagination (unless fetchAll is true)
    let shipmentQuery = `
      SELECT 
        s.id, s.lr_id, s.lr_date, s.consigner, s.address_1, s.consignee, s.address_2,
        s.from_location, s.to_location, s.tanker_no, s.gst_no, s.products, s.boe_no,
        s.wt_type, s.gross_wt, s.vessel, s.tare_wt, s.invoice_no, s.net_wt, s.gp_no,
        s.mobile, s.email, s.pan, s.gst, s.remarks
      FROM shipment s
      ORDER BY s.id DESC
    `;

    if (!fetchAll) {
      shipmentQuery += ` LIMIT ? OFFSET ?`;
    }

    const queryParams = fetchAll ? [] : [limit, offset];
    const shipments = await executeQuery(shipmentQuery, queryParams);

    // ✅ OPTIMIZATION: Only fetch audit logs for full exports (?all=true)
    // This removes a massive bottleneck for the main list page
    if (fetchAll && shipments.length > 0) {
      const shipmentIds = shipments.map(s => s.id);
      const idPlaceholders = shipmentIds.map(() => '?').join(',');
      
      const addLogsQuery = `
        SELECT record_id, user_name, created_at 
        FROM audit_log 
        WHERE record_type = 'lr' AND action = 'add' AND record_id IN (${idPlaceholders})
      `;
      const addLogs = await executeQuery(addLogsQuery, shipmentIds);
      
      const editLogsQuery = `
        SELECT record_id, user_name, created_at 
        FROM (
          SELECT record_id, user_name, created_at, 
                 ROW_NUMBER() OVER (PARTITION BY record_id ORDER BY id DESC) as rn
          FROM audit_log 
          WHERE record_type = 'lr' AND action = 'edit' AND record_id IN (${idPlaceholders})
        ) t WHERE rn = 1
      `;
      const editLogs = await executeQuery(editLogsQuery, shipmentIds);
      
      const addLogsMap = Object.fromEntries(addLogs.map(l => [l.record_id, l]));
      const editLogsMap = Object.fromEntries(editLogs.map(l => [l.record_id, l]));
      
      shipments.forEach(s => {
        const addLog = addLogsMap[s.id];
        const editLog = editLogsMap[s.id];
        s.created_by_name = addLog?.user_name || null;
        s.created_at = addLog?.created_at || null;
        s.updated_by_name = editLog?.user_name || null;
        s.updated_at = editLog?.created_at || null;
      });
    }

    // ✅ Ensure permissions are returned as numbers (0 or 1) for consistency
    const formattedPermissions = {
      can_view: permissionData.can_view === 1 || permissionData.can_view === true ? 1 : 0,
      can_edit: permissionData.can_edit === 1 || permissionData.can_edit === true ? 1 : 0,
      can_create: permissionData.can_create === 1 || permissionData.can_create === true ? 1 : 0
    };

    return NextResponse.json({
      success: true,
      shipments: shipments || [],
      permissions: formattedPermissions,
      pagination: fetchAll ? null : {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error in LR Management API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

