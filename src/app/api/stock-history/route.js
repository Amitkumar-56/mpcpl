import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const pname = searchParams.get('pname');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    const cid = id ? parseInt(id) : 0;

    // Initialize variables
    let filling_stations = {};
    let products = [];
    let rows = [];

    // Fetch filling station names
    let fs_sql;
    let fs_params = [];
    
    if (cid) {
      fs_sql = "SELECT id, station_name FROM filling_stations WHERE id = ?";
      fs_params = [cid];
    } else {
      fs_sql = "SELECT id, station_name FROM filling_stations ORDER BY id";
    }

    const fsResult = await executeQuery(fs_sql, fs_params);
    if (fsResult && fsResult.length > 0) {
      fsResult.forEach(fs_row => {
        filling_stations[fs_row.id] = fs_row.station_name;
      });
    }

    // Fetch product names from products table joined with product_codes
    const productResult = await executeQuery(`
      SELECT 
        p.id, 
        p.pname as product_name
      FROM products p
      ORDER BY p.pname
    `, []);
    
    if (productResult && productResult.length > 0) {
      products = productResult.map(row => row.product_name);
    }

    // Build the main query with proper table relationships
    let sql = `
      SELECT 
        fh.*, 
        p.pname, 
        fr.vehicle_number
      FROM filling_history AS fh
      INNER JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      WHERE 1=1
    `;

    let params = [];
    let conditions = [];

    // Add conditions based on filters
    if (cid) {
      conditions.push("fh.fs_id = ?");
      params.push(cid);
    }

    if (pname && pname.trim() !== '') {
      conditions.push("p.pname = ?");
      params.push(pname);
    }

    if (from_date) {
      conditions.push("DATE(fh.filling_date) >= ?");
      params.push(new Date(from_date).toISOString().split('T')[0]);
    }

    if (to_date) {
      conditions.push("DATE(fh.filling_date) <= ?");
      params.push(new Date(to_date).toISOString().split('T')[0]);
    }

    if (conditions.length > 0) {
      sql += " AND " + conditions.join(" AND ");
    }

    sql += " ORDER BY fh.id DESC";

    // Execute the main query
    const result = await executeQuery(sql, params);
    if (result) {
      rows = result;
    }

    return NextResponse.json({
      success: true,
      data: {
        filling_stations,
        products,
        rows,
        filters: {
          cid,
          pname,
          from_date,
          to_date
        }
      }
    });

  } catch (error) {
    console.error('Error fetching stock history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}