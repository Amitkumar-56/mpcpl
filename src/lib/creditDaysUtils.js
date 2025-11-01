// Credit Days Utility Functions
import { executeQuery } from "./db.js";

/**
 * Check if a credit days customer is overdue
 * @param {number} customerId - Customer ID
 * @returns {Promise<{isOverdue: boolean, daysOverdue: number, totalOutstanding: number}>}
 */
export async function checkCreditDaysOverdue(customerId) {
  try {
    // Get customer details with credit days and limit expiry - NO BALANCE CHECK
    const customerQuery = `
      SELECT 
        c.id,
        c.credit_days,
        c.roleid,
        cb.limit_expiry,
        cb.validity_days
      FROM customers c
      LEFT JOIN customer_balances cb ON c.id = cb.com_id
      WHERE c.id = ?
    `;

    const [customer] = await executeQuery(customerQuery, [customerId]);

    if (!customer) {
      return { isOverdue: false, daysOverdue: 0, totalOutstanding: 0 };
    }

    // Only check for credit days customers
    if (!customer.credit_days || customer.credit_days <= 0) {
      return { isOverdue: false, daysOverdue: 0, totalOutstanding: 0 };
    }

    const currentDate = new Date();
    const limitExpiry = new Date(customer.limit_expiry);

    // Check if credit period has expired - ONLY TIME-BASED CHECK
    const isOverdue = currentDate > limitExpiry;
    const daysOverdue = isOverdue
      ? Math.floor((currentDate - limitExpiry) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      isOverdue,
      daysOverdue,
      totalOutstanding: 0, // No balance tracking for credit days customers
      limitExpiry: customer.limit_expiry,
      creditDays: customer.credit_days || customer.validity_days,
    };
  } catch (error) {
    console.error("Error checking credit days overdue:", error);
    return { isOverdue: false, daysOverdue: 0, totalOutstanding: 0 };
  }
}

/**
 * Reset credit days limit after payment
 * @param {number} customerId - Customer ID
 * @param {number} paymentAmount - Amount paid
 * @returns {Promise<boolean>}
 */
export async function resetCreditDaysLimit(customerId, paymentAmount) {
  try {
    // Get customer credit days - NO BALANCE NEEDED
    const customerQuery = `
      SELECT c.credit_days
      FROM customers c
      WHERE c.id = ?
    `;

    const [customer] = await executeQuery(customerQuery, [customerId]);

    if (!customer) {
      return false;
    }

    const creditDays = customer.credit_days || 7;
    const newLimitExpiry = new Date(
      Date.now() + creditDays * 24 * 60 * 60 * 1000
    );

    // ONLY reset credit period expiry - NO BALANCE UPDATES
    await executeQuery(
      `UPDATE customer_balances 
       SET limit_expiry = ?, last_reset_date = NOW()
       WHERE com_id = ?`,
      [newLimitExpiry.toISOString().split("T")[0], customerId]
    );

    // Log the credit reset - NO BALANCE TRACKING
    await executeQuery(
      `INSERT INTO limit_history (com_id, old_limit, change_amount, new_limit, changed_by, change_date)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        customerId,
        0, // No old limit
        paymentAmount,
        0, // No new limit
        "credit_days_reset",
      ]
    );

    return true;
  } catch (error) {
    console.error("Error resetting credit days limit:", error);
    return false;
  }
}

/**
 * Get customer status based on credit days and balance
 * @param {Object} customer - Customer object with balance, limit_expiry, etc.
 * @returns {string} - Status: 'active', 'overdue', 'blocked'
 */
export function getCreditDaysStatus(customer) {
  if (!customer.limit_expiry) {
    return "active";
  }

  const currentDate = new Date();
  const limitExpiry = new Date(customer.limit_expiry);
  const isOverdue = currentDate > limitExpiry;

  // ONLY TIME-BASED STATUS - NO BALANCE CHECK
  if (isOverdue) {
    return "overdue";
  }

  return "active";
}

/**
 * Check if customer can make new requests
 * @param {number} customerId - Customer ID
 * @param {number} requestAmount - Amount of new request
 * @returns {Promise<{canRequest: boolean, reason: string}>}
 */
export async function canMakeCreditRequest(customerId, requestAmount = 0) {
  try {
    const overdueCheck = await checkCreditDaysOverdue(customerId);

    // For credit days customers, only check if credit period has expired
    // They can make unlimited requests within their credit period (no balance check)
    if (overdueCheck.isOverdue) {
      return {
        canRequest: false,
        reason: `Credit period expired ${overdueCheck.daysOverdue} days ago. Please make payment to reset credit period.`,
      };
    }

    // Credit days customers can make unlimited requests within their credit period
    const daysRemaining = overdueCheck.creditDays
      ? Math.ceil(
          (new Date(overdueCheck.limitExpiry) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      : overdueCheck.creditDays;

    return {
      canRequest: true,
      reason: `${Math.max(0, daysRemaining)} days remaining in credit period`,
    };
  } catch (error) {
    console.error("Error checking credit request eligibility:", error);
    return { canRequest: false, reason: "System error. Please try again." };
  }
}
