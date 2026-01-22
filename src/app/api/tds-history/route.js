// app/api/tds-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const supplier_name = searchParams.get('supplier_name');

    // Build query to get TDS from all suppliers
    let tdsQuery = `
      SELECT 
        ui.id,
        ui.supply_id,
        ui.v_invoice,
        ui.payment,
        ui.date as payment_date,
        ui.remarks,
        ui.type,
        ui.tds_deduction as tds_amount,
        ui.tds_status,
        ui.tds_payment_date,
        s.invoice_number,
        s.invoice_date,
        s.v_invoice_value,
        s.supplier_id,
        sup.name as supplier_name
      FROM update_invoice ui
      LEFT JOIN stock s ON ui.supply_id = s.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE ui.tds_deduction > 0
    `;
    
    const params = [];

    if (from_date) {
      tdsQuery += ' AND ui.date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      tdsQuery += ' AND ui.date <= ?';
      params.push(to_date);
    }

    if (supplier_name) {
      tdsQuery += ' AND (sup.name LIKE ? OR s.invoice_number LIKE ?)';
      params.push(`%${supplier_name}%`, `%${supplier_name}%`);
    }

    tdsQuery += ' ORDER BY ui.date DESC, sup.name ASC';

    let tdsRows;
    try {
      tdsRows = await executeQuery(tdsQuery, params);
    } catch (err) {
      // Auto-migration: If column missing, add it and retry
      if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
        console.log('⚠️ TDS columns missing, adding them...');
        try {
          await executeQuery("ALTER TABLE update_invoice ADD COLUMN tds_status ENUM('Due', 'Paid') DEFAULT 'Due'");
          await executeQuery("ALTER TABLE update_invoice ADD COLUMN tds_payment_date DATETIME NULL");
          console.log('✅ TDS columns added');
          // Retry query
          tdsRows = await executeQuery(tdsQuery, params);
        } catch (alterErr) {
           // If retry fails (e.g. only one column was missing), just fail or try simpler
           console.error('Migration failed:', alterErr);
           throw err; 
        }
      } else {
        throw err;
      }
    }

    // Group by supplier and calculate totals
    const supplierSummary = {};
    const allData = tdsRows.map(row => {
      const supplierId = row.supplier_id;
      const tdsAmount = parseFloat(row.tds_amount || 0);
      const isPaid = row.tds_status === 'Paid';
      
      if (!supplierSummary[supplierId]) {
        supplierSummary[supplierId] = {
          supplier_id: supplierId,
          supplier_name: row.supplier_name,
          total_tds: 0,
          pending_tds: 0,
          entries: 0
        };
      }
      
      supplierSummary[supplierId].total_tds += tdsAmount;
      if (!isPaid) {
        supplierSummary[supplierId].pending_tds += tdsAmount;
      }
      supplierSummary[supplierId].entries += 1;

      return {
        id: row.id,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
        invoice_number: row.invoice_number,
        invoice_date: row.invoice_date,
        payment_date: row.payment_date,
        remarks: row.remarks,
        type: row.type,
        tds_amount: tdsAmount,
        tds_status: row.tds_status || 'Due',
        tds_payment_date: row.tds_payment_date,
        payment: parseFloat(row.payment || 0),
        v_invoice_value: parseFloat(row.v_invoice_value || 0)
      };
    });

    // Convert summary to array
    const summaryArray = Object.values(supplierSummary).sort((a, b) => b.total_tds - a.total_tds);
    
    // Calculate overall totals
    const overallTotal = summaryArray.reduce((sum, supplier) => sum + supplier.total_tds, 0);
    const overallPending = summaryArray.reduce((sum, supplier) => sum + supplier.pending_tds, 0);
    const totalEntries = allData.length;

    return NextResponse.json({
      data: allData,
      summary: summaryArray,
      totals: {
        overall_tds: overallTotal,
        overall_pending: overallPending,
        total_entries: totalEntries,
        total_suppliers: summaryArray.length
      }
    });

  } catch (error) {
    console.error('Error fetching all TDS history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    const query = `
      UPDATE update_invoice 
      SET tds_status = 'Paid', tds_payment_date = NOW() 
      WHERE id IN (${placeholders})
    `;

    await executeQuery(query, ids);

    return NextResponse.json({ 
      success: true, 
      message: `${ids.length} TDS entries marked as Paid` 
    });

  } catch (error) {
    console.error('Error updating TDS status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
