import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request) {
  try {
    // ✅ Check authentication silently - don't log warnings for normal unauthenticated requests
    // Continue with data fetch even if auth check fails
    try {
      const currentUser = await getCurrentUser();
      // Silent auth check - don't log warnings
    } catch (authError) {
      // Silent error - continue with data fetch
    }

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

    // ✅ Check if remarks column exists
    let hasRemarks = false;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
      const colSet = new Set(colsInfo.map(r => r.Field || r.field));
      hasRemarks = colSet.has('remarks');
      console.log('✅ remarks column exists:', hasRemarks);
    } catch (colError) {
      console.log('⚠️ Could not check remarks column:', colError.message);
    }

    // ✅ Fetch specific fields from filling_history table
    // ✅ Ensure created_by name is fetched from employee_profile table properly
    // ✅ Include "Edited" transactions in stock history
    const stockTypeField = hasStockType ? 'fh.stock_type,' : '';
    const remarksField = hasRemarks ? 'fh.remarks,' : '';
    let sql = `
      SELECT 
        fh.id,
        fh.fs_id,
        fh.product_id,
        fh.trans_type,
        fh.rid,
        ${stockTypeField}
        fh.current_stock,
        fh.filling_qty,
        fh.available_stock,
        fh.filling_date,
        fh.created_by,
        ${remarksField}
        COALESCE(p.pname, 'Unknown Product') AS pname, 
        COALESCE(fr.vehicle_number, '') AS vehicle_number,
        COALESCE(fs.station_name, 'Unknown Station') AS station_name,
        ep.name AS created_by_name,
        ep.id AS created_by_employee_id,
        ep.emp_code AS created_by_emp_code
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE fh.trans_type IN ('Inward', 'Outward', 'Edited')
        AND (
          (fh.trans_type = 'Inward' AND fh.available_stock IS NOT NULL AND fh.current_stock IS NOT NULL)
          OR
          (fh.trans_type = 'Outward')
          OR
          (fh.trans_type = 'Edited' AND fh.available_stock IS NOT NULL AND fh.current_stock IS NOT NULL)
        )
    `;
    
    // Add condition to include NB Stock entries
    if (hasStockType) {
      sql += ` AND (fh.cl_id IS NULL OR fh.stock_type = 'NB Stock')`;
    } else {
      sql += ` AND fh.cl_id IS NULL`;
    }

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
    
    // ✅ Debug: Check first few rows for created_by info
    if (rows && rows.length > 0) {
      console.log('🔍 Sample rows created_by info:', rows.slice(0, 3).map(r => ({
        id: r.id,
        created_by: r.created_by,
        created_by_name: r.created_by_name,
        created_by_employee_id: r.created_by_employee_id,
        created_by_emp_code: r.created_by_emp_code
      })));
    }

    // ✅ Collect unique employee IDs that need name lookup
    const missingEmployeeIds = new Set();
    rows.forEach((row) => {
      if (!row.created_by_name && row.created_by && row.created_by > 0) {
        missingEmployeeIds.add(row.created_by);
      }
    });

    // ✅ Fetch all missing employee names in one query (better performance)
    let employeeNameMap = {};
    if (missingEmployeeIds.size > 0) {
      try {
        const employeeIds = Array.from(missingEmployeeIds);
        const placeholders = employeeIds.map(() => '?').join(',');
        const empResult = await executeQuery(
          `SELECT id, name, emp_code FROM employee_profile WHERE id IN (${placeholders})`,
          employeeIds
        );
        empResult.forEach(emp => {
          employeeNameMap[emp.id] = {
            name: emp.name,
            emp_code: emp.emp_code
          };
        });
        console.log(`✅ Fetched ${empResult.length} employee names for stock history`);
      } catch (fetchError) {
        console.error('⚠️ Error fetching employee names:', fetchError);
      }
    }

    // ✅ Format created_by_name - always show employee name or ID, never "System"
    const formattedRows = rows.map((row) => {
      let displayName = null;
      
      if (row.created_by_name) {
        // Employee name found in employee_profile JOIN
        displayName = row.created_by_name;
      } else if (row.created_by && row.created_by > 0) {
        // Employee ID exists but name not found in JOIN - use fetched data
        const empData = employeeNameMap[row.created_by];
        if (empData && empData.name) {
          displayName = empData.name;
        } else {
          // Employee ID exists but not found in employee_profile
          if (row.created_by_emp_code) {
            displayName = `Employee ID: ${row.created_by} (${row.created_by_emp_code})`;
          } else {
            displayName = `Employee ID: ${row.created_by}`;
          }
        }
      }
      // If created_by is null or 0, displayName remains null (will be handled in UI)
      
      return {
        ...row,
        created_by_name: displayName || row.created_by_name,
        user_name: displayName || row.created_by_name // For backward compatibility
      };
    });

    const filling_stations = {};
    const productsSet = new Set();

    formattedRows.forEach((row) => {
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
        rows: formattedRows || [],
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

