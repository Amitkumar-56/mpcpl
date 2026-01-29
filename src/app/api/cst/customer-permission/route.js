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
      "SELECT id, name, roleid, com_id FROM customers WHERE id = ?",
      [customer_id]
    );

    if (customerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerResult[0];
    
    // ✅ Determine which ID to use for permission lookup
    // If it's a sub-user (roleid=2), use their com_id (parent customer ID)
    // If com_id is missing for roleid=2, fallback to own id (shouldn't happen for valid sub-users)
    const permissionLookupId = (customer.roleid === 2 && customer.com_id) 
      ? customer.com_id 
      : customer.id;

    console.log(`API: Lookup permissions for ID: ${permissionLookupId} (Role: ${customer.roleid})`);

    // ✅ Fetch permissions using the correct lookup ID
    const permissionRows = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_create
       FROM customer_permissions
       WHERE customer_id = ?`,
      [permissionLookupId]
    );

    console.log("API: Found permissions:", permissionRows.length);

    // Map permissions to easy object
    const permissions = {};
    permissionRows.forEach((row) => {
      permissions[row.module_name] = {
        can_view: Boolean(row.can_view),
        can_edit: Boolean(row.can_edit),
        can_create: Boolean(row.can_create),
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