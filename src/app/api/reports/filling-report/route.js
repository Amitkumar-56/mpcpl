// src/app/api/reports/filling-report/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { 
      product = '', 
      loading_station = '', 
      customer = '', 
      from_date = '', 
      to_date = '',
      export: exportData = false,
      page = 1,
      limit = 100
    } = await request.json();

    console.log('🔍 Filters:', { product, loading_station, customer, from_date, to_date });

    const offset = (page - 1) * limit;

    // UPDATED QUERY WITH CHECK STATUS, EMPLOYEE PROFILE, AND LOGS
    let queryStr = `
      SELECT 
        fr.id,
        fr.rid,
        fr.vehicle_number,
        fr.driver_number,
        fr.aqty,
        fr.completed_date,
        fr.created,
        fr.status,
        fr.doc1,
        fr.doc2,
        fr.doc3,
        fr.is_checked,
        fr.checked_by,
        fr.checked_at,
        fr.is_invoiced,
        fr.invoiced_by,
        fr.invoiced_at,
        COALESCE(fr.totalamt, 0) as amount,
        p.pname AS product_name, 
        fs.station_name, 
        c.name AS client_name,
        ep.name as checked_by_name,
        ep_invoice.name as invoiced_by_name,
        COALESCE(fl_created.created_by_name, 'System') as created_by_name,
        fl_created.created_date,
        fl_processed.processed_by_name,
        fl_processed.processed_date,
        fl_completed.completed_by_name,
        fl_completed.completed_date
      FROM filling_requests fr
      LEFT JOIN products p ON fr.product = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN employee_profile ep ON fr.checked_by = ep.id
      LEFT JOIN employee_profile ep_invoice ON fr.invoiced_by = ep_invoice.id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          COALESCE(ep.name, c.name, 'System') as created_by_name,
          fl.created_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.created_by = ep.id
        LEFT JOIN customers c ON fl.created_by = c.id
        WHERE fl.created_by IS NOT NULL
      ) fl_created ON fr.rid = fl_created.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name as processed_by_name,
          fl.processed_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.processed_by = ep.id
        WHERE fl.processed_by IS NOT NULL
      ) fl_processed ON fr.rid = fl_processed.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name as completed_by_name,
          fl.completed_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.completed_by = ep.id
        WHERE fl.completed_by IS NOT NULL
      ) fl_completed ON fr.rid = fl_completed.request_id
      WHERE fr.status = 'Completed'
    `;

    const params = [];
    
    // Simple filter logic
    if (product) {
      queryStr += " AND fr.product = ?";
      params.push(product);
    }
    if (loading_station) {
      queryStr += " AND fr.fs_id = ?";
      params.push(loading_station);
    }
    if (customer) {
      queryStr += " AND fr.cid = ?";
      params.push(customer);
    }
    if (from_date && to_date) {
      queryStr += " AND DATE(fr.completed_date) BETWEEN ? AND ?";
      params.push(from_date, to_date);
    }

    // Use direct values for LIMIT and OFFSET to avoid MySQL prepared statement issues
    const limitValue = parseInt(limit) || 100;
    const offsetValue = parseInt(offset) || 0;
    queryStr += ` ORDER BY fr.created DESC LIMIT ${limitValue} OFFSET ${offsetValue}`;

    console.log('📝 Query:', queryStr);
    console.log('🔢 Params:', params);

    // Execute query
    const records = await executeQuery(queryStr, params);
    console.log('✅ Records found:', records.length);

    // Calculate totals
    let totalQty = 0;
    let totalAmount = 0;
    records.forEach(row => {
      totalQty += parseFloat(row.aqty || 0);
      totalAmount += parseFloat(row.amount || 0);
    });

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM filling_requests fr 
      WHERE fr.status = 'Completed'
    `;
    const countParams = [];
    
    if (product) {
      countQuery += " AND fr.product = ?";
      countParams.push(product);
    }
    if (loading_station) {
      countQuery += " AND fr.fs_id = ?";
      countParams.push(loading_station);
    }
    if (customer) {
      countQuery += " AND fr.cid = ?";
      countParams.push(customer);
    }
    if (from_date && to_date) {
      countQuery += " AND DATE(fr.completed_date) BETWEEN ? AND ?";
      countParams.push(from_date, to_date);
    }

    const countResult = await executeQuery(countQuery, countParams);
    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          limit: parseInt(limit)
        },
        totals: {
          pageQty: totalQty,
          pageAmount: totalAmount,
          pageRecords: records.length,
          grandTotalQty: totalQty,
          grandTotalAmount: totalAmount,
          grandTotalRecords: totalRecords
        }
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET for dropdowns and stats
export async function GET() {
  try {
    const [products, stations, customers, stats] = await Promise.all([
      executeQuery("SELECT id, pname FROM products"),
      executeQuery("SELECT id, station_name FROM filling_stations"),
      executeQuery("SELECT id, name FROM customers"),
      // Get stats: Total Filling, Total Stock, Total Invoice, Total Recharge
      Promise.all([
        // Total Filling (completed filling requests)
        executeQuery("SELECT COUNT(*) as total FROM filling_requests WHERE status = 'Completed'").catch(() => [{ total: 0 }]),
        // Total Stock (from stock table - all stock entries)
        executeQuery("SELECT COUNT(*) as total FROM stock").catch(() => [{ total: 0 }]),
        // Total Invoice (invoiced filling requests)
        executeQuery("SELECT COUNT(*) as total FROM filling_requests WHERE status = 'Completed' AND is_invoiced = 1").catch(() => [{ total: 0 }]),
        // Total Recharge (try recharge_requests first, then recharge_wallets as fallback)
        (async () => {
          try {
            const result = await executeQuery("SELECT COUNT(*) as total FROM recharge_requests WHERE status = 'Approved'");
            return result;
          } catch (error) {
            try {
              const result = await executeQuery("SELECT COUNT(*) as total FROM recharge_wallets WHERE status = 'Approved'");
              return result;
            } catch (error2) {
              return [{ total: 0 }];
            }
          }
        })()
      ])
    ]);

    const statsData = {
      totalFilling: stats[0][0]?.total || 0,
      totalStock: stats[1][0]?.total || 0,
      totalInvoice: stats[2][0]?.total || 0,
      totalRecharge: stats[3][0]?.total || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        products: products || [],
        stations: stations || [], 
        customers: customers || [],
        stats: statsData
      }
    });
  } catch (error) {
    console.error('Error in GET /api/reports/filling-report:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      data: {
        products: [],
        stations: [],
        customers: [],
        stats: {
          totalFilling: 0,
          totalStock: 0,
          totalInvoice: 0,
          totalRecharge: 0
        }
      }
    });
  }
}