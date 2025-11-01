// src/app/api/customers/customer-details/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// Helper function for password hashing
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper function to check and handle overdue customers using customer_balances.day_limit as credit days
async function checkAndHandleOverdueCustomer(customerId) {
  try {
    console.log('Checking overdue for customer:', customerId);
    
    const customerQuery = `
      SELECT c.id, c.billing_type, c.status,
             cb.cst_limit, cb.amtlimit, cb.hold_balance, cb.day_limit as credit_days
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.id = ?
    `;
    const customerData = await executeQuery(customerQuery, [customerId]);
    
    if (customerData.length === 0) {
      console.log('Customer not found for overdue check');
      return { hasOverdue: false };
    }

    const customer = customerData[0];
    
    // Only check for postpaid customers (billing_type = 1)
    if (customer.billing_type != 1) {
      console.log('Customer is not postpaid, skipping overdue check');
      return { hasOverdue: false };
    }

    // Use customer_balances.day_limit as credit days, if 0 then use default 7 days
    const creditDaysValue = parseInt(customer.credit_days) > 0 ? parseInt(customer.credit_days) : 7;
    console.log('Using credit days from customer_balances.day_limit:', creditDaysValue);
    
    // Check for overdue invoices
    const overdueQuery = `
      SELECT COUNT(*) as overdue_count, 
             COALESCE(SUM(remaining_amount), 0) as total_overdue
      FROM invoices 
      WHERE customer_id = ? 
      AND status IN ('pending', 'partially_paid')
      AND due_date < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const overdueResult = await executeQuery(overdueQuery, [customerId, creditDaysValue]);
    
    const hasOverdue = overdueResult[0].overdue_count > 0;
    const totalOverdue = parseFloat(overdueResult[0].total_overdue) || 0;

    if (hasOverdue) {
      console.log('Customer has overdue invoices, total:', totalOverdue);
      
      // Auto-block customer by setting remaining limit to 0
      const currentAmtLimit = parseFloat(customer.amtlimit) || 0;
      
      // Only block if not already blocked
      if (currentAmtLimit > 0) {
        console.log('Blocking customer due to overdue');
        const updateQuery = 'UPDATE customer_balances SET amtlimit = 0 WHERE com_id = ?';
        await executeQuery(updateQuery, [customerId]);
        
        // Log this action
        const now = new Date();
        await executeQuery(
          `INSERT INTO filling_history 
           (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "auto_block_overdue",
            now,
            0,
            now,
            customerId,
            1,
            now,
            0,
            currentAmtLimit,
            "decrease",
            `Auto-blocked due to overdue invoices. Total overdue: ₹${totalOverdue}. Credit days: ${creditDaysValue}`
          ]
        );
        
        // Update customer status to inactive
        await executeQuery('UPDATE customers SET status = 0 WHERE id = ?', [customerId]);
        
        return { 
          hasOverdue: true, 
          totalOverdue,
          overdueCount: overdueResult[0].overdue_count,
          wasBlocked: true,
          creditDays: creditDaysValue
        };
      }
      
      return { 
        hasOverdue: true, 
        totalOverdue,
        overdueCount: overdueResult[0].overdue_count,
        wasBlocked: false,
        creditDays: creditDaysValue
      };
    }

    console.log('No overdue invoices found');
    return { hasOverdue: false, creditDays: creditDaysValue };

  } catch (error) {
    console.error('Error checking overdue customer:', error);
    return { hasOverdue: false, error: error.message };
  }
}

// Helper function to check customer eligibility for filling
async function checkCustomerEligibility(customerId) {
  try {
    // First check and handle overdue
    const overdueCheck = await checkAndHandleOverdueCustomer(customerId);
    
    const balanceQuery = `
      SELECT cb.cst_limit, cb.amtlimit, cb.hold_balance, cb.day_limit as credit_days, cb.day_amount,
             c.billing_type, c.status, c.day_limit as daily_filling_limit
      FROM customer_balances cb 
      JOIN customers c ON cb.com_id = c.id 
      WHERE cb.com_id = ?
    `;
    const balanceData = await executeQuery(balanceQuery, [customerId]);
    
    if (balanceData.length === 0) {
      return { 
        eligible: false, 
        reason: 'Customer balance not found',
        hasOverdue: overdueCheck.hasOverdue,
        totalOverdue: overdueCheck.totalOverdue || 0
      };
    }

    const { 
      cst_limit, 
      amtlimit, 
      hold_balance, 
      credit_days,
      day_amount,
      billing_type, 
      status,
      daily_filling_limit
    } = balanceData[0];
    
    const totalLimit = parseFloat(cst_limit) || 0;
    const remainingLimit = parseFloat(amtlimit) || 0;
    const currentHold = parseFloat(hold_balance) || 0;
    const availableBalance = remainingLimit - currentHold;
    const dailyUsed = parseFloat(day_amount) || 0;
    const dailyLimit = parseFloat(daily_filling_limit) || 0;

    // Check if customer is inactive
    if (status == 0) {
      return { 
        eligible: false, 
        reason: 'Customer account is inactive',
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        hasOverdue: overdueCheck.hasOverdue,
        totalOverdue: overdueCheck.totalOverdue || 0,
        creditDays: overdueCheck.creditDays || 7,
        dailyLimit,
        dailyUsed
      };
    }

    // Check available balance
    if (availableBalance <= 0) {
      return { 
        eligible: false, 
        reason: 'Insufficient balance',
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        hasOverdue: overdueCheck.hasOverdue,
        totalOverdue: overdueCheck.totalOverdue || 0,
        creditDays: overdueCheck.creditDays || 7,
        dailyLimit,
        dailyUsed
      };
    }

    // Check daily limit
    if (dailyLimit > 0 && dailyUsed >= dailyLimit) {
      return { 
        eligible: false, 
        reason: 'Daily filling limit exceeded',
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        hasOverdue: overdueCheck.hasOverdue,
        totalOverdue: overdueCheck.totalOverdue || 0,
        creditDays: overdueCheck.creditDays || 7,
        dailyLimit,
        dailyUsed
      };
    }

    // For postpaid customers, check overdue invoices
    if (billing_type == 1 && overdueCheck.hasOverdue) {
      return { 
        eligible: false, 
        reason: `Overdue invoices exist (${overdueCheck.creditDays || 7} days credit period)`,
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        hasOverdue: true,
        totalOverdue: overdueCheck.totalOverdue || 0,
        overdueCount: overdueCheck.overdueCount || 0,
        creditDays: overdueCheck.creditDays || 7,
        dailyLimit,
        dailyUsed
      };
    }

    return { 
      eligible: true, 
      availableBalance,
      totalLimit,
      remainingLimit,
      currentHold,
      billing_type,
      hasOverdue: overdueCheck.hasOverdue,
      totalOverdue: overdueCheck.totalOverdue || 0,
      creditDays: overdueCheck.creditDays || 7,
      dailyLimit,
      dailyUsed,
      remainingDaily: dailyLimit - dailyUsed
    };

  } catch (error) {
    console.error('Error checking eligibility:', error);
    return { 
      eligible: false, 
      reason: 'Error checking eligibility: ' + error.message,
      hasOverdue: false
    };
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // First, check and handle any overdue situation
    await checkAndHandleOverdueCustomer(id);

    // Fetch customer details with both day_limit fields
    const customerQuery = `
      SELECT c.*, 
             cb.hold_balance, 
             cb.cst_limit, 
             cb.amtlimit,
             cb.day_limit as credit_days,
             cb.day_amount,
             cb.last_reset_date
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.id = ?
    `;
    const customer = await executeQuery(customerQuery, [id]);

    if (customer.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch product names
    const productIds = customer[0].product?.split(',').filter(id => id && id.trim() !== '') || [];
    let productNames = [];
    
    if (productIds.length > 0) {
      try {
        const placeholders = productIds.map(() => '?').join(',');
        const productQuery = `SELECT pname FROM products WHERE id IN (${placeholders})`;
        const products = await executeQuery(productQuery, productIds);
        productNames = products.map(p => p.pname);
      } catch (error) {
        console.error('Error fetching products:', error);
        productNames = ['Error loading products'];
      }
    }

    // Fetch block locations
    const blockLocationIds = customer[0].blocklocation?.split(',').filter(id => id && id.trim() !== '') || [];
    let blockLocations = [];
    
    if (blockLocationIds.length > 0) {
      try {
        const placeholders = blockLocationIds.map(() => '?').join(',');
        const locationQuery = `SELECT station_name FROM filling_stations WHERE id IN (${placeholders})`;
        const locations = await executeQuery(locationQuery, blockLocationIds);
        blockLocations = locations.map(l => l.station_name);
      } catch (error) {
        console.error('Error fetching block locations:', error);
        blockLocations = ['Error loading locations'];
      }
    }

    // Fetch sub-users
    let users = [];
    try {
      const usersQuery = 'SELECT id, name, email, phone FROM customers WHERE com_id = ?';
      users = await executeQuery(usersQuery, [id]);
    } catch (error) {
      console.error('Error fetching users:', error);
      users = [];
    }

    // Fetch outstanding invoices
    let outstandingInvoices = [];
    if (customer[0].billing_type == 1) {
      try {
        const invoiceQuery = `
          SELECT id, invoice_number, total_amount, paid_amount, 
                 (total_amount - paid_amount) as remaining_amount,
                 due_date, status, created_date
          FROM invoices 
          WHERE customer_id = ? 
          AND status IN ('pending', 'partially_paid')
          ORDER BY due_date ASC
        `;
        outstandingInvoices = await executeQuery(invoiceQuery, [id]);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        outstandingInvoices = [];
      }
    }

    // Fetch transaction history
    let transactionHistory = [];
    try {
      const transactionQuery = `
        SELECT id, amount, type, description, created_date, status
        FROM transactions 
        WHERE customer_id = ? 
        ORDER BY created_date DESC
        LIMIT 50
      `;
      transactionHistory = await executeQuery(transactionQuery, [id]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      transactionHistory = [];
    }

    // Fetch activity logs
    let logData = {
      Created: { name: '', date: '' },
      Processed: { name: '', date: '' },
      Completed: { name: '', date: '' },
      Cancelled: { name: '', date: '' }
    };

    if (customer[0].rid) {
      try {
        const logQuery = 'SELECT * FROM filling_logs WHERE request_id = ?';
        const logs = await executeQuery(logQuery, [customer[0].rid]);

        for (const log of logs) {
          if (log.created_by) {
            const creator = await executeQuery('SELECT name FROM customers WHERE id = ?', [log.created_by]);
            logData.Created = {
              name: creator[0]?.name || 'Unknown',
              date: log.created_date ? new Date(log.created_date).toLocaleString('en-IN') : ''
            };
          }

          if (log.processed_by) {
            const processor = await executeQuery('SELECT name FROM employee_profile WHERE id = ?', [log.processed_by]);
            logData.Processed = {
              name: processor[0]?.name || 'Unknown',
              date: log.processed_date ? new Date(log.processed_date).toLocaleString('en-IN') : ''
            };
          }

          if (log.completed_by) {
            const completer = await executeQuery('SELECT name FROM employee_profile WHERE id = ?', [log.completed_by]);
            logData.Completed = {
              name: completer[0]?.name || 'Unknown',
              date: log.completed_date ? new Date(log.completed_date).toLocaleString('en-IN') : ''
            };
          }

          if (log.cancelled_by) {
            const canceller = await executeQuery('SELECT name FROM employee_profile WHERE id = ?', [log.cancelled_by]);
            logData.Cancelled = {
              name: canceller[0]?.name || 'Unknown',
              date: log.cancelled_date ? new Date(log.cancelled_date).toLocaleString('en-IN') : ''
            };
          }
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    }

    // Check customer eligibility
    const eligibility = await checkCustomerEligibility(id);

    const responseData = {
      customer: {
        ...customer[0],
        productNames,
        blockLocations,
        users,
        logs: logData,
        outstandingInvoices,
        transactionHistory,
        eligibility,
        hold_balance: customer[0].hold_balance || 0,
        cst_limit: customer[0].cst_limit || 0,
        amtlimit: customer[0].amtlimit || 0,
        credit_days: customer[0].credit_days || 7, // From customer_balances.day_limit
        daily_filling_limit: customer[0].day_limit || 0, // From customers.day_limit
        day_amount: customer[0].day_amount || 0,
        last_reset_date: customer[0].last_reset_date,
        payment_type: customer[0].billing_type == 1 ? 'postpaid' : 'prepaid'
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in GET /api/customers/customer-details:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'update_customer_profile':
        return await handleUpdateProfile(id, data);
        
      case 'update_day_limits':
        return await handleUpdateDayLimits(id, data);
        
      case 'add_user':
        return await handleAddUser(data);
        
      case 'update_password':
        return await handleUpdatePassword(data);
        
      case 'delete_user':
        return await handleDeleteUser(data);
        
      case 'process_payment':
        return await handleProcessPayment(id, data);
        
      case 'create_filling_request':
        return await handleCreateFillingRequest(id, data);
        
      case 'update_request_status':
        return await handleUpdateRequestStatus(data);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/customers/customer-details:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Request processing failed'
    }, { status: 500 });
  }
}

// Separate handler functions
async function handleUpdateProfile(customerId, data) {
  const { name, phone, email, address, gst_name, gst_number, status } = data;
  
  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  const profileCustCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [customerId]);
  if (profileCustCheck.length === 0) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const updateFields = [];
  const updateValues = [];

  if (name) { updateFields.push('name = ?'); updateValues.push(name); }
  if (phone) { updateFields.push('phone = ?'); updateValues.push(phone); }
  if (email) { updateFields.push('email = ?'); updateValues.push(email); }
  if (address) { updateFields.push('address = ?'); updateValues.push(address); }
  if (gst_name) { updateFields.push('gst_name = ?'); updateValues.push(gst_name); }
  if (gst_number) { updateFields.push('gst_number = ?'); updateValues.push(gst_number); }
  if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }

  if (updateFields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updateValues.push(customerId);
  const updateProfileQuery = `UPDATE customers SET ${updateFields.join(', ')} WHERE id = ?`;
  await executeQuery(updateProfileQuery, updateValues);
  
  return NextResponse.json({ message: 'Customer profile updated successfully' });
}

// New function to update day limits
async function handleUpdateDayLimits(customerId, data) {
  const { credit_days, daily_filling_limit } = data;
  
  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  // Check if customer exists
  const customerCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [customerId]);
  if (customerCheck.length === 0) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  try {
    // Update credit days in customer_balances (only if > 0)
    if (credit_days !== undefined && credit_days > 0) {
      await executeQuery(
        'UPDATE customer_balances SET day_limit = ? WHERE com_id = ?',
        [credit_days, customerId]
      );
    }

    // Update daily filling limit in customers table
    if (daily_filling_limit !== undefined) {
      await executeQuery(
        'UPDATE customers SET day_limit = ? WHERE id = ?',
        [daily_filling_limit, customerId]
      );
    }

    return NextResponse.json({ message: 'Day limits updated successfully' });

  } catch (error) {
    console.error('Error updating day limits:', error);
    return NextResponse.json({ error: 'Failed to update day limits' }, { status: 500 });
  }
}

// Filling request handler
async function handleCreateFillingRequest(customerId, data) {
  const { amount, product_id, station_id, vehicle_number } = data;
  
  if (!customerId || !amount || !product_id || !station_id) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  try {
    // Check customer eligibility
    const eligibility = await checkCustomerEligibility(customerId);
    if (!eligibility.eligible) {
      return NextResponse.json({ 
        error: 'Customer not eligible for filling',
        reason: eligibility.reason
      }, { status: 400 });
    }

    // Check if amount is within available balance and daily limit
    const requestedAmount = parseFloat(amount);
    if (requestedAmount > eligibility.availableBalance) {
      return NextResponse.json({ 
        error: 'Requested amount exceeds available balance'
      }, { status: 400 });
    }

    if (eligibility.dailyLimit > 0 && (eligibility.dailyUsed + requestedAmount) > eligibility.dailyLimit) {
      return NextResponse.json({ 
        error: 'Requested amount exceeds daily filling limit'
      }, { status: 400 });
    }

    // Create filling request
    const now = new Date();
    const insertQuery = `
      INSERT INTO filling_requests 
      (customer_id, product_id, station_id, vehicle_number, requested_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `;
    
    const result = await executeQuery(insertQuery, [
      customerId, product_id, station_id, vehicle_number, requestedAmount, now
    ]);

    // Hold the amount
    const newHoldBalance = (eligibility.currentHold || 0) + requestedAmount;
    await executeQuery(
      'UPDATE customer_balances SET hold_balance = ? WHERE com_id = ?',
      [newHoldBalance, customerId]
    );

    return NextResponse.json({ 
      message: 'Filling request created successfully',
      request_id: result.insertId
    });

  } catch (error) {
    console.error('Error creating filling request:', error);
    return NextResponse.json({ error: 'Failed to create filling request' }, { status: 500 });
  }
}

// Update request status
async function handleUpdateRequestStatus(data) {
  const { request_id, status, actual_amount } = data;
  
  if (!request_id || !status) {
    return NextResponse.json({ error: 'Request ID and status are required' }, { status: 400 });
  }

  try {
    // Get request details
    const requestQuery = 'SELECT * FROM filling_requests WHERE id = ?';
    const requests = await executeQuery(requestQuery, [request_id]);
    
    if (requests.length === 0) {
      return NextResponse.json({ error: 'Filling request not found' }, { status: 404 });
    }

    const request = requests[0];
    const now = new Date();

    if (status === 'completed' && actual_amount) {
      // Update customer balances
      const finalAmount = parseFloat(actual_amount);
      
      // Reduce hold balance and actual balance
      await executeQuery(
        'UPDATE customer_balances SET hold_balance = hold_balance - ?, amtlimit = amtlimit - ?, day_amount = day_amount + ? WHERE com_id = ?',
        [request.requested_amount, finalAmount, finalAmount, request.customer_id]
      );

      // Update request
      await executeQuery(
        'UPDATE filling_requests SET status = ?, actual_amount = ?, completed_at = ? WHERE id = ?',
        [status, finalAmount, now, request_id]
      );

    } else if (status === 'cancelled') {
      // Release hold balance
      await executeQuery(
        'UPDATE customer_balances SET hold_balance = hold_balance - ? WHERE com_id = ?',
        [request.requested_amount, request.customer_id]
      );

      // Update request
      await executeQuery(
        'UPDATE filling_requests SET status = ?, cancelled_at = ? WHERE id = ?',
        [status, now, request_id]
      );
    } else {
      // For other statuses (processed, etc.)
      await executeQuery(
        'UPDATE filling_requests SET status = ? WHERE id = ?',
        [status, request_id]
      );
    }

    return NextResponse.json({ message: `Filling request ${status} successfully` });

  } catch (error) {
    console.error('Error updating request status:', error);
    return NextResponse.json({ error: 'Failed to update request status' }, { status: 500 });
  }
}

async function handleAddUser(data) {
  const { com_id, name: userName, phone: userPhone, email: userEmail, password } = data;
  
  if (!com_id || !userName || !userPhone || !userEmail || !password) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const parentQuery = 'SELECT status, product, blocklocation FROM customers WHERE id = ?';
  const parent = await executeQuery(parentQuery, [com_id]);
  
  if (parent.length === 0) {
    return NextResponse.json({ error: 'Parent customer not found' }, { status: 404 });
  }

  const existingUser = await executeQuery(
    'SELECT id FROM customers WHERE email = ? OR phone = ?', 
    [userEmail, userPhone]
  );
  
  if (existingUser.length > 0) {
    return NextResponse.json({ error: 'User with this email or phone already exists' }, { status: 400 });
  }

  const { status: parentStatus, product, blocklocation } = parent[0];
  const hashedPassword = await hashPassword(password);
  
  const insertUserQuery = `
    INSERT INTO customers (com_id, roleid, name, phone, email, password, status, product, blocklocation) 
    VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await executeQuery(insertUserQuery, [
    com_id, 
    userName, 
    userPhone, 
    userEmail, 
    hashedPassword, 
    parentStatus, 
    product, 
    blocklocation
  ]);
  
  return NextResponse.json({ message: 'User added successfully' });
}

async function handleUpdatePassword(data) {
  const { userId, newPassword } = data;
  
  if (!userId || !newPassword) {
    return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
  }

  const userCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [userId]);
  if (userCheck.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const hashedNewPassword = await hashPassword(newPassword);
  await executeQuery('UPDATE customers SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
  
  return NextResponse.json({ message: 'Password updated successfully' });
}

async function handleDeleteUser(data) {
  const { userId: deleteUserId } = data;
  
  if (!deleteUserId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const deleteUserCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [deleteUserId]);
  if (deleteUserCheck.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await executeQuery('DELETE FROM customers WHERE id = ?', [deleteUserId]);
  return NextResponse.json({ message: 'User deleted successfully' });
}

async function handleProcessPayment(customerId, data) {
  const { paymentAmount } = data;
  
  if (!customerId || !paymentAmount) {
    return NextResponse.json({ error: 'Customer ID and payment amount are required' }, { status: 400 });
  }

  const paymentCustCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [customerId]);
  if (paymentCustCheck.length === 0) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  console.log(`Processing payment of ${paymentAmount} for customer ${customerId}`);
  
  return NextResponse.json({ 
    message: 'Payment processed successfully',
    unblocked: false,
    newLimit: 0
  });
}