import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// Helper function to generate LR number
async function generateLRNumber() {
  try {
    // Get the highest LR number that starts with 'LR'
    const latestLrResult = await executeQuery(
      `SELECT lr_id FROM shipment 
       WHERE lr_id LIKE 'LR%' 
       ORDER BY CAST(SUBSTRING(lr_id, 3) AS UNSIGNED) DESC 
       LIMIT 1`
    );
    
    if (latestLrResult.length > 0) {
      const lastLR = latestLrResult[0].lr_id;
      // Extract numeric part and increment
      const numericPart = parseInt(lastLR.replace('LR', '')) || 0;
      const newNumber = numericPart + 1;
      return `LR${newNumber.toString().padStart(3, '0')}`;
    }
    
    // If no records found, start from LR001
    return 'LR001';
  } catch (error) {
    console.error('Error generating LR number:', error);
    return 'LR001';
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let lrData = {};
    let newLrId = 'LR001';

    // If editing, fetch existing data
    if (id) {
      const result = await executeQuery(
        'SELECT * FROM shipment WHERE id = ?',
        [id]
      );
      
      if (result.length > 0) {
        lrData = result[0];
        newLrId = lrData.lr_id;
      }
    } else {
      // For new records, generate next LR number
      newLrId = await generateLRNumber();
    }

    return NextResponse.json({
      lrData,
      newLrId
    });
  } catch (error) {
    console.error('Error fetching LR data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LR data' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.json();
    const {
      id,
      lr_id,
      mobile,
      email,
      pan,
      gst,
      lr_date,
      consigner,
      address_1,
      consignee,
      address_2,
      from_location,
      to_location,
      tanker_no,
      gst_no,
      products,
      boe_no,
      wt_type,
      gross_wt,
      vessel,
      tare_wt,
      invoice_no,
      net_wt,
      gp_no,
      remarks
    } = formData;

    // Check for duplicate LR number when creating new record
    if (!id) {
      const existingLR = await executeQuery(
        'SELECT id FROM shipment WHERE lr_id = ?',
        [lr_id]
      );
      
      if (existingLR.length > 0) {
        return NextResponse.json(
          { error: 'LR number already exists' },
          { status: 400 }
        );
      }
    }

    if (id) {
      // Update existing record
      const result = await executeQuery(
        `UPDATE shipment SET 
        lr_id=?, mobile=?, email=?, pan=?, gst=?, lr_date=?, consigner=?, address_1=?, consignee=?, address_2=?, 
        from_location=?, to_location=?, tanker_no=?, gst_no=?, products=?, boe_no=?, wt_type=?, 
        gross_wt=?, vessel=?, tare_wt=?, invoice_no=?, net_wt=?, gp_no=?, remarks=? 
        WHERE id=?`,
        [
          lr_id, mobile, email, pan, gst, lr_date, consigner, address_1, consignee, address_2,
          from_location, to_location, tanker_no, gst_no, products, boe_no, wt_type,
          gross_wt, vessel, tare_wt, invoice_no, net_wt, gp_no, remarks, id
        ]
      );
    } else {
      // Insert new record
      const result = await executeQuery(
        `INSERT INTO shipment 
        (lr_id, mobile, email, pan, gst, lr_date, consigner, address_1, consignee, address_2, 
        from_location, to_location, tanker_no, gst_no, products, boe_no, wt_type, gross_wt, 
        vessel, tare_wt, invoice_no, net_wt, gp_no, remarks)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          lr_id, mobile, email, pan, gst, lr_date, consigner, address_1, consignee, address_2,
          from_location, to_location, tanker_no, gst_no, products, boe_no, wt_type,
          gross_wt, vessel, tare_wt, invoice_no, net_wt, gp_no, remarks
        ]
      );
    }

    return NextResponse.json({ 
      success: true,
      message: id ? 'Record updated successfully' : 'Record created successfully'
    });
  } catch (error) {
    console.error('Error saving LR data:', error);
    
    // Handle duplicate entry error from MySQL
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'LR number already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save LR data' },
      { status: 500 }
    );
  }
}