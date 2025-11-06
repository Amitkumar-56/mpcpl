// src/app/api/chat/employees/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const employees = await executeQuery(`
      SELECT 
        id,
        name,
        role,
        CASE role 
          WHEN '5' THEN 'Admin'
          WHEN '4' THEN 'Accountant' 
          WHEN '3' THEN 'Team Leader'
          WHEN '2' THEN 'Incharge'
          ELSE 'Unknown'
        END as role_name
      FROM employee_profile 
      WHERE role IN ('2', '3', '4', '5')
      ORDER BY 
        CASE role 
          WHEN '5' THEN 1  -- Admin (highest priority)
          WHEN '4' THEN 2  -- Accountant
          WHEN '3' THEN 3  -- Team Leader  
          WHEN '2' THEN 4  -- Incharge
          ELSE 5
        END
    `);

    return NextResponse.json({ 
      success: true, 
      employees 
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}