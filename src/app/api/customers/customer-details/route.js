//src/app/api/customers/customer-details/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// Helper function for password hashing
async function hashPassword(password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Password hashing failed");
  }
}

// Helper function to check and handle overdue customers
async function checkAndHandleOverdueCustomer(customerId) {
  try {
    console.log(`Checking overdue for customer: ${customerId}`);
    
    // Get customer data with credit_days from customers table and day_limit from customer_balances
    const customerQuery = `
      SELECT c.id, c.billing_type, c.status, c.credit_days,
             cb.cst_limit, cb.amtlimit, cb.hold_balance, cb.day_limit
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.id = ?
    `;

    const customerData = await executeQuery(customerQuery, [customerId]);

    if (!customerData || customerData.length === 0) {
      console.log("No customer data found");
      return { hasOverdue: false };
    }

    const customer = customerData[0];
    console.log("Customer data:", customer);

    // Only check for postpaid customers
    if (parseInt(customer.billing_type) !== 1) {
      console.log("Not a postpaid customer, skipping overdue check");
      return { hasOverdue: false };
    }

    // Use credit_days from customers table, fallback to 7 days
    const creditDaysValue = parseInt(customer.credit_days) || 7;
    console.log(`Using credit days: ${creditDaysValue}`);

    // Check for overdue invoices
    const overdueQuery = `
      SELECT COUNT(*) as overdue_count, 
             SUM(remaining_amount) as total_overdue
      FROM invoices 
      WHERE customer_id = ? 
      AND status IN ('pending', 'partially_paid')
      AND due_date < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const overdueResult = await executeQuery(overdueQuery, [
      customerId,
      creditDaysValue,
    ]);

    console.log("Overdue result:", overdueResult);

    if (!overdueResult || overdueResult.length === 0) {
      return { hasOverdue: false };
    }

    const hasOverdue = overdueResult[0].overdue_count > 0;
    const totalOverdue = parseFloat(overdueResult[0].total_overdue) || 0;

    console.log(`Overdue check: ${hasOverdue}, amount: ${totalOverdue}`);

    if (hasOverdue) {
      // Auto-block customer by setting remaining limit to 0
      const currentAmtLimit = parseFloat(customer.amtlimit) || 0;
      const currentCstLimit = parseFloat(customer.cst_limit) || 0;

      console.log(`Current limits - amtlimit: ${currentAmtLimit}, cst_limit: ${currentCstLimit}`);

      // Only block if not already blocked
      if (currentAmtLimit > 0) {
        console.log("Blocking customer due to overdue invoices");
        
        const updateQuery =
          "UPDATE customer_balances SET amtlimit = 0 WHERE com_id = ?";
        await executeQuery(updateQuery, [customerId]);

        // Log this action
        const now = new Date();
        await executeQuery(
          `INSERT INTO filling_history 
           (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "auto_block_overdue",
            now,
            0,
            now,
            customerId,
            1, // system user
            now,
            0,
            currentAmtLimit,
            "decrease",
            `Auto-blocked due to overdue invoices. Total overdue: ₹${totalOverdue}`,
          ]
        );

        // Update customer status to inactive
        await executeQuery("UPDATE customers SET status = 0 WHERE id = ?", [
          customerId,
        ]);

        console.log("Customer blocked successfully");
      } else {
        console.log("Customer already blocked");
      }

      return {
        hasOverdue: true,
        totalOverdue,
        overdueCount: overdueResult[0].overdue_count,
        wasBlocked: currentAmtLimit > 0,
      };
    }

    return { hasOverdue: false };
  } catch (error) {
    console.error("Error checking overdue customer:", error);
    return { hasOverdue: false, error: error.message };
  }
}

// Helper function to check customer eligibility with overdue handling
async function checkCustomerEligibility(customerId) {
  try {
    console.log(`Checking eligibility for customer: ${customerId}`);
    
    // First check and handle overdue
    const overdueCheck = await checkAndHandleOverdueCustomer(customerId);

    const balanceQuery = `
      SELECT cb.cst_limit, cb.amtlimit, cb.hold_balance, cb.day_limit,
             c.billing_type, c.status, c.credit_days
      FROM customer_balances cb 
      JOIN customers c ON cb.com_id = c.id 
      WHERE cb.com_id = ?
    `;
    const balanceData = await executeQuery(balanceQuery, [customerId]);

    if (!balanceData || balanceData.length === 0) {
      console.log("No balance data found");
      return {
        eligible: false,
        reason: "Customer balance not found",
        hasOverdue: overdueCheck.hasOverdue,
        totalOverdue: overdueCheck.totalOverdue || 0,
      };
    }

    const {
      cst_limit,
      amtlimit,
      hold_balance,
      day_limit,
      billing_type,
      status,
      credit_days,
    } = balanceData[0];

    const totalLimit = parseFloat(cst_limit) || 0;
    const remainingLimit = parseFloat(amtlimit) || 0;
    const currentHold = parseFloat(hold_balance) || 0;
    const availableBalance = remainingLimit - currentHold;
    const dailyLimit = parseInt(day_limit) || 0;

    console.log(`Balance info - total: ${totalLimit}, remaining: ${remainingLimit}, hold: ${currentHold}, available: ${availableBalance}, daily: ${dailyLimit}`);

    // Check if customer is inactive
    if (parseInt(status) === 0) {
      console.log("Customer is inactive");
      return {
        eligible: false,
        reason: "Customer account is inactive",
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        dailyLimit,
        hasOverdue: overdueCheck.hasOverdue,
        totalOverdue: overdueCheck.totalOverdue || 0,
      };
    }

    // Check available balance
    if (availableBalance <= 0) {
      console.log("Insufficient balance");
      return {
        eligible: false,
        reason: "Insufficient balance",
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        dailyLimit,
        hasOverdue: overdueCheck.hasOverdue,
        totalOverdue: overdueCheck.totalOverdue || 0,
      };
    }

    // For postpaid customers, check overdue invoices
    if (parseInt(billing_type) === 1 && overdueCheck.hasOverdue) {
      console.log("Customer has overdue invoices");
      return {
        eligible: false,
        reason: `Overdue invoices exist (${credit_days || 7} days credit period)`,
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        dailyLimit,
        hasOverdue: true,
        totalOverdue: overdueCheck.totalOverdue || 0,
        overdueCount: overdueCheck.overdueCount || 0,
      };
    }

    console.log("Customer is eligible");
    return {
      eligible: true,
      availableBalance,
      totalLimit,
      remainingLimit,
      currentHold,
      dailyLimit,
      billing_type,
      hasOverdue: overdueCheck.hasOverdue,
      totalOverdue: overdueCheck.totalOverdue || 0,
    };
  } catch (error) {
    console.error("Error checking eligibility:", error);
    return {
      eligible: false,
      reason: "Error checking eligibility",
      hasOverdue: false,
      error: error.message,
    };
  }
}

// Helper function to handle payment and auto-unblock
async function handlePaymentAndUnblock(customerId, paymentAmount) {
  try {
    console.log(`Processing payment unblock for customer: ${customerId}, amount: ${paymentAmount}`);
    
    // Get current balance
    const balanceQuery =
      "SELECT cst_limit, amtlimit, hold_balance FROM customer_balances WHERE com_id = ?";
    const balanceData = await executeQuery(balanceQuery, [customerId]);

    if (!balanceData || balanceData.length === 0) {
      console.log("No balance data found for unblock");
      return { unblocked: false };
    }

    const currentCstLimit = parseFloat(balanceData[0].cst_limit) || 0;
    const currentAmtLimit = parseFloat(balanceData[0].amtlimit) || 0;
    const currentHold = parseFloat(balanceData[0].hold_balance) || 0;

    console.log(`Current limits for unblock - cst_limit: ${currentCstLimit}, amtlimit: ${currentAmtLimit}`);

    // If customer was blocked (amtlimit = 0) and payment is made, restore limit
    if (currentAmtLimit === 0 && paymentAmount > 0) {
      const newAmtLimit = currentCstLimit;
      console.log(`Unblocking customer, setting amtlimit to: ${newAmtLimit}`);

      await executeQuery(
        "UPDATE customer_balances SET amtlimit = ? WHERE com_id = ?",
        [newAmtLimit, customerId]
      );

      // Activate customer
      await executeQuery("UPDATE customers SET status = 1 WHERE id = ?", [
        customerId,
      ]);

      // Log the unblock action
      const now = new Date();
      await executeQuery(
        `INSERT INTO filling_history 
         (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "auto_unblock_payment",
          now,
          newAmtLimit,
          now,
          customerId,
          1, // system user
          now,
          newAmtLimit,
          0,
          "increase",
          `Auto-unblocked after payment of ₹${paymentAmount}. Limit restored to ₹${newAmtLimit}`,
        ]
      );

      console.log("Customer unblocked successfully");
      return { unblocked: true, newLimit: newAmtLimit };
    }

    console.log("No unblock needed");
    return { unblocked: false };
  } catch (error) {
    console.error("Error handling payment unblock:", error);
    return { unblocked: false, error: error.message };
  }
}

export async function GET(request) {
  try {
    console.log("GET request received for customer details");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    console.log("Customer ID:", id);

    if (!id) {
      console.log("No customer ID provided");
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // First, check and handle any overdue situation
    console.log("Checking overdue status...");
    await checkAndHandleOverdueCustomer(id);

    // Fetch customer details - including day_limit from customer_balances
    const customerQuery = `
      SELECT c.*, cb.hold_balance, cb.cst_limit, cb.amtlimit, cb.day_limit, cb.last_reset_date
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.id = ?
    `;
    const customer = await executeQuery(customerQuery, [id]);

    console.log("Customer query result:", customer);

    if (!customer || customer.length === 0) {
      console.log("Customer not found");
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Fetch product names
    const productIds = customer[0].product 
      ? customer[0].product.split(",").filter((id) => id && id.trim() !== "")
      : [];
    let productNames = [];

    console.log("Product IDs:", productIds);

    if (productIds.length > 0) {
      try {
        const placeholders = productIds.map(() => "?").join(",");
        const productQuery = `SELECT pname FROM products WHERE id IN (${placeholders})`;
        const products = await executeQuery(productQuery, productIds);
        productNames = products ? products.map((p) => p.pname) : [];
        console.log("Product names:", productNames);
      } catch (error) {
        console.error("Error fetching products:", error);
        productNames = ["Error loading products"];
      }
    }

    // Fetch block locations
    const blockLocationIds = customer[0].blocklocation
      ? customer[0].blocklocation.split(",").filter((id) => id && id.trim() !== "")
      : [];
    let blockLocations = [];

    console.log("Block location IDs:", blockLocationIds);

    if (blockLocationIds.length > 0) {
      try {
        const placeholders = blockLocationIds.map(() => "?").join(",");
        const locationQuery = `SELECT station_name FROM filling_stations WHERE id IN (${placeholders})`;
        const locations = await executeQuery(locationQuery, blockLocationIds);
        blockLocations = locations ? locations.map((l) => l.station_name) : [];
        console.log("Block locations:", blockLocations);
      } catch (error) {
        console.error("Error fetching block locations:", error);
        blockLocations = ["Error loading locations"];
      }
    }

    // Fetch deal prices
    let dealPricesWithNames = [];
    try {
      const dealPrices = customer[0].deal_price
        ? JSON.parse(customer[0].deal_price)
        : {};

      console.log("Deal prices:", dealPrices);

      for (const [stationId, price] of Object.entries(dealPrices)) {
        if (price && stationId && stationId !== "") {
          const stationQuery =
            "SELECT station_name FROM filling_stations WHERE id = ?";
          const station = await executeQuery(stationQuery, [stationId]);
          if (station && station.length > 0) {
            dealPricesWithNames.push({
              stationName: station[0].station_name,
              price: price,
            });
          }
        }
      }
      console.log("Deal prices with names:", dealPricesWithNames);
    } catch (error) {
      console.error("Error processing deal prices:", error);
      dealPricesWithNames = [];
    }

    // Fetch sub-users
    let users = [];
    try {
      const usersQuery =
        "SELECT id, name, email, phone FROM customers WHERE com_id = ?";
      users = await executeQuery(usersQuery, [id]);
      users = users || [];
      console.log("Sub-users:", users);
    } catch (error) {
      console.error("Error fetching users:", error);
      users = [];
    }

    // Fetch outstanding invoices
    let outstandingInvoices = [];
    if (parseInt(customer[0].billing_type) === 1) {
      try {
        const invoiceQuery = `
          SELECT id, invoice_number, total_amount, paid_amount, 
                 (total_amount - paid_amount) as remaining_amount,
                 due_date, status, created_date
          FROM invoices 
          WHERE customer_id = ? 
          AND status IN ('pending', 'partially_paid')
          ORDER BY due_date ASC
        `;
        outstandingInvoices = await executeQuery(invoiceQuery, [id]);
        outstandingInvoices = outstandingInvoices || [];
        console.log("Outstanding invoices:", outstandingInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        outstandingInvoices = [];
      }
    }

    // Fetch transaction history
    let transactionHistory = [];
    try {
      const transactionQuery = `
        SELECT id, amount, type, description, created_date, status
        FROM transactions 
        WHERE customer_id = ? 
        ORDER BY created_date DESC
        LIMIT 50
      `;
      transactionHistory = await executeQuery(transactionQuery, [id]);
      transactionHistory = transactionHistory || [];
      console.log("Transaction history:", transactionHistory);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      transactionHistory = [];
    }

    // Fetch activity logs
    let logData = {
      Created: { name: "", date: "" },
      Processed: { name: "", date: "" },
      Completed: { name: "", date: "" },
      Cancelled: { name: "", date: "" },
    };

    if (customer[0].rid) {
      try {
        const logQuery = "SELECT * FROM filling_logs WHERE request_id = ?";
        const logs = await executeQuery(logQuery, [customer[0].rid]);
        console.log("Activity logs:", logs);

        if (logs) {
          for (const log of logs) {
            if (log.created_by) {
              const creator = await executeQuery(
                "SELECT name FROM customers WHERE id = ?",
                [log.created_by]
              );
              logData.Created = {
                name: (creator && creator[0]?.name) ? creator[0].name : "Unknown",
                date: log.created_date
                  ? new Date(log.created_date).toLocaleString("en-IN")
                  : "",
              };
            }

            if (log.processed_by) {
              const processor = await executeQuery(
                "SELECT name FROM employee_profile WHERE id = ?",
                [log.processed_by]
              );
              logData.Processed = {
                name: (processor && processor[0]?.name) ? processor[0].name : "Unknown",
                date: log.processed_date
                  ? new Date(log.processed_date).toLocaleString("en-IN")
                  : "",
              };
            }

            if (log.completed_by) {
              const completer = await executeQuery(
                "SELECT name FROM employee_profile WHERE id = ?",
                [log.completed_by]
              );
              logData.Completed = {
                name: (completer && completer[0]?.name) ? completer[0].name : "Unknown",
                date: log.completed_date
                  ? new Date(log.completed_date).toLocaleString("en-IN")
                  : "",
              };
            }

            if (log.cancelled_by) {
              const canceller = await executeQuery(
                "SELECT name FROM employee_profile WHERE id = ?",
                [log.cancelled_by]
              );
              logData.Cancelled = {
                name: (canceller && canceller[0]?.name) ? canceller[0].name : "Unknown",
                date: log.cancelled_date
                  ? new Date(log.cancelled_date).toLocaleString("en-IN")
                  : "",
              };
            }
          }
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    }

    // Check customer eligibility
    console.log("Checking customer eligibility...");
    const eligibility = await checkCustomerEligibility(id);
    console.log("Eligibility result:", eligibility);

    const responseData = {
      customer: {
        ...customer[0],
        productNames,
        blockLocations,
        dealPrices: dealPricesWithNames,
        users,
        logs: logData,
        outstandingInvoices,
        transactionHistory,
        eligibility,
        hold_balance: customer[0].hold_balance || 0,
        cst_limit: customer[0].cst_limit || 0,
        amtlimit: customer[0].amtlimit || 0,
        day_limit: customer[0].day_limit || 0,
        last_reset_date: customer[0].last_reset_date,
        credit_days: customer[0].credit_days,
        payment_type:
          parseInt(customer[0].billing_type) === 1
            ? customer[0].credit_days
              ? "credit_days"
              : "postpaid"
            : "prepaid",
      },
    };

    console.log("Final response data prepared");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log("POST request received");
    const body = await request.json();
    const { action, id, ...data } = body;

    console.log("Action:", action, "ID:", id, "Data:", data);

    if (!action) {
      console.log("No action provided");
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "update_customer_profile":
        const { name, phone, email, address, gst_name, gst_number, status } = data;

        if (!id) {
          return NextResponse.json(
            { error: "Customer ID is required" },
            { status: 400 }
          );
        }

        console.log("Updating customer profile for ID:", id);

        const profileCustCheck = await executeQuery(
          "SELECT id FROM customers WHERE id = ?",
          [id]
        );
        if (!profileCustCheck || profileCustCheck.length === 0) {
          return NextResponse.json(
            { error: "Customer not found" },
            { status: 404 }
          );
        }

        const updateFields = [];
        const updateValues = [];

        if (name) {
          updateFields.push("name = ?");
          updateValues.push(name);
        }
        if (phone) {
          updateFields.push("phone = ?");
          updateValues.push(phone);
        }
        if (email) {
          updateFields.push("email = ?");
          updateValues.push(email);
        }
        if (address) {
          updateFields.push("address = ?");
          updateValues.push(address);
        }
        if (gst_name) {
          updateFields.push("gst_name = ?");
          updateValues.push(gst_name);
        }
        if (gst_number) {
          updateFields.push("gst_number = ?");
          updateValues.push(gst_number);
        }
        if (status !== undefined) {
          updateFields.push("status = ?");
          updateValues.push(status);
        }

        if (updateFields.length === 0) {
          return NextResponse.json(
            { error: "No fields to update" },
            { status: 400 }
          );
        }

        updateValues.push(id);
        const updateProfileQuery = `UPDATE customers SET ${updateFields.join(", ")} WHERE id = ?`;
        console.log("Update query:", updateProfileQuery, "Values:", updateValues);
        
        await executeQuery(updateProfileQuery, updateValues);

        return NextResponse.json({
          message: "Customer profile updated successfully",
        });

      case "add_user":
        const {
          com_id,
          name: userName,
          phone: userPhone,
          email: userEmail,
          password,
        } = data;

        if (!com_id || !userName || !userPhone || !userEmail || !password) {
          return NextResponse.json(
            { error: "All fields are required" },
            { status: 400 }
          );
        }

        console.log("Adding user for company ID:", com_id);

        const parentQuery =
          "SELECT status, product, blocklocation FROM customers WHERE id = ?";
        const parent = await executeQuery(parentQuery, [com_id]);

        if (!parent || parent.length === 0) {
          return NextResponse.json(
            { error: "Parent customer not found" },
            { status: 404 }
          );
        }

        const existingUser = await executeQuery(
          "SELECT id FROM customers WHERE email = ? OR phone = ?",
          [userEmail, userPhone]
        );

        if (existingUser && existingUser.length > 0) {
          return NextResponse.json(
            { error: "User with this email or phone already exists" },
            { status: 400 }
          );
        }

        const { status: parentStatus, product, blocklocation } = parent[0];
        const hashedPassword = await hashPassword(password);

        const insertUserQuery = `
          INSERT INTO customers (com_id, roleid, name, phone, email, password, status, product, blocklocation) 
          VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)
        `;

        console.log("Insert user query:", insertUserQuery);
        
        await executeQuery(insertUserQuery, [
          com_id,
          userName,
          userPhone,
          userEmail,
          hashedPassword,
          parentStatus,
          product,
          blocklocation,
        ]);

        return NextResponse.json({ message: "User added successfully" });

      case "update_password":
        const { userId, newPassword } = data;

        if (!userId || !newPassword) {
          return NextResponse.json(
            { error: "User ID and new password are required" },
            { status: 400 }
          );
        }

        console.log("Updating password for user ID:", userId);

        const userCheck = await executeQuery(
          "SELECT id FROM customers WHERE id = ?",
          [userId]
        );
        if (!userCheck || userCheck.length === 0) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        const hashedNewPassword = await hashPassword(newPassword);
        await executeQuery("UPDATE customers SET password = ? WHERE id = ?", [
          hashedNewPassword,
          userId,
        ]);

        return NextResponse.json({ message: "Password updated successfully" });

      case "delete_user":
        const { userId: deleteUserId } = data;

        if (!deleteUserId) {
          return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
          );
        }

        console.log("Deleting user ID:", deleteUserId);

        const deleteUserCheck = await executeQuery(
          "SELECT id FROM customers WHERE id = ?",
          [deleteUserId]
        );
        if (!deleteUserCheck || deleteUserCheck.length === 0) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        await executeQuery("DELETE FROM customers WHERE id = ?", [
          deleteUserId,
        ]);
        return NextResponse.json({ message: "User deleted successfully" });

      case "process_payment":
        const { paymentAmount } = data;

        if (!id || !paymentAmount) {
          return NextResponse.json(
            { error: "Customer ID and payment amount are required" },
            { status: 400 }
          );
        }

        console.log("Processing payment for customer ID:", id, "Amount:", paymentAmount);

        const paymentCustCheck = await executeQuery(
          "SELECT id FROM customers WHERE id = ?",
          [id]
        );
        if (!paymentCustCheck || paymentCustCheck.length === 0) {
          return NextResponse.json(
            { error: "Customer not found" },
            { status: 404 }
          );
        }

        // Process payment logic here (update invoices, transactions, etc.)
        // This is a simplified version - implement your actual payment processing

        // After payment processing, check if we need to unblock the customer
        const unblockResult = await handlePaymentAndUnblock(
          id,
          parseFloat(paymentAmount)
        );

        return NextResponse.json({
          message: "Payment processed successfully",
          unblocked: unblockResult.unblocked || false,
          newLimit: unblockResult.newLimit || 0,
        });

      default:
        console.log("Invalid action:", action);
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing POST request:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}