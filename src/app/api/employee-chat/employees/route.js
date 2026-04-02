// src/app/api/employee-chat/employees/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET - Fetch available employees for chat
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const currentUserId = decoded.userId;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // For testing: temporarily include all employees including current user
    // Remove "AND ep.id != ?" to see all employees
    let query = `
      SELECT 
        ep.id,
        ep.name,
        ep.role
      FROM employee_profile ep
      WHERE ep.status = 1
    `;

    const params = [];

    // Add search functionality
    if (search && search.trim()) {
      query += ` AND ep.name LIKE ?`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm);
    }

    query += ` ORDER BY ep.name ASC`;

    const employees = await executeQuery(query, params);
    console.log('Employee chat API - Query:', query);
    console.log('Employee chat API - Params:', params);
    console.log('Employee chat API - Results:', employees);

    // Map role numbers to names
    const roleMapping = {
      1: 'Staff',
      2: 'Incharge', 
      3: 'Team Leader',
      4: 'Accountant',
      5: 'Admin',
      6: 'Driver',
      7: 'Hard Operation',
      8: 'Supervisor'
    };

    const mappedEmployees = employees.map(emp => ({
      ...emp,
      role: roleMapping[emp.role] || emp.role || 'Employee'
    }));

    console.log('Employee chat API - Mapped employees:', mappedEmployees);

    return NextResponse.json({
      success: true,
      employees: mappedEmployees
    });

  } catch (error) {
    console.error("Error fetching chat employees:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
