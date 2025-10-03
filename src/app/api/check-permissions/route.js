import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const employee_id = parseInt(searchParams.get("employee_id"));
  const module_name = searchParams.get("module_name");
  const action = searchParams.get("action"); // can_view, can_edit, can_delete

  // ✅ Validate input
  if (!employee_id || !module_name || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // ⚠️ Make sure action is a valid column to prevent SQL injection
    const allowedActions = ["can_view", "can_edit", "can_delete"];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 });
    }

    const query = `
      SELECT ${action} as permission
      FROM role_permissions
      WHERE employee_id = ? AND module_name = ?
      LIMIT 1
    `;
    const result = await executeQuery(query, [employee_id, module_name]);

    return NextResponse.json({ allowed: result.length > 0 && result[0].permission === 1 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
