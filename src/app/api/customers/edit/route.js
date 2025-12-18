
// src/app/api/customers/edit/route.js
import { getConnection } from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

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
    connection = await getConnection();

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

    if (password !== undefined && password !== null && password !== '') {
      // Hash password before storing
      const hashedPassword = hashPassword(password);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
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

    if (status !== undefined) {
      // Convert Enable/Disable to 1/0
      // Handle both string and number values
      let statusValue;
      if (typeof status === 'string') {
        statusValue = (status === 'Enable' || status.toLowerCase() === 'enable') ? 1 : 0;
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

    if (updateFields.length === 0) {
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
      await createAuditLog({
        page: 'Customers',
        uniqueCode: id.toString(),
        section: 'Customer Management',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: 'Customer details updated',
        oldValue: existingCustomers[0],
        newValue: customer,
        recordType: 'customer',
        recordId: id
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the request if audit logging fails
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
      customer_type: customer.status === 1 ? 'Enable' : 'Disable',
      billing_type: customer.billing_type ? customer.billing_type.toString() : "1", // Convert to string for dropdown
      payment_type: payment_type || 'Cash', // This might need to come from another field
      blocklocation: customer.blocklocation ? customer.blocklocation.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      products: customer.product ? customer.product.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      productNames: productNames, // Add product names mapping
      status: customer.status === 1 ? 'Enable' : 'Disable',
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

    connection = await getConnection();

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

    // Format response to match what the frontend expects
    const formattedCustomer = {
      ...customer,
      customer_type: customer.status === 1 ? 'Enable' : 'Disable',
      billing_type: customer.billing_type ? customer.billing_type.toString() : "1", // Convert to string for dropdown
      payment_type: 'Cash', // Default value, adjust if you have this field
      blocklocation: customer.blocklocation ? customer.blocklocation.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      products: customer.product ? customer.product.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      productNames: productNames, // Add product names mapping
      status: customer.status === 1 ? 'Enable' : 'Disable',
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