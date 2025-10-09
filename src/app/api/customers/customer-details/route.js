import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

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
    const productIds = customer[0].product?.split(',') || [];
    let productNames = [];
    
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const productQuery = `SELECT pname FROM product WHERE id IN (${placeholders})`;
      const products = await query(productQuery, productIds);
      productNames = products.map(p => p.pname);
    }

    // Fetch block locations
    const blockLocationIds = customer[0].blocklocation?.split(',') || [];
    let blockLocations = [];
    
    if (blockLocationIds.length > 0) {
      const placeholders = blockLocationIds.map(() => '?').join(',');
      const locationQuery = `SELECT station_name FROM filling_stations WHERE id IN (${placeholders})`;
      blockLocations = await query(locationQuery, blockLocationIds);
    }

    // Fetch deal prices
    const dealPrices = customer[0].deal_price ? JSON.parse(customer[0].deal_price) : {};
    const dealPricesWithNames = [];

    for (const [stationId, price] of Object.entries(dealPrices)) {
      if (price) {
        const stationQuery = 'SELECT station_name FROM filling_stations WHERE id = ?';
        const station = await query(stationQuery, [stationId]);
        if (station.length > 0) {
          dealPricesWithNames.push({
            stationName: station[0].station_name,
            price: price
          });
        }
      }
    }

    // Fetch sub-users
    const usersQuery = 'SELECT id, name, email, phone FROM customers WHERE com_id = ?';
    const users = await executeQuery(usersQuery, [id]);

    // Fetch activity logs
    const logQuery = 'SELECT * FROM filling_logs WHERE request_id = ?';
    const logs = await executeQuery(logQuery, [customer[0].rid]);

    const logData = {
      Created: { name: '', date: '' },
      Processed: { name: '', date: '' },
      Completed: { name: '', date: '' },
      Cancelled: { name: '', date: '' }
    };

    for (const log of logs) {
      if (log.created_by) {
        const creator = await executeQuery('SELECT name FROM customers WHERE id = ?', [log.created_by]);
        logData.Created = {
          name: creator[0]?.name || 'Unknown',
          date: new Date(log.created_date).toLocaleString('en-IN')
        };
      }

      if (log.processed_by) {
        const processor = await executeQuery('SELECT name FROM employee_profile WHERE id = ?', [log.processed_by]);
        logData.Processed = {
          name: processor[0]?.name || 'Unknown',
          date: new Date(log.processed_date).toLocaleString('en-IN')
        };
      }

      if (log.completed_by) {
        const completer = await executeQuery('SELECT name FROM employee_profile WHERE id = ?', [log.completed_by]);
        logData.Completed = {
          name: completer[0]?.name || 'Unknown',
          date: new Date(log.completed_date).toLocaleString('en-IN')
        };
      }

      if (log.cancelled_by) {
        const canceller = await executeQuery('SELECT name FROM employee_profile WHERE id = ?', [log.cancelled_by]);
        logData.Cancelled = {
          name: canceller[0]?.name || 'Unknown',
          date: new Date(log.cancelled_date).toLocaleString('en-IN')
        };
      }
    }

    return NextResponse.json({
      customer: {
        ...customer[0],
        productNames,
        blockLocations: blockLocations.map(l => l.station_name),
        dealPrices: dealPricesWithNames,
        users,
        logs: logData
      }
    });

  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    switch (action) {
      case 'clear_hold_balance':
        // Fetch current balance
        const balanceQuery = 'SELECT hold_balance, amtlimit FROM customer_balances WHERE com_id = ?';
        const balance = await query(balanceQuery, [id]);
        
        if (balance.length === 0) {
          return NextResponse.json({ error: 'Customer balance not found' }, { status: 404 });
        }

        const { hold_balance, amtlimit } = balance[0];
        
        if (hold_balance > 0) {
          const newAmtLimit = amtlimit + hold_balance;
          const updateQuery = 'UPDATE customer_balances SET amtlimit = ?, hold_balance = 0 WHERE com_id = ?';
          await query(updateQuery, [newAmtLimit, id]);
          return NextResponse.json({ message: 'Holding balance cleared successfully' });
        } else {
          return NextResponse.json({ error: 'Hold balance is already 0' }, { status: 400 });
        }

      case 'add_user':
        const { com_id, name, phone, email, password } = data;
        
        // Fetch parent customer data
        const parentQuery = 'SELECT status, product, blocklocation FROM customers WHERE id = ?';
        const parent = await executeQuery(parentQuery, [com_id]);
        
        if (parent.length === 0) {
          return NextResponse.json({ error: 'Parent customer not found' }, { status: 404 });
        }

        const { status, product, blocklocation } = parent[0];
        const hashedPassword = await hashPassword(password);
        
        const insertUserQuery = `
          INSERT INTO customers (com_id, roleid, name, phone, email, password, status, product, blocklocation) 
          VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await executeQuery(insertUserQuery, [com_id, name, phone, email, hashedPassword, status, product, blocklocation]);
        return NextResponse.json({ message: 'User added successfully' });

      case 'update_password':
        const { userId, newPassword } = data;
        const hashedNewPassword = await hashPassword(newPassword);
        
        await executeQuery('UPDATE customers SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
        return NextResponse.json({ message: 'Password updated successfully' });

      case 'delete_user':
        await executeQuery('DELETE FROM customers WHERE id = ?', [data.userId]);
        return NextResponse.json({ message: 'User deleted successfully' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function hashPassword(password) {
  // Implement your password hashing logic here
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}