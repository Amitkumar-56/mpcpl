// API to check if customer can make requests (especially for credit days customers)
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import {
  canMakeCreditRequest,
  checkCreditDaysOverdue,
} from "@/lib/creditDaysUtils";

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

    // Get customer details
    const customerQuery = `
      SELECT c.id, c.name, c.credit_days, c.roleid, c.billing_type,
             cb.balance, cb.cst_limit, cb.limit_expiry, cb.validity_days
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

    // Check if this is a credit days customer
    const isCreditDaysCustomer =
      customer.credit_days && customer.credit_days > 0;

    if (isCreditDaysCustomer) {
      // For credit days customers, use special logic
      const eligibility = await canMakeCreditRequest(customerId);
      const overdueStatus = await checkCreditDaysOverdue(customerId);

      return NextResponse.json({
        eligible: eligibility.canRequest,
        reason: eligibility.reason,
        customerType: "credit_days",
        creditDays: customer.credit_days,
        isOverdue: overdueStatus.isOverdue,
        daysOverdue: overdueStatus.daysOverdue,
        limitExpiry: customer.limit_expiry,
        message: eligibility.canRequest
          ? "Customer can make unlimited requests within credit period"
          : "Credit period expired - payment required",
      });
    } else {
      // For regular customers, check balance
      const availableBalance =
        (customer.cst_limit || 0) - (customer.balance || 0);
      const eligible = availableBalance > 0;

      return NextResponse.json({
        eligible,
        reason: eligible
          ? "Sufficient balance available"
          : "Insufficient balance",
        customerType: customer.billing_type === 1 ? "postpaid" : "prepaid",
        availableBalance,
        totalLimit: customer.cst_limit || 0,
        currentBalance: customer.balance || 0,
      });
    }
  } catch (error) {
    console.error("Error checking customer eligibility:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
