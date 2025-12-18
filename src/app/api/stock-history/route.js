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

    let sql = `
      SELECT 
        fh.*, 
        p.pname, 
        fr.vehicle_number,
        fs.station_name
      FROM filling_history AS fh
      INNER JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      WHERE 1=1
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

    const rows = await executeQuery(sql, params);

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

    return NextResponse.json({
      success: true,
      data: {
        filling_stations,
        products,
        rows,
        filters: {
          pname: pname || "",
          from_date: from_date || "",
          to_date: to_date || "",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching stock history:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

