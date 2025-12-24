
// src/app/api/agent-management/allocate/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  try {
      // Fetch customers with their current agent assignment status
      const customers = await executeQuery(`
        SELECT 
            c.id, 
            c.name, 
            c.client_type, 
            c.phone,
            a.first_name as assigned_agent_name,
            a.last_name as assigned_agent_last_name,
            ac.agent_id as assigned_agent_id,
            ac.status as assignment_status
        FROM customers c
        LEFT JOIN agent_customers ac ON c.id = ac.customer_id AND ac.status = 'active'
        LEFT JOIN agents a ON ac.agent_id = a.id
        ORDER BY c.name
      `);

      // Fetch products and their codes (sub-products)
      const productsData = await executeQuery(`
        SELECT 
            p.id as product_id, 
            p.pname,
            pc.id as code_id,
            pc.pcode
        FROM products p
        JOIN product_codes pc ON p.id = pc.product_id
        ORDER BY p.pname, pc.pcode
      `);

      // Structure products: Main Product -> [Sub Products]
      const products = [];
      const productMap = {};
      
      productsData.forEach(row => {
          if (!productMap[row.product_id]) {
              productMap[row.product_id] = {
                  id: row.product_id,
                  pname: row.pname,
                  codes: []
              };
              products.push(productMap[row.product_id]);
          }
          productMap[row.product_id].codes.push({
              id: row.code_id,
              pcode: row.pcode
          });
      });

      // Fetch existing commissions for THIS agent
      const commissions = await executeQuery(
          "SELECT customer_id, product_code_id, commission_rate FROM agent_commissions WHERE agent_id = ?",
          [agentId]
      );
      
      return NextResponse.json({ customers, products, commissions });
  } catch (error) {
      console.error("Error in allocate API:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
    try {
        const { agentId, assignments } = await request.json();
        
        if (!agentId) return NextResponse.json({ error: "Agent ID required" }, { status: 400 });

        for (const assignment of assignments) {
            const { customerId, selected, products } = assignment;
            
            if (selected === false) {
                 // Mark as inactive in agent_customers
                 await executeQuery(
                    "UPDATE agent_customers SET status = 'inactive' WHERE agent_id = ? AND customer_id = ?", 
                    [agentId, customerId]
                 );
                 // Remove commissions settings
                 await executeQuery(
                    "DELETE FROM agent_commissions WHERE agent_id = ? AND customer_id = ?", 
                    [agentId, customerId]
                 );
                 continue;
            }
            
            // 1. Insert/Update agent_customers
            await executeQuery(`
                INSERT INTO agent_customers (agent_id, customer_id, allocated_by, status)
                VALUES (?, ?, 1, 'active')
                ON DUPLICATE KEY UPDATE status = 'active', allocated_by = 1
            `, [agentId, customerId]);

            // 2. Insert/Update agent_commissions (Rates)
            if (products && products.length > 0) {
                for (const prod of products) {
                    // Only insert if rate is provided and greater than 0
                    if (prod.rate && parseFloat(prod.rate) > 0) {
                        await executeQuery(`
                            INSERT INTO agent_commissions (agent_id, customer_id, product_id, product_code_id, commission_rate)
                            VALUES (?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE commission_rate = VALUES(commission_rate)
                        `, [agentId, customerId, prod.productId, prod.codeId, parseFloat(prod.rate)]);
                    } else {
                        // Remove commission if rate is 0 or empty
                        await executeQuery(`
                            DELETE FROM agent_commissions 
                            WHERE agent_id = ? AND customer_id = ? AND product_code_id = ?
                        `, [agentId, customerId, prod.codeId]);
                    }
                }
            } else {
                // If no products provided but customer is selected, remove all commissions for this customer
                await executeQuery(`
                    DELETE FROM agent_commissions 
                    WHERE agent_id = ? AND customer_id = ?
                `, [agentId, customerId]);
            }
        }
        
        return NextResponse.json({ success: true });

    } catch (error) {
         console.error("Error saving allocations:", error);
         return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
