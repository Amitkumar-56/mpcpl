import { executeQuery } from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { agent_id, password } = await request.json();

    if (!agent_id || !password) {
      return NextResponse.json(
        { success: false, error: "Agent ID and password are required" },
        { status: 400 }
      );
    }

    // Find agent by agent_id
    const agents = await executeQuery(
      `SELECT id, agent_id, first_name, last_name, email, phone, password, status 
       FROM agents 
       WHERE agent_id = ?`,
      [agent_id]
    );

    if (agents.length === 0) {
      return NextResponse.json(
        { success: false, error: "Agent ID not found" },
        { status: 401 }
      );
    }

    const agent = agents[0];

    // Check if agent is active (status = 1) BEFORE password check for security
    if (agent.status === 0 || agent.status === null || agent.status === undefined) {
      return NextResponse.json(
        { success: false, error: "Your account has been deactivated. Please contact administrator." },
        { status: 403 }
      );
    }

    // Hash password with SHA-256
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Verify password
    if (hashedPassword !== agent.password) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    // Return agent data (exclude password)
    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        agent_id: agent.agent_id,
        first_name: agent.first_name,
        last_name: agent.last_name,
        email: agent.email,
        phone: agent.phone,
        name: `${agent.first_name} ${agent.last_name}`
      }
    });

  } catch (error) {
    console.error("Agent login error:", error);
    return NextResponse.json(
      { success: false, error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

