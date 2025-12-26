// src/app/api/suppliers/login/route.js
import { executeQuery } from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email & password required" },
        { status: 400 }
      );
    }

    // Fetch supplier by email
    const rows = await executeQuery(
      "SELECT * FROM suppliers WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const supplier = rows[0];

    // Check if supplier is active (status = 1) BEFORE password check for security
    if (supplier.status === 0 || supplier.status === null || supplier.status === undefined) {
      return NextResponse.json({ 
        error: "Your account has been deactivated by admin. Please contact administrator." 
      }, { status: 403 });
    }

    // Compute SHA256 hash of input password
    const hash = crypto.createHash("sha256").update(password).digest("hex");

    // Check if DB password is plain-text (for migration)
    if (supplier.password === password) {
      // Update password in DB to hashed version
      await executeQuery("UPDATE suppliers SET password=? WHERE id=?", [hash, supplier.id]);
    } else if (supplier.password !== hash) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Issue JWT for supplier
    const token = signToken({ id: supplier.id, role: "supplier" });

    // Return supplier info (exclude password) + token
    const response = NextResponse.json({
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        gstin: supplier.gstin,
        pan: supplier.pan,
        supplier_type: supplier.supplier_type,
        status: supplier.status,
      },
      token
    });

    return response;
  } catch (err) {
    console.error("Supplier login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

