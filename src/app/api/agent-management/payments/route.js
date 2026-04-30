import { verifyToken } from "@/lib/auth";
import { executeQuery } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/auditLog";

// Ensure agent_payment_logs table exists
async function ensurePaymentLogsTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS agent_payment_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      payment_id INT NOT NULL,
      agent_id INT NOT NULL,
      customer_id INT UNSIGNED DEFAULT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      tds_amount DECIMAL(10, 2) DEFAULT 0,
      net_amount DECIMAL(10, 2) DEFAULT NULL,
      paid_by_user_id INT,
      paid_by_user_name VARCHAR(255),
      remarks TEXT,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_agent_id (agent_id),
      INDEX idx_payment_id (payment_id),
      INDEX idx_customer_id (customer_id),
      INDEX idx_payment_date (payment_date)
    )
  `);
  
  // Ensure agent_payments table has customer_id column (make it nullable if it's NOT NULL)
  try {
    // Check if column exists and if it's NOT NULL, make it nullable
    const checkColumn = await executeQuery(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_payments' 
      AND COLUMN_NAME = 'customer_id'
    `);
    
    if (checkColumn.length === 0) {
      // Column doesn't exist, add it
      await executeQuery(`
        ALTER TABLE agent_payments 
        ADD COLUMN customer_id INT UNSIGNED DEFAULT NULL,
        ADD INDEX idx_customer_id (customer_id)
      `);
    } else if (checkColumn[0].IS_NULLABLE === 'NO') {
      // Column exists but is NOT NULL, make it nullable
      await executeQuery(`
        ALTER TABLE agent_payments 
        MODIFY COLUMN customer_id INT UNSIGNED DEFAULT NULL
      `);
    }
  } catch (e) {
    // Column might already exist, ignore error
    console.log("agent_payments customer_id column check:", e.message);
  }
  
  // Ensure agent_payment_logs has customer_id column (if table already existed)
  try {
    const checkColumn = await executeQuery(`
      SELECT COLUMN_NAME, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_payment_logs' 
      AND COLUMN_NAME = 'customer_id'
    `);
    
    if (checkColumn.length === 0) {
      await executeQuery(`
        ALTER TABLE agent_payment_logs 
        ADD COLUMN customer_id INT UNSIGNED DEFAULT NULL,
        ADD INDEX idx_customer_id_logs (customer_id)
      `);
    }
  } catch (e) {
    // Column might already exist, ignore error
    console.log("agent_payment_logs customer_id column check:", e.message);
  }

  // Ensure TDS and net_amount columns exist on agent_payments
  try {
    const cols = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_payments'
        AND COLUMN_NAME IN ('tds_amount','net_amount')
    `);
    const hasTds = cols.some(c => c.COLUMN_NAME === 'tds_amount');
    const hasNet = cols.some(c => c.COLUMN_NAME === 'net_amount');
    if (!hasTds) {
      await executeQuery(`ALTER TABLE agent_payments ADD COLUMN tds_amount DECIMAL(10,2) DEFAULT 0`);
    }
    if (!hasNet) {
      await executeQuery(`ALTER TABLE agent_payments ADD COLUMN net_amount DECIMAL(10,2) DEFAULT NULL`);
    }
  } catch (e) {
    console.log("agent_payments tds/net columns check:", e.message);
  }

  // Ensure tds_status column exists on agent_payments
  try {
    const cols = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_payments'
        AND COLUMN_NAME = 'tds_status'
    `);
    if (cols.length === 0) {
      await executeQuery(`ALTER TABLE agent_payments ADD COLUMN tds_status VARCHAR(20) DEFAULT 'unpaid'`);
    }
  } catch (e) {
    console.log("agent_payments tds_status column check:", e.message);
  }

  // Ensure tds_status column exists on agent_payment_logs
  try {
    const cols = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_payment_logs'
        AND COLUMN_NAME = 'tds_status'
    `);
    if (cols.length === 0) {
      await executeQuery(`ALTER TABLE agent_payment_logs ADD COLUMN tds_status VARCHAR(20) DEFAULT 'unpaid'`);
    }
  } catch (e) {
    console.log("agent_payment_logs tds_status column check:", e.message);
  }

  // Ensure earning_id column exists
  try {
    await executeQuery(`ALTER TABLE agent_payments ADD COLUMN earning_id INT DEFAULT NULL`);
    await executeQuery(`ALTER TABLE agent_payment_logs ADD COLUMN earning_id INT DEFAULT NULL`);
  } catch (e) {
    console.log("earning_id column check error:", e.message);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    await ensurePaymentLogsTable();

    if (agentId) {
      console.log("Fetching TDS for agent:", agentId);
      
      // Get payment history for specific agent with customer details
      const payments = await executeQuery(`
        SELECT 
          ap.id,
          ap.agent_id,
          ap.customer_id,
          ap.amount,
          ap.tds_amount,
          ap.net_amount,
          ap.tds_status,
          ap.remarks,
          ap.earning_id,
          ap.payment_date,
          a.first_name,
          a.last_name,
          a.agent_id as agent_code,
          c.name as customer_name,
          c.phone as customer_phone
        FROM agent_payments ap
        LEFT JOIN agents a ON ap.agent_id = a.id
        LEFT JOIN customers c ON ap.customer_id = c.id
        WHERE ap.agent_id = ?
        ORDER BY ap.payment_date DESC
      `, [agentId]);

      console.log("Payments found:", payments.length);

      // Get payment logs with customer details
      const logs = await executeQuery(`
        SELECT 
          apl.*,
          apl.tds_amount,
          apl.net_amount,
          apl.tds_status,
          a.first_name,
          a.last_name,
          a.agent_id as agent_code,
          c.name as customer_name,
          c.phone as customer_phone
        FROM agent_payment_logs apl
        LEFT JOIN agent_payments ap ON apl.payment_id = ap.id
        LEFT JOIN agents a ON apl.agent_id = a.id
        LEFT JOIN customers c ON apl.customer_id = c.id
        WHERE apl.agent_id = ?
        ORDER BY apl.payment_date DESC
      `, [agentId]);

      console.log("Logs found:", logs.length);
      console.log("TDS logs:", logs.filter(l => parseFloat(l.tds_amount || 0) > 0));

      return NextResponse.json({ payments, logs });
    } else {
      console.log("Fetching all TDS logs");
      
      // Get all payment logs with agent and customer details
      const logs = await executeQuery(`
        SELECT 
          apl.*,
          apl.tds_amount,
          apl.net_amount,
          apl.tds_status,
          a.first_name,
          a.last_name,
          a.agent_id as agent_code,
          c.name as customer_name,
          c.phone as customer_phone
        FROM agent_payment_logs apl
        LEFT JOIN agent_payments ap ON apl.payment_id = ap.id
        LEFT JOIN agents a ON apl.agent_id = a.id
        LEFT JOIN customers c ON apl.customer_id = c.id
        ORDER BY apl.payment_date DESC
      `);

      console.log("All logs found:", logs.length);
      console.log("All TDS logs:", logs.filter(l => parseFloat(l.tds_amount || 0) > 0));

      return NextResponse.json({ logs });
    }
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Auth Check - Try both cookie and Authorization header
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;
    
    // Also check Authorization header
    const authHeader = request.headers.get('authorization');
    if (!token && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = authHeader; // Sometimes token is passed without Bearer prefix
      }
    }
    
    // Remove any whitespace
    if (token) {
      token = token.trim();
    }

    if (!token) {
      console.error("Payment API: No token found in cookies or Authorization header");
      return NextResponse.json({ 
        error: "Unauthorized: Please login again",
        details: "No authentication token found. Please refresh the page and try again."
      }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenError) {
      console.error("Payment API: Token verification failed:", tokenError.message);
      return NextResponse.json({ 
        error: "Unauthorized: Invalid or expired token",
        details: "Your session has expired. Please refresh the page and login again."
      }, { status: 401 });
    }

    if (!decoded) {
      console.error("Payment API: Token could not be decoded");
      return NextResponse.json({ 
        error: "Unauthorized: Invalid token",
        details: "Token could not be decoded. Please refresh the page and login again."
      }, { status: 401 });
    }

    // ✅ STRICT USER VERIFICATION: Get user ID and verify user exists
    let userId = decoded.userId || decoded.id || decoded.emp_id;
    
    if (!userId) {
      console.error("Payment API: No user ID found in token");
      return NextResponse.json({ 
        error: "Unauthorized: Invalid token",
        details: "Token does not contain valid user information. Please login again."
      }, { status: 401 });
    }

    let userName = null;
    let userRole = 0;
    
    try {
      // ✅ STRICT: Fetch user details including role from database - MUST exist
      const userResult = await executeQuery(
        `SELECT id, name, role, status FROM employee_profile WHERE id = ?`,
        [userId]
      );
      
      if (userResult.length === 0) {
        console.error(`Payment API: User not found in database - userId: ${userId}`);
        return NextResponse.json({ 
          error: "Unauthorized: User not found",
          details: "User account not found in database. Please login again."
        }, { status: 401 });
      }
      
      userName = userResult[0].name;
      userRole = Number(userResult[0].role || 0);
      
      // ✅ STRICT: Check if user is active
      if (userResult[0].status !== 1) {
        console.error(`Payment API: User account is inactive - userId: ${userId}`);
        return NextResponse.json({ 
          error: "Forbidden: Your account is inactive",
          details: "Your account has been deactivated. Please contact administrator."
        }, { status: 403 });
      }
    } catch (userError) {
      console.error("Payment API: Error fetching user details:", userError);
      return NextResponse.json({ 
        error: "Internal Server Error",
        details: "Failed to verify user details. Please try again."
      }, { status: 500 });
    }

    // Check if user has edit permission for Agent Management
    // Admin (role 5) always has permission
    if (userRole !== 5) {
      const { checkPermissions } = await import("@/lib/auth");
      const hasPermission = await checkPermissions(userId, "Agent Management", "can_edit");
      
      if (!hasPermission) {
        console.error(`Payment API: Access denied - userId: ${userId}, role: ${userRole}, missing can_edit permission for Agent Management`);
        return NextResponse.json({ 
          error: "Forbidden: You do not have permission to record payments",
          details: "Your role does not have 'Edit' permission for the Agent Management module. Please contact an administrator."
        }, { status: 403 });
      }
    }

    const { agentId, amount, remarks, customerId, tdsAmount, earningId, earningIds } = await request.json();
    
    // Normalize earningIds to an array
    const targetEarningIds = Array.isArray(earningIds) ? earningIds : (earningId ? [earningId] : []);

    if (!agentId || !amount) {
      return NextResponse.json(
        { error: "Agent ID and Amount are required" },
        { status: 400 }
      );
    }

    // Verify agent exists
    const agent = await executeQuery(
      `SELECT id, first_name, last_name, agent_id FROM agents WHERE id = ?`,
      [agentId]
    );

    if (agent.length === 0) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    await ensurePaymentLogsTable();

    // Validate customer_id if provided
    let validCustomerId = null;
    if (customerId && customerId !== "" && customerId !== null && customerId !== "null") {
      // Check if customer exists
      const customerCheck = await executeQuery(
        `SELECT id FROM customers WHERE id = ?`,
        [parseInt(customerId)]
      );
      if (customerCheck.length > 0) {
        validCustomerId = parseInt(customerId);
      }
    }

    const netAmount = parseFloat(amount); // Amount actually paid/transferred to agent
    const tds = tdsAmount !== undefined && tdsAmount !== null ? parseFloat(tdsAmount) : 0;
    const grossAmount = netAmount + (isNaN(tds) ? 0 : tds); // Total to be deducted from commission balance
    
    // Insert without customer_id if it's not valid (avoid foreign key constraint)
    const result = await executeQuery(
      `INSERT INTO agent_payments (agent_id, customer_id, earning_id, amount, tds_amount, net_amount, remarks, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [agentId, validCustomerId, targetEarningIds.length === 1 ? targetEarningIds[0] : null, grossAmount, isNaN(tds) ? 0 : tds, netAmount, remarks || ""]
    );

    const paymentId = result.insertId;

    // Get customer name if valid customer_id is provided
    let customerName = null;
    if (validCustomerId) {
      const customerResult = await executeQuery(
        `SELECT name FROM customers WHERE id = ?`,
        [validCustomerId]
      );
      if (customerResult.length > 0) {
        customerName = customerResult[0].name;
      }
    }

    // Insert into payment logs with who paid, when, etc.
    await executeQuery(
      `INSERT INTO agent_payment_logs (payment_id, agent_id, customer_id, earning_id, amount, tds_amount, net_amount, paid_by_user_id, paid_by_user_name, remarks, payment_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [paymentId, agentId, validCustomerId, targetEarningIds.length === 1 ? targetEarningIds[0] : null, grossAmount, isNaN(tds) ? 0 : tds, netAmount, userId, userName, remarks || ""]
    );

    // Deduct commission from agent_earnings and agent_commissions tables
    if (targetEarningIds.length > 0) {
      // targeted deduction - deduct based on the actual earnings selected
      // We need to distribute the grossAmount among selected earnings
      // For simplicity, we assume the grossAmount represents the total of selected earnings
      for (const eid of targetEarningIds) {
        // Find individual earning amount to deduct exactly that
        const earning = await executeQuery(`SELECT commission_amount FROM agent_earnings WHERE id = ?`, [eid]);
        if (earning.length > 0) {
          await executeQuery(
            `UPDATE agent_earnings SET payment_id = ? WHERE id = ?`,
            [paymentId, eid]
          );
        }
      }
    } else if (validCustomerId) {
      const totalDeduction = grossAmount; // Full gross amount (Net + TDS) should be deducted
      
      // Check if agent_earnings table exists and has data
      let earningsDeducted = 0;
      try {
        const earningsTableCheck = await executeQuery(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = DATABASE() AND table_name = 'agent_earnings'`
        );
        
        if (earningsTableCheck[0]?.count > 0) {
          // Check if there are earnings records for this agent and customer
          const earningsCount = await executeQuery(
            `SELECT COUNT(*) as count FROM agent_earnings 
             WHERE agent_id = ? AND customer_id = ? AND commission_amount > 0`,
            [agentId, validCustomerId]
          );
          
          if (earningsCount[0]?.count > 0) {
            // Deduct from agent_earnings table (FIFO - First In First Out)
            const earningsToDeduct = await executeQuery(
              `SELECT id, commission_amount 
               FROM agent_earnings 
               WHERE agent_id = ? AND customer_id = ? AND commission_amount > 0 
               ORDER BY earned_at ASC 
               LIMIT ?`,
              [agentId, validCustomerId, 50]
            );

            let remainingDeduction = totalDeduction;
            
            for (const earning of earningsToDeduct) {
              if (remainingDeduction <= 0) break;
              
              const deductAmount = Math.min(remainingDeduction, parseFloat(earning.commission_amount || 0));
              
              await executeQuery(
                `UPDATE agent_earnings 
                 SET commission_amount = commission_amount - ? 
                 WHERE id = ?`,
                [deductAmount, earning.id]
              );
              
              remainingDeduction -= deductAmount;
              earningsDeducted += deductAmount;
            }
          }
        }
      } catch (error) {
        console.log("Agent earnings table not available or error:", error.message);
      }

      // If agent_earnings deduction didn't work, try agent_commissions as fallback
      if (earningsDeducted < totalDeduction) {
        const remainingToDeduct = totalDeduction - earningsDeducted;
        
        try {
          // Deduct from agent_commissions table (reduce commission_rate)
          const commissionsToDeduct = await executeQuery(
            `SELECT ac.id, ac.commission_rate, ac.product_code_id,
                    COALESCE(SUM(fr.aqty), 0) as total_quantity
             FROM agent_commissions ac
             LEFT JOIN filling_requests fr ON fr.cid = ac.customer_id 
               AND fr.status = 'Completed'
               AND (fr.fl_id = ac.product_code_id OR fr.sub_product_id = ac.product_code_id)
             WHERE ac.agent_id = ? AND ac.customer_id = ? AND ac.commission_rate > 0
             GROUP BY ac.id, ac.commission_rate, ac.product_code_id
             ORDER BY ac.id ASC
             LIMIT ?`,
            [agentId, validCustomerId, 50]
          );

          let remainingDeduction = remainingToDeduct;
          
          for (const commission of commissionsToDeduct) {
            if (remainingDeduction <= 0) break;
            
            const totalCommission = parseFloat(commission.commission_rate || 0) * parseFloat(commission.total_quantity || 0);
            const deductAmount = Math.min(remainingDeduction, totalCommission);
            
            // Calculate new commission rate (proportionally reduce)
            const newCommissionRate = Math.max(0, (totalCommission - deductAmount) / parseFloat(commission.total_quantity || 1));
            
            await executeQuery(
              `UPDATE agent_commissions 
               SET commission_rate = ? 
               WHERE id = ?`,
              [newCommissionRate, commission.id]
            );
            
            remainingDeduction -= deductAmount;
          }
        } catch (error) {
          console.log("Agent commissions deduction error:", error.message);
        }
      }
    }

    // Create audit log
    const totalDeduction = grossAmount;
    const paymentMessage = customerName 
      ? `Payment of ₹${netAmount.toFixed(2)} + TDS ₹${(isNaN(tds) ? 0 : tds).toFixed(2)} = ₹${totalDeduction.toFixed(2)} recorded for agent ${agent[0].first_name} ${agent[0].last_name} (${agent[0].agent_id}) - Customer: ${customerName}`
      : `Payment of ₹${netAmount.toFixed(2)} + TDS ₹${(isNaN(tds) ? 0 : tds).toFixed(2)} = ₹${totalDeduction.toFixed(2)} recorded for agent ${agent[0].first_name} ${agent[0].last_name} (${agent[0].agent_id}) - General Payment`;
      await createAuditLog({
      page: 'Agent Management',
      uniqueCode: `AGENT-PAY-${agent[0].agent_id}-${paymentId}`,
      section: 'Record Payment',
      userId: userId,
      userName: userName,
      action: 'create',
      remarks: paymentMessage + (remarks ? ` | Remarks: ${remarks}` : ''),
      oldValue: null,
      newValue: {
        payment_id: paymentId,
        agent_id: agentId,
        agent_name: `${agent[0].first_name} ${agent[0].last_name}`,
        agent_code: agent[0].agent_id,
        customer_id: validCustomerId,
        customer_name: customerName,
        amount: grossAmount,
        tds_amount: isNaN(tds) ? 0 : tds,
        net_amount: netAmount,
        total_deduction: totalDeduction,
        commission_deducted: (validCustomerId || targetEarningIds.length > 0) ? 'Yes' : 'No',
        earning_id: targetEarningIds.length === 1 ? targetEarningIds[0] : null,
        earning_ids: targetEarningIds,
        remarks: remarks || ''
      },
      recordType: 'agent_payment',
      recordId: paymentId
    });

    return NextResponse.json(
      { 
        success: true, 
        id: paymentId,
        message: paymentMessage
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payment recording failed:", error);
    const errorMessage = error?.message || "Unknown error occurred";
    const errorDetails = error?.stack ? (process.env.NODE_ENV === 'development' ? error.stack : undefined) : undefined;
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to record payment",
        message: errorMessage,
        details: errorDetails || "Please check server logs for more details"
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { paymentId, status } = await request.json();

    if (!paymentId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await ensurePaymentLogsTable();

    await executeQuery(
      `UPDATE agent_payments SET tds_status = ? WHERE id = ?`,
      [status, paymentId]
    );

    // Update log entry as well
    await executeQuery(
      `UPDATE agent_payment_logs SET tds_status = ? WHERE payment_id = ?`,
      [status, paymentId]
    );

    return NextResponse.json({ success: true, message: "TDS status updated" }, { status: 200 });
  } catch (error) {
    console.error("Failed to update TDS status:", error);
    return NextResponse.json({ error: "Failed to update TDS status" }, { status: 500 });
  }
}

