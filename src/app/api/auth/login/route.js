import { signToken } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request) {
  let connection;
  try {
    const { email, password, remember } = await request.json();
    connection = await db.getConnection();

    const [userCheck] = await connection.execute(
      `SELECT id, password, status FROM employee_profile WHERE email = ?`,
      [email]
    );

    if (userCheck.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const statusNum = Number(userCheck[0].status);
    if (statusNum !== 1) {
      return NextResponse.json(
        { success: false, message: "Your account has been deactivated by admin. Please contact administrator." },
        { status: 403 }
      );
    }

    const hashed = crypto.createHash("sha256").update(password || "").digest("hex");
    const dbPassword = userCheck[0].password || "";
    if (hashed !== dbPassword) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const [rows] = await connection.execute(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client
       FROM employee_profile 
       WHERE id = ?`,
      [userCheck[0].id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const user = rows[0];

    const [employeePermissions] = await connection.execute(
      `SELECT module_name, can_view, can_edit, can_create
       FROM role_permissions 
       WHERE employee_id = ?`,
      [user.id]
    );

    const [roleBasedPermissions] = await connection.execute(
      `SELECT module_name, can_view, can_edit, can_create
       FROM role_permissions
       WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)`,
      [user.role]
    );

    const permissionMap = new Map();
    roleBasedPermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_create: perm.can_create === 1,
      });
    });
    employeePermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_create: perm.can_create === 1,
      });
    });

    const userPermissions = {};
    permissionMap.forEach((perms, module_name) => {
      userPermissions[module_name] = perms;
    });

    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
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

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    };
    if (remember) {
      cookieOptions.maxAge = 365 * 24 * 60 * 60;
    }
    response.cookies.set("token", token, cookieOptions);

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
