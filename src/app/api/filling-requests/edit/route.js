import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    console.log('🔍 Fetching request with ID:', id);
    
    const query = `
      SELECT 
        fr.*, 
        c.name as customer_name, 
        c.phone as customer_phone,
        fs.station_name as loading_station,
        pc.pcode as product_name,
        ep.name as updated_by_name,
        cb.amtlimit as customer_balance
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN product_codes pc ON pc.id = fr.fl_id
      LEFT JOIN employee_profile ep ON ep.id = fr.status_updated_by
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      WHERE fr.id = ?
    `;

    const requestData = await executeQuery(query, [id]);
    
    console.log('📦 Database result:', requestData);
    
    if (requestData.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: requestData[0] });
  } catch (error) {
    console.error('❌ Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status, qty, vehicle_number, driver_number, remark } = body;

    console.log('💾 Updating request:', { id, ...body });

    // Check if request exists
    const checkQuery = "SELECT * FROM filling_requests WHERE id = ?";
    const existingRequest = await executeQuery(checkQuery, [id]);
    
    if (existingRequest.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    let updateQuery = "UPDATE filling_requests SET ";
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push("status = ?");
      updateParams.push(status);
      
      // If status is being updated to Completed, set completed_date
      if (status === "Completed") {
        updateFields.push("completed_date = NOW()");
      }
    }

    if (qty !== undefined) {
      updateFields.push("qty = ?");
      updateFields.push("aqty = ?"); // Also update aqty
      updateParams.push(parseFloat(qty));
      updateParams.push(parseFloat(qty));
    }

    if (vehicle_number) {
      updateFields.push("vehicle_number = ?");
      updateParams.push(vehicle_number);
    }

    if (driver_number) {
      updateFields.push("driver_number = ?");
      updateParams.push(driver_number);
    }

    if (remark !== undefined) {
      updateFields.push("remark = ?");
      updateParams.push(remark);
    }

    // Add updated timestamp
    updateFields.push("updated = NOW()");

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateQuery += updateFields.join(", ");
    updateQuery += " WHERE id = ?";
    updateParams.push(id);

    console.log('📝 Update query:', updateQuery);
    console.log('📝 Update params:', updateParams);

    const result = await executeQuery(updateQuery, updateParams);

    console.log('✅ Update result:', result);

    if (result.affectedRows > 0) {
      // Get user info for audit log
      let userId = null;
      let userName = 'System';
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            const users = await executeQuery(
              `SELECT id, name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name;
            }
          }
        }
      } catch (userError) {
        console.error('Error getting user info:', userError);
      }

      // Create audit log
      const oldRequest = existingRequest[0];
      const newRequest = { ...oldRequest, ...body };
      
      await createAuditLog({
        page: 'Filling Requests',
        uniqueCode: `REQUEST-${id}`,
        section: 'Edit Request',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Filling request updated: ${oldRequest.rid || id}`,
        oldValue: oldRequest,
        newValue: newRequest,
        recordType: 'filling_request',
        recordId: parseInt(id)
      });

      return NextResponse.json({ 
        success: true, 
        message: "Request updated successfully" 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to update request" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ PUT API Error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error.message 
    }, { status: 500 });
  }
}