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
      amount DECIMAL(10, 2) NOT NULL,
      paid_by_user_id INT,
      paid_by_user_name VARCHAR(255),
      remarks TEXT,
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_agent_id (agent_id),
      INDEX idx_payment_id (payment_id),
      INDEX idx_payment_date (payment_date)
    )
  `);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    await ensurePaymentLogsTable();

    if (agentId) {
      // Get payment history for specific agent with logs
      const payments = await executeQuery(`
        SELECT 
          ap.id,
          ap.agent_id,
          ap.amount,
          ap.remarks,
          ap.payment_date,
          a.first_name,
          a.last_name,
          a.agent_id as agent_code
        FROM agent_payments ap
        LEFT JOIN agents a ON ap.agent_id = a.id
        WHERE ap.agent_id = ?
        ORDER BY ap.payment_date DESC
      `, [agentId]);

      // Get payment logs
      const logs = await executeQuery(`
        SELECT 
          apl.*,
          a.first_name,
          a.last_name,
          a.agent_id as agent_code
        FROM agent_payment_logs apl
        LEFT JOIN agents a ON apl.agent_id = a.id
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
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    let userId = null;
    let userName = 'System';
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id || decoded.emp_id;
          // Get user name
          if (userId) {
            const userResult = await executeQuery(
              `SELECT name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (userResult.length > 0) {
              userName = userResult[0].name;
            }
          }
        }
      } catch (tokenError) {
        console.error("Token verification error:", tokenError);
      }
    }

    if (!token) {
      console.error("Payment API: No token found in cookies or Authorization header");
      return NextResponse.json({ 
        error: "Unauthorized: Please login again",
        details: "No authentication token found"
      }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenError) {
      console.error("Payment API: Token verification failed:", tokenError);
      return NextResponse.json({ 
        error: "Unauthorized: Invalid or expired token",
        details: "Please login again"
      }, { status: 401 });
    }

    if (!decoded) {
      return NextResponse.json({ 
        error: "Unauthorized: Invalid token",
        details: "Token could not be decoded"
      }, { status: 401 });
    }

    // Check if user is admin (role 5)
    const userRole = Number(decoded.role);
    if (userRole !== 5) {
      console.error(`Payment API: Access denied for role ${userRole}, required role 5`);
      return NextResponse.json({ 
        error: "Forbidden: Only Administrators can record payments",
        details: `Your role (${userRole}) does not have permission`
      }, { status: 403 });
    }

    const { agentId, amount, remarks } = await request.json();

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

    // Insert payment record
    const result = await executeQuery(
      `INSERT INTO agent_payments (agent_id, amount, remarks, payment_date) VALUES (?, ?, ?, NOW())`,
      [agentId, parseFloat(amount), remarks || ""]
    );

    const paymentId = result.insertId;

    // Insert into payment logs with who paid, when, etc.
    await executeQuery(
      `INSERT INTO agent_payment_logs (payment_id, agent_id, amount, paid_by_user_id, paid_by_user_name, remarks, payment_date) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [paymentId, agentId, parseFloat(amount), userId, userName, remarks || ""]
    );

    return NextResponse.json(
      { 
        success: true, 
        id: paymentId,
        message: `Payment of ₹${parseFloat(amount).toFixed(2)} recorded for ${agent[0].first_name} ${agent[0].last_name} (${agent[0].agent_id})`
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payment recording failed:", error);
    return NextResponse.json(
      { error: "Failed to record payment: " + error.message },
      { status: 500 }
    );
  }
}
