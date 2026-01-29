// src/lib/cstauth.js
import jwt from "jsonwebtoken";
import { executeQuery } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

// 🔑 Generate JWT
export function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
}

// 🔑 Verify JWT
export function verifyToken(token) {
  try {
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Token verification error:", error.message);
    return null;
  }
}

// 🔑 Validate Customer Role - ADD THIS FUNCTION
export function validateCustomerRole(user) {
  return user && user.role === 'customer';
}

// 🔑 Check Permissions
export async function checkPermissions(userId, moduleName, action = 'can_view') {
  try {
    const result = await executeQuery(
      `SELECT can_view, can_edit, can_create 
       FROM customer_permissions 
       WHERE customer_id = ? AND module_name = ?`,
      [userId, moduleName]
    );

    if (result.length === 0) return false;
    
    // Check the specific action permission
    return result[0][action] === 1; // true if allowed
  } catch (error) {
    console.error("Permission check error:", error.message);
    return false;
  }
}