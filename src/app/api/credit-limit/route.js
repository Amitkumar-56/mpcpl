import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    console.log("🔵 GET request for customer ID:", id);

    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // Fetch customer details
    const customer = await executeQuery(
      "SELECT name, phone FROM customers WHERE id = ?",
      [id]
    );

    const balance = await executeQuery(
      "SELECT cst_limit, balance, amtlimit FROM customer_balances WHERE com_id = ?",
      [id]
    );

    const responseData = {
      customer: customer[0] || { name: "Not Found", phone: "Not Found" },
      balance: balance[0] || { cst_limit: 0, balance: 0, amtlimit: 0 },
    };

    console.log("🟢 GET response:", responseData);
    return NextResponse.json(responseData);

  } catch (err) {
    console.error("🔴 GET Error:", err.message);
    return NextResponse.json({ 
      error: "Failed to fetch customer data: " + err.message 
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { com_id, in_amount = 0, d_amount = 0, user_id = 1 } = body;

    console.log("🔵 POST request received:", { com_id, in_amount, d_amount, user_id });

    // Basic validation
    if (!com_id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    if (in_amount > 0 && d_amount > 0) {
      return NextResponse.json(
        { error: "Please enter either increase amount or decrease amount, not both." },
        { status: 400 }
      );
    }

    const amount = in_amount > 0 ? parseFloat(in_amount) : parseFloat(d_amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid amount greater than 0" },
        { status: 400 }
      );
    }

    // Check current balance record
    const currentBalance = await executeQuery(
      "SELECT cst_limit, balance, amtlimit FROM customer_balances WHERE com_id = ?",
      [com_id]
    );

    console.log("📊 Current balance record:", currentBalance);

    const now = new Date();
    let newCstLimit, newAmtLimit, operation;

    // Case 1: No existing record - INSERT new (only for increase)
    if (currentBalance.length === 0) {
      console.log("🆕 No existing record - INSERTING new record");

      if (in_amount > 0) {
        newCstLimit = amount;
        newAmtLimit = amount;
        operation = "insert";
        await executeQuery(
          `INSERT INTO customer_balances (com_id, cst_limit, amtlimit, balance, created_at, updated_at) 
           VALUES (?, ?, ?, 0, ?, ?)`,
          [com_id, newCstLimit, newAmtLimit, now, now]
        );

        console.log("✅ New record inserted:", { newCstLimit, newAmtLimit });
      } else {
        return NextResponse.json(
          { error: "Cannot decrease credit limit for new customer. Please set a credit limit first." },
          { status: 400 }
        );
      }
    }
    // Case 2: Existing record found - UPDATE
    else {
      console.log("📝 Existing record found - UPDATING");
      const current = currentBalance[0];
      const currentCstLimit = parseFloat(current.cst_limit) || 0;
      const currentAmtLimit = parseFloat(current.amtlimit) || 0;
      const currentBalanceAmt = parseFloat(current.balance) || 0;

      console.log("📈 Current data:", { 
        currentCstLimit, 
        currentAmtLimit, 
        currentBalanceAmt
      });

      if (in_amount > 0) {
        // FOR INCREASE
        operation = "increase";
        newCstLimit = currentCstLimit + amount;
        newAmtLimit = currentAmtLimit + amount;
        console.log("⬆️ Normal increase:", { newCstLimit, newAmtLimit });
      } else {
        // FOR DECREASE
        operation = "decrease";

        // Check if sufficient limit exists for decrease
        if (currentCstLimit < amount) {
          return NextResponse.json(
            { error: `Insufficient credit limit. Current: ₹${currentCstLimit}, Requested decrease: ₹${amount}` },
            { status: 400 }
          );
        }

        newCstLimit = currentCstLimit - amount;
        newAmtLimit = currentAmtLimit - amount;
        console.log("⬇️ Decreasing by:", amount);
      }

      console.log("🎯 Final new limits:", { 
        newCstLimit, 
        newAmtLimit 
      });

      // Update existing record
      const updateResult = await executeQuery(
        `UPDATE customer_balances 
         SET cst_limit = ?, amtlimit = ?, updated_at = ?
         WHERE com_id = ?`,
        [newCstLimit, newAmtLimit, now, com_id]
      );

      console.log("✅ Update result:", updateResult);
    }

    // Add to filling_history
    try {
      await executeQuery(
        `INSERT INTO filling_history
         (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "credit_limit_update",
          now,
          newAmtLimit,
          now,
          com_id,
          user_id,
          now,
          operation === "increase" ? amount : 0,
          operation === "decrease" ? amount : 0,
          operation
        ]
      );
      console.log("✅ Filling history updated");
    } catch (fillingError) {
      console.log("⚠️ Filling history skipped:", fillingError.message);
    }

    // Get customer name for audit log
    const customerInfo = await executeQuery(
      `SELECT name FROM customers WHERE id = ?`,
      [com_id]
    );
    const customerName = customerInfo.length > 0 ? customerInfo[0].name : `Customer ID: ${com_id}`;

    // Get current user for audit log
    let userId = user_id;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || currentUser?.id || user_id;
      const empResult = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [userId]
      );
      if (empResult.length > 0 && empResult[0].name) {
        userName = empResult[0].name;
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Customer Management',
        uniqueCode: `CUSTOMER-${com_id}`,
        section: 'Credit Limit',
        userId: userId,
        userName: userName || (userId ? `Employee ID: ${userId}` : null),
        action: operation === "increase" ? 'add' : 'edit',
        remarks: `Credit limit ${operation === "increase" ? "increased" : "decreased"} for ${customerName}: ₹${amount} (${operation})`,
        oldValue: currentBalance.length > 0 ? {
          cst_limit: currentBalance[0].cst_limit,
          amtlimit: currentBalance[0].amtlimit,
          balance: currentBalance[0].balance
        } : null,
        newValue: {
          cst_limit: newCstLimit,
          amtlimit: newAmtLimit,
          operation
        },
        recordType: 'customer',
        recordId: parseInt(com_id)
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    console.log("🎉 CREDIT LIMIT UPDATE SUCCESSFUL");

    return NextResponse.json({
      success: true,
      message: `Credit limit ${operation === "increase" ? "increased" : "decreased"} successfully`,
      cst_limit: newCstLimit,
      amtlimit: newAmtLimit
    });

  } catch (err) {
    console.error("🔴 POST Error:", err.message);
    console.error("Error stack:", err.stack);
    
    return NextResponse.json({ 
      error: "Failed to update credit limit: " + err.message
    }, { status: 500 });
  }
}