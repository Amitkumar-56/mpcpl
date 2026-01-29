import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';
import { executeQuery, getConnection } from '@/lib/db';
import { NextResponse } from 'next/server';

/* =====================================================
   GET : Supplier Invoice List
===================================================== */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID required' }, { status: 400 });
    }

    let query = `
      SELECT s.*,
             p.pname AS product_name,
             f.station_name
      FROM stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations f ON s.fs_id = f.id
      WHERE s.supplier_id = ?
    `;

    const params = [supplierId];

    if (fromDate) {
      query += ` AND s.invoice_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND s.invoice_date <= ?`;
      params.push(toDate);
    }

    query += ` ORDER BY s.id DESC`;

    const invoices = await executeQuery(query, params);

    const supplier = await executeQuery(
      `SELECT name FROM suppliers WHERE id = ?`,
      [supplierId]
    );

    return NextResponse.json({
      success: true,
      supplierName: supplier?.[0]?.name || 'Unknown Supplier',
      invoices: invoices || []
    });

  } catch (error) {
    console.error('GET supplierinvoice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/* =====================================================
   POST : Make Supplier Payment (NO TRANSACTION)
===================================================== */
export async function POST(request) {
  const conn = await getConnection();

  try {
    const body = await request.json();
    const { id, amount, pay_date, remarks, v_invoice, tds_deduction } = body;

    if (!id || amount === undefined || !pay_date) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const paymentAmount = parseFloat(amount);
    const tdsAmount = parseFloat(tds_deduction || 0);
    const netAmount = paymentAmount - tdsAmount;

    if (netAmount <= 0) {
      return NextResponse.json(
        { error: 'Net amount must be greater than zero' },
        { status: 400 }
      );
    }

    /* 🔹 Ensure TDS columns exist */
    try {
      const check = await conn.query("SHOW COLUMNS FROM update_invoice LIKE 'tds_status'");
      if (check[0].length === 0) {
        await conn.query("ALTER TABLE update_invoice ADD COLUMN tds_status ENUM('Due', 'Paid') DEFAULT 'Due'");
        await conn.query("ALTER TABLE update_invoice ADD COLUMN tds_payment_date DATETIME NULL");
        console.log("✅ Added tds_status columns");
      }
    } catch (err) {
      console.warn("⚠️ TDS column check warning:", err.message);
    }

    /* 🔹 Fetch stock */
    const [stock] = await conn.query(
      `SELECT payable, payment 
       FROM stock 
       WHERE id = ?`,
      [id]
    );

    if (!stock || stock.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (netAmount > stock[0].payable) {
      return NextResponse.json(
        { error: 'Payment exceeds payable amount' },
        { status: 400 }
      );
    }

    /* 🔹 Update stock (AUTO COMMIT) */
    // Payment increases by netAmount (cash paid)
    // Payable decreases by paymentAmount (total liability reduction: cash + TDS)
    await conn.query(
      `UPDATE stock
       SET payment = payment + ?,
           payable = payable - ?,
           pay_date = ?
       WHERE id = ?`,
      [netAmount, paymentAmount, pay_date, id]
    );

    /* 🔹 Insert payment record */
    await conn.query(
      `INSERT INTO update_invoice
       (supply_id, v_invoice, payment, date, remarks, type, tds_deduction, tds_status)
       VALUES (?, ?, ?, ?, ?, 1, ?, 'Due')`,
      [
        id,
        v_invoice || null,
        netAmount,
        pay_date,
        remarks || null,
        tdsAmount
      ]
    );

    /* 🔹 Audit Log (optional, non-blocking) */
    try {
      const currentUser = await getCurrentUser();

      await createAuditLog({
        page: 'Supplier Invoice',
        section: 'Supplier Payment',
        action: 'payment',
        recordType: 'supplier_invoice',
        recordId: id,
        userId: currentUser?.userId || null,
        userName: currentUser?.userName || null,
        remarks: `Payment ₹${netAmount} (TDS ₹${tdsAmount})`,
        oldValue: {
          payable: stock[0].payable,
          payment: stock[0].payment
        },
        newValue: {
          payable: stock[0].payable - netAmount,
          payment: stock[0].payment + netAmount
        }
      });
    } catch (auditError) {
      console.warn('Audit log failed:', auditError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully'
    });

  } catch (error) {
    console.error('POST supplierinvoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment failed' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
