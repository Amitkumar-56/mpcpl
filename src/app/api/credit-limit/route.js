import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

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

    // Fetch balance details with expiry
    const balance = await executeQuery(
      "SELECT cst_limit, balance, amtlimit, limit_expiry, validity_days FROM customer_balances WHERE com_id = ?",
      [id]
    );

    const responseData = {
      customer: customer[0] || { name: "Not Found", phone: "Not Found" },
      balance: balance[0] || { cst_limit: 0, balance: 0, amtlimit: 0, limit_expiry: null, validity_days: 0 },
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
    const { com_id, in_amount = 0, d_amount = 0, validity_days = 0, user_id = 1 } = body;

    console.log("🔵 POST request received:", { com_id, in_amount, d_amount, validity_days, user_id });

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

    // For increase, validate validity days
    if (in_amount > 0 && (!validity_days || validity_days <= 0)) {
      return NextResponse.json(
        { error: "Please enter validity days for credit limit increase" },
        { status: 400 }
      );
    }

    // Check current balance record
    const currentBalance = await executeQuery(
      "SELECT cst_limit, balance, amtlimit, limit_expiry, validity_days FROM customer_balances WHERE com_id = ?",
      [com_id]
    );

    console.log("📊 Current balance record:", currentBalance);

    const now = new Date();
    let newCstLimit, newAmtLimit, operation, limitExpiry, newValidityDays;

    // Check if limit is expired
    const isLimitExpired = currentBalance.length > 0 && 
                          currentBalance[0].limit_expiry && 
                          new Date(currentBalance[0].limit_expiry) < now;

    console.log("⏰ Limit expiry check:", { 
      hasExpiry: currentBalance[0]?.limit_expiry, 
      expiryDate: currentBalance[0]?.limit_expiry,
      currentTime: now,
      isExpired: isLimitExpired 
    });

    // Case 1: No existing record - INSERT new (only for increase)
    if (currentBalance.length === 0) {
      console.log("🆕 No existing record - INSERTING new record");

      if (in_amount > 0) {
        newCstLimit = amount;
        newAmtLimit = amount;
        operation = "insert";
        newValidityDays = validity_days;
        
        // Calculate expiry date
        limitExpiry = new Date();
        limitExpiry.setDate(limitExpiry.getDate() + parseInt(validity_days));
        
        console.log("📅 Setting expiry date:", limitExpiry);

        // Insert new record with expiry and timestamps
        await executeQuery(
          `INSERT INTO customer_balances (com_id, cst_limit, amtlimit, balance, limit_expiry, validity_days, created_at, updated_at) 
           VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
          [com_id, newCstLimit, newAmtLimit, limitExpiry, newValidityDays, now, now]
        );

        console.log("✅ New record inserted with expiry:", { newCstLimit, newAmtLimit, limitExpiry, validity_days: newValidityDays });
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
        currentBalanceAmt,
        isLimitExpired 
      });

      if (in_amount > 0) {
        // FOR INCREASE
        operation = "increase";
        newValidityDays = validity_days;
        
        // Calculate expiry date for increase
        limitExpiry = new Date();
        limitExpiry.setDate(limitExpiry.getDate() + parseInt(validity_days));
        
        if (isLimitExpired) {
          // IMPORTANT FIX: When limit expired, new amount limit = new credit limit - (expired credit limit - current amount limit)
          // This gives us: ₹2000 - ₹700 = ₹1300
          const adjustmentAmount = currentCstLimit - currentAmtLimit;
          newCstLimit = amount;
          newAmtLimit = amount - adjustmentAmount;
          
          console.log("🔄 Limit expired - starting fresh:", { 
            newCstLimit, 
            newAmtLimit,
            adjustmentAmount,
            calculation: `${amount} - ${adjustmentAmount} = ${newAmtLimit}`
          });
        } else {
          // Normal increase - add to existing limits
          newCstLimit = currentCstLimit + amount;
          newAmtLimit = currentAmtLimit + amount;
          console.log("⬆️ Normal increase:", { newCstLimit, newAmtLimit });
        }
        
        console.log("📅 Setting new expiry:", limitExpiry, "days:", validity_days);
      } else {
        // FOR DECREASE
        operation = "decrease";
        
        if (isLimitExpired) {
          return NextResponse.json(
            { error: "Cannot decrease credit limit. Current limit has expired. Please set a new credit limit first." },
            { status: 400 }
          );
        }

        // Check if sufficient limit exists for decrease
        if (currentCstLimit < amount) {
          return NextResponse.json(
            { error: `Insufficient credit limit. Current: ₹${currentCstLimit}, Requested decrease: ₹${amount}` },
            { status: 400 }
          );
        }

        newCstLimit = currentCstLimit - amount;
        newAmtLimit = currentAmtLimit - amount;
        
        // For decrease, keep existing expiry date and validity days
        limitExpiry = current.limit_expiry;
        newValidityDays = current.validity_days;
        console.log("⬇️ Decreasing by:", amount);
      }

      console.log("🎯 Final new limits:", { 
        newCstLimit, 
        newAmtLimit, 
        limitExpiry, 
        validity_days: newValidityDays 
      });

      // Update existing record
      const updateResult = await executeQuery(
        `UPDATE customer_balances 
         SET cst_limit = ?, amtlimit = ?, limit_expiry = ?, validity_days = ?, updated_at = ?
         WHERE com_id = ?`,
        [newCstLimit, newAmtLimit, limitExpiry, newValidityDays, now, com_id]
      );

      console.log("✅ Update result:", updateResult);
    }

    // Add to filling_history with validity days
    try {
      await executeQuery(
        `INSERT INTO filling_history
         (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type, validity_days, expiry_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          operation,
          newValidityDays || null,
          limitExpiry || null
        ]
      );
      console.log("✅ Filling history updated with validity days");
    } catch (fillingError) {
      console.log("⚠️ Filling history skipped:", fillingError.message);
    }

    console.log("🎉 CREDIT LIMIT UPDATE SUCCESSFUL");

    return NextResponse.json({
      success: true,
      message: `Credit limit ${operation === "increase" ? "increased" : "decreased"} successfully${operation === "increase" ? ` for ${validity_days} days` : ''}`,
      cst_limit: newCstLimit,
      amtlimit: newAmtLimit,
      limit_expiry: limitExpiry,
      validity_days: newValidityDays,
      is_expired: isLimitExpired
    });

  } catch (err) {
    console.error("🔴 POST Error:", err.message);
    console.error("Error stack:", err.stack);
    
    return NextResponse.json({ 
      error: "Failed to update credit limit: " + err.message
    }, { status: 500 });
  }
}