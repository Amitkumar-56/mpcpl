import { executeQuery } from '@/lib/db';
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

    // Calculate remaining amount
    const remaining_amount = advance - total_expense;
    const paid_amount = 0;
    const status = 'pending';

    // Generate voucher number (sequential)
    const voucherNoResult = await executeQuery(
      'SELECT COALESCE(MAX(voucher_no), 0) + 1 as next_voucher_no FROM vouchers'
    );
    const voucher_no = voucherNoResult[0]?.next_voucher_no || 1;

    // Insert voucher (voucher_no ही voucher_code है)
    const voucherQuery = `
      INSERT INTO vouchers 
      (station_id, emp_id, voucher_no, vehicle_no, driver_phone, advance, 
       total_expense, remaining_amount, paid_amount, exp_date, status, prepared_by, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const voucherResult = await executeQuery(voucherQuery, [
      parseInt(station_id), 
      parseInt(employee_id),
      voucher_no,
      vehicle_no,
      driver_phone,
      advance,
      total_expense,
      remaining_amount,
      paid_amount,
      exp_date,
      status,
      parseInt(user_id)
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
      VALUES (?, ?, ?, 'voucher', NOW())
    `;
    
    await executeQuery(historyQuery, [voucherId, parseInt(user_id), total_expense]);

    console.log('✅ Voucher created successfully:', { voucherId, voucher_no });
    return NextResponse.json({
      success: true,
      message: 'Voucher created successfully',
      voucherId: voucherId,
      voucher_no: voucher_no
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