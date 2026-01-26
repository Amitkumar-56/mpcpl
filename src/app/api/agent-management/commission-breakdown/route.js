// src/app/api/agent-management/commission-breakdown/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // 1. Get all agent commissions with details
    const commissionDetails = await executeQuery(`
      SELECT 
        ac.id,
        ac.agent_id,
        ac.customer_id,
        ac.product_id,
        ac.product_code_id,
        ac.commission_rate,
        c.name as customer_name,
        p.pname as product_name,
        pc.pcode as product_code_name
      FROM agent_commissions ac
      LEFT JOIN customers c ON ac.customer_id = c.id
      LEFT JOIN products p ON ac.product_id = p.id
      LEFT JOIN product_codes pc ON ac.product_code_id = pc.id
      WHERE ac.agent_id = ?
      ORDER BY ac.customer_id, ac.product_id
    `, [agentId]);

    // 2. Get all completed filling requests for agent's customers
    const fillingRequests = await executeQuery(`
      SELECT 
        fr.id,
        fr.rid,
        fr.cid as customer_id,
        fr.fl_id,
        fr.sub_product_id,
        fr.aqty,
        fr.status,
        fr.completed_date,
        c.name as customer_name,
        pc.pcode as product_code_name,
        COALESCE(fr.sub_product_id, fr.fl_id) as matched_product_code_id
      FROM filling_requests fr
      INNER JOIN agent_customers acust ON acust.customer_id = fr.cid 
        AND acust.agent_id = ? 
        AND acust.status = 'active'
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN product_codes pc ON pc.id = COALESCE(fr.sub_product_id, fr.fl_id)
      WHERE fr.status = 'Completed'
        AND COALESCE(fr.aqty, 0) > 0
      ORDER BY fr.completed_date DESC
    `, [agentId]);

    // 3. Calculate commission for each filling request
    const commissionCalculations = [];
    let totalEarned = 0;

    fillingRequests.forEach(fr => {
      // Find matching commission rate
      const matchingCommission = commissionDetails.find(ac => 
        ac.customer_id === fr.customer_id &&
        (ac.product_code_id === fr.matched_product_code_id || 
         ac.product_code_id === fr.sub_product_id ||
         ac.product_code_id === fr.fl_id)
      );

      if (matchingCommission) {
        const commissionAmount = parseFloat(fr.aqty || 0) * parseFloat(matchingCommission.commission_rate || 0);
        totalEarned += commissionAmount;

        commissionCalculations.push({
          filling_request_id: fr.id,
          rid: fr.rid,
          customer_id: fr.customer_id,
          customer_name: fr.customer_name,
          product_code_id: fr.matched_product_code_id,
          product_code_name: fr.product_code_name,
          quantity: parseFloat(fr.aqty || 0),
          commission_rate: parseFloat(matchingCommission.commission_rate || 0),
          commission_amount: commissionAmount,
          completed_date: fr.completed_date,
          matched_commission_id: matchingCommission.id
        });
      } else {
        // No matching commission found
        commissionCalculations.push({
          filling_request_id: fr.id,
          rid: fr.rid,
          customer_id: fr.customer_id,
          customer_name: fr.customer_name,
          product_code_id: fr.matched_product_code_id,
          product_code_name: fr.product_code_name,
          quantity: parseFloat(fr.aqty || 0),
          commission_rate: 0,
          commission_amount: 0,
          completed_date: fr.completed_date,
          matched_commission_id: null,
          note: "No matching commission rate found"
        });
      }
    });

    // 4. Get all payments
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
        c.name as customer_name
      FROM agent_payments ap
      LEFT JOIN customers c ON ap.customer_id = c.id
      WHERE ap.agent_id = ?
      ORDER BY ap.payment_date DESC
    `, [agentId]);

    const totalPaid = payments.reduce((sum, p) => {
      const net = parseFloat(p.net_amount || 0) || 0;
      const tds = parseFloat(p.tds_amount || 0) || 0;
      return sum + net + tds;
    }, 0);
    const totalDue = Math.max(0, totalEarned - totalPaid);

    // 5. Group by customer
    const customerBreakdown = {};
    commissionCalculations.forEach(calc => {
      const custId = calc.customer_id;
      if (!customerBreakdown[custId]) {
        customerBreakdown[custId] = {
          customer_id: custId,
          customer_name: calc.customer_name,
          transactions: [],
          total_commission: 0
        };
      }
      customerBreakdown[custId].transactions.push(calc);
      customerBreakdown[custId].total_commission += calc.commission_amount;
    });

    // 6. Customer-wise payments
    const customerPayments = {};
    payments.forEach(p => {
      const custId = p.customer_id || 'general';
      if (!customerPayments[custId]) {
        customerPayments[custId] = {
          customer_id: p.customer_id,
          customer_name: p.customer_name || 'General Payment',
          payments: [],
          total_paid: 0
        };
      }
      customerPayments[custId].payments.push(p);
      const net = parseFloat(p.net_amount || 0) || 0;
      const tds = parseFloat(p.tds_amount || 0) || 0;
      customerPayments[custId].total_paid += (net + tds);
    });

    return NextResponse.json({
      agent_id: agentId,
      summary: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        total_due: totalDue,
        transaction_count: commissionCalculations.length,
        payment_count: payments.length
      },
      commission_rates: commissionDetails,
      commission_calculations: commissionCalculations,
      customer_breakdown: Object.values(customerBreakdown),
      payments: payments,
      customer_payments: customerPayments,
      filling_requests_count: fillingRequests.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching commission breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch commission breakdown: " + error.message },
      { status: 500 }
    );
  }
}

