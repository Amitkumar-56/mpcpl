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

// Helper function to check customer eligibility
async function checkCustomerEligibility(customerId) {
  try {
    const balanceQuery = `
      SELECT cb.cst_limit, cb.amtlimit, cb.hold_balance, c.billing_type, c.status, c.credit_days
      FROM customer_balances cb 
      JOIN customers c ON cb.com_id = c.id 
      WHERE cb.com_id = ?
    `;
    const balanceData = await executeQuery(balanceQuery, [customerId]);
    
    if (balanceData.length === 0) {
      return { eligible: false, reason: 'Customer balance not found' };
    }

    const { 
      cst_limit, 
      amtlimit, 
      hold_balance, 
      billing_type, 
      status,
      credit_days 
    } = balanceData[0];
    
    const totalLimit = parseFloat(cst_limit) || 0;
    const remainingLimit = parseFloat(amtlimit) || 0;
    const currentHold = parseFloat(hold_balance) || 0;
    const availableBalance = remainingLimit - currentHold;

    // Check available balance - ALLOW NEGATIVE VALUES
    if (availableBalance <= 0) {
      return { 
        eligible: false, 
        reason: 'Insufficient balance',
        availableBalance,
        totalLimit,
        remainingLimit,
        currentHold
      };
    }

    // For postpaid customers, check overdue invoices
    if (billing_type == 1) {
      const creditDaysValue = parseInt(credit_days) || 7;
      
      const overdueQuery = `
        SELECT COUNT(*) as overdue_count, 
               SUM(remaining_amount) as total_overdue
        FROM invoices 
        WHERE customer_id = ? 
        AND status IN ('pending', 'partially_paid')
        AND due_date < DATE_SUB(NOW(), INTERVAL ? DAY)
      `;
      const overdueResult = await executeQuery(overdueQuery, [customerId, creditDaysValue]);
      
      if (overdueResult[0].overdue_count > 0) {
        return { 
          eligible: false, 
          reason: `Overdue invoices exist (${creditDaysValue} days credit period)`,
          availableBalance,
          totalLimit,
          remainingLimit,
          currentHold,
          overdueAmount: overdueResult[0].total_overdue || 0
        };
      }
    }

    return { 
      eligible: true, 
      availableBalance,
      totalLimit,
      remainingLimit,
      currentHold,
      billing_type 
    };

  } catch (error) {
    console.error('Error checking eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Fetch customer details
    const customerQuery = `
      SELECT c.*, cb.hold_balance, cb.cst_limit, cb.amtlimit
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
      case 'clear_hold_balance':
        if (!id) {
          return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }

        const customerCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [id]);
        if (customerCheck.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const balanceQuery = 'SELECT hold_balance, amtlimit, cst_limit FROM customer_balances WHERE com_id = ?';
        const balance = await executeQuery(balanceQuery, [id]);
        
        if (balance.length === 0) {
          return NextResponse.json({ error: 'Customer balance not found' }, { status: 404 });
        }

        const { hold_balance, amtlimit, cst_limit } = balance[0];
        const currentHoldBalance = parseFloat(hold_balance) || 0;
        const currentAmtLimit = parseFloat(amtlimit) || 0;
        const currentCstLimit = parseFloat(cst_limit) || 0;
        
        if (currentHoldBalance > 0) {
          // When clearing hold balance, add it back to remaining limit (amtlimit)
          const newAmtLimit = currentAmtLimit + currentHoldBalance;
          const updateQuery = 'UPDATE customer_balances SET amtlimit = ?, hold_balance = 0 WHERE com_id = ?';
          await executeQuery(updateQuery, [newAmtLimit, id]);
          
          // Insert into filling_history with required fields only
          const now = new Date();
          await executeQuery(
            `INSERT INTO filling_history
             (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              "credit_limit_update",
              now,
              newAmtLimit,
              now,
              id,
              1, // created_by (you can get from session/auth)
              now,
              currentHoldBalance,
              0,
              "increase",
            ]
          );
          
          return NextResponse.json({ message: 'Holding balance cleared successfully' });
        } else {
          return NextResponse.json({ error: 'Hold balance is already 0' }, { status: 400 });
        }

      case 'update_balance':
        const { balance_type, amount, operation } = data;
        
        if (!id || !balance_type || !amount || !operation) {
          return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const custCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [id]);
        if (custCheck.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const currentBalanceQuery = 'SELECT cst_limit, amtlimit, hold_balance FROM customer_balances WHERE com_id = ?';
        const currentBalance = await executeQuery(currentBalanceQuery, [id]);
        
        if (currentBalance.length === 0) {
          return NextResponse.json({ error: 'Customer balance not found' }, { status: 404 });
        }

        const existingCstLimit = parseFloat(currentBalance[0].cst_limit) || 0;
        const existingAmtLimit = parseFloat(currentBalance[0].amtlimit) || 0;
        const existingHoldBalance = parseFloat(currentBalance[0].hold_balance) || 0;
        const amountNum = parseFloat(amount);

        let updatedCstLimit = existingCstLimit;
        let updatedAmtLimit = existingAmtLimit;
        let updatedHoldBalance = existingHoldBalance;
        let in_amount = 0;
        let d_amount = 0;
        let limit_type = "increase";

        if (balance_type === 'cst_limit') {
          // Update TOTAL LIMIT (cst_limit)
          if (operation === 'increase') {
            updatedCstLimit = existingCstLimit + amountNum;
            // Also increase remaining limit (amtlimit) by same amount
            updatedAmtLimit = existingAmtLimit + amountNum;
            in_amount = amountNum;
            limit_type = "increase";
          } else if (operation === 'decrease') {
            // ALLOW NEGATIVE VALUES - NO VALIDATION
            updatedCstLimit = existingCstLimit - amountNum;
            // Also decrease remaining limit (amtlimit) by same amount
            updatedAmtLimit = existingAmtLimit - amountNum;
            d_amount = amountNum;
            limit_type = "decrease";
          } else if (operation === 'set') {
            const difference = amountNum - existingCstLimit;
            updatedCstLimit = amountNum;
            // Adjust remaining limit accordingly
            updatedAmtLimit = existingAmtLimit + difference;
            if (difference >= 0) {
              in_amount = difference;
              limit_type = "increase";
            } else {
              d_amount = Math.abs(difference);
              limit_type = "decrease";
            }
          }
        } else if (balance_type === 'amtlimit') {
          // Update REMAINING LIMIT (amtlimit) only
          if (operation === 'increase') {
            updatedAmtLimit = existingAmtLimit + amountNum;
            in_amount = amountNum;
            limit_type = "increase";
          } else if (operation === 'decrease') {
            // ALLOW NEGATIVE VALUES - NO VALIDATION
            updatedAmtLimit = existingAmtLimit - amountNum;
            d_amount = amountNum;
            limit_type = "decrease";
          } else if (operation === 'set') {
            updatedAmtLimit = amountNum;
            const difference = amountNum - existingAmtLimit;
            if (difference >= 0) {
              in_amount = difference;
              limit_type = "increase";
            } else {
              d_amount = Math.abs(difference);
              limit_type = "decrease";
            }
          }
        } else if (balance_type === 'hold_balance') {
          if (operation === 'increase') {
            updatedHoldBalance = existingHoldBalance + amountNum;
            in_amount = amountNum;
            limit_type = "increase";
          } else if (operation === 'decrease') {
            if (existingHoldBalance < amountNum) {
              return NextResponse.json({ error: 'Insufficient hold balance to decrease' }, { status: 400 });
            }
            updatedHoldBalance = existingHoldBalance - amountNum;
            d_amount = amountNum;
            limit_type = "decrease";
          } else if (operation === 'set') {
            updatedHoldBalance = amountNum;
            const difference = amountNum - existingHoldBalance;
            if (difference >= 0) {
              in_amount = difference;
              limit_type = "increase";
            } else {
              d_amount = Math.abs(difference);
              limit_type = "decrease";
            }
          }
        }

        const updateBalanceQuery = 'UPDATE customer_balances SET cst_limit = ?, amtlimit = ?, hold_balance = ? WHERE com_id = ?';
        await executeQuery(updateBalanceQuery, [updatedCstLimit, updatedAmtLimit, updatedHoldBalance, id]);

        // Insert into filling_history with required fields only
        const now = new Date();
        await executeQuery(
          `INSERT INTO filling_history
           (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            "credit_limit_update",
            now,
            updatedAmtLimit,
            now,
            id,
            1, // created_by (you can get from session/auth)
            now,
            in_amount,
            d_amount,
            limit_type,
          ]
        );

        return NextResponse.json({ 
          message: 'Balance updated successfully',
          newCstLimit: updatedCstLimit,
          newAmtLimit: updatedAmtLimit,
          newHoldBalance: updatedHoldBalance
        });

      case 'update_billing_type':
        const { billing_type, credit_days } = data;
        
        if (!id || billing_type === undefined) {
          return NextResponse.json({ error: 'Customer ID and billing type are required' }, { status: 400 });
        }

        const billingCustCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [id]);
        if (billingCustCheck.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        if (credit_days !== undefined) {
          await executeQuery(
            'UPDATE customers SET billing_type = ?, credit_days = ? WHERE id = ?', 
            [billing_type, credit_days, id]
          );
        } else {
          await executeQuery(
            'UPDATE customers SET billing_type = ? WHERE id = ?', 
            [billing_type, id]
          );
        }
        
        return NextResponse.json({ message: 'Billing type updated successfully' });

      case 'update_credit_days':
        const { credit_days: new_credit_days } = data;
        
        if (!id || !new_credit_days) {
          return NextResponse.json({ error: 'Customer ID and credit days are required' }, { status: 400 });
        }

        const creditCustCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [id]);
        if (creditCustCheck.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        await executeQuery(
          'UPDATE customers SET credit_days = ? WHERE id = ?', 
          [new_credit_days, id]
        );
        
        return NextResponse.json({ message: 'Credit days updated successfully' });

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