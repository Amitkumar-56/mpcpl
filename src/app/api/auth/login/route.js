//src/app/api/auth/login/route.js
import { signToken } from "@/lib/auth";
import db from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(request) {
  let connection;
  try {
    const { email, password } = await request.json();
    connection = await db.getConnection();

    const [rows] = await connection.execute(
      `SELECT id, emp_code, name, email, password, role, status, fs_id, fl_id, station, client
       FROM employee_profile
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0)
      return NextResponse.json({ success: false, message: "Email not found" }, { status: 401 });

    const user = rows[0];
    
    // Check if employee is active (status = 1) BEFORE password check for security
    // Convert status to number for strict comparison (handle both string and number)
    const userStatus = Number(user.status);
    if (userStatus !== 1) {
      return NextResponse.json({ 
        success: false, 
        message: "Your account has been deactivated by admin. Please contact administrator." 
      }, { status: 403 });
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
    if (hashedPassword !== user.password)
      return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 });

    // ✅ FIX: Fetch BOTH employee-specific AND role-based permissions
    // Employee-specific permissions take priority
    const [employeePermissions] = await connection.execute(
      `SELECT module_name, can_view, can_edit, can_delete
       FROM role_permissions
       WHERE employee_id = ?`,
      [user.id]
    );
    
    // Also fetch role-based permissions (for modules not covered by employee-specific)
    const [roleBasedPermissions] = await connection.execute(
      `SELECT module_name, can_view, can_edit, can_delete
       FROM role_permissions
       WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)`,
      [user.role]
    );
    
    // ✅ Merge permissions: employee-specific override role-based for same module
    const permissionMap = new Map();
    
    // First, add all role-based permissions
    roleBasedPermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_delete: perm.can_delete === 1
      });
    });
    
    // Then, override with employee-specific permissions (they take priority)
    employeePermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_delete: perm.can_delete === 1
      });
    });
    
    // Convert to object format
    const userPermissions = {};
    permissionMap.forEach((perms, module_name) => {
      userPermissions[module_name] = perms;
    });
    
    console.log('🔑 Login - Employee-specific permissions:', employeePermissions.length);
    console.log('🔑 Login - Role-based permissions:', roleBasedPermissions.length);
    console.log('🔑 Login - Final merged permissions:', Object.keys(userPermissions).length);

    const token = signToken({ id: user.id, role: user.role });

    const res = NextResponse.json({
      success: true,
      userId: user.id,
      emp_code: user.emp_code,
      name: user.name,
      email: user.email,
      role: user.role,
      fs_id: user.fs_id,
      fl_id: user.fl_id,
      station: user.station,
      client: user.client,
      permissions: userPermissions,
      token,
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
