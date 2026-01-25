import { createAuditLog } from "@/lib/auditLog";
import { verifyToken } from "@/lib/auth";
import { executeQuery } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

  // Ensure TDS and net_amount columns exist on agent_payment_logs
  try {
    const cols = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'agent_payment_logs'
        AND COLUMN_NAME IN ('tds_amount','net_amount')
    `);
    const hasTds = cols.some(c => c.COLUMN_NAME === 'tds_amount');
    const hasNet = cols.some(c => c.COLUMN_NAME === 'net_amount');
    if (!hasTds) {
      await executeQuery(`ALTER TABLE agent_payment_logs ADD COLUMN tds_amount DECIMAL(10,2) DEFAULT 0`);
    }
    if (!hasNet) {
      await executeQuery(`ALTER TABLE agent_payment_logs ADD COLUMN net_amount DECIMAL(10,2) DEFAULT NULL`);
    }
  } catch (e) {
    console.log("agent_payment_logs tds/net columns check:", e.message);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    await ensurePaymentLogsTable();

    if (agentId) {
      // Get payment history for specific agent with customer details
      const payments = await executeQuery(`
        SELECT 
          ap.id,
          ap.agent_id,
          ap.customer_id,
          ap.amount,
          COALESCE(ap.tds_amount, 0) as tds_amount,
          COALESCE(ap.net_amount, ap.amount) as net_amount,
          ap.remarks,
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

      // Get payment logs with customer details
      const logs = await executeQuery(`
        SELECT 
          apl.*,
          apl.tds_amount,
          apl.net_amount,
          a.first_name,
          a.last_name,
          a.agent_id as agent_code,
          c.name as customer_name,
          c.phone as customer_phone
        FROM agent_payment_logs apl
        LEFT JOIN agents a ON apl.agent_id = a.id
        LEFT JOIN customers c ON apl.customer_id = c.id
        WHERE apl.agent_id = ?
        ORDER BY apl.payment_date DESC
      `, [agentId]);

      return NextResponse.json({
        payments: payments || [],
        logs: logs || []
      }, { status: 200 });
    }

    // Get all payments
    const allPayments = await executeQuery(`
      SELECT 
        ap.id,
        ap.agent_id,
        ap.amount,
        COALESCE(ap.tds_amount, 0) as tds_amount,
        COALESCE(ap.net_amount, ap.amount) as net_amount,
        ap.remarks,
        ap.payment_date,
        a.first_name,
        a.last_name,
        a.agent_id as agent_code
      FROM agent_payments ap
      LEFT JOIN agents a ON ap.agent_id = a.id
      ORDER BY ap.payment_date DESC
    `);

    return NextResponse.json({
      payments: allPayments || []
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments: " + error.message },
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

    if (!userId || ![3,4,5,6].includes(userRole)) {
      console.error(`Payment API: Access denied - userId: ${userId}, role: ${userRole}, allowed roles 3,4,5,6`);
      return NextResponse.json({ 
        error: "Forbidden: Insufficient permissions to record payments",
        details: `Your role (${userRole || 'Unknown'}) does not have permission. Allowed roles: 3 (Teamleader), 4 (Accountant), 5 (Admin), 6 (Hardoperation).`
      }, { status: 403 });
    }

    const { agentId, amount, remarks, customerId, tdsAmount, requestId } = await request.json();

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
    try {
      const colsPay = await executeQuery(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'agent_payments'
          AND COLUMN_NAME = 'request_id'
      `);
      if (colsPay.length === 0) {
        await executeQuery(`ALTER TABLE agent_payments ADD COLUMN request_id INT DEFAULT NULL, ADD INDEX idx_request_id_pay (request_id)`);
      }
    } catch (e) {}
    try {
      const colsLog = await executeQuery(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'agent_payment_logs'
          AND COLUMN_NAME = 'request_id'
      `);
      if (colsLog.length === 0) {
        await executeQuery(`ALTER TABLE agent_payment_logs ADD COLUMN request_id INT DEFAULT NULL, ADD INDEX idx_request_id_logs (request_id)`);
      }
    } catch (e) {}

    // Insert payment record (with optional customer_id)
    // If customer_id is not provided, use NULL (column should be nullable)
    const grossAmount = parseFloat(amount);
    const tds = tdsAmount !== undefined && tdsAmount !== null ? parseFloat(tdsAmount) : 0;
    const netAmount = Math.max(0, grossAmount - (isNaN(tds) ? 0 : tds));
    const result = await executeQuery(
      `INSERT INTO agent_payments (agent_id, customer_id, request_id, amount, tds_amount, net_amount, remarks, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [agentId, customerId ? parseInt(customerId) : null, requestId ? parseInt(requestId) : null, grossAmount, isNaN(tds) ? 0 : tds, netAmount, remarks || ""]
    );

    const paymentId = result.insertId;

    // Get customer name if customer_id is provided
    let customerName = null;
    if (customerId) {
      const customerResult = await executeQuery(
        `SELECT name FROM customers WHERE id = ?`,
        [customerId]
      );
      if (customerResult.length > 0) {
        customerName = customerResult[0].name;
      }
    }

    // Insert into payment logs with who paid, when, etc.
    await executeQuery(
      `INSERT INTO agent_payment_logs (payment_id, agent_id, customer_id, request_id, amount, tds_amount, net_amount, paid_by_user_id, paid_by_user_name, remarks, payment_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [paymentId, agentId, customerId || null, requestId ? parseInt(requestId) : null, grossAmount, isNaN(tds) ? 0 : tds, netAmount, userId, userName, remarks || ""]
    );

    // Create audit log
    const paymentMessage = customerName 
      ? `Payment of ₹${grossAmount.toFixed(2)} recorded for agent ${agent[0].first_name} ${agent[0].last_name} (${agent[0].agent_id}) - Customer: ${customerName}`
      : `Payment of ₹${grossAmount.toFixed(2)} recorded for agent ${agent[0].first_name} ${agent[0].last_name} (${agent[0].agent_id}) - General Payment`;

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
        customer_id: customerId,
        customer_name: customerName,
        amount: grossAmount,
        tds_amount: isNaN(tds) ? 0 : tds,
        net_amount: netAmount,
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
