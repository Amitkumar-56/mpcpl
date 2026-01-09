import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import path from 'path';
import { createEntityLog } from '@/lib/entityLogs';

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

    const employee = employeeResult[0];
    
    // Ensure fs_id is properly formatted (handle null, empty string, or comma-separated values)
    if (employee.fs_id === null || employee.fs_id === undefined || employee.fs_id === '') {
      employee.fs_id = '';
    } else {
      // Convert to string, trim, and remove any extra spaces
      let fsIdStr = String(employee.fs_id).trim();
      // Remove any extra spaces around commas (e.g., "1, 2, 3" -> "1,2,3")
      fsIdStr = fsIdStr.replace(/\s*,\s*/g, ',');
      employee.fs_id = fsIdStr;
    }
    
    console.log('🔍 GET Employee - fs_id from DB:', { 
      raw: employeeResult[0].fs_id, 
      formatted: employee.fs_id,
      type: typeof employee.fs_id 
    });

    // Get permissions for this employee
    let permissionsQuery = `
      SELECT module_name, can_view, can_edit, can_create
      FROM role_permissions 
      WHERE employee_id = ?
    `;
    const permissionsResult = await executeQuery(permissionsQuery, [id]);

    // Convert permissions array to object format
    const permissionsObj = {};
    permissionsResult.forEach(perm => {
      permissionsObj[perm.module_name] = {
        can_view: perm.can_view === 1 || perm.can_view === true,
        can_edit: perm.can_edit === 1 || perm.can_edit === true,
        can_create: perm.can_create === 1 || perm.can_create === true
      };
    });

    // Get all stations
    const stationsQuery = `SELECT * FROM filling_stations ORDER BY station_name`;
    const stations = await executeQuery(stationsQuery);

    return NextResponse.json({
      success: true,
      data: {
        employee: employee,
        permissions: permissionsObj,
        stations: stations || []
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
    let updateData = {};
    
    // Check if request is FormData or JSON
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Handle fs_id[] array separately (multiple checkboxes)
      const fsIdArray = formData.getAll('fs_id[]');
      console.log('🔍 EDIT Employee - Received fs_id[] from form:', fsIdArray, 'Count:', fsIdArray.length);
      
      // Always process fs_id[] if it exists (even if empty array)
      // Empty array or array with empty string means clear all stations
      // This allows removing all stations by unchecking them
      updateData.fs_id = fsIdArray;
      
      // Convert FormData to object
      for (const [key, value] of formData.entries()) {
        // Skip fs_id[] as we already handled it above
        if (key === 'fs_id[]') {
          continue;
        }
        if (key === 'permissions') {
          updateData[key] = value; // Keep as string, will parse later
        } else if (key === 'picture' && value instanceof File) {
          updateData[key] = value; // Keep File object for processing
        } else if (key === 'current_data') {
          // Parse current data for comparison
          try {
            updateData[key] = JSON.parse(value);
          } catch (e) {
            console.error('Error parsing current_data:', e);
          }
        } else {
          updateData[key] = value;
        }
      }
    } else {
      const body = await request.json();
      updateData = body;
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    if (!id && updateData && updateData.id) {
      id = String(updateData.id);
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get current user info for audit log
    let currentUserId = null;
    let currentUserName = null;
    let currentUserRole = null;
    
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          currentUserId = decoded.userId || decoded.id;
          
          // Get current user details from database
          const users = await executeQuery(
            `SELECT id, name, role FROM employee_profile WHERE id = ?`,
            [currentUserId]
          );
          
          if (users.length > 0) {
            currentUserName = users[0].name;
            currentUserRole = users[0].role;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Get old employee data from database
    const oldEmployeeQuery = `SELECT * FROM employee_profile WHERE id = ?`;
    const oldEmployeeResult = await executeQuery(oldEmployeeQuery, [id]);

    if (oldEmployeeResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const oldEmployee = oldEmployeeResult[0];

    // Build update query for employee_profile
    const updateFields = [];
    const updateValues = [];
    const changes = {};

    // Store ID separately and remove from updateData
    const employeeId = updateData.id || id;
    delete updateData.id;

    // Handle password separately (hash it)
    let passwordChanged = false;
    if (updateData.password !== undefined && updateData.password !== null && updateData.password !== '') {
      updateFields.push('password = ?');
      updateValues.push(hashPassword(updateData.password));
      changes.password = { old: '***', new: '***' }; // Don't log actual password
      passwordChanged = true;
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

    // Store permissions separately
    const permissionsData = updateData.permissions;
    delete updateData.permissions;
    
    // Store role for permissions
    let roleForPermissions = oldEmployee.role;
    if (updateData.role !== undefined) {
      roleForPermissions = updateData.role;
    }

    // Handle fs_id (checkboxes) - ALWAYS process if provided (even if empty array)
    if (updateData.fs_id !== undefined) {
      // If it's an array (from checkboxes), join with comma
      let fsIdValue = updateData.fs_id;
      if (Array.isArray(fsIdValue)) {
        // Filter out empty values and convert to strings for consistency
        const validIds = fsIdValue
          .filter(id => id && id !== '' && id !== 'undefined' && id !== 'null')
          .map(id => String(id).trim());
        fsIdValue = validIds.length > 0 ? validIds.join(',') : '';
      } else if (typeof fsIdValue === 'string') {
        fsIdValue = fsIdValue.trim();
      } else {
        fsIdValue = String(fsIdValue || '').trim();
      }
      
      const oldFsId = (oldEmployee.fs_id || '').toString().trim();
      const newFsId = fsIdValue || '';
      
      console.log('🔍 EDIT Employee - Updating fs_id:', { 
        old: oldFsId, 
        new: newFsId, 
        wasArray: Array.isArray(updateData.fs_id),
        oldCount: oldFsId ? oldFsId.split(',').length : 0,
        newCount: newFsId ? newFsId.split(',').length : 0
      });
      
      // Always update fs_id (even if same, to ensure consistency)
      // This allows removing stations by unchecking them
      // Ensure it's a string, not a number
      const fs_id_string = String(newFsId || '');
      console.log('🔍 EDIT Employee - Final fs_id string to update:', {
        value: fs_id_string,
        type: typeof fs_id_string,
        length: fs_id_string.length,
        contains_comma: fs_id_string.includes(',')
      });
      
      updateFields.push('fs_id = ?');
      updateValues.push(fs_id_string); // Explicitly send as string
      changes.fs_id = { old: oldFsId, new: fs_id_string };
      delete updateData.fs_id;
    }

    // Only update fields that have actually changed
    Object.keys(updateData).forEach(key => {
      // Skip if value is undefined or null
      if (updateData[key] === undefined || updateData[key] === null) {
        return;
      }
      
      // Skip non-column fields
      if (['current_data', 'fs_id[]'].includes(key)) {
        return;
      }
      
      // Get old and new values
      const oldValue = oldEmployee[key];
      const newValue = updateData[key];
      
      // Handle different field types
      let hasChanged = false;
      
      if (['role', 'status', 'salary'].includes(key)) {
        // Handle numeric fields
        const oldNum = oldValue !== null && oldValue !== undefined ? Number(oldValue) : null;
        const newNum = newValue !== null && newValue !== undefined ? Number(newValue) : null;
        hasChanged = oldNum !== newNum;
      } else {
        // Handle string fields
        const oldStr = oldValue !== null && oldValue !== undefined ? String(oldValue).trim() : '';
        const newStr = newValue !== null && newValue !== undefined ? String(newValue).trim() : '';
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

    // Check if there's anything to update in employee_profile
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

    // Start transaction for atomic updates
    try {
      // Only update employee_profile if there are fields to update
      if (hasFieldsToUpdate) {
        updateValues.push(employeeId);
        // Update employee
        // Note: fs_id column must be VARCHAR/TEXT type to store comma-separated values like "2,3,4,5,6,7"
        // If column is INT, only first number will be stored
        const updateQuery = `UPDATE employee_profile SET ${updateFields.join(', ')} WHERE id = ?`;
        
        // Find fs_id value in updateValues for logging
        const fsIdIndex = updateFields.findIndex(field => field.includes('fs_id'));
        const fsIdValue = fsIdIndex >= 0 ? updateValues[fsIdIndex] : null;
        
        console.log('🔍 EDIT Employee - Executing update query:', {
          query: updateQuery.substring(0, 200),
          fs_id_value: fsIdValue,
          fs_id_type: typeof fsIdValue,
          fs_id_length: String(fsIdValue || '').length,
          total_fields: updateFields.length
        });
        
        await executeQuery(updateQuery, updateValues);
        console.log('✅ Employee profile updated');
        
        // Verify fs_id was updated correctly
        if (fsIdIndex >= 0) {
          const [verify] = await executeQuery(
            'SELECT fs_id, CAST(fs_id AS CHAR) as fs_id_string FROM employee_profile WHERE id = ?',
            [employeeId]
          );
          console.log('✅ EDIT Employee - fs_id after update:', {
            raw: verify[0]?.fs_id,
            as_string: verify[0]?.fs_id_string,
            type: typeof verify[0]?.fs_id,
            length: String(verify[0]?.fs_id || '').length,
            expected: fsIdValue,
            match: String(verify[0]?.fs_id || '') === String(fsIdValue || '')
          });
        }
      }

      // Handle permissions if provided
      if (hasPermissionsToUpdate) {
        console.log('🔧 Processing permissions update...');
        
        // Parse permissions data
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

        console.log('📋 Permissions to update:', Object.keys(permissions).length);
        
        // Process each module permission
        for (const moduleName in permissions) {
          const perm = permissions[moduleName];
          
          // Convert to boolean/numbers
          const can_view = perm.can_view === true || perm.can_view === 1 || perm.can_view === '1' ? 1 : 0;
          const can_edit = perm.can_edit === true || perm.can_edit === 1 || perm.can_edit === '1' ? 1 : 0;
          const can_create = perm.can_create === true || perm.can_create === 1 || perm.can_create === '1' ? 1 : 0;
          
          // Check if permission already exists for this employee and module
          const checkQuery = `
            SELECT id FROM role_permissions 
            WHERE employee_id = ? AND module_name = ?
            LIMIT 1
          `;
          const existing = await executeQuery(checkQuery, [employeeId, moduleName]);
          
          if (existing.length > 0) {
            // UPDATE existing permission
            const updatePermQuery = `
              UPDATE role_permissions 
              SET 
                role = ?,
                can_view = ?,
                can_edit = ?,
                can_create = ?,
                updated_at = NOW()
              WHERE employee_id = ? AND module_name = ?
            `;
            await executeQuery(updatePermQuery, [
              roleForPermissions,
              can_view,
              can_edit,
              can_create,
              employeeId,
              moduleName
            ]);
            console.log(`🔄 Updated permission: ${moduleName} for employee ${employeeId}`);
          } else {
            // INSERT new permission only if any permission is true
            if (can_view === 1 || can_edit === 1 || can_create === 1) {
              const insertPermQuery = `
                INSERT INTO role_permissions 
                  (employee_id, role, module_name, can_view, can_edit, can_create, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
              `;
              await executeQuery(insertPermQuery, [
                employeeId,
                roleForPermissions,
                moduleName,
                can_view,
                can_edit,
                can_create
              ]);
              console.log(`➕ Inserted permission: ${moduleName} for employee ${employeeId}`);
            } else {
              console.log(`⏭️ Skipped permission: ${moduleName} (all false)`);
            }
          }
        }
        console.log('✅ Permissions updated successfully');
      }

      // Create audit log
      const remarks = passwordChanged 
        ? `Employee password changed: ${oldEmployee.name || oldEmployee.emp_code}`
        : `Employee ${oldEmployee.name || oldEmployee.emp_code} updated by ${currentUserName}`;

      await createAuditLog({
        page: 'Employee Management',
        uniqueCode: `EMPLOYEE-${employeeId}`,
        section: 'Edit Employee',
        userId: currentUserId,
        userName: currentUserName,
        action: passwordChanged ? 'password_change' : 'edit',
        remarks: remarks,
        oldValue: oldEmployee,
        newValue: { ...oldEmployee, ...updateData },
        changes: changes,
        recordType: 'employee',
        recordId: parseInt(employeeId)
      });

      console.log('📝 Audit log created');

      // ✅ Send notification to admins if password was changed
      if (passwordChanged) {
        try {
          const io = global._io;
          if (io) {
            io.to('role_5').emit('password_change_notification', {
              type: 'employee_password_changed',
              employeeId: parseInt(employeeId),
              employeeName: oldEmployee.name || oldEmployee.emp_code,
              employeeCode: oldEmployee.emp_code || '',
              changedBy: {
                id: currentUserId,
                name: currentUserName || 'Unknown'
              },
              timestamp: Date.now(),
              message: `Employee password changed: ${oldEmployee.name || oldEmployee.emp_code} (${oldEmployee.emp_code || employeeId}) by ${currentUserName || 'Unknown'}`
            });
            console.log('✅ Employee password change notification sent to admins');
          }
        } catch (notifError) {
          console.error('⚠️ Error sending password change notification:', notifError);
        }
      }

      // ✅ Create entity-specific log (similar to filling_logs) for update
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        await createEntityLog({
          entityType: 'employee',
          entityId: employeeId,
          createdBy: null, // Will use existing if log exists
          updatedBy: currentUserId,
          updatedDate: currentDateTime
        });
      } catch (logError) {
        console.error('⚠️ Error creating employee log:', logError);
      }

      return NextResponse.json({
        success: true,
        message: 'Employee updated successfully',
        changes: changes
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database error: ' + dbError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Alias for PUT
export async function POST(request) {
  return PUT(request);
}