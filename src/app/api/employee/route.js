import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import path from 'path';
import { createAuditLog } from '@/lib/auditLog';

export async function GET() {
  try {
    const [rows] = await db.execute('SELECT * FROM employee_profile ORDER BY id DESC');
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}

// ✅ DELETE functionality removed - employees cannot be deleted

export async function POST(req) {
  const conn = await db.getConnection();
  try {
    const formData = await req.formData();
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || null;
    let isAdmin = false;
    let currentUserId = null;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        currentUserId = decoded.userId || decoded.id;
        try {
          const [rows] = await conn.execute(
            'SELECT role FROM employee_profile WHERE id = ? LIMIT 1',
            [currentUserId]
          );
          if (rows.length > 0 && Number(rows[0].role) === 5) {
            isAdmin = true;
          }
        } catch {}
      }
    }

    // Auto-generate Employee Code
    const [lastRow] = await conn.execute(
      'SELECT emp_code FROM employee_profile ORDER BY id DESC LIMIT 1'
    );
    let lastCode = lastRow.length ? lastRow[0].emp_code : null;
    let newCodeNumber = 1;
    if (lastCode) {
      const numPart = parseInt(lastCode.replace('EMP', ''), 10);
      newCodeNumber = numPart + 1;
    }
    const emp_code = `EMP${newCodeNumber.toString().padStart(3, '0')}`;

    // Form fields
    const email = formData.get('email') || '';
    const rawPassword = formData.get('password') || '';
    const role = parseInt(formData.get('role')) || 0;
    const salary = parseInt(formData.get('salary')) || 0;
    const name = formData.get('name') || '';
    const address = formData.get('address') || '';
    const city = formData.get('city') || '';
    const region = formData.get('region') || '';
    const country = formData.get('country') || '';
    const postbox = formData.get('postbox') || '';
    const phone = formData.get('phone') || '';
    const phonealt = formData.get('phonealt') || '';
    let status = parseInt(formData.get('status')) || 1;
    if (!isAdmin) {
      status = 1;
    }
    const account_details = formData.get('account_details') || '';
    
    // Handle station assignment (fs_id) - comma-separated string
    let fs_id = '';
    if (isAdmin) {
      const fsIds = formData.getAll('fs_id[]');
      
      if (fsIds && fsIds.length > 0) {
        // Simple: join all IDs with comma
        fs_id = fsIds.filter(id => id && id !== '').join(',');
      }
    }

    // Hash password
    const password = crypto.createHash('sha256').update(rawPassword).digest('hex');

    // Handle image
    const pictureFile = formData.get('picture');
    let pictureName = 'default.png';
    if (pictureFile && pictureFile.name) {
      pictureName = `${Date.now()}_${pictureFile.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      fs.mkdirSync(uploadDir, { recursive: true });
      const buffer = Buffer.from(await pictureFile.arrayBuffer());
      fs.writeFileSync(path.join(uploadDir, pictureName), buffer);
    }

    // Handle QR code upload
    const qrCodeFile = formData.get('qr_code');
    let qrCodeName = '';
    if (qrCodeFile && qrCodeFile.name) {
      qrCodeName = `qr_${Date.now()}_${qrCodeFile.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      fs.mkdirSync(uploadDir, { recursive: true });
      const buffer = Buffer.from(await qrCodeFile.arrayBuffer());
      fs.writeFileSync(path.join(uploadDir, qrCodeName), buffer);
    }

    // Begin transaction
    await conn.beginTransaction();

    // Insert employee - Simple and direct
    const [result] = await conn.execute(
      `INSERT INTO employee_profile 
      (emp_code, email, password, role, salary, name, address, city, region, country,
       postbox, phone, phonealt, picture, status, account_details, fs_id, qr_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        emp_code, email, password, role, salary, name, address,
        city, region, country, postbox, phone, phonealt, pictureName, status, account_details, fs_id, qrCodeName
      ]
    );

    const employeeId = result.insertId;

    // Save permissions - BOTH employee_id AND role
    const perms = isAdmin ? formData.get('permissions') : null;
    console.log('🔍 CREATE Employee - Permissions received:', perms ? 'Yes' : 'No', isAdmin ? '(Admin)' : '(Not Admin)');
    
    if (perms) {
      let permissionsObj = {};
      try {
        permissionsObj = JSON.parse(perms);
        console.log('🔍 CREATE Employee - Parsed permissions:', Object.keys(permissionsObj).length, 'modules');
      } catch (e) {
        console.error('❌ Invalid permissions JSON', e);
        permissionsObj = {};
      }

      // First, delete any existing permissions for this employee
      await conn.execute(
        'DELETE FROM role_permissions WHERE employee_id = ?',
        [employeeId]
      );

      // Insert new permissions - Insert ALL modules, even if all permissions are false
      let insertedCount = 0;
      let errorCount = 0;
      
      for (let moduleName in permissionsObj) {
        const modulePerms = permissionsObj[moduleName];
        const can_view = modulePerms.can_view === true || modulePerms.can_view === 1 || modulePerms.can_view === '1' ? 1 : 0;
        const can_edit = modulePerms.can_edit === true || modulePerms.can_edit === 1 || modulePerms.can_edit === '1' ? 1 : 0;
        const can_create = modulePerms.can_create === true || modulePerms.can_create === 1 || modulePerms.can_create === '1' ? 1 : 0;
        
        try {
          await conn.execute(
            `INSERT INTO role_permissions 
              (employee_id, role, module_name, can_view, can_edit, can_create, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              employeeId, 
              role,
              moduleName, 
              can_view, 
              can_edit, 
              can_create
            ]
          );
          insertedCount++;
        } catch (err) {
          errorCount++;
          console.error(`❌ Error inserting permission for ${moduleName}:`, err.message);
          // If can_create column doesn't exist, try with can_delete
          if (err.message.includes('can_create')) {
            try {
              await conn.execute(
                `INSERT INTO role_permissions 
                  (employee_id, role, module_name, can_view, can_edit, can_delete, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [
                  employeeId, 
                  role,
                  moduleName, 
                  can_view, 
                  can_edit, 
                  can_create
                ]
              );
              insertedCount++;
              errorCount--;
            } catch (err2) {
              console.error(`❌ Error with can_delete fallback for ${moduleName}:`, err2.message);
            }
          }
        }
      }
      
      console.log(`✅ CREATE Employee - Permissions inserted: ${insertedCount} modules, Errors: ${errorCount}`);
    }

    // Create audit log for employee creation
    try {
      let creatorName = null;
      let creatorRole = null;
      if (currentUserId) {
        try {
          const [creatorRows] = await conn.execute(
            'SELECT name, role FROM employee_profile WHERE id = ? LIMIT 1',
            [currentUserId]
          );
          if (creatorRows.length > 0) {
            creatorName = creatorRows[0].name;
            creatorRole = Number(creatorRows[0].role);
          }
        } catch (err) {
          console.error('Error fetching creator info:', err);
        }
      }

      await createAuditLog({
        page: 'Employees',
        uniqueCode: emp_code,
        section: 'Employee Management',
        userId: currentUserId,
        userName: creatorName,
        action: 'create',
        remarks: `Employee created: ${name} (ID: ${employeeId}, Role: ${role}, Created by: ${creatorName} - ID: ${currentUserId || 'N/A'}, Role: ${creatorRole || 'N/A'})`,
        oldValue: null,
        newValue: {
          employee_id: employeeId,
          emp_code: emp_code,
          name: name,
          email: email,
          role: role,
          role_name: role === 1 ? 'Staff' : role === 2 ? 'Incharge' : role === 3 ? 'Team Leader' : role === 4 ? 'Accountant' : role === 5 ? 'Admin' : role === 6 ? 'Driver' : 'Unknown',
          created_by_employee_id: currentUserId,
          created_by_name: creatorName,
          created_by_role: creatorRole
        },
        recordType: 'employee',
        recordId: employeeId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Commit transaction
    await conn.commit();
    
    return NextResponse.json({ 
      message: 'Employee added successfully', 
      id: employeeId, 
      emp_code,
      role
    });
  } catch (err) {
    await conn.rollback();
    console.error('Database error:', err);
    return NextResponse.json(
      { message: 'Database error', error: err.sqlMessage || err.message },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
