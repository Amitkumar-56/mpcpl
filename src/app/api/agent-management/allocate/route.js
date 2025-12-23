import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
  }

  try {
      // 1. Ensure agent_customers table exists (Relationship)
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS agent_customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            agent_id INT NOT NULL,
            customer_id INT NOT NULL,
            allocated_by INT DEFAULT 1,
            status ENUM('active', 'inactive') DEFAULT 'active',
            allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_allocation (agent_id, customer_id),
            FOREIGN KEY (agent_id) REFERENCES agents(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
      `);

      // 2. Ensure agent_commissions table exists (Rates Settings)
      // We need to handle schema migration for existing tables that might lack product_code_id
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS agent_commissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            agent_id INT NOT NULL,
            customer_id INT NOT NULL,
            product_id INT NOT NULL,
            product_code_id INT,
            commission_rate DECIMAL(10, 2) DEFAULT 0.00,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_rate (agent_id, customer_id, product_id, product_code_id)
        )
      `);

      // 2.1 Schema Migration: Ensure product_code_id column exists
      try {
        await executeQuery("SELECT product_code_id FROM agent_commissions LIMIT 1");
      } catch (error) {
        // Column doesn't exist, add it
        console.log("Adding product_code_id to agent_commissions");
        await executeQuery("ALTER TABLE agent_commissions ADD COLUMN product_code_id INT AFTER product_id");
        
        // Update unique index to include product_code_id
        // First try to drop existing unique indexes if they exist
        try { await executeQuery("ALTER TABLE agent_commissions DROP INDEX unique_rate"); } catch(e) {}
        try { await executeQuery("ALTER TABLE agent_commissions DROP INDEX unique_assignment"); } catch(e) {}
        
        // Add new unique index
        await executeQuery("ALTER TABLE agent_commissions ADD UNIQUE KEY unique_rate (agent_id, customer_id, product_id, product_code_id)");
      }

      // 3. Ensure agent_earnings table exists (History Log)
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
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
      `);

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
                    await executeQuery(`
                        INSERT INTO agent_commissions (agent_id, customer_id, product_id, product_code_id, commission_rate)
                        VALUES (?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE commission_rate = VALUES(commission_rate)
                    `, [agentId, customerId, prod.productId, prod.codeId, prod.rate]);
                }
            }
        }
        
        return NextResponse.json({ success: true });

    } catch (error) {
         console.error("Error saving allocations:", error);
         return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
