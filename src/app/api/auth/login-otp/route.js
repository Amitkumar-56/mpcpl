// src/app/api/auth/login-otp/route.js - ये नया file बनाएं
import { signToken } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  let connection;
  try {
    const { mobile } = await request.json();
    connection = await db.getConnection();

    // First check if user exists (without status filter to detect disabled accounts)
    const [userCheck] = await connection.execute(
      `SELECT id, status FROM employee_profile WHERE mobile = ?`,
      [mobile]
    );

    if (userCheck.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Mobile number not found" 
      }, { status: 401 });
    }

    // Check if user is disabled BEFORE fetching full data - strict comparison
    const userStatus = Number(userCheck[0].status);
    if (userStatus !== 1) {
      return NextResponse.json({ 
        success: false, 
        message: "Your account has been deactivated by admin. Please contact administrator." 
      }, { status: 403 });
    }

    // Fetch full user data (only active users)
    const [rows] = await connection.execute(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client
       FROM employee_profile 
       WHERE mobile = ? AND status = 1`,
      [mobile]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Account is inactive" 
      }, { status: 403 });
    }

    const user = rows[0];

    // ✅ FIX: Fetch BOTH employee-specific AND role-based permissions
    // Employee-specific permissions take priority
    const [employeePermissions] = await connection.execute(
      `SELECT module_name, can_view, can_edit, can_create
       FROM role_permissions 
       WHERE employee_id = ?`,
      [user.id]
    );
    
    // Also fetch role-based permissions (for modules not covered by employee-specific)
    const [roleBasedPermissions] = await connection.execute(
      `SELECT module_name, can_view, can_edit, can_create
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
        can_create: perm.can_create === 1
      });
    });
    
    // Then, override with employee-specific permissions (they take priority)
    employeePermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_create: perm.can_create === 1
      });
    });
    
    // Convert to object format
    const userPermissions = {};
    permissionMap.forEach((perms, module_name) => {
      userPermissions[module_name] = perms;
    });
    
    console.log('🔑 OTP Login - Employee-specific permissions:', employeePermissions.length);
    console.log('🔑 OTP Login - Role-based permissions:', roleBasedPermissions.length);
    console.log('🔑 OTP Login - Final merged permissions:', Object.keys(userPermissions).length);

    const token = signToken({ 
      id: user.id, 
      role: user.role,
      email: user.email 
    });

    const response = NextResponse.json({
      success: true,
      userId: user.id,
      emp_code: user.emp_code,
      name: user.name,
      email: user.email,
      role: user.role,
      fs_id: user.fs_id,
      fl_id: user.fl_id,
      permissions: userPermissions,
      station: user.station,
      client: user.client,
      token,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 365 * 24 * 60 * 60, // ✅ 1 year expiry - user stays logged in until explicit logout
      path: "/",
      sameSite: "lax"
    });

    return response;

  } catch (err) {
    console.error("OTP login error:", err);
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error" 
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}