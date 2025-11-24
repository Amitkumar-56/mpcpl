// src/app/api/reports/invoiced-records/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get invoiced IDs from URL
    const invoicedIds = searchParams.get('invoiced_ids') ? searchParams.get('invoiced_ids').split(',') : [];
    
    // Get filter parameters
    const product = searchParams.get('product') || '';
    const loading_station = searchParams.get('loading_station') || '';
    const customer = searchParams.get('customer') || '';
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';

    if (invoicedIds.length === 0) {
      return NextResponse.json({ error: "No records selected." }, { status: 400 });
    }

    // Create placeholders for SQL query
    const placeholders = invoicedIds.map(() => '?').join(',');
    
    // Fetch invoiced records
    const query = `
      SELECT 
        fr.*, 
        p.pname AS product_name, 
        fs.station_name, 
        c.name AS client_name,
        fh.amount,
        ep.name as invoiced_by_name
      FROM filling_requests fr
      LEFT JOIN products p ON fr.product = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN filling_history fh ON fh.rid = fr.rid
      LEFT JOIN employee_profile ep ON fr.invoiced_by = ep.id
      WHERE fr.id IN (${placeholders}) AND fr.status = 'Completed'
      ORDER BY fr.created DESC
    `;

    const result = await executeQuery(query, invoicedIds);
    
    // Calculate totals
    let totalQty = 0;
    let totalAmount = 0;
    
    const records = result.map(row => {
      const qty = parseFloat(row.aqty) || 0;
      const amount = parseFloat(row.amount) || 0;
      
      totalQty += qty;
      totalAmount += amount;
      
      return {
        ...row,
        aqty: qty,
        amount: amount
      };
    });

    return NextResponse.json({
      records,
      summary: {
        totalQty,
        totalAmount,
        totalRecords: records.length
      },
      filters: {
        product,
        loading_station,
        customer,
        from_date,
        to_date
      }
    });

  } catch (error) {
    console.error('Error fetching invoiced records:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}