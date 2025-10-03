// src/app/api/cst/customer-permission/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id");

    console.log("API: Fetching customer permissions for customer_id:", customer_id);

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: "customer_id is required" },
        { status: 400 }
      );
    }

    // ✅ Validate customer_id is a number
    if (isNaN(customer_id) || customer_id <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid customer_id" },
        { status: 400 }
      );
    }

    // ✅ Check if customer exists
    const customerResult = await executeQuery(
      "SELECT id, name, roleid FROM customers WHERE id = ?",
      [customer_id]
    );

    if (customerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerResult[0];

    // ✅ Fetch permissions for this customer
    const permissionRows = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_delete
       FROM customer_permissions
       WHERE customer_id = ?`,
      [customer_id]
    );

    console.log("API: Found permissions:", permissionRows.length);

    // Map permissions to easy object
    const permissions = {};
    permissionRows.forEach((row) => {
      permissions[row.module_name] = {
        can_view: Boolean(row.can_view),
        can_edit: Boolean(row.can_edit),
        can_delete: Boolean(row.can_delete),
      };
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        roleid: customer.roleid,
      },
      permissions,
      totalPermissions: permissionRows.length
    });

  } catch (err) {
    console.error("Permission fetch error:", err);
    return NextResponse.json(
      { 
        success: false, 
        message: "Server error",
        error: err.message 
      }, 
      { status: 500 }
    );
  }
}