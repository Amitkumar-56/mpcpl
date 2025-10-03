// src/app/api/retailers/login/route.js
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, phone, password } = body;

    if ((!email && !phone) || !password) {
      return new Response(JSON.stringify({ success: false, message: "Email/Phone and password required" }), {
        status: 400,
      });
    }

    // Find retailer by email or phone
    const [rows] = await pool.query(
      `SELECT * FROM retailers WHERE email = ? OR phone = ? LIMIT 1`,
      [email || "", phone || ""]
    );

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "Retailer not found" }), {
        status: 401,
      });
    }

    const retailer = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, retailer.password);
    if (!isMatch) {
      return new Response(JSON.stringify({ success: false, message: "Invalid password" }), {
        status: 401,
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: retailer.id, name: retailer.retailer_name, role: retailer.role },
      process.env.JWT_SECRET || "yoursecret",
      { expiresIn: "1d" }
    );

    return new Response(JSON.stringify({ success: true, token, retailer }), {
      status: 200,
    });
  } catch (err) {
    console.error("Login error:", err);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), { status: 500 });
  }
}
