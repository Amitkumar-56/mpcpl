import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  try {
      // Ensure agent_payments table exists
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS agent_payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            agent_id INT,
            amount DECIMAL(10, 2),
            payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            remarks TEXT
        )
      `);

      // Ensure agent_earnings table exists (if not created by allocate route)
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS agent_earnings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            agent_id INT NOT NULL,
            customer_id INT NOT NULL,
            filling_request_id INT,
            product_code_id INT,
            quantity DECIMAL(10, 2),
            commission_rate DECIMAL(10, 2),
            commission_amount DECIMAL(10, 2),
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            UNIQUE KEY unique_earning (filling_request_id, agent_id)
        )
      `);

      // 1. SYNC: Backfill/Insert missing earnings into agent_earnings
      // This ensures that we "store" the commission data properly as requested.
      // We look for completed filling requests that match an active agent commission rule
      // but haven't been recorded in agent_earnings yet.
      // Commission calculation: quantity (L) * commission_rate (₹/L) = commission_amount (₹)
      await executeQuery(`
        INSERT IGNORE INTO agent_earnings (agent_id, customer_id, filling_request_id, product_code_id, quantity, commission_rate, commission_amount, earned_at)
        SELECT 
            ac.agent_id,
            fr.cid,
            fr.id,
            pc.id,
            fr.aqty,
            ac.commission_rate,
            (fr.aqty * ac.commission_rate) as commission_amount,
            fr.completed_date
        FROM filling_requests fr
        JOIN agent_commissions ac ON fr.cid = ac.customer_id
        JOIN product_codes pc ON fr.fl_id = pc.id AND ac.product_code_id = pc.id
        WHERE fr.status = 'Completed' AND ac.agent_id = ? AND ac.commission_rate > 0
      `, [agentId]);

      // 2. Fetch History from the STORED agent_earnings table
      // This ensures data integrity even if rates change later.
      const history = await executeQuery(`
        SELECT 
            ae.id,
            c.name as client_name,
            COALESCE(pc.pcode, 'Unknown Product') as product_name,
            ae.quantity,
            ae.commission_rate,
            ae.commission_amount,
            ae.earned_at as completed_date
        FROM agent_earnings ae
        JOIN customers c ON ae.customer_id = c.id
        LEFT JOIN product_codes pc ON ae.product_code_id = pc.id
        WHERE ae.agent_id = ?
        ORDER BY ae.earned_at DESC
      `, [agentId]);
      
      const totalCommission = history.reduce((sum, item) => sum + (parseFloat(item.commission_amount) || 0), 0);

      // 3. Fetch Payments
      const payments = await executeQuery(
          "SELECT * FROM agent_payments WHERE agent_id = ? ORDER BY payment_date DESC",
          [agentId]
      );
      
      const totalPaid = payments.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      
      const remaining = totalCommission - totalPaid;

      // 4. Fetch Allocated Customers (Display only)
      const allocatedCustomers = await executeQuery(`
          SELECT 
              c.name as client_name,
              c.phone,
              CONCAT(p.pname, ' - ', COALESCE(pc.pcode, '')) as product_name,
              ac.commission_rate
          FROM agent_commissions ac
          JOIN customers c ON ac.customer_id = c.id
          LEFT JOIN product_codes pc ON ac.product_code_id = pc.id
          LEFT JOIN products p ON pc.product_id = p.id
          WHERE ac.agent_id = ? AND ac.commission_rate > 0
          ORDER BY c.name, p.pname
      `, [agentId]);

      return NextResponse.json({
          history,
          payments,
          allocatedCustomers,
          summary: {
              totalCommission,
              totalPaid,
              remaining
          }
      });

  } catch (error) {
      console.error("Error fetching commission history:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
