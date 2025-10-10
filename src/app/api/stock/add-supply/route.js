import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET method - Dropdown data के लिए
export async function GET() {
  try {
    // Fetch all data from different tables
    const [suppliers, transporters, products, stations] = await Promise.all([
      executeQuery("SELECT id, name FROM suppliers"),
      executeQuery("SELECT id, transporter_name FROM transporters"),
      executeQuery("SELECT id, pname FROM products"),
      executeQuery("SELECT id, station_name FROM filling_stations")
    ]);

    return NextResponse.json({
      suppliers: suppliers || [],
      transporters: transporters || [],
      products: products || [],
      stations: stations || []
    });

  } catch (error) {
    console.error('Error fetching form data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch form data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// POST method - Supply data save करने के लिए
export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Extract all form fields
    const supply_type = formData.get('supply_type');
    const supplier_id = formData.get('supplier_id');
    const transporter_id = formData.get('transporter_id') || null;
    const product_id = formData.get('product_id');
    const station_id = formData.get('station_id');
    const tanker_no = formData.get('tanker_no');
    const driver_no = formData.get('driver_no');
    const weight_type = formData.get('weight_type');
    const kg = formData.get('kg') || null;
    const ltr = formData.get('ltr') || null;
    const density = formData.get('density') || null;
    const supplier_product_name = formData.get('supplier_product_name');
    const invoice_date = formData.get('invoice_date');
    const supplier_invoice_no = formData.get('supplier_invoice_no');
    const supplier_invoice_value = parseFloat(formData.get('supplier_invoice_value')) || 0;
    const transporter_invoice_no = formData.get('transporter_invoice_no') || null;
    const transporter_invoice_value = parseFloat(formData.get('transporter_invoice_value')) || 0;
    const slip_image = formData.get('slip_image');

    // Generate invoice number
    const invoice_number = `INV-${Date.now()}`;
    
    // Calculate payable amounts
    const payable = supplier_invoice_value;
    const t_payable = transporter_invoice_value;

    // Insert into stock table
    const sql = `
      INSERT INTO stock 
      (invoice_number, invoice_date, transport_number, fs_id, product_id, product_name, 
       transporter_id, supplier_id, tanker_no, weight_type, kg, ltr, density, 
       driver_no, v_invoice_value, t_invoice_value, payable, t_payable, payment, 
       t_payment, slip_image, staff_id, status, supply_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      invoice_number,
      invoice_date,
      transporter_invoice_no,
      station_id,
      product_id,
      supplier_product_name,
      transporter_id,
      supplier_id,
      tanker_no,
      weight_type,
      kg,
      ltr,
      density,
      driver_no,
      supplier_invoice_value,
      transporter_invoice_value,
      payable,
      t_payable,
      0,
      0,
      slip_image ? slip_image.name : null,
      1,
      1,
      supply_type
    ];

    const result = await executeQuery(sql, values);

    return NextResponse.json({
      success: true,
      message: 'Supply added successfully',
      data: {
        id: result.insertId,
        invoice_number: invoice_number
      }
    });

  } catch (error) {
    console.error('Error adding supply:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add supply: ' + error.message 
      },
      { status: 500 }
    );
  }
}