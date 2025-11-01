import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * =====================================================
 * GET → Fetch customer balance and expiry from DB
 * POST → Create or update customer balance record
 * =====================================================
 */

// ✅ GET - Fetch customer balance and expiry details (from DB only)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Customer ID is required" },
        { status: 400 }
      );
    }

    // ✅ Verify customer exists
    const customerQuery = `
      SELECT id, name, email 
      FROM customers 
      WHERE id = ?
      LIMIT 1
    `;
    const customerResult = await executeQuery(customerQuery, [customerId]);

    if (customerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    // ✅ Fetch balance & expiry info - SIMPLIFIED QUERY
    const balanceQuery = `
      SELECT 
        com_id,
        limit_expiry,
        validity_days,
        created_at,
        updated_at
      FROM customer_balances
      WHERE com_id = ?
      LIMIT 1
    `;
    const balanceResult = await executeQuery(balanceQuery, [customerId]);

    console.log("🔍 Balance Query Result:", balanceResult); // Debug log

    let balanceData;

    if (balanceResult.length > 0) {
      const b = balanceResult[0];
      
      // ✅ Debug log to see what's coming from database
      console.log("📊 Raw DB Data:", {
        com_id: b.com_id,
        limit_expiry: b.limit_expiry,
        limit_expiry_type: typeof b.limit_expiry,
        validity_days: b.validity_days
      });

      balanceData = {
        com_id: b.com_id,
        limit_expiry: b.limit_expiry,
        validity_days: b.validity_days || 0,
        // ✅ Simple date formatting without errors
        limit_expiry_formatted: b.limit_expiry 
          ? new Date(b.limit_expiry).toISOString().split('T')[0]
          : null,
        created_at: b.created_at,
        updated_at: b.updated_at,
      };
    } else {
      // No record found → send blank defaults
      balanceData = {
        com_id: customerId,
        limit_expiry: null,
        validity_days: 0,
        limit_expiry_formatted: null,
        created_at: null,
        updated_at: null,
      };
    }

    return NextResponse.json({
      success: true,
      customer: customerResult[0],
      balanceData,
    });
  } catch (error) {
    console.error("❌ Error fetching customer balance:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ POST - Create or update balance record
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customer_id,
      validity_days = 0,
    } = body;

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: "Customer ID is required" },
        { status: 400 }
      );
    }

    // ✅ Check if already exists
    const checkQuery = `SELECT id FROM customer_balances WHERE com_id = ? LIMIT 1`;
    const checkResult = await executeQuery(checkQuery, [customer_id]);

    const now = new Date();
    const limitExpiry = validity_days > 0
      ? new Date(now.getTime() + validity_days * 24 * 60 * 60 * 1000)
      : null;

    console.log("Calculating expiry:", {
      validity_days,
      limitExpiry,
      now: now.toISOString()
    });

    if (checkResult.length > 0) {
      // ✅ Update record
      const updateQuery = `
        UPDATE customer_balances
        SET 
          validity_days = ?,
          limit_expiry = ?,
          updated_at = NOW()
        WHERE com_id = ?
      `;
      await executeQuery(updateQuery, [
        validity_days,
        limitExpiry,
        customer_id,
      ]);

      return NextResponse.json({
        success: true,
        message: "Customer balance updated successfully",
        limit_expiry: limitExpiry,
      });
    } else {
      // ✅ Insert record
      const insertQuery = `
        INSERT INTO customer_balances (
          com_id,
          limit_expiry,
          validity_days,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      await executeQuery(insertQuery, [
        customer_id,
        limitExpiry,
        validity_days,
      ]);

      return NextResponse.json({
        success: true,
        message: "Customer balance created successfully",
        limit_expiry: limitExpiry,
      });
    }
  } catch (error) {
    console.error("❌ Error saving customer balance:", error);
    return NextResponse.json(
      { success: false, message: "Error saving customer balance" },
      { status: 500 }
    );
  }
}