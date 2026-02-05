// src/app/api/cst/add-user/route.js
import { executeQuery } from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

// Helper function to get logged-in user ID
async function getLoggedInUserId(request) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    if (userIdFromHeader) {
      return parseInt(userIdFromHeader);
    }

    // Get from session storage for customer login
    // For now, return the logged-in customer's ID directly
    // In production, this should come from proper authentication
    console.log('⚠️ Using customer session - implement proper auth in production');
    return null; // We'll handle this in the main function

  } catch (error) {
    console.error('❌ Error getting user ID:', error);
    return null;
  }
}

// POST - New user add करने के लिए
export async function POST(request) {
  console.log('🚀 POST /api/cst/add-user called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body received:', body);

    const { name, email, phone, password, customerId } = body;

    if (!name || !email || !phone || !password) {
      console.log('❌ Missing fields:', { name, email, phone, password });
      return NextResponse.json({ 
        success: false,
        error: 'All fields are required' 
      }, { status: 400 });
    }

    // Get logged-in customer ID - use customerId from request or get from auth
    let loggedInUserId = customerId;
    
    // If not in request body, try to get from auth headers
    if (!loggedInUserId) {
      loggedInUserId = await getLoggedInUserId(request);
    }
    
    // If still null, try to get from session/customer token
    if (!loggedInUserId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Here you should decode the token to get customer ID
        // For now, we'll use a fallback
        console.log('� Found auth token, but token decoding not implemented');
      }
      
      // Last resort - check if there's a customer session
      // This should come from proper session management
      console.log('⚠️ No customer ID found - implement proper session management');
      return NextResponse.json({ 
        success: false,
        error: 'Customer authentication required' 
      }, { status: 401 });
    }

    console.log('👤 Logged in customer ID:', loggedInUserId);
    
    // Use logged-in customer's ID as com_id for new user
    const customerComId = loggedInUserId;
    console.log('🏢 Using customer ID as com_id for new user:', customerComId);

    const roleid = 2;

    // Check if phone already exists
    console.log('🔍 Checking if phone exists:', phone);
    const existingUser = await executeQuery(
      'SELECT id FROM customers WHERE phone = ?',
      [phone]
    );

    console.log('📱 Phone check result:', existingUser);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Phone number already exists' 
      }, { status: 400 });
    }

    // Check if email already exists
    console.log('🔍 Checking if email exists:', email);
    const existingEmail = await executeQuery(
      'SELECT id FROM customers WHERE email = ?',
      [email]
    );

    console.log('📧 Email check result:', existingEmail);

    if (existingEmail.length > 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Email already exists' 
      }, { status: 400 });
    }

    // Hash password with SHA256
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Insert new user - ONLY EXISTING COLUMNS
    console.log('💾 Inserting new user...');
    const insertQuery = `
      INSERT INTO customers (
        name, email, phone, password, com_id, roleid, status
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery(insertQuery, [
      name,           // name
      email,          // email
      phone,          // phone
      hashedPassword, // password (hashed)
      customerComId,  // com_id (from logged-in customer)
      roleid,         // roleid
      1               // status (active by default)
    ]);

    console.log('✅ User inserted successfully, ID:', result.insertId);

    return NextResponse.json({ 
      success: true,
      message: 'User added successfully',
      id: result.insertId 
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error in POST /api/cst/add-user:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET - All users fetch करने के लिए
export async function GET(request) {
  console.log('🚀 GET /api/cst/add-user called');
  
  try {
    const { searchParams } = new URL(request.url);
    const comId = searchParams.get('com_id');
    
    console.log('📋 Query parameters - com_id:', comId);
    
    if (!comId) {
      return NextResponse.json({ 
        success: false,
        error: 'com_id parameter आवश्यक है' 
      }, { status: 400 });
    }
    
    // सिर्फ com_id के आधार पर सभी users fetch करें
    console.log(`🔍 Fetching all users for com_id: ${comId}`);
    
    const customersQuery = 'SELECT * FROM customers WHERE com_id = ? ORDER BY id DESC';
    const customers = await executeQuery(customersQuery, [comId]);

    console.log('👥 Users found:', customers.length);

    return NextResponse.json({ 
      success: true,
      customers: customers || [],
      totalCount: customers.length,
      comId: comId
    });

  } catch (error) {
    console.error('❌ Error in GET /api/cst/add-user:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'आंतरिक सर्वर त्रुटि' 
    }, { status: 500 });
  }
}

// PUT - User update करने के लिए
export async function PUT(request) {
  try {
    const { id, name, email, phone, password } = await request.json();

    if (!id || !name || !email || !phone) {
      return NextResponse.json({ 
        success: false,
        error: 'All fields are required' 
      }, { status: 400 });
    }

    const loggedInUserId = await getLoggedInUserId(request);
    
    if (!loggedInUserId) {
      return NextResponse.json({ 
        success: false,
        error: 'User not authenticated' 
      }, { status: 401 });
    }

    // Get logged-in customer's com_id
    const customerQuery = 'SELECT com_id FROM customers WHERE id = ?';
    const customerResult = await executeQuery(customerQuery, [loggedInUserId]);
    
    if (customerResult.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer not found' 
      }, { status: 404 });
    }
    
    const customerComId = customerResult[0].com_id;

    // Check if target user belongs to current user's company
    const targetUserQuery = 'SELECT id FROM customers WHERE id = ? AND com_id = ?';
    const targetUser = await executeQuery(targetUserQuery, [id, customerComId]);

    if (targetUser.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found or access denied' 
      }, { status: 404 });
    }

    // Check if new phone already exists (other than current user)
    const existingPhone = await executeQuery(
      'SELECT id FROM customers WHERE phone = ? AND id != ?',
      [phone, id]
    );

    if (existingPhone.length > 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Phone number already exists' 
      }, { status: 400 });
    }

    // Check if new email already exists (other than current user)
    const existingEmail = await executeQuery(
      'SELECT id FROM customers WHERE email = ? AND id != ?',
      [email, id]
    );

    if (existingEmail.length > 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Email already exists' 
      }, { status: 400 });
    }

    let updateQuery;
    let params;
    if (password && password.length >= 6) {
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      updateQuery = `
        UPDATE customers 
        SET name = ?, email = ?, phone = ?, password = ?
        WHERE id = ? AND com_id = ?
      `;
      params = [name, email, phone, hashedPassword, id, customerComId];
    } else {
      updateQuery = `
        UPDATE customers 
        SET name = ?, email = ?, phone = ?
        WHERE id = ? AND com_id = ?
      `;
      params = [name, email, phone, id, customerComId];
    }
    
    await executeQuery(updateQuery, params);

    return NextResponse.json({ 
      success: true,
      message: 'User updated successfully' 
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}


