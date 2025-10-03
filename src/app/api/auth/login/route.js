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
      `SELECT id, emp_code, name, email, password, role, status
       FROM employee_profile
       WHERE email = ?`,
      [email]
    );

    if (rows.length === 0)
      return NextResponse.json({ success: false, message: "Email not found" }, { status: 401 });

    const user = rows[0];
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
    if (hashedPassword !== user.password)
      return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 });

    if (user.status === 0)
      return NextResponse.json({ success: false, message: "Your account is disabled" }, { status: 403 });

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

    const token = signToken({ id: user.id, role: user.role });

    const res = NextResponse.json({
      success: true,
      userId: user.id,
      emp_code: user.emp_code,
      name: user.name,
      email: user.email,
      role: user.role,
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
