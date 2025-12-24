// src/app/api/agent-management/export-commissions/route.js
import { executeQuery } from "@/lib/db";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  try {
    // 1. Fetch Agent Details
    const agents = await executeQuery("SELECT * FROM agents WHERE id = ?", [agentId]);
    if (agents.length === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    const agent = agents[0];

    // 2. Fetch Commission History
    const commissionQuery = `
      SELECT 
          fr.completed_date,
          c.name as client_name,
          pc.pcode as product_name,
          fr.aqty as quantity,
          ac.commission_rate,
          (fr.aqty * ac.commission_rate) as commission_amount
      FROM filling_requests fr
      JOIN customers c ON fr.cid = c.id
      JOIN agent_commissions ac 
        ON ac.customer_id = fr.cid 
       AND ac.agent_id = ?
       AND COALESCE(fr.sub_product_id, fr.fl_id) = ac.product_code_id
      LEFT JOIN product_codes pc ON ac.product_code_id = pc.id
      WHERE fr.status = 'Completed'
      ORDER BY fr.completed_date DESC
    `;
    const history = await executeQuery(commissionQuery, [agentId]);

    // 3. Fetch Payments
    const payments = await executeQuery(
      "SELECT payment_date, amount, COALESCE(net_amount, amount) as net_amount, tds_amount, remarks FROM agent_payments WHERE agent_id = ? ORDER BY payment_date DESC",
      [agentId]
    );

    // 4. Create Workbook
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Commission History
    const sheet1 = workbook.addWorksheet("Commission History");
    sheet1.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Client", key: "client", width: 20 },
      { header: "Product", key: "product", width: 15 },
      { header: "Quantity", key: "qty", width: 10 },
      { header: "Rate", key: "rate", width: 10 },
      { header: "Commission", key: "commission", width: 15 },
    ];
    
    history.forEach(row => {
      sheet1.addRow({
        date: new Date(row.completed_date).toLocaleString(),
        client: row.client_name,
        product: row.product_name,
        qty: row.quantity,
        rate: row.commission_rate,
        commission: row.commission_amount
      });
    });

    // Sheet 2: Payment History
    const sheet2 = workbook.addWorksheet("Payment History");
    sheet2.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "TDS", key: "tds", width: 12 },
      { header: "Net Amount", key: "net", width: 15 },
      { header: "Remarks", key: "remarks", width: 30 },
    ];

    payments.forEach(row => {
      sheet2.addRow({
        date: new Date(row.payment_date).toLocaleString(),
        amount: row.amount,
        tds: row.tds_amount || 0,
        net: row.net_amount || row.amount,
        remarks: row.remarks
      });
    });

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return response
    const filename = `Commission_History_${agent.first_name}_${agent.last_name}.xlsx`;
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
