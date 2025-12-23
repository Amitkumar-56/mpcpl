import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    // Fetch assigned customers with commission summary
    const assignedCustomers = await executeQuery(`
      SELECT 
        ac.customer_id,
        c.name,
        c.email,
        c.phone,
        COALESCE(SUM(ae.commission_amount), 0) as total_commission,
        COALESCE(COUNT(ae.id), 0) as transaction_count
      FROM agent_customers ac
      LEFT JOIN customers c ON ac.customer_id = c.id
      LEFT JOIN agent_earnings ae ON ae.agent_id = ? AND ae.customer_id = ac.customer_id
      WHERE ac.agent_id = ? AND ac.status = 'active'
      GROUP BY ac.customer_id, c.name, c.email, c.phone
    `, [id, id]);

    // Fetch commission rates
    const commissionRates = await executeQuery(`
      SELECT 
        customer_id,
        product_id,
        commission_rate
      FROM agent_commissions
      WHERE agent_id = ?
    `, [id]);

    // Organize commission rates by customer
    const ratesByCustomer = {};
    commissionRates.forEach(rate => {
      if (!ratesByCustomer[rate.customer_id]) {
        ratesByCustomer[rate.customer_id] = {};
      }
      ratesByCustomer[rate.customer_id][rate.product_id] = rate.commission_rate;
    });

    return NextResponse.json({
      customers: assignedCustomers || [],
      commissionRates: ratesByCustomer
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching agent customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent customers: " + error.message },
      { status: 500 }
    );
  }
}

