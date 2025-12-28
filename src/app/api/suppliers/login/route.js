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

    // ✅ FIX: Properly validate email and password (trim whitespace and check length)
    const trimmedEmail = email ? email.trim() : '';
    const trimmedPassword = password ? password.trim() : '';

    if (!trimmedEmail || !trimmedPassword) {
      return NextResponse.json(
        { success: false, error: "Email & password required" },
        { status: 400 }
      );
    }

    // ✅ FIX: Additional validation - password must have minimum length
    if (trimmedPassword.length < 1) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Fetch supplier by email (use trimmed email)
    const rows = await executeQuery(
      "SELECT * FROM suppliers WHERE email = ? LIMIT 1",
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Supplier not found. Please check your email." 
      }, { status: 404 });
    }

    const supplier = rows[0];

    // Check if supplier is active (status = 1 or 'active') BEFORE password check for security
    const supplierStatus = supplier.status;
    if (supplierStatus === 0 || supplierStatus === '0' || supplierStatus === 'inactive' || supplierStatus === null || supplierStatus === undefined) {
      return NextResponse.json({ 
        success: false,
        error: "Your account has been deactivated by admin. Please contact administrator." 
      }, { status: 403 });
    }

    // Compute SHA256 hash of input password (use trimmed password)
    const hash = crypto.createHash("sha256").update(trimmedPassword).digest("hex");

    // Check if DB password is plain-text (for migration)
    if (supplier.password === trimmedPassword) {
      // Update password in DB to hashed version
      await executeQuery("UPDATE suppliers SET password=? WHERE id=?", [hash, supplier.id]);
    } else if (supplier.password !== hash) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid password. Please check your password." 
      }, { status: 401 });
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
    return NextResponse.json({ 
      success: false,
      error: "Server error. Please try again later." 
    }, { status: 500 });
  }
}

