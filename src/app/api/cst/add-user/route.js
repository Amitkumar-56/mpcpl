// src/app/api/cst/add-user/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// Helper function to get logged-in user ID
async function getLoggedInUserId(request) {
  try {
    const userIdFromHeader = request.headers.get('x-user-id');
    if (userIdFromHeader) {
      return parseInt(userIdFromHeader);
    }

    // Temporary: Development के लिए
    console.log('⚠️ Using default user ID 1 for development');
    return 1;

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

    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      console.log('❌ Missing fields:', { name, email, phone, password });
      return NextResponse.json({ 
        success: false,
        error: 'All fields are required' 
      }, { status: 400 });
    }

    // Get logged-in user ID
    const loggedInUserId = await getLoggedInUserId(request);
    console.log('👤 Logged in user ID:', loggedInUserId);
    
    if (!loggedInUserId) {
      return NextResponse.json({ 
        success: false,
        error: 'User not authenticated' 
      }, { status: 401 });
    }

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
      password,       // password
      loggedInUserId, // com_id
      roleid,         // roleid = 2
      1               // status = active
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
    const id = searchParams.get('id');
    console.log('📋 Query parameters:', { id });
    
    // Get logged-in user ID
    const loggedInUserId = await getLoggedInUserId(request);
    console.log('👤 Logged in user ID:', loggedInUserId);
    
    if (!loggedInUserId) {
      return NextResponse.json({ 
        success: false,
        error: 'User not authenticated' 
      }, { status: 401 });
    }
    
    if (id) {
      // Single user fetch
      console.log('🔍 Fetching single user with ID:', id);
      const customerQuery = 'SELECT id, name, email, phone, status FROM customers WHERE id = ? AND com_id = ?';
      const customer = await executeQuery(customerQuery, [id, loggedInUserId]);
      
      console.log('👤 Single user result:', customer);
      
      if (customer.length === 0) {
        return NextResponse.json({ 
          success: false,
          error: 'User not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true,
        customer: customer[0] 
      });
    }
    
    // All users fetch - ONLY EXISTING COLUMNS
    console.log('🔍 Fetching all users for com_id:', loggedInUserId);
    const customersQuery = 'SELECT id, name, email, phone, status FROM customers WHERE com_id = ? AND roleid = 2';
    const customers = await executeQuery(customersQuery, [loggedInUserId]);

    console.log('👥 All users result count:', customers.length);

    return NextResponse.json({ 
      success: true,
      customers: customers || []
    });

  } catch (error) {
    console.error('❌ Error in GET /api/cst/add-user:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// PUT - User update करने के लिए
export async function PUT(request) {
  try {
    const { id, name, email, phone } = await request.json();

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

    // Check if target user belongs to current user
    const targetUserQuery = 'SELECT id FROM customers WHERE id = ? AND com_id = ?';
    const targetUser = await executeQuery(targetUserQuery, [id, loggedInUserId]);

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

    // Update user
    const updateQuery = `
      UPDATE customers 
      SET name = ?, email = ?, phone = ?
      WHERE id = ? AND com_id = ?
    `;
    
    await executeQuery(updateQuery, [name, email, phone, id, loggedInUserId]);

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

// DELETE - User delete करने के लिए
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const loggedInUserId = await getLoggedInUserId(request);
    
    if (!loggedInUserId) {
      return NextResponse.json({ 
        success: false,
        error: 'User not authenticated' 
      }, { status: 401 });
    }

    // Check if the target user belongs to current user
    const targetUserQuery = 'SELECT id FROM customers WHERE id = ? AND com_id = ?';
    const targetUser = await executeQuery(targetUserQuery, [id, loggedInUserId]);

    if (targetUser.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found or access denied' 
      }, { status: 404 });
    }

    // Delete the user
    const deleteQuery = 'DELETE FROM customers WHERE id = ? AND com_id = ?';
    await executeQuery(deleteQuery, [id, loggedInUserId]);

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}