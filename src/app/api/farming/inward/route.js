import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendGenericReportEmail } from "@/lib/email";

// ... (GET logic stays same)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT i.*, 
        a.tag_id as animal_tag, a.name as animal_name,
        b.batch_code, b.batch_name
      FROM farming_inward i
      LEFT JOIN farming_animals a ON i.animal_id = a.id
      LEFT JOIN farming_batches b ON i.batch_id = b.id
      WHERE 1=1
    `;
    let params = [];

    if (type) { query += ` AND i.type = ?`; params.push(type); }
    if (from_date) { query += ` AND i.inward_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND i.inward_date <= ?`; params.push(to_date); }

    query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const records = await executeQuery(query, params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM farming_inward WHERE 1=1 ${type ? 'AND type = ?' : ''}`;
    const countParams = type ? [type] : [];
    const [{ total }] = await executeQuery(countQuery, countParams);

    return NextResponse.json({ 
      success: true, 
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Inward GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create inward entry
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      type, animal_id, batch_id, inward_type, quantity, weight,
      unit_price, total_price, supplier_name, supplier_contact,
      vehicle_no, invoice_no, inward_date, notes, recipient_email
    } = body;

    if (!type || !inward_type) {
      return NextResponse.json({ success: false, error: 'Type and Inward Type required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO farming_inward 
        (type, animal_id, batch_id, inward_type, quantity, weight, unit_price, total_price,
         supplier_name, supplier_contact, vehicle_no, invoice_no, inward_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type, animal_id || null, batch_id || null, inward_type,
      quantity || 1, weight || 0, unit_price || 0, total_price || 0,
      supplier_name || '', supplier_contact || '', vehicle_no || '',
      invoice_no || '', inward_date || new Date().toISOString().split('T')[0],
      notes || ''
    ]);

    // Send Automatic Email Notification
    const reportData = [
      { label: 'Date', value: inward_date },
      { label: 'Animal Type', value: type },
      { label: 'Inward Type', value: inward_type },
      { label: 'Quantity', value: quantity },
      { label: 'Weight', value: weight ? weight + ' kg' : 'N/A' },
      { label: 'Total Price', value: '₹' + Number(total_price).toLocaleString() },
      { label: 'Supplier', value: supplier_name },
      { label: 'Vehicle No', value: vehicle_no },
      { label: 'Invoice No', value: invoice_no }
    ];

    await sendGenericReportEmail("Animal Inward Entry", reportData, recipient_email, notes);

    return NextResponse.json({
      success: true,
      message: 'Inward entry created',
      id: result.insertId
    });
  } catch (error) {
    console.error("Inward POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
