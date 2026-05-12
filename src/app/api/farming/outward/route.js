import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendGenericReportEmail } from "@/lib/email";
import { ensureFarmingTables } from "@/lib/farming_init";

// ... (GET logic stays same)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit')) || 20));
    const offset = Math.max(0, (page - 1) * limit);

    let query = `
      SELECT o.*, 
        a.tag_id as animal_tag, a.name as animal_name,
        b.batch_code, b.batch_name
      FROM farming_outward o
      LEFT JOIN farming_animals a ON o.animal_id = a.id
      LEFT JOIN farming_batches b ON o.batch_id = b.id
      WHERE 1=1
    `;
    let params = [];

    if (type) { query += ` AND o.type = ?`; params.push(type); }
    if (from_date) { query += ` AND o.outward_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND o.outward_date <= ?`; params.push(to_date); }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const records = await executeQuery(query, params);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM farming_outward WHERE 1=1 ${type ? 'AND type = ?' : ''}`;
    const countParams = type ? [type] : [];
    const countResult = await executeQuery(countQuery, countParams);
    const total = Number(countResult[0]?.total || 0);

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
    console.error("Outward GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create outward entry
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      type, animal_id, batch_id, outward_type, product_type, quantity, weight,
      unit_price, total_price, buyer_name, buyer_contact,
      vehicle_no, invoice_no, outward_date, notes, recipient_email
    } = body;

    if (!type || !outward_type) {
      return NextResponse.json({ success: false, error: 'Type and Outward Type required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO farming_outward 
        (type, animal_id, batch_id, outward_type, product_type, quantity, weight, unit_price, total_price,
         buyer_name, buyer_contact, vehicle_no, invoice_no, outward_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type, animal_id || null, batch_id || null, outward_type,
      product_type || '', quantity || 1, weight || 0, unit_price || 0, total_price || 0,
      buyer_name || '', buyer_contact || '', vehicle_no || '',
      invoice_no || '', outward_date || new Date().toISOString().split('T')[0],
      notes || ''
    ]);

    // If animal sold or deceased, update status
    if (animal_id && (outward_type === 'sale' || outward_type === 'death' || outward_type === 'slaughter')) {
      const newStatus = outward_type === 'sale' ? 'sold' : 'deceased';
      await executeQuery(`UPDATE farming_animals SET status = ? WHERE id = ?`, [newStatus, animal_id]);
    }

    // Send Automatic Email Notification
    const reportData = [
      { label: 'Date', value: outward_date },
      { label: 'Animal Type', value: type },
      { label: 'Outward Type', value: outward_type },
      { label: 'Product Type', value: product_type },
      { label: 'Quantity', value: quantity },
      { label: 'Weight', value: weight ? weight + ' kg' : 'N/A' },
      { label: 'Total Price', value: '₹' + Number(total_price).toLocaleString() },
      { label: 'Buyer', value: buyer_name },
      { label: 'Vehicle No', value: vehicle_no },
      { label: 'Invoice No', value: invoice_no }
    ];

    await sendGenericReportEmail("Animal Outward Entry", reportData, recipient_email, notes);

    return NextResponse.json({
      success: true,
      message: 'Outward entry created',
      id: result.insertId
    });
  } catch (error) {
    console.error("Outward POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
