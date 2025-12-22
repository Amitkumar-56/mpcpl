import { executeQuery, getConnection } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request, { params }) {
  try {
    // Auth: cookie + header fallback
    const cookieStore = await cookies();
    let token = cookieStore.get('token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const requesterId = decoded.userId || decoded.id;

    // Get role
    const roleRows = await executeQuery('SELECT role FROM employee_profile WHERE id = ? LIMIT 1', [requesterId]);
    const requesterRole = roleRows.length > 0 ? Number(roleRows[0].role) : null;
    // Permission check for non-admin
    if (requesterRole !== 5) {
      const moduleName = 'Employees';
      const empPerm = await executeQuery(
        `SELECT can_view, can_edit FROM role_permissions WHERE employee_id = ? AND module_name = ? LIMIT 1`,
        [requesterId, moduleName]
      );
      let allowed = false;
      if (empPerm.length > 0) {
        allowed = empPerm[0].can_view === 1 || empPerm[0].can_edit === 1;
      } else if (requesterRole != null) {
        const rolePerm = await executeQuery(
          `SELECT can_view, can_edit FROM role_permissions 
           WHERE role = ? AND module_name = ? AND (employee_id IS NULL OR employee_id = 0) LIMIT 1`,
          [requesterRole, moduleName]
        );
        allowed = rolePerm.length > 0 && (rolePerm[0].can_view === 1 || rolePerm[0].can_edit === 1);
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Access denied: no permission for Employees' }, { status: 403 });
      }
    }

    // Get id from params or query
    let { id } = params || {};
    if (!id) {
      const { searchParams } = new URL(request.url);
      id = searchParams.get('id');
    }
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }
    
    // Fetch employee details
    const employee = await executeQuery('SELECT * FROM employee_profile WHERE id = ?', [id]);
    
    if (employee.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }
    
    // Fetch all stations
    const stationsRows = await executeQuery('SELECT id, station_name FROM filling_stations ORDER BY station_name');

    // Normalize fs_id to array of numbers
    const fsVal = employee[0].fs_id;
    let fsArr = [];
    if (fsVal) {
      if (Array.isArray(fsVal)) fsArr = fsVal.map(v => parseInt(v)).filter(v => !isNaN(v));
      else if (typeof fsVal === 'number') fsArr = [fsVal];
      else fsArr = String(fsVal).split(',').map(v => parseInt(v)).filter(v => !isNaN(v));
    }
    const formattedEmployee = { ...employee[0], fs_id: fsArr };
    
    return NextResponse.json({
      success: true,
      data: {
        employee: formattedEmployee,
        stations: stationsRows || []
      }
    });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const formData = await request.formData();
    
    // Get form data
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const phonealt = formData.get('phonealt');
    const role = formData.get('role');
    const salary = formData.get('salary');
    const address = formData.get('address');
    const city = formData.get('city');
    const state = formData.get('state');
    const postbox = formData.get('postbox');
    // Accept both fs_id[] and fs_id
    const fs_ids_list = formData.getAll('fs_id[]');
    const fs_ids_fallback = formData.getAll('fs_id');
    const fs_ids = (fs_ids_list.length > 0 ? fs_ids_list : fs_ids_fallback).join(',');
    const status = formData.get('status');
    const account_details = formData.get('account_details');
    
    // Get current salary for history
    const currentEmployee = await executeQuery(
      'SELECT salary FROM employee_profile WHERE id = ?',
      [id]
    );
    const current_salary = currentEmployee[0]?.salary;
    
    // Handle file upload if exists
    let qr_file_name = null;
    const qr_file = formData.get('qr_code');
    
    if (qr_file && qr_file.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const ext = path.extname(qr_file.name);
      const fileName = `qr_${id}_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      
      const bytes = await qr_file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await fs.promises.writeFile(filePath, buffer);
      qr_file_name = fileName;
    }
    
    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();
    
    try {
      // Update employee profile
      const updateQuery = `
        UPDATE employee_profile 
        SET name = ?, email = ?, phone = ?, phonealt = ?, role = ?, 
            salary = ?, address = ?, city = ?, region = ?, postbox = ?, 
            fs_id = ?, status = ?, account_details = ?, 
            qr_code = COALESCE(?, qr_code)
        WHERE id = ?
      `;
      
      await connection.query(updateQuery, [
        name, email, phone, phonealt, role,
        salary, address, city, state, postbox,
        fs_ids, status, account_details,
        qr_file_name, id
      ]);
      
      // Insert salary history if changed
      if (salary != current_salary) {
        const historyQuery = `
          INSERT INTO salary_history 
          (emp_id, old_salary, current_salary, update_date) 
          VALUES (?, ?, ?, NOW())
        `;
        await connection.query(historyQuery, [id, current_salary, salary]);
      }
      
      await connection.commit();
      return NextResponse.json({ 
        success: true, 
        message: 'Employee updated successfully' 
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST handler aligned with UI
export async function POST(request) {
  try {
    // Auth
    const cookieStore = await cookies();
    let token = cookieStore.get('token')?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const requesterId = decoded.userId || decoded.id;
    const roleRows = await executeQuery('SELECT role FROM employee_profile WHERE id = ? LIMIT 1', [requesterId]);
    const requesterRole = roleRows.length > 0 ? Number(roleRows[0].role) : null;
    const isAdmin = requesterRole === 5;
    // Non-admin must have can_edit Employees
    if (!isAdmin) {
      const moduleName = 'Employees';
      const empPerm = await executeQuery(
        `SELECT can_edit FROM role_permissions WHERE employee_id = ? AND module_name = ? LIMIT 1`,
        [requesterId, moduleName]
      );
      let allowed = empPerm.length > 0 && empPerm[0].can_edit === 1;
      if (!allowed) {
        const rolePerm = await executeQuery(
          `SELECT can_edit FROM role_permissions 
           WHERE role = ? AND module_name = ? AND (employee_id IS NULL OR employee_id = 0) LIMIT 1`,
          [requesterRole, moduleName]
        );
        allowed = rolePerm.length > 0 && rolePerm[0].can_edit === 1;
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: 'Access denied: no edit permission for Employees' }, { status: 403 });
      }
    }

    const formData = await request.formData();
    const empId = formData.get('id');
    if (!empId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required' }, { status: 400 });
    }

    // Load current employee
    const currentRows = await executeQuery('SELECT salary, status, fs_id, role FROM employee_profile WHERE id = ? LIMIT 1', [empId]);
    if (currentRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }
    const current = currentRows[0];

    // Build updates
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const phonealt = formData.get('phonealt');
    const role = isAdmin ? formData.get('role') : current.role;
    const salary = formData.get('salary');
    const address = formData.get('address');
    const city = formData.get('city');
    const region = formData.get('region') || formData.get('state');
    const postbox = formData.get('postbox');
    const account_details = formData.get('account_details');
    // Status - ensure it's saved as integer (1 or 0)
    let statusVal = Number(current.status) ?? 1;
    if (isAdmin) {
      const sIn = formData.get('status');
      if (typeof sIn === 'string') {
        const sLower = sIn.toLowerCase();
        if (sLower === 'enable' || sLower === '1') {
          statusVal = 1;
        } else if (sLower === 'disable' || sLower === '0') {
          statusVal = 0;
        } else {
          statusVal = parseInt(sIn) || 1;
        }
      } else {
        statusVal = Number(sIn) === 1 ? 1 : 0;
      }
    }
    // Ensure statusVal is always 0 or 1 (integer)
    statusVal = statusVal === 1 ? 1 : 0;
    // fs_ids
    let fs_ids = current.fs_id || '';
    if (isAdmin) {
      const fsList = formData.getAll('fs_id[]');
      const fsList2 = formData.getAll('fs_id');
      const finalList = (fsList.length > 0 ? fsList : fsList2);
      fs_ids = finalList.length > 0 ? finalList.join(',') : '';
    }
    // QR file
    let qr_file_name = null;
    const qr_file = formData.get('qr_code');
    if (qr_file && qr_file.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const ext = path.extname(qr_file.name);
      const fileName = `qr_${empId}_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const bytes = await qr_file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.promises.writeFile(filePath, buffer);
      qr_file_name = fileName;
    }

    // Update
    const connection = await getConnection();
    await connection.beginTransaction();
    try {
      const updateQuery = `
        UPDATE employee_profile 
        SET name = ?, email = ?, phone = ?, phonealt = ?, role = ?, 
            salary = ?, address = ?, city = ?, region = ?, postbox = ?, 
            fs_id = ?, status = ?, account_details = ?, 
            qr_code = COALESCE(?, qr_code)
        WHERE id = ?
      `;
      await connection.query(updateQuery, [
        name, email, phone, phonealt, role,
        salary, address, city, region, postbox,
        fs_ids, statusVal, account_details,
        qr_file_name, empId
      ]);
      // Salary history
      if (salary != null && String(salary) !== String(current.salary)) {
        const historyQuery = `
          INSERT INTO salary_history 
          (emp_id, old_salary, current_salary, update_date) 
          VALUES (?, ?, ?, NOW())
        `;
        await connection.query(historyQuery, [empId, current.salary, salary]);
      }
      // Permissions save (admin only)
      if (isAdmin) {
        const permsJson = formData.get('permissions');
        if (permsJson) {
          try {
            const permsObj = JSON.parse(permsJson);
            // Get employee's role for role_permissions table
            const employeeRole = role || current.role;
            // Delete old employee-specific permissions
            await connection.query('DELETE FROM role_permissions WHERE employee_id = ?', [empId]);
            // Insert new employee-specific permissions with role
            for (const [moduleName, perms] of Object.entries(permsObj)) {
              await connection.query(
                `INSERT INTO role_permissions (employee_id, role, module_name, can_view, can_edit, can_delete)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  empId,
                  employeeRole,
                  moduleName,
                  perms?.can_view ? 1 : 0,
                  perms?.can_edit ? 1 : 0,
                  perms?.can_delete ? 1 : 0
                ]
              );
            }
          } catch (permErr) {
            console.error('Error saving permissions:', permErr);
          }
        }
      }

      // Create audit log for employee edit
      try {
        let editorName = 'System';
        let editorRole = null;
        if (requesterId) {
          try {
            const [editorRows] = await connection.query(
              'SELECT name, role FROM employee_profile WHERE id = ? LIMIT 1',
              [requesterId]
            );
            if (editorRows.length > 0) {
              editorName = editorRows[0].name;
              editorRole = Number(editorRows[0].role);
            }
          } catch (err) {
            console.error('Error fetching editor info:', err);
          }
        }

        // Get employee details for audit log
        const [empRows] = await connection.query(
          'SELECT emp_code, name, role FROM employee_profile WHERE id = ? LIMIT 1',
          [empId]
        );
        const empCode = empRows.length > 0 ? empRows[0].emp_code : `EMPLOYEE-${empId}`;
        const empName = empRows.length > 0 ? empRows[0].name : 'Unknown';
        const empRole = empRows.length > 0 ? Number(empRows[0].role) : null;

        const roleNames = {
          1: 'Staff',
          2: 'Incharge',
          3: 'Team Leader',
          4: 'Accountant',
          5: 'Admin',
          6: 'Driver'
        };

        await createAuditLog({
          page: 'Employees',
          uniqueCode: empCode,
          section: 'Employee Management',
          userId: requesterId,
          userName: editorName,
          action: 'edit',
          remarks: `Employee edited: ${empName} (ID: ${empId}, Role: ${empRole || 'N/A'}, Edited by: ${editorName} - ID: ${requesterId || 'N/A'}, Role: ${editorRole || 'N/A'})`,
          oldValue: current,
          newValue: {
            employee_id: empId,
            emp_code: empCode,
            name: name || empName,
            email: email,
            role: role || empRole,
            role_name: roleNames[role || empRole] || 'Unknown',
            edited_by_employee_id: requesterId,
            edited_by_name: editorName,
            edited_by_role: editorRole
          },
          recordType: 'employee',
          recordId: parseInt(empId)
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the main operation
      }

      await connection.commit();
      return NextResponse.json({ success: true, message: 'Employee updated successfully' });
    } catch (err) {
      await connection.rollback();
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
      connection.release();
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
