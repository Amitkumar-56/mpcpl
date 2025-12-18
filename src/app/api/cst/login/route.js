//src/app/api/cst/login/route.js
import { executeQuery } from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { signToken } from "@/lib/cstauth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email & password required" },
        { status: 400 }
      );
    }

    // Fetch customer by email
    const rows = await executeQuery(
      "SELECT * FROM customers WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = rows[0];

    // Compute SHA256 hash of input password
    const hash = crypto.createHash("sha256").update(password).digest("hex");

    // Check if DB password is plain-text
    if (customer.password === password) {
      // Update password in DB to hashed version
      await executeQuery("UPDATE customers SET password=? WHERE id=?", [hash, customer.id]);
    } else if (customer.password !== hash) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Only allow customers with rollid = 1
    if (customer.roleid !== 1) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if customer is active (status = 1)
    if (customer.status === 0) {
      return NextResponse.json({ 
        error: "Your account has been deactivated by admin. Please contact administrator." 
      }, { status: 403 });
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
