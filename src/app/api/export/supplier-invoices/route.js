// app/api/export/supplier-invoices/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Build query (similar to main route but for export)
    let query = `
      SELECT 
        s.invoice_date,
        s.invoice_number,
        s.v_invoice_value,
        'Purchase' as type,
        NULL as remarks,
        s.v_invoice_value as credit,
        NULL as debit
      FROM stock s
      WHERE s.supplier_id = ?
    `;
    
    const params = [id];
    
    if (from_date) {
      query += ' AND s.invoice_date >= ?';
      params.push(from_date);
    }
    
    if (to_date) {
      query += ' AND s.invoice_date <= ?';
      params.push(to_date);
    }
    
    query += `
      UNION ALL
      
      SELECT 
        ui.date,
        s.invoice_number,
        NULL,
        'Payment',
        ui.remarks,
        NULL,
        ui.payment
      FROM update_invoice ui
      JOIN stock s ON ui.supply_id = s.id
      WHERE ui.type = 1 AND s.supplier_id = ?
    `;
    
    params.push(id);
    
    if (from_date) {
      query += ' AND ui.date >= ?';
      params.push(from_date);
    }
    
    if (to_date) {
      query += ' AND ui.date <= ?';
      params.push(to_date);
    }
    
    query += `
      UNION ALL
      
      SELECT 
        d.dncn_date,
        s.invoice_number,
        NULL,
        'DNCN',
        d.remarks,
        CASE WHEN d.type = 2 THEN d.amount ELSE NULL END,
        CASE WHEN d.type = 1 THEN d.amount ELSE NULL END
      FROM dncn d
      JOIN stock s ON d.sup_id = s.id
      WHERE s.supplier_id = ?
      ORDER BY invoice_date DESC, invoice_number
    `;
    
    params.push(id);
    
    if (from_date) {
      query += ' AND d.dncn_date >= ?';
      params.push(from_date);
    }
    
    if (to_date) {
      query += ' AND d.dncn_date <= ?';
      params.push(to_date);
    }

    const data = await executeQuery(query, params);
    
    // Convert to CSV
    const csvHeaders = ['Date', 'Invoice #', 'Remarks', 'Type', 'Debit', 'Credit', 'Balance'];
    
    let csvContent = csvHeaders.join(',') + '\n';
    
    let runningBalance = 0;
    
    data.forEach(row => {
      if (row.type === 'Purchase') {
        runningBalance += parseFloat(row.credit || 0);
      } else if (row.type === 'Payment') {
        runningBalance -= parseFloat(row.debit || 0);
      } else if (row.type === 'DNCN') {
        if (row.credit) runningBalance += parseFloat(row.credit);
        if (row.debit) runningBalance -= parseFloat(row.debit);
      }
      
      const csvRow = [
        row.invoice_date,
        row.invoice_number,
        `"${row.remarks}"`,
        row.type,
        row.debit || '',
        row.credit || '',
        runningBalance.toFixed(2)
      ];
      
      csvContent += csvRow.join(',') + '\n';
    });

    // Create response with CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="supplier-invoices-${id}.csv"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}