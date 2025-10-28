//src/app/api/customers/customer-details/route.js
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

// Helper function to check and handle overdue customers using validity_days from customer_balances
async function checkAndHandleOverdueCustomer(customerId) {
  try {
    const customerQuery = `
      SELECT c.id, c.billing_type, c.status,
             cb.cst_limit, cb.amtlimit, cb.hold_balance, cb.validity_days
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.id = ?
    `;
    const customerData = await executeQuery(customerQuery, [customerId]);
    
    if (customerData.length === 0) {
      return { hasOverdue: false };
    }

    const customer = customerData[0];
    
    // Only check for postpaid customers
    if (customer.billing_type != 1) {
      return { hasOverdue: false };
    }

    // Use validity_days from customer_balances table, fallback to 7 days
    const creditDaysValue = parseInt(customer.validity_days) || 7;
    
    // Check for overdue invoices
    const overdueQuery = `
      SELECT COUNT(*) as overdue_count, 
             SUM(remaining_amount) as total_overdue
      FROM invoices 
      WHERE customer_id = ? 
      AND status IN ('pending', 'partially_paid')
      AND due_date < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const overdueResult = await executeQuery(overdueQuery, [customerId, creditDaysValue]);
    
    const hasOverdue = overdueResult[0].overdue_count > 0;
    const totalOverdue = parseFloat(overdueResult[0].total_overdue) || 0;

    if (hasOverdue) {
      // Auto-block customer by setting remaining limit to 0
      const currentAmtLimit = parseFloat(customer.amtlimit) || 0;
      const currentCstLimit = parseFloat(customer.cst_limit) || 0;
      
      // Only block if not already blocked
      if (currentAmtLimit > 0) {
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
            1, // system user
            now,
            0,
            currentAmtLimit,
            "decrease",
            `Auto-blocked due to overdue invoices. Total overdue: ₹${totalOverdue}`
          ]
        );
        
        // Update customer status to inactive
        await executeQuery('UPDATE customers SET status = 0 WHERE id = ?', [customerId]);
      }
      
      return { 
        hasOverdue: true, 
        totalOverdue,
        overdueCount: overdueResult[0].overdue_count,
        wasBlocked: currentAmtLimit > 0
      };
    }

    return { hasOverdue: false };

  } catch (error) {
    console.error('Error checking overdue customer:', error);
    return { hasOverdue: false };
  }
}

// Helper function to check customer eligibility with overdue handling
async function checkCustomerEligibility(customerId) {
  try {
    // First check and handle overdue
    const overdueCheck = await checkAndHandleOverdueCustomer(customerId);
    
    const balanceQuery = `
      SELECT cb.cst_limit, cb.amtlimit, cb.hold_balance, c.billing_type, c.status, cb.validity_days
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
      billing_type, 
      status,
      validity_days 
    } = balanceData[0];
    
    const totalLimit = parseFloat(cst_limit) || 0;
    const remainingLimit = parseFloat(amtlimit) || 0;
    const currentHold = parseFloat(hold_balance) || 0;
    const availableBalance = remainingLimit - currentHold;

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
        totalOverdue: overdueCheck.totalOverdue || 0
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
        totalOverdue: overdueCheck.totalOverdue || 0
      };
    }

    // For postpaid customers, check overdue invoices
    if (billing_type == 1 && overdueCheck.hasOverdue) {
      return { 
        eligible: false, 
        reason: `Overdue invoices exist (${validity_days || 7} days credit period)`,
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold,
        hasOverdue: true,
        totalOverdue: overdueCheck.totalOverdue || 0,
        overdueCount: overdueCheck.overdueCount || 0
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
      totalOverdue: overdueCheck.totalOverdue || 0
    };

  } catch (error) {
    console.error('Error checking eligibility:', error);
    return { 
      eligible: false, 
      reason: 'Error checking eligibility',
      hasOverdue: false
    };
  }
}

// Helper function to handle payment and auto-unblock
async function handlePaymentAndUnblock(customerId, paymentAmount) {
  try {
    // Get current balance
    const balanceQuery = 'SELECT cst_limit, amtlimit, hold_balance FROM customer_balances WHERE com_id = ?';
    const balanceData = await executeQuery(balanceQuery, [customerId]);
    
    if (balanceData.length === 0) return { unblocked: false };
    
    const currentCstLimit = parseFloat(balanceData[0].cst_limit) || 0;
    const currentAmtLimit = parseFloat(balanceData[0].amtlimit) || 0;
    const currentHold = parseFloat(balanceData[0].hold_balance) || 0;
    
    // If customer was blocked (amtlimit = 0) and payment is made, restore limit
    if (currentAmtLimit === 0 && paymentAmount > 0) {
      const newAmtLimit = currentCstLimit;
      
      await executeQuery(
        'UPDATE customer_balances SET amtlimit = ? WHERE com_id = ?',
        [newAmtLimit, customerId]
      );
      
      // Activate customer
      await executeQuery('UPDATE customers SET status = 1 WHERE id = ?', [customerId]);
      
      // Log the unblock action
      const now = new Date();
      await executeQuery(
        `INSERT INTO filling_history 
         (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "auto_unblock_payment",
          now,
          newAmtLimit,
          now,
          customerId,
          1, // system user
          now,
          newAmtLimit,
          0,
          "increase",
          `Auto-unblocked after payment of ₹${paymentAmount}. Limit restored to ₹${newAmtLimit}`
        ]
      );
      
      return { unblocked: true, newLimit: newAmtLimit };
    }
    
    return { unblocked: false };
  } catch (error) {
    console.error('Error handling payment unblock:', error);
    return { unblocked: false };
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

    // Fetch customer details with limit_expiry and validity_days from customer_balances
    const customerQuery = `
      SELECT c.*, cb.hold_balance, cb.cst_limit, cb.amtlimit, cb.validity_days, cb.limit_expiry
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

    // Fetch deal prices
    let dealPricesWithNames = [];
    try {
      const dealPrices = customer[0].deal_price ? JSON.parse(customer[0].deal_price) : {};
      
      for (const [stationId, price] of Object.entries(dealPrices)) {
        if (price && stationId && stationId !== '') {
          const stationQuery = 'SELECT station_name FROM filling_stations WHERE id = ?';
          const station = await executeQuery(stationQuery, [stationId]);
          if (station.length > 0) {
            dealPricesWithNames.push({
              stationName: station[0].station_name,
              price: price
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing deal prices:', error);
      dealPricesWithNames = [];
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
        dealPrices: dealPricesWithNames,
        users,
        logs: logData,
        outstandingInvoices,
        transactionHistory,
        eligibility,
        hold_balance: customer[0].hold_balance || 0,
        cst_limit: customer[0].cst_limit || 0,
        amtlimit: customer[0].amtlimit || 0,
        validity_days: customer[0].validity_days || 7, // Use validity_days from customer_balances
        limit_expiry: customer[0].limit_expiry, // Use limit_expiry from customer_balances
        payment_type: customer[0].billing_type == 1 ? 'postpaid' : 'prepaid'
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching customer details:', error);
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
        const { name, phone, email, address, gst_name, gst_number, status } = data;
        
        if (!id) {
          return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }

        const profileCustCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [id]);
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

        updateValues.push(id);
        const updateProfileQuery = `UPDATE customers SET ${updateFields.join(', ')} WHERE id = ?`;
        await executeQuery(updateProfileQuery, updateValues);
        
        return NextResponse.json({ message: 'Customer profile updated successfully' });

      case 'add_user':
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

      case 'update_password':
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

      case 'delete_user':
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

      case 'process_payment':
        // Handle payment processing and auto-unblock
        const { paymentAmount } = data;
        
        if (!id || !paymentAmount) {
          return NextResponse.json({ error: 'Customer ID and payment amount are required' }, { status: 400 });
        }

        const paymentCustCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [id]);
        if (paymentCustCheck.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Process payment logic here (update invoices, transactions, etc.)
        // This is a simplified version - implement your actual payment processing
        
        // After payment processing, check if we need to unblock the customer
        const unblockResult = await handlePaymentAndUnblock(id, parseFloat(paymentAmount));
        
        return NextResponse.json({ 
          message: 'Payment processed successfully',
          unblocked: unblockResult.unblocked || false,
          newLimit: unblockResult.newLimit || 0
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing POST request:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Request processing failed'
    }, { status: 500 });
  }
}