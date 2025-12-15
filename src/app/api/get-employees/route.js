// src/app/api/get-employees/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const employees = await executeQuery(
      "SELECT id, emp_code, name, phone FROM employee_profile WHERE status = 1 ORDER BY name",
      []
    );
    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}