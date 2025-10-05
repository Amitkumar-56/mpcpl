import { executeQuery } from "@/lib/db";
import crypto from "crypto";
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

    return NextResponse.json(
      { message: "Agent created successfully", id: result.insertId, agentId: agentId },
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
    const agents = await executeQuery(`
      SELECT id, agent_id, first_name, last_name, email, phone, 
             address, status, created_at 
      FROM agents 
      ORDER BY created_at DESC
    `);
    return NextResponse.json(agents);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}