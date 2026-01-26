// src/app/api/agent-management/customers/route.js
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

    // Fetch assigned customers with detailed commission breakdown
    // Calculate commission from filling_requests directly using agent_commissions rates
    const assignedCustomers = await executeQuery(`
      SELECT 
        ac.customer_id as customer_id,
        c.id,
        c.name,
        c.email,
        c.phone,
        COALESCE(SUM(
          CASE 
            WHEN fr.status = 'Completed' 
              AND (
                fr.fl_id = ac_comm.product_code_id 
                OR fr.sub_product_id = ac_comm.product_code_id
                OR COALESCE(fr.sub_product_id, fr.fl_id) = ac_comm.product_code_id
              )
            THEN fr.aqty * ac_comm.commission_rate 
            ELSE 0 
          END
        ), 0) as total_earned_commission,
        COUNT(DISTINCT CASE 
          WHEN fr.status = 'Completed' 
            AND (
              fr.fl_id = ac_comm.product_code_id 
              OR fr.sub_product_id = ac_comm.product_code_id
              OR COALESCE(fr.sub_product_id, fr.fl_id) = ac_comm.product_code_id
            )
          THEN fr.id 
        END) as transaction_count
      FROM agent_customers ac
      LEFT JOIN customers c ON ac.customer_id = c.id
      LEFT JOIN agent_commissions ac_comm ON ac_comm.agent_id = ? AND ac_comm.customer_id = ac.customer_id
      LEFT JOIN filling_requests fr ON fr.cid = ac.customer_id 
        AND fr.status = 'Completed' 
        AND (
          fr.fl_id = ac_comm.product_code_id 
          OR fr.sub_product_id = ac_comm.product_code_id
          OR COALESCE(fr.sub_product_id, fr.fl_id) = ac_comm.product_code_id
        )
        AND COALESCE(fr.aqty, 0) > 0
      WHERE ac.agent_id = ? AND ac.status = 'active'
      GROUP BY ac.customer_id, c.id, c.name, c.email, c.phone
    `, [id, id]);

    // Fetch customer-wise payments (including payments without customer_id - these are general payments)
    const customerPayments = await executeQuery(`
      SELECT 
        COALESCE(customer_id, 0) as customer_id,
        SUM(COALESCE(net_amount, amount, 0)) as total_paid,
        COUNT(*) as payment_count
      FROM agent_payments
      WHERE agent_id = ?
      GROUP BY customer_id
    `, [id]);
    
    // Also get total payments without customer_id (general payments)
    const generalPayments = await executeQuery(`
      SELECT 
        SUM(COALESCE(net_amount, amount, 0)) as total_general_paid
      FROM agent_payments
      WHERE agent_id = ? AND (customer_id IS NULL OR customer_id = 0)
    `, [id]);
    
    const totalGeneralPaid = parseFloat(generalPayments[0]?.total_general_paid || 0);

    // Create a map of customer payments
    const paymentMap = {};
    customerPayments.forEach(p => {
      const custId = p.customer_id || 0;
      if (custId > 0) {
        paymentMap[custId] = {
          total_paid: parseFloat(p.total_paid || 0),
          payment_count: parseInt(p.payment_count || 0)
        };
      }
    });

    // Fetch product-wise commission breakdown per customer
    // Calculate from filling_requests directly
    const productCommissionBreakdown = await executeQuery(`
      SELECT 
        ac_comm.customer_id,
        p.id as product_id,
        p.pname as product_name,
        SUM(
          CASE 
            WHEN fr.status = 'Completed' 
              AND (
                fr.fl_id = ac_comm.product_code_id 
                OR fr.sub_product_id = ac_comm.product_code_id
                OR COALESCE(fr.sub_product_id, fr.fl_id) = ac_comm.product_code_id
              )
            THEN fr.aqty * ac_comm.commission_rate 
            ELSE 0 
          END
        ) as total_commission,
        SUM(
          CASE 
            WHEN fr.status = 'Completed' 
              AND (
                fr.fl_id = ac_comm.product_code_id 
                OR fr.sub_product_id = ac_comm.product_code_id
                OR COALESCE(fr.sub_product_id, fr.fl_id) = ac_comm.product_code_id
              )
            THEN fr.aqty 
            ELSE 0 
          END
        ) as total_quantity,
        COUNT(DISTINCT 
          CASE 
            WHEN fr.status = 'Completed' 
              AND (
                fr.fl_id = ac_comm.product_code_id 
                OR fr.sub_product_id = ac_comm.product_code_id
                OR COALESCE(fr.sub_product_id, fr.fl_id) = ac_comm.product_code_id
              )
            THEN fr.id 
          END
        ) as transaction_count
      FROM agent_commissions ac_comm
      LEFT JOIN product_codes pc ON ac_comm.product_code_id = pc.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN filling_requests fr ON fr.cid = ac_comm.customer_id 
        AND fr.status = 'Completed'
        AND (
          fr.fl_id = ac_comm.product_code_id 
          OR fr.sub_product_id = ac_comm.product_code_id
          OR COALESCE(fr.sub_product_id, fr.fl_id) = ac_comm.product_code_id
        )
        AND COALESCE(fr.aqty, 0) > 0
      WHERE ac_comm.agent_id = ?
      GROUP BY ac_comm.customer_id, p.id, p.pname
      ORDER BY ac_comm.customer_id, p.pname
    `, [id]);

    // Organize product breakdown by customer
    const productBreakdownByCustomer = {};
    productCommissionBreakdown.forEach(item => {
      const customerId = item.customer_id;
      if (!productBreakdownByCustomer[customerId]) {
        productBreakdownByCustomer[customerId] = [];
      }
      productBreakdownByCustomer[customerId].push({
        product_id: item.product_id,
        product_name: item.product_name || 'Unknown Product',
        total_commission: parseFloat(item.total_commission || 0),
        total_quantity: parseFloat(item.total_quantity || 0),
        transaction_count: parseInt(item.transaction_count || 0)
      });
    });

    // Add payment and remaining commission to each customer
    const customersWithPayments = assignedCustomers.map(customer => {
      const customerId = customer.customer_id;
      const totalEarned = parseFloat(customer.total_earned_commission || 0);
      const paymentInfo = paymentMap[customerId] || { total_paid: 0, payment_count: 0 };
      const totalPaid = paymentInfo.total_paid || 0;
      const remaining = Math.max(0, totalEarned - totalPaid);

      return {
        ...customer,
        total_earned_commission: totalEarned,
        total_paid_commission: totalPaid,
        payment_count: paymentInfo.payment_count || 0,
        remaining_commission: remaining,
        product_breakdown: productBreakdownByCustomer[customerId] || []
      };
    });
    
    // Calculate total earned and total paid across all customers
    const totalEarnedAll = customersWithPayments.reduce((sum, c) => sum + parseFloat(c.total_earned_commission || 0), 0);
    const totalPaidAll = customersWithPayments.reduce((sum, c) => sum + parseFloat(c.total_paid_commission || 0), 0) + totalGeneralPaid;

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
      customers: customersWithPayments || [],
      commissionRates: ratesByCustomer,
      summary: {
        total_earned: totalEarnedAll,
        total_paid: totalPaidAll,
        total_remaining: Math.max(0, totalEarnedAll - totalPaidAll),
        general_payments: totalGeneralPaid
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching agent customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent customers: " + error.message },
      { status: 500 }
    );
  }
}

