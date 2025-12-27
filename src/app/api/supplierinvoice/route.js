// src/app/api/supplierinvoice/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

// GET handler for fetching supplier invoices
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Build the query
    let query = `
      SELECT s.*, 
             p.pname as product_name,
             f.station_name as station_name
      FROM stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations f ON s.fs_id = f.id
      WHERE s.supplier_id = ?
    `;

    const params = [id];

    if (fromDate) {
      query += ` AND s.invoice_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND s.invoice_date <= ?`;
      params.push(toDate);
    }

    query += ` ORDER BY s.id DESC`;

    // Fetch supplier details
    const supplierQuery = `SELECT name FROM suppliers WHERE id = ?`;
    const [supplierRows] = await executeQuery(supplierQuery, [id]);
    const supplierName = supplierRows.length > 0 ? supplierRows[0].name : 'Unknown Supplier';

    // Fetch invoice data
    const [rows] = await executeQuery(query, params);

    return NextResponse.json({
      supplierName,
      invoices: rows,
      total: rows.length
    });

  } catch (error) {
    console.error('Error fetching supplier invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST handler for making payments
export async function POST(request) {
  try {
    const formData = await request.json();
    const { id, amount, pay_date, remarks, v_invoice, tds_deduction } = formData;

    // Validate inputs
    if (!id || !amount || !pay_date) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const tdsAmount = parseFloat(tds_deduction || 0);
    const netAmount = parseFloat(amount) - tdsAmount;

    // Start transaction
    await executeQuery('START TRANSACTION');

    // Update stock payment (use net amount after TDS)
    const updateStockQuery = `
      UPDATE stock 
      SET payment = payment + ?, 
          pay_date = ?, 
          payable = payable - ? 
      WHERE id = ?
    `;
    await executeQuery(updateStockQuery, [netAmount, pay_date, netAmount, id]);

    // Insert into update_invoice - check if tds_deduction column exists
    try {
      const insertInvoiceQuery = `
        INSERT INTO update_invoice (supply_id, v_invoice, payment, date, remarks, type, tds_deduction) 
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `;
      await executeQuery(insertInvoiceQuery, [id, v_invoice, netAmount, pay_date, remarks, tdsAmount]);
    } catch (error) {
      // If tds_deduction column doesn't exist, insert without it
      if (error.message.includes('tds_deduction') || error.message.includes('Unknown column')) {
        const insertInvoiceQuery = `
          INSERT INTO update_invoice (supply_id, v_invoice, payment, date, remarks, type) 
          VALUES (?, ?, ?, ?, ?, 1)
        `;
        await executeQuery(insertInvoiceQuery, [id, v_invoice, netAmount, pay_date, remarks]);
      } else {
        throw error;
      }
    }

    // Commit transaction
    await executeQuery('COMMIT');

    // ✅ Create Audit Log for Payment
    try {
      let userId = null;
      let userName = null;
      
      try {
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.userId) {
          userId = currentUser.userId;
          userName = currentUser.userName;
          // If userName not found, fetch from employee_profile
          if (!userName && userId) {
            const users = await executeQuery(
              `SELECT name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0 && users[0].name) {
              userName = users[0].name;
            }
          }
        }
      } catch (getUserError) {
        // Silent fail - continue without audit log if auth fails
      }

      // Fetch supplier name for audit log
      const supplierQuery = `SELECT name FROM suppliers WHERE id = (SELECT supplier_id FROM stock WHERE id = ?)`;
      const supplierResult = await executeQuery(supplierQuery, [id]);
      const supplierName = supplierResult.length > 0 ? supplierResult[0].name : 'Unknown';

      // Fetch invoice details
      const invoiceQuery = `SELECT invoice_no, invoice_date, total_amount, payment, payable FROM stock WHERE id = ?`;
      const invoiceResult = await executeQuery(invoiceQuery, [id]);
      const invoice = invoiceResult.length > 0 ? invoiceResult[0] : null;

      await createAuditLog({
        page: 'Supplier Invoice',
        uniqueCode: `PAYMENT-${id}-${Date.now()}`,
        section: 'Supplier Payment',
        userId,
        userName,
        action: 'payment',
        remarks: `Payment made: ₹${netAmount.toFixed(2)}${tdsAmount > 0 ? ` (TDS: ₹${tdsAmount.toFixed(2)})` : ''}. ${remarks ? `Remarks: ${remarks}` : ''}`,
        oldValue: invoice ? {
          invoice_id: id,
          invoice_no: invoice.invoice_no,
          supplier_name: supplierName,
          previous_payment: parseFloat(invoice.payment) - netAmount,
          previous_payable: parseFloat(invoice.payable) + netAmount,
          previous_total: parseFloat(invoice.total_amount)
        } : null,
        newValue: {
          invoice_id: id,
          invoice_no: invoice?.invoice_no || 'N/A',
          supplier_name: supplierName,
          payment_amount: netAmount,
          tds_deduction: tdsAmount,
          payment_date: pay_date,
          v_invoice: v_invoice || null,
          new_payment: invoice ? parseFloat(invoice.payment) : netAmount,
          new_payable: invoice ? parseFloat(invoice.payable) : 0,
          remarks: remarks || null
        },
        fieldName: 'payment',
        recordType: 'supplier_invoice',
        recordId: id
      });
    } catch (auditError) {
      // Don't fail the payment if audit log fails
      console.error('Error creating audit log for payment:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      redirectUrl: `/supplierinvoice?id=${id}`
    });

  } catch (error) {
    await executeQuery('ROLLBACK');
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}