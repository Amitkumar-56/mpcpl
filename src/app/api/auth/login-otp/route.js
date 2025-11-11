// src/app/api/auth/login-otp/route.js - ये नया file बनाएं
import { signToken } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  let connection;
  try {
    const { mobile } = await request.json();
    connection = await db.getConnection();

    const [rows] = await connection.execute(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client
       FROM employee_profile 
       WHERE mobile = ? AND status = 1`,
      [mobile]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Mobile number not found or account disabled" 
      }, { status: 401 });
    }

    const user = rows[0];

    const [permissions] = await connection.execute(
      `SELECT module_name, can_view, can_edit, can_delete
       FROM role_permissions 
       WHERE employee_id = ?`,
      [user.id]
    );

    const userPermissions = {};
    permissions.forEach((p) => {
      userPermissions[p.module_name] = {
        can_view: p.can_view === 1,
        can_edit: p.can_edit === 1,
        can_delete: p.can_delete === 1,
      };
    });

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
      maxAge: 24 * 60 * 60, // 24 hours
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