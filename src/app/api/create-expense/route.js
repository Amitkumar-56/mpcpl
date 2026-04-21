import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Ensure expenses table exists and has all columns
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          payment_date DATE NOT NULL,
          title VARCHAR(255) NOT NULL,
          details TEXT,
          paid_to VARCHAR(255) NOT NULL,
          reason TEXT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          receiver_vendor_id INT NULL,
          is_receiver_from_dropdown TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Ensure missing columns exist in expenses table (for existing tables)
      try {
        await executeQuery(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receiver_vendor_id INT NULL`);
        await executeQuery(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_receiver_from_dropdown TINYINT(1) DEFAULT 0`);
      } catch (colError) {
        // Skip if columns already exist or MySQL version doesn't support IF NOT EXISTS in ALTER
        console.warn('Note: Could not add columns to expenses table automatically:', colError.message);
      }
    } catch (tableError) {
      console.error('Error creating expenses table:', tableError);
    }

    // Ensure cash_balance table exists
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS cash_balance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          balance DECIMAL(12,2) DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Initialize cash balance if empty
      await executeQuery(`INSERT IGNORE INTO cash_balance (id, balance) VALUES (1, 100000)`);
    } catch (balanceTableError) {
      console.error('Error creating cash_balance table:', balanceTableError);
    }

    // Ensure vendors table has amount column
    try {
      await executeQuery(`
        ALTER TABLE vendors ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 0.00
      `);
    } catch (vendorColumnError) {
      // Ignore if column already exists or table doesn't exist yet
      console.error('Error adding amount column to vendors:', vendorColumnError);
    }

    // Ensure vendor_transactions table exists and has all columns
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS vendor_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vendor_id INT NOT NULL,
          customer_name VARCHAR(255),
          reverse_name VARCHAR(255),
          amount DECIMAL(10,2) NOT NULL,
          transaction_date DATE NOT NULL,
          transaction_type ENUM('credit', 'debit') NOT NULL,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Ensure missing columns exist in vendor_transactions (for existing tables)
      try {
        await executeQuery(`ALTER TABLE vendor_transactions ADD COLUMN IF NOT EXISTS transaction_type ENUM('credit', 'debit') NOT NULL DEFAULT 'debit'`);
        await executeQuery(`ALTER TABLE vendor_transactions ADD COLUMN IF NOT EXISTS reverse_name VARCHAR(255)`);
        await executeQuery(`ALTER TABLE vendor_transactions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)`);
      } catch (colError) {
        console.warn('Note: Could not add columns to vendor_transactions automatically:', colError.message);
      }
    } catch (transTableError) {
      console.error('Error creating vendor_transactions table:', transTableError);
    }

    const formData = await request.json();
    console.log('Incoming expense data:', formData);
    
    // Extract and validate form data
    const { 
      payment_date, 
      title, 
      details, 
      paid_to, 
      reason, 
      amount, 
      vendor_id,
      receiver_vendor_id,
      is_receiver_from_dropdown 
    } = formData;

    // Validate required fields
    if (!payment_date || !title || !paid_to || !reason || !amount) {
      console.error('Validation failed: Missing required fields');
      return NextResponse.json(
        { error: 'All fields are required (date, title, receiver, reason, amount)' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('Validation failed: Invalid amount', amount);
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const { executeTransaction } = await import('@/lib/db');

    return await executeTransaction(async (connection) => {
      // 1. Get current balance for logging
      console.log('Step 1: Fetching current balance...');
      const [currentBalanceResult] = await connection.execute('SELECT balance FROM cash_balance WHERE id = 1');
      const currentBalance = currentBalanceResult?.balance || 0;
      console.log('Current balance was:', currentBalance);

      // Note: Insufficient balance check removed as requested. 
      // The transaction will proceed even if balance is low.

      // 2. Insert expense record
      console.log('Step 2: Inserting expense record...');
      const expenseQuery = `
        INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount, receiver_vendor_id, is_receiver_from_dropdown) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [expenseResult] = await connection.execute(expenseQuery, [
        payment_date,
        title,
        details || '',
        paid_to,
        reason,
        amountNum,
        receiver_vendor_id || null,
        is_receiver_from_dropdown ? 1 : 0
      ]);

      const expenseId = expenseResult.insertId;
      console.log('Expense inserted with ID:', expenseId);

      // 3. Update cash balance (Deduct from main pool)
      console.log('Step 3: Updating cash balance...');
      const updateBalanceQuery = `
        UPDATE cash_balance 
        SET balance = COALESCE(balance, 0) - ?, updated_at = NOW()
        WHERE id = 1
      `;
      await connection.execute(updateBalanceQuery, [amountNum]);

      // 4. Handle parking vendor logic (Deduct from parking)
      if (vendor_id && vendor_id !== '') {
        console.log(`Step 4: Handling parking vendor ${vendor_id}...`);
        
        // Update vendor amount (deduct)
        await connection.execute(
          'UPDATE vendors SET amount = COALESCE(amount, 0) - ?, updated_at = NOW() WHERE id = ?',
          [amountNum, vendor_id]
        );

        // Get current user ID for transactions
        let currentUserId = null;
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get('token')?.value;
          if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
              currentUserId = decoded.userId || decoded.id;
            }
          }
        } catch (e) {}

        // Insert record into vendor_transactions table for parking vendor (Debit)
        await connection.execute(
          'INSERT INTO vendor_transactions (vendor_id, customer_name, reverse_name, amount, transaction_date, created_by, transaction_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [vendor_id, title, paid_to, amountNum, payment_date, currentUserId, 'debit']
        );
      }

      // 5. Handle receiver vendor logic (Add amount to receiver)
      if ((is_receiver_from_dropdown || receiver_vendor_id) && receiver_vendor_id && receiver_vendor_id !== '') {
        console.log(`Step 5: Handling receiver vendor ${receiver_vendor_id}...`);
        
        // Update receiver vendor amount (add)
        await connection.execute(
          'UPDATE vendors SET amount = COALESCE(amount, 0) + ?, updated_at = NOW() WHERE id = ?',
          [amountNum, receiver_vendor_id]
        );

        // Get current user ID
        let currentUserId = null;
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get('token')?.value;
          if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
              currentUserId = decoded.userId || decoded.id;
            }
          }
        } catch (e) {}

        // Insert record into vendor_transactions table for receiver vendor (Credit)
        await connection.execute(
          'INSERT INTO vendor_transactions (vendor_id, customer_name, reverse_name, amount, transaction_date, created_by, transaction_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [receiver_vendor_id, title, paid_to, amountNum, payment_date, currentUserId, 'credit']
        );
      }

      // 6. Get new balance for response
      const [newBalanceResult] = await connection.execute('SELECT balance FROM cash_balance WHERE id = 1');
      const newBalance = newBalanceResult?.balance || 0;

      // Create Audit Log
      try {
        let userId = null;
        let userName = null;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            const users = await executeQuery(`SELECT name FROM employee_profile WHERE id = ?`, [userId]);
            if (users.length > 0) userName = users[0].name || null;
          }
        }

        await createAuditLog({
          page: 'Expenses',
          uniqueCode: expenseId.toString(),
          section: 'Expense Management',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: `Expense created: ${title} - ₹${amountNum}`,
          oldValue: null,
          newValue: { expense_id: expenseId, title, amount: amountNum, parking_vendor: vendor_id, receiver_vendor: receiver_vendor_id },
          recordType: 'expense',
          recordId: expenseId
        });
      } catch (auditError) {
        console.error('Audit log failed (non-critical):', auditError.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Expense created and balances updated successfully!',
        expenseId: expenseId,
        newBalance: newBalance
      });
    }).catch(error => {
      console.error('Transaction Failed:', error);
      return NextResponse.json(
        { 
          error: error.message || 'Failed to create expense',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    });

  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json(
      { 
        error: 'Critical server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// PUT - Update vendor balance manually
export async function PUT(request) {
  try {
    const data = await request.json();
    const { action, vendor_id, amount, reason } = data;

    if (action === 'update_vendor_balance') {
      if (!vendor_id || amount === undefined) {
        return NextResponse.json({ error: 'Vendor ID and amount are required' }, { status: 400 });
      }

      const query = 'UPDATE vendors SET amount = ?, updated_at = NOW() WHERE id = ?';
      await executeQuery(query, [amount, vendor_id]);

      // Log the manual update
      await createAuditLog({
        page: 'Vendors',
        uniqueCode: vendor_id.toString(),
        section: 'Balance Adjustment',
        action: 'edit',
        remarks: `Manual balance update for vendor ${vendor_id} to ₹${amount}. Reason: ${reason || 'Not specified'}`,
        newValue: { amount },
        recordType: 'vendor',
        recordId: vendor_id
      });

      return NextResponse.json({ success: true, message: 'Vendor balance updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const balanceQuery = 'SELECT balance FROM cash_balance WHERE id = 1';
    const balanceResult = await executeQuery(balanceQuery);
    
    let currentBalance = 0;
    
    if (balanceResult.length > 0) {
      currentBalance = balanceResult[0].balance || 0;
    } else {
      // Initialize cash_balance if empty
      await executeQuery('INSERT INTO cash_balance (balance) VALUES (100000)');
      currentBalance = 100000;
    }

    return NextResponse.json({
      success: true,
      data: {
        currentBalance: currentBalance
      }
    });

  } catch (error) {
    console.error('Error fetching balance data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch balance data'
      },
      { status: 500 }
    );
  }
}