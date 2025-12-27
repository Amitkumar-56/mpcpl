//src/app/api/cst/login/route.js
import { executeQuery } from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { signToken } from "@/lib/cstauth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    // ✅ FIX: Properly validate email and password (trim whitespace and check length)
    const trimmedEmail = email ? email.trim() : '';
    const trimmedPassword = password ? password.trim() : '';

    if (!trimmedEmail || !trimmedPassword) {
      return NextResponse.json(
        { error: "Email & password required" },
        { status: 400 }
      );
    }

    // ✅ FIX: Additional validation - password must have minimum length
    if (trimmedPassword.length < 1) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Fetch customer by email
    const rows = await executeQuery(
      "SELECT * FROM customers WHERE email = ? LIMIT 1",
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = rows[0];

    // Check if customer is active (status = 1) BEFORE password check for security
    if (customer.status === 0 || customer.status === null || customer.status === undefined) {
      return NextResponse.json({ 
        error: "Your account has been deactivated by admin. Please contact administrator." 
      }, { status: 403 });
    }

    // Only allow customers with roleid = 1
    if (customer.roleid !== 1) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Compute SHA256 hash of input password (use trimmed password)
    const hash = crypto.createHash("sha256").update(trimmedPassword).digest("hex");

    // Check if DB password is plain-text
    if (customer.password === password) {
      // Update password in DB to hashed version
      await executeQuery("UPDATE customers SET password=? WHERE id=?", [hash, customer.id]);
    } else if (customer.password !== hash) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Issue JWT for customer
    const token = signToken({ id: customer.id, role: "customer" });

    // Return customer info (exclude password) + token
    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        station: customer.station,
        client: customer.client,
        roleid: customer.roleid,
      },
      token
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
