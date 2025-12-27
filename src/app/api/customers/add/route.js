// src/app/api/customers/add/route.js
import { executeTransaction } from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const client_name = formData.get("client_name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const password = crypto.createHash("sha256").update(formData.get("password")).digest("hex");
    const role = formData.get("role");
    const billing_type = formData.get("billing_type");
    const client_type = formData.get("client_type");

    // Address & GST details
    const address = formData.get("address") || "";
    const city = formData.get("city") || "";
    const region = formData.get("region") || "";
    const country = formData.get("country") || "";
    const postbox = formData.get("postbox") || "";
    const gst_name = formData.get("gst_name") || "";
    const gst_number = formData.get("gst_number") || "";

    // Handle multiple product IDs and locations
    const productsArray = formData.getAll("products[]");
    const product = productsArray.length > 0 ? productsArray.join(",") : ""; 
    const blocklocationsArray = formData.getAll("block_location[]");
    const blocklocation = blocklocationsArray.length > 0 ? blocklocationsArray.join(",") : "";
    
    // Handle Conditional Fields
    const day_limit = client_type === "3" ? parseInt(formData.get("day_limit")) : 0;
    const amtlimit = client_type === "2" ? parseFloat(formData.get("amtlimit")) : 0.00;
    
    const auth_token = crypto.randomBytes(32).toString("hex");

    // Use a single DB transaction so customer + balances + permissions are atomic
    let newCustomerId;
    const permInsertErrors = [];
    let parsedPermissionsForResponse = null;

    try {
      const txResult = await executeTransaction(async (conn) => {
        // Insert customer using transaction connection
        const insertCustomerQuery = `
          INSERT INTO customers
            (name, phone, email, password, roleid, billing_type,
             address, city, region, country, postbox,
             gst_name, gst_number, product, blocklocation,
             day_limit, auth_token, amtlimit, client_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const custParams = [
          client_name, phone, email, password, role || null, billing_type || null,
          address, city, region, country, postbox,
          gst_name, gst_number, product, blocklocation,
          day_limit || 0, auth_token, amtlimit, client_type
        ];
        console.log('Inserting customer with params:', custParams.map(p => (typeof p === 'string' && p.length>100 ? p.slice(0,100)+'...' : p)));
        let custRes;
        try {
          [custRes] = await conn.execute(insertCustomerQuery, custParams);
        } catch (custErr) {
          console.error('Customer INSERT failed:', custErr.code, custErr.errno, custErr.sqlMessage || custErr.message);
          throw custErr;
        }

        const createdId = custRes.insertId;

        // Insert customer balance
        const insertBalanceQuery = `
          INSERT INTO customer_balances
            (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const balance_amtlimit = client_type === "2" ? amtlimit : 0.00;
        const balance_day_limit = client_type === "3" ? day_limit : 0;
        const initial_day_amount = 0.00;
        const is_active = 1;

        await conn.execute(insertBalanceQuery, [
          0.00, 0.00, balance_amtlimit, balance_amtlimit,
          createdId, balance_day_limit, initial_day_amount, 
          is_active
        ]);

        // Ensure customer_permissions table exists (within tx)
        try {
          await conn.execute(`
            CREATE TABLE IF NOT EXISTS customer_permissions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              customer_id INT NOT NULL,
              module_name VARCHAR(255) NOT NULL,
              can_view TINYINT(1) DEFAULT 0,
              can_edit TINYINT(1) DEFAULT 0,
              can_create TINYINT(1) DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_customer (customer_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
          `);
          
          // ✅ Add can_create column if table exists but column doesn't
          try {
            await conn.execute(`ALTER TABLE customer_permissions ADD COLUMN can_create TINYINT(1) DEFAULT 0`);
          } catch (alterErr) {
            // Column already exists, ignore
            if (!alterErr.message.includes('Duplicate column name')) {
              console.warn('Error adding can_create column:', alterErr.message);
            }
          }
          
          // ✅ Remove can_delete column if it exists
          try {
            await conn.execute(`ALTER TABLE customer_permissions DROP COLUMN can_delete`);
          } catch (dropErr) {
            // Column doesn't exist, ignore
            if (!dropErr.message.includes("doesn't exist") && !dropErr.message.includes('Unknown column')) {
              console.warn('Error removing can_delete column:', dropErr.message);
            }
          }
        } catch (createErr) {
          // If create fails, still continue; table may already exist or permissions may not be needed
          console.error('Error ensuring customer_permissions table exists (tx):', createErr);
        }

        // Insert permissions if provided
        const permissionsDataInner = formData.get("permissions");
        if (permissionsDataInner) {
          let permissionsInner = {};
          if (typeof permissionsDataInner === 'string') {
            permissionsInner = JSON.parse(permissionsDataInner);
          } else if (permissionsDataInner instanceof Object) {
            permissionsInner = permissionsDataInner;
          } else {
            try { permissionsInner = JSON.parse(String(permissionsDataInner)); } catch (e) { permissionsInner = {}; }
          }

          parsedPermissionsForResponse = permissionsInner;

          for (const moduleName in permissionsInner) {
            const perm = permissionsInner[moduleName] || {};
            const can_view = perm.can_view === true || perm.can_view === 1 || perm.can_view === '1' ? 1 : 0;
            const can_edit = perm.can_edit === true || perm.can_edit === 1 || perm.can_edit === '1' ? 1 : 0;
            const can_create = perm.can_create === true || perm.can_create === 1 || perm.can_create === '1' ? 1 : 0;

            try {
              await conn.execute(
                `INSERT INTO customer_permissions 
                 (customer_id, module_name, can_view, can_edit, can_create, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [createdId, moduleName, can_view, can_edit, can_create]
              );
            } catch (permInsertErr) {
              console.error('Error inserting permission (tx) for module', moduleName, permInsertErr.sqlMessage || permInsertErr.message || permInsertErr);
              // collect but throw to rollback entire tx
              throw permInsertErr;
            }
          }
        }

        return createdId;
      });

      newCustomerId = txResult;

      // Create Audit Log
      try {
        const currentUser = await getCurrentUser();
        const userId = currentUser?.userId || null;
        // Ensure userName is fetched from employee_profile
        let userName = currentUser?.userName;
        if (!userName && currentUser?.userId) {
          const users = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [currentUser.userId]
          );
          if (users.length > 0 && users[0].name) {
            userName = users[0].name;
          }
        }

        await createAuditLog({
          page: 'Customers',
          uniqueCode: newCustomerId.toString(),
          section: 'Customer Management',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: 'New customer created',
          oldValue: null,
          newValue: { 
            name: client_name, 
            email, 
            phone, 
            client_type,
            billing_type,
            address
          },
          recordType: 'customer',
          recordId: newCustomerId
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      try {
        const io = global._io;
        if (io) {
          io.to('role_5').emit('new_customer', {
            customerId: newCustomerId,
            name: client_name,
            phone,
            email,
            timestamp: Date.now()
          });
        }
      } catch (emitError) {
        console.error('Socket emit failed for new_customer:', emitError?.message || emitError);
      }

    } catch (txErr) {
      console.error('Transaction failed, rolled back:', txErr.code || txErr.sqlMessage || txErr.message || txErr);
      const errDetail = {
        code: txErr.code || null,
        errno: txErr.errno || null,
        sqlMessage: txErr.sqlMessage || null,
        message: txErr.message || String(txErr),
        stack: txErr.stack ? txErr.stack.split('\n').slice(0,5).join('\n') : null
      };
      return NextResponse.json({ success: false, message: 'Database transaction failed', error: errDetail }, { status: 500 });
    }


    const responsePayload = { 
      success: true, 
      message: "Customer added successfully",
      customer_id: newCustomerId,
      client_type: client_type
    };
    if (typeof permInsertErrors !== 'undefined' && permInsertErrors.length > 0) {
      responsePayload.permission_errors = permInsertErrors;
    }
    if (typeof parsedPermissionsForResponse !== 'undefined' && parsedPermissionsForResponse) {
      responsePayload.permissions = parsedPermissionsForResponse;
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
