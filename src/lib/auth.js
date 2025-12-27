// src/lib/auth.js
import jwt from "jsonwebtoken";
import { executeQuery } from "./db.js";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

// 🔑 Generate JWT - ✅ 1 year expiry so user stays logged in until explicit logout
export function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "365d" });
}

// 🔑 Get Current User
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    const userId = decoded.userId || decoded.id;
    
    const users = await executeQuery(
      `SELECT id, name, role FROM employee_profile WHERE id = ?`,
      [userId]
    );
    
    if (users.length > 0) {
      return {
        userId: users[0].id,
        userName: users[0].name,
        role: users[0].role
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// 🔑 Verify JWT - FIXED version
export function verifyToken(token) {
  try {
    if (!token) {
      console.log('❌ No token provided');
      return null;
    }
    
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    console.log('✅ Token verified successfully for user:', decoded.userId);
    return decoded;
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    return null;
  }
}

// 🔑 Check Permissions
export async function checkPermissions(userId, moduleName, action = 'can_view') {
  try {
    console.log(`🔐 Checking permissions: User ${userId}, Module: ${moduleName}, Action: ${action}`);
    
    const result = await executeQuery(
      `SELECT can_view, can_edit, can_delete 
       FROM role_permissions 
       WHERE employee_id = ? AND module_name = ?`,
      [userId, moduleName]
    );

    if (result.length === 0) {
      console.log(`❌ No permission record found for user ${userId} in module ${moduleName}`);
      return false;
    }
    
    const permissions = result[0];
    console.log(`📋 User permissions:`, permissions);
    
    // Check the specific action permission
    const hasPermission = permissions[action] === 1;
    console.log(`✅ Permission check for ${action}: ${hasPermission}`);
    
    return hasPermission;
  } catch (error) {
    console.error("❌ Permission check error:", error.message);
    return false;
  }
}