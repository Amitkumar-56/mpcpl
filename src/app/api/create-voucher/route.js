import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('=== VOUCHER CREATION STARTED ===');
  
  try {
    const formData = await request.formData();
    console.log('FormData received');
    
    // Parse and validate form data according to your schema
    const exp_date = formData.get('exp_date');
    const employee_id = formData.get('employee_id'); // This will be emp_id
    const driver_phone = formData.get('driver_phone');
    const vehicle_no = formData.get('vehicle_no');
    const station_id = formData.get('station_id');
    const advance = parseFloat(formData.get('advance')) || 0;
    const total_expense = parseFloat(formData.get('total_expense')) || 0;
    const user_id = formData.get('user_id'); // This will be prepared_by

    console.log('Parsed form data:', {
      exp_date, employee_id, driver_phone, vehicle_no, station_id, 
      advance, total_expense, user_id
    });

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

    console.log('Voucher items:', {
      item_details: item_details,
      amounts: amounts,
      images_count: images.length
    });

    // Validate items
    if (item_details.length === 0 || amounts.length === 0) {
      return NextResponse.json(
        { error: 'At least one voucher item is required' },
        { status: 400 }
      );
    }

    // Calculate remaining amount
    const remaining_amount = advance - total_expense;
    const paid_amount = 0; // Initial paid amount is 0
    const status = 'pending'; // Default status

    console.log('Calculated amounts:', {
      advance,
      total_expense,
      remaining_amount,
      paid_amount
    });

    try {
      // Generate voucher number (you might want to implement your own logic)
      const voucherNoResult = await executeQuery(
        'SELECT COALESCE(MAX(voucher_no), 0) + 1 as next_voucher_no FROM vouchers'
      );
      const voucher_no = voucherNoResult[0]?.next_voucher_no || 1;
      const voucher_code = `V${String(voucher_no).padStart(4, '0')}`;

      console.log('Generated voucher number:', voucher_no);

      // Insert voucher with your actual schema
      const voucherQuery = `
        INSERT INTO vouchers 
        (station_id, emp_id, voucher_no, vehicle_no, driver_phone, advance, 
         total_expense, remaining_amount, paid_amount, exp_date, status, prepared_by, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      console.log('Executing voucher insert...');
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
      console.log('Voucher created with ID:', voucherId);

      // Insert voucher items with your actual schema
      const itemQuery = `
        INSERT INTO vouchers_items 
        (voucher_id, item_details, amount, image, created_at) 
        VALUES (?, ?, ?, ?, NOW())
      `;

      console.log('Inserting voucher items...');
      for (let i = 0; i < item_details.length; i++) {
        const itemDetail = item_details[i];
        const amount = parseFloat(amounts[i]) || 0;
        const image = images[i];
        
        let imageData = null;

        // Handle image upload if exists
        if (image && image.size > 0) {
          // For file uploads, you might want to store the file and save the path
          // or convert to base64 if your database supports BLOB
          // For now, we'll just store the filename
          imageData = image.name;
          console.log(`Image uploaded: ${imageData}`);
        }

        console.log(`Inserting item ${i + 1}:`, { itemDetail, amount, imageData });
        await executeQuery(itemQuery, [voucherId, itemDetail, amount, imageData]);
      }

      // Insert into voucher_history if needed
      const historyQuery = `
        INSERT INTO voucher_history 
        (row_id, user_id, amount, type, created_at) 
        VALUES (?, ?, ?, 'voucher', NOW())
      `;
      
      await executeQuery(historyQuery, [voucherId, parseInt(user_id), total_expense]);

      console.log('=== VOUCHER CREATION COMPLETED SUCCESSFULLY ===');
      return NextResponse.json({
        success: true,
        message: 'Voucher created successfully',
        voucherId: voucherId,
        voucher_no: voucher_no,
        voucher_code: voucher_code
      });

    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }

  } catch (error) {
    console.error('=== VOUCHER CREATION FAILED ===');
    console.error('Error details:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create voucher';
    
    if (error.message.includes('vouchers')) {
      errorMessage = 'Error saving voucher. Please check if the vouchers table exists and has the correct structure.';
    } else if (error.message.includes('vouchers_items')) {
      errorMessage = 'Error saving voucher items. Please check if the vouchers_items table exists.';
    } else if (error.message.includes('foreign key')) {
      errorMessage = 'Invalid employee, station, or user reference.';
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    console.log('Fetching form data...');
    
    // Fetch stations and employees for the form
    const [stations, employees] = await Promise.all([
      executeQuery('SELECT id, station_name FROM filling_stations'),
      executeQuery('SELECT id, name FROM employee_profile WHERE role <> 5')
    ]);

    console.log('Form data fetched successfully:', {
      stations: stations?.length,
      employees: employees?.length
    });

    return NextResponse.json({
      stations: stations || [],
      employees: employees || []
    });

  } catch (error) {
    console.error('Error fetching form data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch form data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}