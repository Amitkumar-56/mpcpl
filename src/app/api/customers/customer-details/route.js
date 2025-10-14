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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('Fetching customer details for ID:', id);

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Fetch customer details
    const customerQuery = `
      SELECT c.*, cb.hold_balance, cb.amtlimit 
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
        const productQuery = `SELECT pname FROM product WHERE id IN (${placeholders})`;
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

    const responseData = {
      customer: {
        ...customer[0],
        productNames,
        blockLocations,
        dealPrices: dealPricesWithNames,
        users,
        logs: logData,
        hold_balance: customer[0].hold_balance || 0,
        amtlimit: customer[0].amtlimit || 0
      }
    };

    console.log('Successfully fetched customer details');
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

    console.log('Processing POST action:', action, 'for ID:', id);

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'clear_hold_balance':
        if (!id) {
          return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }

        // Check if customer exists
        const customerCheck = await executeQuery('SELECT id FROM customers WHERE id = ?', [id]);
        if (customerCheck.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Fetch current balance
        const balanceQuery = 'SELECT hold_balance, amtlimit FROM customer_balances WHERE com_id = ?';
        const balance = await executeQuery(balanceQuery, [id]);
        
        if (balance.length === 0) {
          return NextResponse.json({ error: 'Customer balance not found' }, { status: 404 });
        }

        const { hold_balance, amtlimit } = balance[0];
        const currentHoldBalance = parseFloat(hold_balance) || 0;
        const currentAmtLimit = parseFloat(amtlimit) || 0;
        
        if (currentHoldBalance > 0) {
          const newAmtLimit = currentAmtLimit + currentHoldBalance;
          const updateQuery = 'UPDATE customer_balances SET amtlimit = ?, hold_balance = 0 WHERE com_id = ?';
          await executeQuery(updateQuery, [newAmtLimit, id]);
          return NextResponse.json({ message: 'Holding balance cleared successfully' });
        } else {
          return NextResponse.json({ error: 'Hold balance is already 0' }, { status: 400 });
        }

      case 'add_user':
        const { com_id, name, phone, email, password } = data;
        
        // Validate required fields
        if (!com_id || !name || !phone || !email || !password) {
          return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // Check if parent customer exists
        const parentQuery = 'SELECT status, product, blocklocation FROM customers WHERE id = ?';
        const parent = await executeQuery(parentQuery, [com_id]);
        
        if (parent.length === 0) {
          return NextResponse.json({ error: 'Parent customer not found' }, { status: 404 });
        }

        // Check if user already exists with same email or phone
        const existingUser = await executeQuery(
          'SELECT id FROM customers WHERE email = ? OR phone = ?', 
          [email, phone]
        );
        
        if (existingUser.length > 0) {
          return NextResponse.json({ error: 'User with this email or phone already exists' }, { status: 400 });
        }

        const { status, product, blocklocation } = parent[0];
        const hashedPassword = await hashPassword(password);
        
        const insertUserQuery = `
          INSERT INTO customers (com_id, roleid, name, phone, email, password, status, product, blocklocation) 
          VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await executeQuery(insertUserQuery, [
          com_id, 
          name, 
          phone, 
          email, 
          hashedPassword, 
          status, 
          product, 
          blocklocation
        ]);
        
        return NextResponse.json({ message: 'User added successfully' });

      case 'update_password':
        const { userId, newPassword } = data;
        
        if (!userId || !newPassword) {
          return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 });
        }

        // Check if user exists
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

        // Check if user exists
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