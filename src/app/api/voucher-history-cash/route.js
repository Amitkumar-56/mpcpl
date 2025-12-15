import { executeQuery } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const emp_id = searchParams.get('emp_id') || '';
    const vehicle_no = searchParams.get('vehicle_no') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const doExport = searchParams.get('export') === '1';

    // Base query: read from voucher_history joined with vouchers and optional item details
    let sql = `
      SELECT vh.id as history_id,
             vh.row_id as voucher_id,
             vh.user_id,
             vh.amount as history_amount,
             vh.type as history_type,
             vh.created_at as history_created,
             v.voucher_no,
             v.exp_date,
             v.emp_id,
             ep.name as emp_name,
             v.vehicle_no,
             v.driver_name,
             vi.item_details
      FROM voucher_history vh
      LEFT JOIN vouchers v ON vh.row_id = v.voucher_id
      LEFT JOIN employee_profile ep ON v.emp_id = ep.id
      LEFT JOIN vouchers_items vi ON vi.voucher_id = v.voucher_id AND vi.amount = vh.amount
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ` AND (vi.item_details LIKE ? OR v.voucher_no LIKE ? OR ep.name LIKE ? OR vh.type LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (emp_id) {
      sql += ` AND v.emp_id = ?`;
      params.push(emp_id);
    }
    if (vehicle_no) {
      sql += ` AND v.vehicle_no LIKE ?`;
      params.push(`%${vehicle_no}%`);
    }
    if (from) {
      sql += ` AND DATE(v.exp_date) >= ?`;
      params.push(from);
    }
    if (to) {
      sql += ` AND DATE(v.exp_date) <= ?`;
      params.push(to);
    }

    sql += ` ORDER BY vh.created_at DESC, v.exp_date DESC, v.voucher_id DESC`;

    const rows = await executeQuery(sql, params);

    if (doExport) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('VoucherHistory');
      sheet.columns = [
        { header: 'Voucher ID', key: 'voucher_id', width: 12 },
        { header: 'Voucher No', key: 'voucher_no', width: 18 },
        { header: 'Date', key: 'exp_date', width: 15 },
        { header: 'Employee ID', key: 'emp_id', width: 12 },
        { header: 'Employee Name', key: 'emp_name', width: 25 },
        { header: 'Vehicle No', key: 'vehicle_no', width: 15 },
        { header: 'Driver Name', key: 'driver_name', width: 20 },
        { header: 'Driver Phone', key: 'driver_phone', width: 15 },
        { header: 'Item Details', key: 'item_details', width: 40 },
        { header: 'Amount', key: 'amount', width: 12 }
      ];

      rows.forEach(r => {
        sheet.addRow({
          voucher_id: r.voucher_id,
          voucher_no: r.voucher_no,
          exp_date: r.exp_date ? new Date(r.exp_date).toLocaleDateString('en-IN') : '',
          emp_id: r.emp_id,
          emp_name: r.emp_name,
          vehicle_no: r.vehicle_no,
          driver_name: r.driver_name,
          driver_phone: r.driver_phone,
          item_details: r.item_details || '',
          amount: parseFloat(r.history_amount || 0),
          type: r.history_type || ''
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="voucher-history-cash.xlsx"'
        }
      });
    }

    return new Response(JSON.stringify({ success: true, rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('voucher-history-cash API error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
