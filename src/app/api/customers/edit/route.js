
// src/app/api/customers/edit/route.js
import { getConnection } from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createEntityLog } from '@/lib/entityLogs';

async function getConnWithRetry(retries = 3, delayMs = 300) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await getConnection();
      return conn;
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      if (err?.code === 'ER_CON_COUNT_ERROR' || msg.includes('Too many connections')) {
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Helper function for password hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// PUT - Update customer
export async function PUT(request) {
  let connection;
  try {
    const body = await request.json();
    const {
      id,
      name,
      email,
      phone,
      password,
      address,
      region,
      postbox,
      customer_type,
      billing_type,
      payment_type,
      client_type,
      day_limit,
      blocklocation,
      products,
      status,
      gst_name,
      gst_number
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer ID is required',
          error: 'MISSING_ID'
        },
        { status: 400 }
      );
    }

    // Get connection from pool
    connection = await getConnWithRetry();

    // Check if customer exists
    const [existingCustomers] = await connection.execute(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    if (existingCustomers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer not found',
          error: 'CUSTOMER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Prepare update fields
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name || null);
    }

    if (email !== undefined) {
      // Check if email is being changed and if it's unique
      const emailValue = email || null;
      if (emailValue && emailValue !== existingCustomers[0].email) {
        const [emailExists] = await connection.execute(
          'SELECT id FROM customers WHERE email = ? AND id != ?',
          [emailValue, id]
        );

        if (emailExists.length > 0) {
          return NextResponse.json(
            {
              success: false,
              message: 'Email already exists',
              error: 'DUPLICATE_EMAIL'
            },
            { status: 409 }
          );
        }
      }
      updateFields.push('email = ?');
      updateValues.push(emailValue);
    }

    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone || null);
    }

    // Track password change separately
    let passwordChanged = false;
    if (password !== undefined && password !== null && password !== '') {
      // Hash password before storing
      const hashedPassword = hashPassword(password);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
      passwordChanged = true;
    }

    if (address !== undefined && address !== null) {
      updateFields.push('address = ?');
      updateValues.push(address.trim() || null);
    }

    if (region !== undefined && region !== null) {
      updateFields.push('region = ?');
      updateValues.push(region.trim() || null);
    }

    if (postbox !== undefined && postbox !== null) {
      updateFields.push('postbox = ?');
      updateValues.push(postbox.trim() || null);
    }

    if (billing_type !== undefined) {
      // Convert string to number if needed (1 for Billing, 2 for Non Billing)
      const billingTypeValue = typeof billing_type === 'string' ? parseInt(billing_type) : billing_type;
      updateFields.push('billing_type = ?');
      updateValues.push(billingTypeValue);
    }

    // Handle client_type (1=Prepaid, 2=Postpaid, 3=Day Limit)
    if (client_type !== undefined) {
      const clientTypeValue = typeof client_type === 'string' ? parseInt(client_type) : client_type;
      updateFields.push('client_type = ?');
      updateValues.push(clientTypeValue);

      // Also update gid based on client_type for backward compatibility
      // 1=Prepaid (Cash), 2=Postpaid (Credit), 3=Day Limit (Credit)
      const gidValue = clientTypeValue === 1 ? 1 : 2;
      updateFields.push('gid = ?');
      updateValues.push(gidValue);
    } else if (payment_type !== undefined) {
      // Fallback to old payment_type logic
      let paymentTypeValue;
      if (typeof payment_type === 'string') {
        paymentTypeValue = payment_type === 'Cash' ? 1 : (payment_type === 'Credit' ? 2 : parseInt(payment_type));
      } else {
        paymentTypeValue = payment_type;
      }
      updateFields.push('gid = ?');
      updateValues.push(paymentTypeValue);
    }

    // Handle day_limit update for day_limit customers
    if (day_limit !== undefined && day_limit !== null) {
      const dayLimitValue = typeof day_limit === 'string' ? parseInt(day_limit) : day_limit;

      // Update customer_balances table
      const [balanceCheck] = await connection.execute(
        'SELECT id FROM customer_balances WHERE com_id = ?',
        [id]
      );

      if (balanceCheck.length > 0) {
        // Update existing balance record
        await connection.execute(
          'UPDATE customer_balances SET day_limit = ? WHERE com_id = ?',
          [dayLimitValue, id]
        );
      } else {
        // Insert new balance record
        await connection.execute(
          `INSERT INTO customer_balances 
           (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [0, 0, 0, 0, id, dayLimitValue, 0, 1]
        );
      }
    }

    if (status !== undefined) {
      // Convert Enable/Disable to 1/0
      // Handle both string and number values
      let statusValue;
      if (typeof status === 'string') {
        // Handle "1"/"0" strings or "Enable"/"Disable"
        if (status === '1' || status === '0') {
          statusValue = parseInt(status);
        } else if (status === 'Enable' || status.toLowerCase() === 'enable') {
          statusValue = 1;
        } else if (status === 'Disable' || status.toLowerCase() === 'disable') {
          statusValue = 0;
        } else {
          statusValue = 1; // Default to Enable
        }
      } else if (typeof status === 'number') {
        statusValue = status === 1 ? 1 : 0;
      } else if (status === true) {
        statusValue = 1;
      } else {
        statusValue = 0;
      }

      console.log('Status conversion:', { original: status, converted: statusValue });
      updateFields.push('status = ?');
      updateValues.push(statusValue);
    }

    if (gst_name !== undefined) {
      updateFields.push('gst_name = ?');
      updateValues.push(gst_name || null);
    }

    if (gst_number !== undefined) {
      updateFields.push('gst_number = ?');
      updateValues.push(gst_number || null);
    }

    // Handle products array - convert to comma-separated string
    if (products !== undefined) {
      const productString = Array.isArray(products) ? products.join(',') : products;
      updateFields.push('product = ?');
      updateValues.push(productString || null);
    }

    // Handle blocklocation array - convert to comma-separated string
    if (blocklocation !== undefined) {
      const blocklocationString = Array.isArray(blocklocation) ? blocklocation.join(',') : blocklocation;
      updateFields.push('blocklocation = ?');
      updateValues.push(blocklocationString || null);
    }

    // Handle permissions update
    let permissionsUpdated = false;
    if (body.permissions !== undefined) {
      const permissions = body.permissions;

      // Delete existing permissions
      await connection.execute(
        'DELETE FROM customer_permissions WHERE customer_id = ?',
        [id]
      );

      // Insert new permissions
      if (permissions && typeof permissions === 'object') {
        const insertPermQuery = `
          INSERT INTO customer_permissions 
          (customer_id, module_name, can_view, can_edit, can_create)
          VALUES (?, ?, ?, ?, ?)
        `;

        for (const [moduleName, perm] of Object.entries(permissions)) {
          const can_view = perm.can_view === true || perm.can_view === 1 || perm.can_view === '1' ? 1 : 0;
          const can_edit = perm.can_edit === true || perm.can_edit === 1 || perm.can_edit === '1' ? 1 : 0;
          const can_create = perm.can_create === true || perm.can_create === 1 || perm.can_create === '1' ? 1 : 0;

          if (can_view || can_edit || can_create) {
            await connection.execute(insertPermQuery, [
              id,
              moduleName,
              can_view,
              can_edit,
              can_create
            ]);
          }
        }
        permissionsUpdated = true;
      }
    }

    if (updateFields.length === 0 && !permissionsUpdated) {
      return NextResponse.json(
        {
          success: false,
          message: 'No fields to update',
          error: 'NO_FIELDS_TO_UPDATE'
        },
        { status: 400 }
      );
    }

    // Add id for WHERE clause
    updateValues.push(id);

    // Log the update query for debugging
    console.log('Update Query:', `UPDATE customers SET ${updateFields.join(', ')} WHERE id = ?`);
    console.log('Update Values:', updateValues);
    console.log('Update Fields Count:', updateFields.length);

    // Update customer
    const [result] = await connection.execute(
      `UPDATE customers 
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      updateValues
    );

    console.log('Update Result:', result);
    console.log('Affected Rows:', result.affectedRows);

    // Check if update was successful
    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update customer',
          error: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    // Fetch updated customer
    const [updatedCustomers] = await connection.execute(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    const customer = updatedCustomers[0];

    // Create Audit Log
    try {
      // Get authenticated user for audit log
      let userId = null;
      let userName = null;
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            // Fetch user name from database
            const [users] = await connection.execute(
              'SELECT name FROM employee_profile WHERE id = ?',
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name || 'Unknown';
            }
          }
        }
      } catch (authError) {
        console.error('Error getting user for audit log:', authError);
      }

      const { createAuditLog } = await import('@/lib/auditLog');

      // Check if password was changed (already tracked above)
      const remarks = passwordChanged
        ? `Customer password changed: ${customer.name || `ID ${id}`}`
        : 'Customer details updated';

      await createAuditLog({
        page: 'Customers',
        uniqueCode: id.toString(),
        section: 'Customer Management',
        userId: userId,
        userName: userName,
        action: passwordChanged ? 'password_change' : 'edit',
        remarks: remarks,
        oldValue: existingCustomers[0],
        newValue: customer,
        recordType: 'customer',
        recordId: id
      });

      // ✅ Send notification to admins if password was changed
      if (passwordChanged) {
        try {
          const io = global._io;
          if (io) {
            io.to('role_5').emit('password_change_notification', {
              type: 'customer_password_changed',
              customerId: id,
              customerName: customer.name || `Customer ID: ${id}`,
              changedBy: {
                id: userId,
                name: userName || 'Unknown'
              },
              timestamp: Date.now(),
              message: `Customer password changed: ${customer.name || `ID ${id}`} by ${userName || 'Unknown'}`
            });
            console.log('✅ Customer password change notification sent to admins');
          }
        } catch (notifError) {
          console.error('⚠️ Error sending password change notification:', notifError);
        }
      }
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    // ✅ Create entity-specific log (similar to filling_logs) for update
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      let userId = null;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
        }
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      await createEntityLog({
        entityType: 'customer',
        entityId: id,
        createdBy: null, // Will use existing if log exists
        updatedBy: userId,
        updatedDate: currentDateTime
      });
    } catch (logError) {
      console.error('⚠️ Error creating customer log:', logError);
    }

    // Fetch product names for the product IDs
    let productNames = {};
    if (customer.product) {
      const productIds = customer.product.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        const [productRows] = await connection.execute(
          `SELECT id, pname FROM products WHERE id IN (${placeholders})`,
          productIds
        );
        productRows.forEach(p => {
          productNames[p.id] = p.pname;
        });
      }
    }

    // Format response to match what the frontend expects
    const formattedCustomer = {
      ...customer,
      customer_type: customer.status === 1 ? '1' : '0',
      billing_type: customer.billing_type ? customer.billing_type.toString() : "1", // Convert to string for dropdown
      payment_type: customer.gid ? customer.gid.toString() : '1', // Use gid field for payment_type
      gid: customer.gid || 1, // Include gid in response
      blocklocation: customer.blocklocation ? customer.blocklocation.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      products: customer.product ? customer.product.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      productNames: productNames, // Add product names mapping
      status: customer.status === 1 ? '1' : '0', // Return as string "1" or "0"
    };

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        customer: formattedCustomer
      }
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);

    // Handle specific MySQL errors
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        {
          success: false,
          message: 'Email already exists',
          error: 'DUPLICATE_EMAIL'
        },
        { status: 409 }
      );
    }

    if (error.code === 'ER_NO_REFERENCED_ROW') {
      return NextResponse.json(
        {
          success: false,
          message: 'Referenced data not found',
          error: 'REFERENCE_ERROR'
        },
        { status: 400 }
      );
    }

    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid field name: ' + error.message,
          error: 'BAD_FIELD_ERROR'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error: ' + error.message,
        error: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// GET - Fetch single customer for editing
export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer ID is required',
          error: 'MISSING_ID'
        },
        { status: 400 }
      );
    }

    connection = await getConnWithRetry();

    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer not found',
          error: 'CUSTOMER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const customer = customers[0];

    // Fetch product names for the product IDs
    let productNames = {};
    try {
      if (customer.product && customer.product.trim() !== '') {
        const productIds = customer.product.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
        if (productIds.length > 0) {
          const placeholders = productIds.map(() => '?').join(',');
          const [productRows] = await connection.execute(
            `SELECT id, pname FROM products WHERE id IN (${placeholders})`,
            productIds
          );
          if (productRows && Array.isArray(productRows)) {
            productRows.forEach(p => {
              productNames[p.id] = p.pname;
            });
          }
        }
      }
    } catch (productError) {
      console.error('Error fetching product names:', productError);
      // Continue without product names if there's an error
    }

    // ✅ Fetch Permissions
    let formattedPermissions = {};
    try {
      // Check if table exists first (safeguard)
      const [permRows] = await connection.execute(
        `SELECT module_name, can_view, can_edit, can_create 
         FROM customer_permissions 
         WHERE customer_id = ?`,
        [id]
      );

      if (permRows && permRows.length > 0) {
        permRows.forEach(row => {
          formattedPermissions[row.module_name] = {
            can_view: row.can_view === 1,
            can_edit: row.can_edit === 1,
            can_create: row.can_create === 1
          };
        });
      }
    } catch (permErr) {
      console.warn('Could not fetch permissions (table might not exist yet):', permErr.message);
    }

    // Format response to match what the frontend expects
    const formattedCustomer = {
      ...customer,
      customer_type: customer.status === 1 ? '1' : '0',
      billing_type: customer.billing_type ? customer.billing_type.toString() : "1", // Convert to string for dropdown
      payment_type: customer.gid ? customer.gid.toString() : '1', // Use gid field for payment_type
      gid: customer.gid || 1, // Include gid in response
      blocklocation: customer.blocklocation ? customer.blocklocation.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      products: customer.product ? customer.product.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      productNames: productNames, // Add product names mapping
      permissions: formattedPermissions, // ✅ Include permissions
      status: customer.status === 1 ? '1' : '0', // Return as string "1" or "0"
    };

    return NextResponse.json({
      success: true,
      message: 'Customer fetched successfully',
      data: {
        customer: formattedCustomer
      }
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);

    if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid customer ID format',
          error: 'INVALID_ID_FORMAT'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error: ' + error.message,
        error: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
