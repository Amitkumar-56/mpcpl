// src/app/api/employee/edit/route.js
import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET - Fetch employee data for editing
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const employeeQuery = `SELECT * FROM employee_profile WHERE id = ?`;
    const employeeResult = await executeQuery(employeeQuery, [id]);

    if (employeeResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Get permissions
    const permissionsQuery = `
      SELECT module_name, can_view, can_edit, can_delete 
      FROM role_permissions 
      WHERE employee_id = ?
    `;
    const permissions = await executeQuery(permissionsQuery, [id]);

    return NextResponse.json({
      success: true,
      data: {
        ...employeeResult[0],
        permissions: permissions
      }
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update employee
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    let updateData = {};
    
    // Check if request is FormData or JSON
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        if (key === 'permissions') {
          updateData[key] = value; // Keep as string, will parse later
        } else if (key === 'picture' && value instanceof File) {
          updateData[key] = value; // Keep File object for processing
        } else {
          updateData[key] = value;
        }
      }
    } else {
      const body = await request.json();
      updateData = body;
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get user info for audit log
    const currentUser = await getCurrentUser();
    let userId = null;
    let userName = 'System';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }
    // Get old employee data
    const oldEmployeeQuery = `SELECT * FROM employee_profile WHERE id = ?`;
    const oldEmployeeResult = await executeQuery(oldEmployeeQuery, [id]);

    if (oldEmployeeResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const oldEmployee = oldEmployeeResult[0];

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    const changes = {};

    // Handle password separately (hash it)
    if (updateData.password !== undefined && updateData.password !== null && updateData.password !== '') {
      updateFields.push('password = ?');
      updateValues.push(hashPassword(updateData.password));
      changes.password = { old: '***', new: '***' }; // Don't log actual password
      delete updateData.password;
    }

    // Handle picture upload
    if (updateData.picture && updateData.picture instanceof File) {
      try {
        const pictureFile = updateData.picture;
        const pictureName = `${Date.now()}_${pictureFile.name}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Convert File to buffer using arrayBuffer()
        const arrayBuffer = await pictureFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Write file to disk
        const filePath = path.join(uploadDir, pictureName);
        fs.writeFileSync(filePath, buffer);
        
        updateFields.push('picture = ?');
        updateValues.push(pictureName);
        changes.picture = { old: oldEmployee.picture, new: pictureName };
        delete updateData.picture;
      } catch (fileError) {
        console.error('Error processing picture file:', fileError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload picture: ' + fileError.message },
          { status: 400 }
        );
      }
    }

    // Handle QR code upload
    if (updateData.qr_code && updateData.qr_code instanceof File) {
      try {
        const qrFile = updateData.qr_code;
        const qrName = `${Date.now()}_${qrFile.name}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Convert File to buffer using arrayBuffer()
        const arrayBuffer = await qrFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Write file to disk
        const filePath = path.join(uploadDir, qrName);
        fs.writeFileSync(filePath, buffer);
        
        updateFields.push('qr_code = ?');
        updateValues.push(qrName);
        changes.qr_code = { old: oldEmployee.qr_code, new: qrName };
        delete updateData.qr_code;
      } catch (fileError) {
        console.error('Error processing QR code file:', fileError);
        return NextResponse.json(
          { success: false, error: 'Failed to upload QR code: ' + fileError.message },
          { status: 400 }
        );
      }
    }

    // Store permissions separately (not a column in employee_profile table)
    const permissionsData = updateData.permissions;
    delete updateData.permissions;
    
    // Store role for permissions (before it gets processed in the loop)
    const roleForPermissions = updateData.role || oldEmployee.role;

    // Only update fields that have actually changed
    Object.keys(updateData).forEach(key => {
      // Skip if value is undefined or null
      if (updateData[key] === undefined || updateData[key] === null) {
        return;
      }
      
      // Get old and new values
      const oldValue = oldEmployee[key];
      const newValue = updateData[key];
      
      // Handle numeric fields (role, status, salary) - compare as numbers
      const numericFields = ['role', 'status', 'salary'];
      let hasChanged = false;
      
      if (numericFields.includes(key)) {
        const oldNum = oldValue !== null && oldValue !== undefined ? Number(oldValue) : null;
        const newNum = newValue !== null && newValue !== undefined ? Number(newValue) : null;
        hasChanged = oldNum !== newNum;
      } else {
        // For string fields, compare trimmed values
        const oldStr = oldValue !== null && oldValue !== undefined 
          ? String(oldValue).trim() 
          : '';
        const newStr = newValue !== null && newValue !== undefined 
          ? String(newValue).trim() 
          : '';
        hasChanged = oldStr !== newStr;
      }
      
      // Only add to update if value has actually changed
      if (hasChanged) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
        
        // Track changes for audit log
        changes[key] = {
          old: oldEmployee[key],
          new: updateData[key]
        };
      }
    });

    // Check if there's anything to update (fields or permissions)
    const hasFieldsToUpdate = updateFields.length > 0;
    const hasPermissionsToUpdate = permissionsData !== undefined && permissionsData !== null;
    
    console.log('🔍 Update check:', {
      fieldsToUpdate: updateFields.length,
      hasPermissions: hasPermissionsToUpdate,
      updateFields: updateFields
    });
    
    if (!hasFieldsToUpdate && !hasPermissionsToUpdate) {
      console.log('❌ No fields or permissions to update');
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Only update employee_profile if there are fields to update
    if (hasFieldsToUpdate) {
      updateValues.push(id);
      // Update employee
      const updateQuery = `UPDATE employee_profile SET ${updateFields.join(', ')} WHERE id = ?`;
      await executeQuery(updateQuery, updateValues);
    }

    // Handle permissions if provided
    if (hasPermissionsToUpdate) {
      // Delete old permissions
      await executeQuery('DELETE FROM role_permissions WHERE employee_id = ?', [id]);

      // Insert new permissions
      let permissions;
      if (typeof permissionsData === 'string') {
        try {
          permissions = JSON.parse(permissionsData);
        } catch (e) {
          console.error('Error parsing permissions:', e);
          permissions = {};
        }
      } else {
        permissions = permissionsData;
      }

      const finalRole = roleForPermissions;
      
      for (let moduleName in permissions) {
        const perm = permissions[moduleName];
        const can_view = perm.can_view === true || perm.can_view === 1 || perm.can_view === '1';
        const can_edit = perm.can_edit === true || perm.can_edit === 1 || perm.can_edit === '1';
        const can_delete = perm.can_delete === true || perm.can_delete === 1 || perm.can_delete === '1';
        
        await executeQuery(
          `INSERT INTO role_permissions 
            (employee_id, role, module_name, can_view, can_edit, can_delete, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            finalRole,
            moduleName,
            can_view ? 1 : 0,
            can_edit ? 1 : 0,
            can_delete ? 1 : 0
          ]
        );
      }
      
      // Remove permissions from updateData so it doesn't try to update it as a column
      delete updateData.permissions;
    }

    // Create audit log
    await createAuditLog({
      page: 'Employee Management',
      uniqueCode: `EMPLOYEE-${id}`,
      section: 'Edit Employee',
      userId: userId,
      userName: userName,
      action: 'edit',
      remarks: `Employee ${oldEmployee.name || oldEmployee.emp_code} updated`,
      oldValue: oldEmployee,
      newValue: { ...oldEmployee, ...updateData },
      recordType: 'employee',
      recordId: parseInt(id)
    });

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully'
    });

  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

