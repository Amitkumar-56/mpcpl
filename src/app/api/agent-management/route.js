// src/app/api/agent-management/route.js
import { createAuditLog } from "@/lib/auditLog";
import { verifyToken } from "@/lib/auth";
import { executeQuery } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const agentData = await request.json();

    // Validate required fields
    const requiredFields = [
      "firstName", "lastName", "email", "phone", "address", 
      "aadharNumber", "panNumber", "bankName", "accountNumber", 
      "ifscCode", "password"
    ];

    for (const field of requiredFields) {
      if (!agentData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingAgent = await executeQuery(
      `SELECT id FROM agents WHERE email = ?`,
      [agentData.email]
    );

    if (existingAgent.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // Generate unique agent_id
    const agentId = 'AGT' + Date.now();

    // Hash password with SHA-256
    const hashedPassword = crypto
      .createHash("sha256")
      .update(agentData.password)
      .digest("hex");

   

    // Insert agent with ALL required fields
    const result = await executeQuery(
      `INSERT INTO agents 
        (agent_id, first_name, last_name, email, phone, address, 
         aadhar_number, pan_number, bank_name, account_number, 
         ifsc_code, password, status, kyc_verified, bank_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        agentData.firstName,
        agentData.lastName,
        agentData.email,
        agentData.phone,
        agentData.address,
        agentData.aadharNumber,
        agentData.panNumber,
        agentData.bankName,
        agentData.accountNumber,
        agentData.ifscCode,
        hashedPassword,
        1, // status = active
        0, // kyc_verified = false
        0  // bank_verified = false
      ]
    );

    const newAgentId = result.insertId;

    // Handle customer assignments and commission rates if provided
    if (agentData.customers && Array.isArray(agentData.customers) && agentData.customers.length > 0) {
      const commissionRates = agentData.commissionRates || {};
      
      for (const customerId of agentData.customers) {
        // Insert into agent_customers
        await executeQuery(
          `INSERT INTO agent_customers (agent_id, customer_id, status) 
           VALUES (?, ?, 'active')
           ON DUPLICATE KEY UPDATE status = 'active'`,
          [newAgentId, customerId]
        );

        // Insert commission rates for this customer
        if (commissionRates[customerId]) {
          const rates = commissionRates[customerId];
          
          // Get product codes for each product
          for (const [productId, rate] of Object.entries(rates)) {
            if (rate && parseFloat(rate) > 0) {
              // Get all product codes for this product
              const productCodes = await executeQuery(
                `SELECT id FROM product_codes WHERE product_id = ?`,
                [productId]
              );
              
              // Insert commission rate for each product code
              for (const code of productCodes) {
                await executeQuery(
                  `INSERT INTO agent_commissions 
                   (agent_id, customer_id, product_id, product_code_id, commission_rate) 
                   VALUES (?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE commission_rate = ?`,
                  [newAgentId, customerId, productId, code.id, rate, rate]
                );
              }
            }
          }
        }
      }
    }

    // Gather actor info for audit
    let actorId = null;
    let actorName = null;
    try {
      const cookieStore = await cookies();
      let token = cookieStore.get("token")?.value;
      const authHeader = request.headers.get('authorization');
      if (!token && authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      }
      if (token) {
        const decoded = verifyToken(token.trim());
        actorId = decoded.userId || decoded.id || decoded.emp_id || null;
        if (actorId) {
          const userRes = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [actorId]
          );
          if (userRes.length > 0) {
            actorName = userRes[0].name || actorName;
          }
        }
      }
    } catch (e) {
      // silently continue
    }

    await createAuditLog({
      page: 'Agent Management',
      uniqueCode: `AGENT-CREATE-${agentId}-${newAgentId}`,
      section: 'Create Agent',
      userId: actorId,
      userName: actorName,
      action: 'create',
      remarks: `Agent created: ${agentData.firstName} ${agentData.lastName} (${agentId})`,
      oldValue: null,
      newValue: {
        agent_db_id: newAgentId,
        agent_code: agentId,
        first_name: agentData.firstName,
        last_name: agentData.lastName,
        email: agentData.email,
        phone: agentData.phone,
        status: 1
      },
      recordType: 'agent',
      recordId: newAgentId
    });

    return NextResponse.json(
      { message: "Agent created successfully", id: newAgentId, agentId: agentId },
      { status: 201 }
    );

  } catch (error) {
    console.error("Agent creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create agent: " + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Ensure necessary tables exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS agent_commissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          agent_id INT,
          customer_id INT,
          product_id INT,
          product_code_id INT,
          commission_rate DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_assignment (agent_id, customer_id, product_id, product_code_id)
      )
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS agent_payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          agent_id INT,
          amount DECIMAL(10, 2),
          payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          remarks TEXT
      )
    `);

    // If ID is provided, fetch single agent
    if (id) {
      const agent = await executeQuery(`
        SELECT 
          a.id, a.agent_id, a.first_name, a.last_name, a.email, a.phone, 
          a.address, a.aadhar_number, a.pan_number, a.bank_name, 
          a.account_number, a.ifsc_code, a.status, a.created_at
        FROM agents a
        WHERE a.id = ?
      `, [id]);

      if (agent.length === 0) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      return NextResponse.json(agent[0], { status: 200 });
    }

    // Otherwise, fetch all agents
    const agentsTableCheck = await executeQuery(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'agents'
    `).catch(() => [{ count: 0 }]);

    if (agentsTableCheck[0]?.count === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Calculate agent commissions from filling_requests
    const agents = await executeQuery(`
      SELECT 
        a.id, a.agent_id, a.first_name, a.last_name, a.email, a.phone, 
        a.address, a.bank_name, a.account_number, a.ifsc_code, a.status, a.created_at,
        COALESCE(e.total_earned, 0) as total_earned,
        COALESCE(p.total_paid, 0) as total_paid,
        (COALESCE(e.total_earned, 0) - COALESCE(p.total_paid, 0)) as total_due_commission
      FROM agents a
      LEFT JOIN (
          SELECT 
              ac.agent_id, 
              SUM(COALESCE(fr.aqty, 0) * COALESCE(ac.commission_rate, 0)) as total_earned
          FROM agent_commissions ac
          INNER JOIN agent_customers acust ON acust.agent_id = ac.agent_id 
            AND acust.customer_id = ac.customer_id 
            AND acust.status = 'active'
          LEFT JOIN filling_requests fr ON fr.cid = ac.customer_id 
            AND fr.status = 'Completed' 
            AND (
              fr.fl_id = ac.product_code_id 
              OR fr.sub_product_id = ac.product_code_id
              OR COALESCE(fr.sub_product_id, fr.fl_id) = ac.product_code_id
            )
            AND COALESCE(fr.aqty, 0) > 0
          WHERE ac.agent_id IS NOT NULL 
            AND COALESCE(ac.commission_rate, 0) > 0
          GROUP BY ac.agent_id
      ) e ON e.agent_id = a.id
      LEFT JOIN (
          SELECT agent_id, SUM(COALESCE(net_amount, 0) + COALESCE(tds_amount, 0)) as total_paid 
          FROM agent_payments 
          WHERE agent_id IS NOT NULL
          GROUP BY agent_id
      ) p ON p.agent_id = a.id
      ORDER BY a.created_at DESC
    `).catch((err) => {
      console.error("Agent commission calculation error:", err);
      // Fallback: return agents with zero commission
      return executeQuery(`
        SELECT 
          id, agent_id, first_name, last_name, email, phone, 
          address, status, created_at,
          0 as total_earned,
          0 as total_paid,
          0 as total_due_commission
        FROM agents
        ORDER BY created_at DESC
      `);
    });

    const adjustedAgents = (agents || []).map(a => ({
      ...a,
      total_due_commission: Math.max(0, (parseFloat(a.total_earned || 0) || 0) - (parseFloat(a.total_paid || 0) || 0))
    }));

    return NextResponse.json(adjustedAgents, { status: 200 });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const agentData = await request.json();
    const agentId = agentData.id;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Check if agent exists
    const existingAgent = await executeQuery(
      `SELECT id, email FROM agents WHERE id = ?`,
      [agentId]
    );

    if (existingAgent.length === 0) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Check if email is being changed and if new email already exists
    if (agentData.email && agentData.email !== existingAgent[0].email) {
      const emailCheck = await executeQuery(
        `SELECT id FROM agents WHERE email = ? AND id != ?`,
        [agentData.email, agentId]
      );

      if (emailCheck.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 }
        );
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (agentData.firstName !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(agentData.firstName);
    }
    if (agentData.lastName !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(agentData.lastName);
    }
    if (agentData.email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(agentData.email);
    }
    if (agentData.phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(agentData.phone);
    }
    if (agentData.address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(agentData.address);
    }
    if (agentData.aadharNumber !== undefined) {
      updateFields.push('aadhar_number = ?');
      updateValues.push(agentData.aadharNumber);
    }
    if (agentData.panNumber !== undefined) {
      updateFields.push('pan_number = ?');
      updateValues.push(agentData.panNumber);
    }
    if (agentData.bankName !== undefined) {
      updateFields.push('bank_name = ?');
      updateValues.push(agentData.bankName);
    }
    if (agentData.accountNumber !== undefined) {
      updateFields.push('account_number = ?');
      updateValues.push(agentData.accountNumber);
    }
    if (agentData.ifscCode !== undefined) {
      updateFields.push('ifsc_code = ?');
      updateValues.push(agentData.ifscCode);
    }
    if (agentData.password !== undefined && agentData.password !== '') {
      const hashedPassword = crypto
        .createHash("sha256")
        .update(agentData.password)
        .digest("hex");
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }
    if (agentData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(agentData.status);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updateValues.push(agentId);

    await executeQuery(
      `UPDATE agents SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Handle customer assignments and commission rates if provided
    if (agentData.customers !== undefined) {
      // Remove existing assignments
      await executeQuery(
        `DELETE FROM agent_customers WHERE agent_id = ?`,
        [agentId]
      );
      await executeQuery(
        `DELETE FROM agent_commissions WHERE agent_id = ?`,
        [agentId]
      );

      // Add new assignments
      if (Array.isArray(agentData.customers) && agentData.customers.length > 0) {
        const commissionRates = agentData.commissionRates || {};
        
        for (const customerId of agentData.customers) {
          await executeQuery(
            `INSERT INTO agent_customers (agent_id, customer_id, status) 
             VALUES (?, ?, 'active')`,
            [agentId, customerId]
          );

          if (commissionRates[customerId]) {
            const rates = commissionRates[customerId];
            
            for (const [productId, rate] of Object.entries(rates)) {
              if (rate && parseFloat(rate) > 0) {
                const productCodes = await executeQuery(
                  `SELECT id FROM product_codes WHERE product_id = ?`,
                  [productId]
                );
                
                for (const code of productCodes) {
                  await executeQuery(
                    `INSERT INTO agent_commissions 
                     (agent_id, customer_id, product_id, product_code_id, commission_rate) 
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE commission_rate = ?`,
                    [agentId, customerId, productId, code.id, rate, rate]
                  );
                }
              }
            }
          }
        }
      }
    }

    // Gather actor info for audit
    let actorId = null;
    let actorName = null;
    try {
      const cookieStore = await cookies();
      let token = cookieStore.get("token")?.value;
      const authHeader = request.headers.get('authorization');
      if (!token && authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      }
      if (token) {
        const decoded = verifyToken(token.trim());
        actorId = decoded.userId || decoded.id || decoded.emp_id || null;
        if (actorId) {
          const userRes = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [actorId]
          );
          if (userRes.length > 0) {
            actorName = userRes[0].name || actorName;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    await createAuditLog({
      page: 'Agent Management',
      uniqueCode: `AGENT-UPDATE-${agentId}`,
      section: 'Update Agent',
      userId: actorId,
      userName: actorName,
      action: 'update',
      remarks: `Agent updated: ID ${agentId}`,
      oldValue: null,
      newValue: {
        id: agentId,
        ...Object.fromEntries(updateFields.map((f, idx) => {
          const key = f.split('=')[0].trim();
          return [key, updateValues[idx]];
        }))
      },
      recordType: 'agent',
      recordId: agentId
    });

    return NextResponse.json(
      { message: "Agent updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Agent update failed:", error);
    return NextResponse.json(
      { error: "Failed to update agent: " + error.message },
      { status: 500 }
    );
  }
}
