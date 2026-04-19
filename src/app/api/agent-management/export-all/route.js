// src/app/api/agent-management/export-all/route.js
import { executeQuery } from "@/lib/db";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("search") || "";

    // 1. Fetch Agents with commission calculations
    let agents = [];
    try {
      // Use the same logic as the main GET route
      const earningsTableCheck = await executeQuery(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'agent_earnings'`
      );

      const baseQuery = earningsTableCheck[0]?.count > 0 
        ? `
          SELECT 
            a.id, a.agent_id, a.first_name, a.last_name, a.email, a.phone, 
            a.address, a.bank_name, a.account_number, a.ifsc_code, a.status, a.created_at,
            COALESCE(e.total_earned, 0) as total_earned,
            COALESCE(p.total_paid, 0) as total_paid,
            (COALESCE(e.total_earned, 0) - COALESCE(p.total_paid, 0)) as total_due_commission
          FROM agents a
          LEFT JOIN (
              SELECT agent_id, SUM(COALESCE(commission_amount, 0)) as total_earned
              FROM agent_earnings 
              WHERE commission_amount > 0 GROUP BY agent_id
          ) e ON e.agent_id = a.id
          LEFT JOIN (
              SELECT agent_id, SUM(COALESCE(amount, 0)) as total_paid
              FROM agent_payments GROUP BY agent_id
          ) p ON p.agent_id = a.id
        `
        : `
          SELECT 
            a.id, a.agent_id, a.first_name, a.last_name, a.email, a.phone, 
            a.address, a.bank_name, a.account_number, a.ifsc_code, a.status, a.created_at,
            COALESCE(e.total_earned, 0) as total_earned,
            COALESCE(p.total_paid, 0) as total_paid,
            (COALESCE(e.total_earned, 0) - COALESCE(p.total_paid, 0)) as total_due_commission
          FROM agents a
          LEFT JOIN (
              SELECT ac.agent_id, SUM(COALESCE(fr.aqty, 0) * COALESCE(ac.commission_rate, 0)) as total_earned
              FROM agent_commissions ac
              INNER JOIN agent_customers acust ON acust.agent_id = ac.agent_id AND acust.status = 'active'
              LEFT JOIN filling_requests fr ON fr.cid = ac.customer_id AND fr.status = 'Completed' 
                AND (fr.fl_id = ac.product_code_id OR fr.sub_product_id = ac.product_code_id)
              WHERE ac.agent_id IS NOT NULL AND COALESCE(ac.commission_rate, 0) > 0
              GROUP BY ac.agent_id
          ) e ON e.agent_id = a.id
          LEFT JOIN (
              SELECT agent_id, SUM(COALESCE(amount, 0)) as total_paid
              FROM agent_payments GROUP BY agent_id
          ) p ON p.agent_id = a.id
        `;

      agents = await executeQuery(`${baseQuery} ORDER BY a.created_at DESC`);
    } catch (err) {
      console.error("DB Error in export:", err);
      // Fallback simple query
      agents = await executeQuery("SELECT * FROM agents ORDER BY created_at DESC");
    }

    // 2. Filter by search term in memory (to match frontend logic exactly)
    const filteredAgents = searchTerm 
      ? agents.filter(agent => {
          const searchStr = searchTerm.toLowerCase();
          const fullName = `${agent.first_name || ""} ${agent.last_name || ""}`.toLowerCase();
          return (
            fullName.includes(searchStr) ||
            (agent.agent_id || "").toLowerCase().includes(searchStr) ||
            (agent.email || "").toLowerCase().includes(searchStr) ||
            (agent.phone || "").toLowerCase().includes(searchStr)
          );
        })
      : agents;

    // 3. Create Workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Agents List");

    // Header styling
    sheet.columns = [
      { header: "Agent ID", key: "agent_id", width: 15 },
      { header: "First Name", key: "first_name", width: 15 },
      { header: "Last Name", key: "last_name", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Address", key: "address", width: 30 },
      { header: "Bank Name", key: "bank_name", width: 20 },
      { header: "A/C Number", key: "account_number", width: 20 },
      { header: "IFSC Code", key: "ifsc_code", width: 15 },
      { header: "Status", key: "status", width: 10 },
      { header: "Total Earned", key: "total_earned", width: 15 },
      { header: "Total Paid", key: "total_paid", width: 15 },
      { header: "Balance Due", key: "total_due", width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 4. Add Rows
    filteredAgents.forEach(agent => {
      sheet.addRow({
        agent_id: agent.agent_id,
        first_name: agent.first_name,
        last_name: agent.last_name,
        email: agent.email,
        phone: agent.phone,
        address: agent.address,
        bank_name: agent.bank_name,
        account_number: agent.account_number,
        ifsc_code: agent.ifsc_code,
        status: Number(agent.status) === 1 ? "Active" : "Inactive",
        total_earned: parseFloat(agent.total_earned || 0).toFixed(2),
        total_paid: parseFloat(agent.total_paid || 0).toFixed(2),
        total_due: Math.max(0, (parseFloat(agent.total_earned || 0) - parseFloat(agent.total_paid || 0))).toFixed(2)
      });
    });

    // 5. Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Agents_Report_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
