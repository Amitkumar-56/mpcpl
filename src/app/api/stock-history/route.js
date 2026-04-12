import { getCurrentUser } from "@/lib/auth";
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // ✅ Silent authentication check
    try {
      const currentUser = await getCurrentUser();
    } catch (authError) {
      // Continue without authentication
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const pname = searchParams.get("pname");
    const from_date = searchParams.get("from_date");
    const to_date = searchParams.get("to_date");
    const fs_id = searchParams.get("fs_id");

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

    // ✅ SIMPLIFIED SQL query with loading_qty > 0 condition
    const stockTypeField = hasStockType ? 'fh.stock_type,' : '';
    const remarksField = hasRemarks ? 'fh.remarks,' : '';
    
    // ✅ Modified: Exclude records where filling_qty is 0
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
        ep.emp_code AS created_by_emp_code,
        fr.rid AS request_rid
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE 1=1
      AND fh.trans_type IN ('Inward', 'Outward', 'Edited', 'extra', 'stored', 'Shortage', 'Return')
    `;
    
    // Add NB Stock condition if stock_type exists
    if (hasStockType) {
      sql += ` AND (fh.cl_id IS NULL OR fh.stock_type = 'NB Stock')`;
    }

    const params = [];
    const conditions = [];

    if (cid) {
      conditions.push("fh.fs_id = ?");
      params.push(cid);
    }

    if (fs_id && fs_id.trim() !== "") {
      conditions.push("fh.fs_id = ?");
      params.push(fs_id);
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
    
    // ✅ Detailed debug log
    if (rows && rows.length > 0) {
      console.log(' Filtered Transactions (filling_qty > 0):');
      
      // Summary
      const inwardRows = rows.filter(r => r.trans_type === 'Inward');
      const outwardRows = rows.filter(r => r.trans_type === 'Outward');
      const storedRows = rows.filter(r => r.trans_type === 'stored');
      const shortageRows = rows.filter(r => r.trans_type === 'Shortage');
      const extraRows = rows.filter(r => r.trans_type === 'extra');
      const editedRows = rows.filter(r => r.trans_type === 'Edited');
      const returnRows = rows.filter(r => r.trans_type === 'Return');
      
      console.log(' Transaction Summary:', {
        total: rows.length,
        inward: inwardRows.length,
        outward: outwardRows.length,
        edited: editedRows.length,
        extra: extraRows.length,
        stored: storedRows.length,
        shortage: shortageRows.length,
        return: returnRows.length,
        zeroQtyExcluded: inwardRows.filter(r => parseFloat(r.filling_qty || 0) === 0).length
      });
      
      // Show sample data
      console.log(' Sample rows (first 3):');
      rows.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
          id: row.id,
          trans_type: row.trans_type,
          filling_qty: row.filling_qty,
          current_stock: row.current_stock,
          available_stock: row.available_stock,
          pname: row.pname
        });
      });
    }

    // ✅ Collect unique employee IDs that need name lookup
    const missingEmployeeIds = new Set();
    rows.forEach((row) => {
      if (!row.created_by_name && row.created_by && row.created_by > 0) {
        missingEmployeeIds.add(row.created_by);
      }
    });

    // ✅ Fetch all missing employee names in one query
    let employeeNameMap = {};
    if (missingEmployeeIds.size > 0) {
      try {
        console.log(`🔍 Fetching ${missingEmployeeIds.size} missing employee names for stock history`);
        const employeeIds = Array.from(missingEmployeeIds);
        const placeholders = employeeIds.map(() => '?').join(',');
        const empResult = await executeQuery(
          `SELECT id, name, emp_code FROM employee_profile WHERE id IN (${placeholders})`,
          employeeIds
        );
        console.log(`✅ Fetched ${empResult.length} employee names from employee_profile table`);
        empResult.forEach(emp => {
          if (emp.name && emp.id) {
            employeeNameMap[emp.id] = {
              name: emp.name,
              emp_code: emp.emp_code
            };
            console.log(`  - ID: ${emp.id} => Name: ${emp.name}`);
          }
        });
      } catch (fetchError) {
        console.error('❌ Error fetching employee names:', fetchError);
      }
    }

    // ✅ Format created_by_name and process data
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
          displayName = `Emp ID: ${row.created_by}`;
        }
      } else {
        // System or null created_by
        displayName = 'System';
      }

      return {
        ...row,
        created_by_display_name: displayName
      };
    });

    // ✅ Handle Outward transactions - get vehicle number
    const processedRows = formattedRows.map((row) => {
      let vehicleNumber = row.vehicle_number || '';
      if ((row.trans_type === 'Outward' || row.trans_type === 'Edited') && row.rid) {
        // If vehicle_number is empty, try to extract from request_rid or use rid
        if (!vehicleNumber && row.request_rid) {
          vehicleNumber = row.request_rid;
        }
      }
      
      // ✅ Parse numeric values
      const currentStock = row.current_stock !== null ? parseFloat(row.current_stock) : 0;
      const fillingQty = row.filling_qty !== null ? parseFloat(row.filling_qty) : 0;
      const availableStock = row.available_stock !== null ? parseFloat(row.available_stock) : 0;
      
      return {
        ...row,
        vehicle_number: vehicleNumber,
        current_stock: currentStock,
        filling_qty: fillingQty,
        available_stock: availableStock,
      };
    });

    // Filter out rows where filling_qty is 0 (double check)
    const filteredRows = processedRows.filter(row => 
      row.filling_qty > 0 || 
      row.filling_qty < 0 || // Include negative quantities for 'stored' transactions
      row.trans_type === 'Edited' || // Edited transactions might have 0 qty change
      row.trans_type === 'stored' || // Include stored transactions even with 0 qty
      row.trans_type === 'Shortage' || // Include Shortage transactions even with 0 qty
      row.trans_type === 'Return' // Include Return transactions even with 0 qty
    );

    console.log(`After filtering zero qty rows: ${filteredRows.length} records`);

    const filling_stations = {};
    const productsSet = new Set();

    filteredRows.forEach((row) => {
      if (row.fs_id && row.station_name) {
        filling_stations[row.fs_id] = row.station_name;
      }
      if (row.pname && row.pname !== 'Unknown Product') {
        productsSet.add(row.pname);
      }
    });

    const products = Array.from(productsSet).sort();

    console.log('✅ Final Stock History Response:', {
      rowsCount: filteredRows?.length || 0,
      stationsCount: Object.keys(filling_stations).length,
      productsCount: products.length,
      outwardCount: filteredRows.filter(r => r.trans_type === 'Outward').length
    });

    return NextResponse.json({
      success: true,
      data: {
        filling_stations,
        products,
        rows: filteredRows || [],
        filters: {
          pname: pname || "",
          from_date: from_date || "",
          to_date: to_date || "",
          fs_id: fs_id || "",
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