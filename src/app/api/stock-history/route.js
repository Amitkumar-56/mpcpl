import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const pname = searchParams.get("pname");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");

    const cid = id ? parseInt(id) : 0;

    // ✅ Check if stock_type column exists
    let hasStockType = false;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
      const colSet = new Set(colsInfo.map(r => r.Field));
      hasStockType = colSet.has('stock_type');
      console.log('✅ stock_type column exists:', hasStockType);
    } catch (colError) {
      console.log('⚠️ Could not check stock_type column:', colError.message);
    }

    // ✅ Fetch specific fields from filling_history table
    const stockTypeField = hasStockType ? 'fh.stock_type,' : '';
    let sql = `
      SELECT 
        fh.id,
        fh.fs_id,
        fh.product_id,
        fh.trans_type,
        ${stockTypeField}
        fh.current_stock,
        fh.filling_qty,
        fh.available_stock,
        fh.filling_date,
        fh.created_by,
        COALESCE(p.pname, 'Unknown Product') AS pname, 
        COALESCE(fr.vehicle_number, '') AS vehicle_number,
        COALESCE(fs.station_name, 'Unknown Station') AS station_name,
        COALESCE(ep.name, 'System') AS created_by_name,
        CASE 
          WHEN ep.id IS NOT NULL THEN ep.name
          ELSE 'System'
        END AS user_name
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE fh.trans_type IN ('Inward', 'Outward')
        AND (
          (fh.trans_type = 'Inward' AND fh.available_stock IS NOT NULL AND fh.current_stock IS NOT NULL)
          OR
          (fh.trans_type = 'Outward')
        )
    `;

    const params = [];
    const conditions = [];

    if (cid) {
      conditions.push("fh.fs_id = ?");
      params.push(cid);
    }

    if (pname && pname.trim() !== "") {
      conditions.push("p.pname = ?");
      params.push(pname);
    }

    if (from_date) {
      conditions.push("DATE(fh.filling_date) >= ?");
      params.push(new Date(from_date).toISOString().split("T")[0]);
    }

    if (to_date) {
      conditions.push("DATE(fh.filling_date) <= ?");
      params.push(new Date(to_date).toISOString().split("T")[0]);
    }

    if (conditions.length > 0) {
      sql += " AND " + conditions.join(" AND ");
    }

    sql += " ORDER BY fh.id DESC";

    console.log('🔍 Stock History Query:', sql);
    console.log('🔍 Stock History Params:', params);

    const rows = await executeQuery(sql, params);

    console.log('✅ Stock History Rows Count:', rows?.length || 0);

    const filling_stations = {};
    const productsSet = new Set();

    rows.forEach((row) => {
      if (row.fs_id && row.station_name) {
        filling_stations[row.fs_id] = row.station_name;
      }
      if (row.pname) {
        productsSet.add(row.pname);
      }
    });

    const products = Array.from(productsSet).sort();

    console.log('✅ Stock History Response:', {
      rowsCount: rows?.length || 0,
      stationsCount: Object.keys(filling_stations).length,
      productsCount: products.length
    });

    return NextResponse.json({
      success: true,
      data: {
        filling_stations,
        products,
        rows: rows || [],
        filters: {
          pname: pname || "",
          from_date: from_date || "",
          to_date: to_date || "",
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching stock history:", error);
    console.error("❌ Error stack:", error.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

