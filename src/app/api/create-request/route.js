import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Fetch ONLY 4 specific product codes for dropdown
    const rows = await executeQuery(
      `SELECT 
        pc.id, 
        pc.pcode, 
        pc.product_id,
        p.pname as product_name
       FROM product_codes pc
       LEFT JOIN products p ON pc.product_id = p.id
       WHERE pc.product_id IN (2, 3, 4, 5)
       ORDER BY pc.product_id, pc.pcode`
    );

    console.log('📦 Product codes fetched (4 specific products):', rows.length);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customer,
      product_id,
      products_codes,
      station_id,
      vehicle_no,
      driver_no,
      request_type,
      qty,
      aqty,
      remarks
    } = body;

    // Get current user info
    let userId = null;
    let userName = 'Unknown User';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const userResult = await executeQuery(
            'SELECT name FROM employee_profile WHERE id = ?',
            [userId]
          );
          if (userResult.length > 0) {
            userName = userResult[0].name || 'Unknown User';
          } else {
            // Check if it's admin role
            if (decoded.role === 5) {
              userName = 'Admin';
            }
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user for create-request:', authError);
    }

    // Get next RID
    const ridResult = await executeQuery('SELECT MAX(rid) as max_rid FROM filling_requests');
    const nextRID = (ridResult[0]?.max_rid || 0) + 1;
    
    // Get current date
    const currentDate = new Date().toISOString().split('T')[0];

    // Insert into filling_requests table
    const result = await executeQuery(
      `INSERT INTO filling_requests (
        rid, fl_id, fs_id, vehicle_number, driver_number, rtype, qty, aqty, 
        created, cid, status, remark, product
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextRID, parseInt(products_codes), parseInt(station_id),
        vehicle_no, driver_no, request_type, parseFloat(qty), parseFloat(qty),
        currentDate, parseInt(customer), 'Pending', remarks || '', ''
      ]
    );

    if (result.affectedRows > 0) {
      // Create filling_logs entry with created_by
      try {
        await executeQuery(
          `INSERT INTO filling_logs (request_id, created_by, created_date) VALUES (?, ?, ?)`,
          [nextRID, userId || 1, currentDate]
        );
        console.log('✅ Filling logs entry created with created_by:', userId, userName);
      } catch (logError) {
        console.error('⚠️ Error creating filling logs:', logError);
        // Don't fail the request if log creation fails
      }

      // Create Audit Log
      try {
        const { createAuditLog } = await import('@/lib/auditLog');
        await createAuditLog({
          page: 'Create Request',
          uniqueCode: nextRID,
          section: 'Request Management',
          userId: userId,
          userName: userName,
          action: 'created by',
          remarks: `Filling request created: ${nextRID} for customer ${customer}, quantity ${qty}`,
          oldValue: null,
          newValue: {
            rid: nextRID,
            customer_id: customer,
            product_id: product_id,
            station_id: station_id,
            quantity: qty,
            created_by: userName
          },
          recordType: 'filling_request',
          recordId: nextRID
        });
      } catch (auditError) {
        console.error('⚠️ Error creating audit log:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Request created successfully',
        rid: nextRID,
        created_by: userName
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create request'
    }, { status: 500 });

  } catch (error) {
    console.error("❌ POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}