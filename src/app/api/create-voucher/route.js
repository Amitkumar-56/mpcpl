import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { createEntityLog } from '@/lib/entityLogs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET endpoint for fetching form data
export async function GET(request) {
  try {
    // Fetch stations
    const stationsQuery = `
      SELECT id, station_name 
      FROM filling_stations 
      WHERE status = 1 
      ORDER BY station_name
    `;

    // Fetch employees
    const employeesQuery = `
      SELECT id, name, emp_code, phone
      FROM employee_profile 
      WHERE status = 1 
      ORDER BY name ASC
    `;

    // Execute queries
    const stationsResult = await executeQuery(stationsQuery);
    const employeesResult = await executeQuery(employeesQuery);

    // Process results
    const stations = Array.isArray(stationsResult) ? stationsResult : [];
    const employees = Array.isArray(employeesResult) ? employeesResult : [];

    // Format employees for dropdown
    const formattedEmployees = employees.map(emp => ({
      id: emp.id.toString(),
      name: emp.name || emp.emp_code || `Employee ${emp.id}`,
      emp_code: emp.emp_code || '',
      phone: emp.phone || ''
    }));

    return NextResponse.json({
      success: true,
      stations: stations,
      employees: formattedEmployees
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch form data',
        stations: [],
        employees: []
      },
      { status: 500 }
    );
  }
}

// POST endpoint for creating voucher
export async function POST(request) {
  try {
    const formData = await request.formData();

    // Parse form data
    const exp_date = formData.get('exp_date');
    const employee_id = formData.get('employee_id');
    const driver_phone = formData.get('driver_phone');
    const vehicle_no = formData.get('vehicle_no');
    const station_id = formData.get('station_id');
    const advance = parseFloat(formData.get('advance')) || 0;
    const total_expense = parseFloat(formData.get('total_expense')) || 0;
    const user_id = formData.get('user_id');

    // Validate required fields
    const requiredFields = { exp_date, employee_id, driver_phone, vehicle_no, station_id, user_id };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields: missingFields
        },
        { status: 400 }
      );
    }

    // Get arrays of items
    const item_details = formData.getAll('item_details[]');
    const amounts = formData.getAll('amount[]');
    const images = formData.getAll('image[]');

    // Validate items
    if (item_details.length === 0) {
      return NextResponse.json(
        { error: 'At least one voucher item is required' },
        { status: 400 }
      );
    }

    // Calculate remaining amount (pending) = total_expense - advance
    const remaining_amount = total_expense - advance;
    const paid_amount = 0;
    const status = 'pending';

    // Determine next sequence by extracting the numeric sequence part from existing
    // `voucher_no` values of the form 'V{seq}{last4}'. We assume seq is stored
    // immediately after 'V' and is numeric (pad to 2 digits).
    const seqResult = await executeQuery(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_no, 2, 2) AS UNSIGNED)), 0) + 1 as next_seq
       FROM vouchers
       WHERE voucher_no LIKE 'V%'
      `
    );
    const nextSeq = seqResult[0]?.next_seq || 1;

    // Insert voucher (voucher_no ही voucher_code है)
    const voucherQuery = `
      INSERT INTO vouchers 
      (station_id, emp_id, voucher_no, vehicle_no, driver_phone, advance, 
       total_expense, remaining_amount, paid_amount, exp_date, status, prepared_by, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    // Build display voucher code using the computed sequence and vehicle last-4
    const seqStrForInsert = String(nextSeq).padStart(2, '0');
    const digitsOnlyForInsert = (vehicle_no || '').toString().replace(/\D/g, '');
    let last4ForInsert = digitsOnlyForInsert.slice(-4);
    if (last4ForInsert.length < 4) {
      const raw = (vehicle_no || '').toString();
      last4ForInsert = raw.slice(-4).padStart(4, '0');
    }
    const voucherCodeToStore = `V${seqStrForInsert}${last4ForInsert}`;

    const voucherResult = await executeQuery(voucherQuery, [
      parseInt(station_id) || 0,
      parseInt(employee_id) || 0,
      voucherCodeToStore,
      vehicle_no,
      driver_phone,
      advance,
      total_expense,
      remaining_amount,
      paid_amount,
      exp_date,
      status,
      parseInt(user_id) || 0
    ]);

    const voucherId = voucherResult.insertId;

    // Insert voucher items
    const itemQuery = `
      INSERT INTO vouchers_items 
      (voucher_id, item_details, amount, image, created_at) 
      VALUES (?, ?, ?, ?, NOW())
    `;

    for (let i = 0; i < item_details.length; i++) {
      const itemDetail = item_details[i];
      const amount = parseFloat(amounts[i]) || 0;
      const image = images[i];

      let imageData = null;
      if (image && image.size > 0) {
        imageData = image.name;
      }

      await executeQuery(itemQuery, [voucherId, itemDetail, amount, imageData]);
    }

    // Insert into voucher_history
    const historyQuery = `
      INSERT INTO voucher_history 
      (row_id, user_id, amount, type, created_at) 
      VALUES (?, ?, ?, 1, NOW())
    `;

    await executeQuery(historyQuery, [voucherId, parseInt(user_id), total_expense]);

    // Insert into advance_history if advance > 0
    if (advance > 0) {
      const advanceQuery = `
        INSERT INTO advance_history 
        (voucher_id, amount, given_date, given_by, created_at) 
        VALUES (?, ?, ?, ?, NOW())
      `;
      await executeQuery(advanceQuery, [
        voucherId,
        advance,
        exp_date,
        parseInt(user_id) || 0
      ]);
    }

    // Build display voucher code: V{sequence 2-digit}{last-4-digits-of-vehicle}
    // Extract digits from vehicle_no (e.g., MH12AB1234 -> 1234)
    const digitsOnly = (vehicle_no || '').toString().replace(/\D/g, '');
    let last4 = digitsOnly.slice(-4);
    if (last4.length < 4) {
      // fallback to last 4 chars of vehicle_no if not enough digits
      const raw = (vehicle_no || '').toString();
      last4 = raw.slice(-4).padStart(4, '0');
    }
    // Create Audit Log
    try {
      let userId = null;
      let userName = null;
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            const users = await executeQuery(
              `SELECT name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name || null;
            }
          }
        }
      } catch (authError) {
        console.error('Error getting user for audit log:', authError);
      }

      // If still no name, try to get from user_id in formData
      if (!userName && user_id) {
        try {
          const users = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [user_id]
          );
          if (users.length > 0) {
            userName = users[0].name;
            userId = user_id;
          }
        } catch (err) {
          console.error('Error fetching employee name from user_id:', err);
        }
      }

      await createAuditLog({
        page: 'Vouchers',
        uniqueCode: voucherCodeToStore,
        section: 'Voucher Management',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `Voucher created: ${voucherCodeToStore} for vehicle ${vehicle_no}, employee ${employee_id}`,
        oldValue: null,
        newValue: {
          voucher_id: voucherId,
          voucher_no: voucherCodeToStore,
          vehicle_no: vehicle_no,
          employee_id: employee_id,
          station_id: station_id,
          advance: advance,
          total_expense: total_expense,
          exp_date: exp_date
        },
        recordType: 'voucher',
        recordId: voucherId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    // ✅ Create entity-specific log (similar to filling_logs)
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      await createEntityLog({
        entityType: 'voucher',
        entityId: voucherId,
        createdBy: userId || parseInt(user_id),
        createdDate: currentDateTime
      });
    } catch (logError) {
      console.error('⚠️ Error creating voucher log:', logError);
    }

    // Return the stored voucher_no (formatted code) in response for UI
    console.log('✅ Voucher created successfully:', { voucherId, voucher_no: voucherCodeToStore });
    return NextResponse.json({
      success: true,
      message: 'Voucher created successfully',
      voucherId: voucherId,
      voucher_no: voucherCodeToStore
    });

  } catch (error) {
    console.error('❌ Error creating voucher:', error);
    return NextResponse.json(
      {
        error: 'Failed to create voucher',
        details: error.message
      },
      { status: 500 }
    );
  }
}