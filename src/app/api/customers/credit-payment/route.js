// API for handling credit days customer payments
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import {
  resetCreditDaysLimit,
  checkCreditDaysOverdue,
} from "@/lib/creditDaysUtils";

export async function POST(req) {
  try {
    const {
      customerId,
      paymentAmount,
      paymentMethod = "cash",
      remarks = "",
    } = await req.json();

    if (!customerId || !paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { message: "Customer ID and valid payment amount are required" },
        { status: 400 }
      );
    }

    // Check if customer exists and is a credit days customer
    const customerQuery = `
      SELECT c.id, c.name, c.roleid, c.credit_days, cb.balance, cb.cst_limit
      FROM customers c
      LEFT JOIN customer_balances cb ON c.id = cb.com_id
      WHERE c.id = ?
    `;

    const [customer] = await executeQuery(customerQuery, [customerId]);

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    // Check overdue status before payment
    const overdueStatus = await checkCreditDaysOverdue(customerId);

    // Process payment and reset credit limit
    const resetSuccess = await resetCreditDaysLimit(customerId, paymentAmount);

    if (!resetSuccess) {
      return NextResponse.json(
        { message: "Failed to process payment" },
        { status: 500 }
      );
    }

    // Record payment in cash_balance if payment method is cash
    if (paymentMethod === "cash") {
      await executeQuery(
        `UPDATE cash_balance SET balance = balance + ? WHERE id = 1`,
        [paymentAmount]
      );
    }

    // Create payment record (you might want to create a payments table)
    await executeQuery(
      `INSERT INTO limit_history (com_id, old_limit, change_amount, new_limit, changed_by, change_date)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        customerId,
        customer.balance,
        paymentAmount,
        customer.balance + paymentAmount,
        `payment_${paymentMethod}`,
      ]
    );

    // Get updated customer status
    const updatedCustomer = await executeQuery(customerQuery, [customerId]);
    const newOverdueStatus = await checkCreditDaysOverdue(customerId);

    return NextResponse.json({
      message: "Payment processed successfully",
      customer: {
        id: customer.id,
        name: customer.name,
        previousBalance: customer.balance,
        newBalance: customer.balance + paymentAmount,
        paymentAmount,
        wasOverdue: overdueStatus.isOverdue,
        isOverdue: newOverdueStatus.isOverdue,
        creditDays: customer.credit_days,
        newLimitExpiry: new Date(
          Date.now() + customer.credit_days * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0],
      },
    });
  } catch (error) {
    console.error("Error processing credit payment:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { message: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Get customer credit status
    const overdueStatus = await checkCreditDaysOverdue(customerId);

    const customerQuery = `
      SELECT 
        c.id, c.name, c.phone, c.email, c.credit_days, c.roleid,
        cb.balance, cb.cst_limit, cb.limit_expiry, cb.last_reset_date
      FROM customers c
      LEFT JOIN customer_balances cb ON c.id = cb.com_id
      WHERE c.id = ?
    `;

    const [customer] = await executeQuery(customerQuery, [customerId]);

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      customer: {
        ...customer,
        ...overdueStatus,
        status: overdueStatus.isOverdue ? "overdue" : "active",
        availableCredit: customer.cst_limit + customer.balance, // balance is negative for credit
      },
    });
  } catch (error) {
    console.error("Error fetching credit status:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
