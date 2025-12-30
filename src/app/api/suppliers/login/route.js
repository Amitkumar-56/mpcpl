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
    // Only reject if explicitly inactive (0, '0', 'inactive')
    // Accept: 1, '1', 'active', null, undefined, or any truthy value
    const supplierStatus = supplier.status;
    console.log('🔍 Supplier Status Check:', { 
      supplierId: supplier.id, 
      email: supplier.email,
      status: supplierStatus, 
      statusType: typeof supplierStatus 
    });
    
    // Only block if explicitly inactive, allow all other values (including null/undefined as active by default)
    const isInactive = supplierStatus === 0 || supplierStatus === '0' || supplierStatus === 'inactive';
    
    if (isInactive) {
      console.log('❌ Supplier account is inactive:', supplier.email);
      return NextResponse.json({ 
        success: false,
        error: "Your account has been deactivated by admin. Please contact administrator." 
      }, { status: 403 });
    }

    // Compute SHA256 hash of input password (use trimmed password)
    const hash = crypto.createHash("sha256").update(trimmedPassword).digest("hex");

    console.log('🔍 Password Check:', { 
      supplierId: supplier.id,
      email: supplier.email,
      dbPasswordLength: supplier.password?.length,
      dbPasswordType: typeof supplier.password,
      inputHashLength: hash.length
    });

    // Check if DB password is plain-text (for migration) or hashed
    let passwordMatch = false;
    
    // Normalize password values for comparison
    const dbPassword = supplier.password || '';
    const dbPasswordTrimmed = typeof dbPassword === 'string' ? dbPassword.trim() : String(dbPassword);
    
    console.log('🔍 Password Comparison Details:', {
      supplierId: supplier.id,
      email: supplier.email,
      dbPasswordType: typeof dbPassword,
      dbPasswordLength: dbPassword?.length,
      dbPasswordTrimmedLength: dbPasswordTrimmed?.length,
      inputPasswordLength: trimmedPassword?.length,
      inputHashLength: hash?.length,
      isHash: dbPasswordTrimmed?.length === 64,
      dbPasswordPreview: dbPasswordTrimmed?.length > 0 ? dbPasswordTrimmed.substring(0, 10) + '...' : 'empty',
      inputHashPreview: hash?.substring(0, 10) + '...'
    });
    
    // Check 1: Plain-text password match (for migration) - compare trimmed versions
    // Plain text passwords are usually shorter than SHA256 hashes (64 chars)
    if (dbPasswordTrimmed && dbPasswordTrimmed.length < 64) {
      // Case-insensitive comparison for plain text
      if (dbPasswordTrimmed.toLowerCase() === trimmedPassword.toLowerCase() || 
          dbPasswordTrimmed === trimmedPassword) {
        passwordMatch = true;
        // Update password in DB to hashed version
        await executeQuery("UPDATE suppliers SET password=? WHERE id=?", [hash, supplier.id]);
        console.log('✅ Plain-text password matched (case-insensitive), updated to hash');
      }
    } 
    // Check 2: Hashed password match - compare with computed hash
    // SHA256 hashes are always 64 characters long
    else if (dbPasswordTrimmed && dbPasswordTrimmed.length === 64) {
      // Case-sensitive comparison for hashes (hashes are always lowercase hex)
      if (dbPasswordTrimmed.toLowerCase() === hash.toLowerCase() || 
          dbPasswordTrimmed === hash) {
        passwordMatch = true;
        console.log('✅ Hashed password matched');
      } else {
        // Try comparing without case sensitivity (in case DB has uppercase)
        if (dbPasswordTrimmed.toLowerCase() === hash.toLowerCase()) {
          passwordMatch = true;
          // Normalize DB password to lowercase
          await executeQuery("UPDATE suppliers SET password=? WHERE id=?", [hash, supplier.id]);
          console.log('✅ Hashed password matched (case-corrected)');
        }
      }
    }
    // Check 3: If DB password is empty or null, reject
    else if (!dbPasswordTrimmed || dbPasswordTrimmed.length === 0) {
      console.log('❌ DB password is empty or null');
      passwordMatch = false;
    }
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch - Details:', {
        dbPasswordLength: dbPassword?.length || 0,
        dbPasswordTrimmedLength: dbPasswordTrimmed?.length || 0,
        inputPasswordLength: trimmedPassword?.length || 0,
        inputHashLength: hash?.length || 0,
        dbPasswordIsHash: dbPasswordTrimmed?.length === 64,
        dbPasswordPreview: dbPasswordTrimmed?.substring(0, 15),
        inputHashPreview: hash?.substring(0, 15),
        plainTextMatch: dbPasswordTrimmed && dbPasswordTrimmed.length < 64 && (dbPasswordTrimmed.toLowerCase() === trimmedPassword.toLowerCase()),
        hashMatch: dbPasswordTrimmed?.length === 64 && (dbPasswordTrimmed.toLowerCase() === hash.toLowerCase())
      });
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

