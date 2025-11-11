import crypto from 'crypto';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import db from '../../../lib/db';

export async function GET() {
  try {
    const [rows] = await db.execute('SELECT * FROM employee_profile ORDER BY id DESC');
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    await db.execute('DELETE FROM employee_profile WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}

export async function POST(req) {
  const conn = await db.getConnection();
  try {
    const formData = await req.formData();

    // --- Auto-generate Employee Code ---
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

    // --- Form fields ---
    const email = formData.get('email') || '';
    const rawPassword = formData.get('password') || '';
    const role = parseInt(formData.get('role')) || 0; // Yeh role employee_profile ke liye hai
    const salary = parseInt(formData.get('salary')) || 0;
    const name = formData.get('name') || '';
    const address = formData.get('address') || '';
    const city = formData.get('city') || '';
    const region = formData.get('region') || '';
    const country = formData.get('country') || '';
    const postbox = formData.get('postbox') || '';
    const phone = formData.get('phone') || '';
    const phonealt = formData.get('phonealt') || '';
    const status = parseInt(formData.get('status')) || 0;
    const account_details = formData.get('account_details') || '';

    // --- Hash password with SHA-256 ---
    const password = crypto.createHash('sha256').update(rawPassword).digest('hex');

    // --- Handle image ---
    const pictureFile = formData.get('picture');
    let pictureName = 'default.png';
    if (pictureFile && pictureFile.name) {
      pictureName = `${Date.now()}_${pictureFile.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      fs.mkdirSync(uploadDir, { recursive: true });
      const buffer = Buffer.from(await pictureFile.arrayBuffer());
      fs.writeFileSync(path.join(uploadDir, pictureName), buffer);
    }

    // --- Begin transaction ---
    await conn.beginTransaction();

    // Insert employee
    const [result] = await conn.execute(
      `INSERT INTO employee_profile 
      (emp_code,email,password,role,salary,name,address,city,region,country,
       postbox,phone,phonealt,picture,status,account_details,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW())`,
      [
        emp_code, email, password, role, salary, name, address,
        city, region, country, postbox, phone, phonealt, pictureName, status, account_details
      ]
    );

    const employeeId = result.insertId;

    // --- Save permissions with ROLE ---
    const perms = formData.get('permissions');
    if (perms) {
      let permissionsObj = {};
      try {
        permissionsObj = JSON.parse(perms);
      } catch (e) {
        console.error('Invalid permissions JSON', e);
      }

      for (let moduleName in permissionsObj) {
        const { can_view, can_edit, can_delete } = permissionsObj[moduleName];
        await conn.execute(
          `INSERT INTO role_permissions 
            (employee_id, role, module_name, can_view, can_edit, can_delete, created_at)
           VALUES (?,?,?,?,?,?, NOW())`,
          [
            employeeId, 
            role, // Yahan same role use karenge jo employee_profile mein hai
            moduleName, 
            can_view ? 1 : 0, 
            can_edit ? 1 : 0, 
            can_delete ? 1 : 0
          ]
        );
      }
    }

    // Commit transaction
    await conn.commit();
    return NextResponse.json({ 
      message: 'Employee added', 
      id: employeeId, 
      emp_code,
      role: role // Response mein role bhi send karen
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