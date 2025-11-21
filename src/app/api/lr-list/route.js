import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// Simple authentication function
async function authenticateUser(token) {
  try {
    const userQuery = `
      SELECT 
        id as employee_id,
        emp_code,
        email,
        role,
        name,
        status
      FROM employee_profile 
      WHERE id = ? AND status = 'active'
    `;
    
    const users = await executeQuery(userQuery, [token]);
    
    if (users.length > 0) {
      return users[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    // For demo purposes, using mock session
    // In real app, you would get this from your auth system
    const mockSession = {
      user_id: 1,
      role: 5
    };

    // Check permissions
    const module_name = 'lr_management';
    const permissionQuery = `
      SELECT module_name, can_view, can_edit, can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND role = ?
    `;
    
    const permissions = await executeQuery(permissionQuery, [module_name, mockSession.role]);

    if (permissions.length === 0) {
      return NextResponse.json({ 
        error: 'No permissions found for LR Management.' 
      }, { status: 403 });
    }

    const permissionData = permissions[0];

    if (permissionData.can_view !== 1) {
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

    return NextResponse.json({ 
      success: true,
      shipments: shipments || [],
      permissions: permissionData
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