import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    // Get transfer details
    const transferQuery = `
      SELECT 
        pt.*,
        fs_from.station_name as station_from_name,
        fs_to.station_name as station_to_name,
        p_from.pname as product_from_name,
        p_to.pname as product_to_name
      FROM product_transfers pt
      LEFT JOIN filling_stations fs_from ON pt.station_from = fs_from.id
      LEFT JOIN filling_stations fs_to ON pt.station_to = fs_to.id
      LEFT JOIN products p_from ON pt.product_id = p_from.id
      LEFT JOIN products p_to ON pt.product_to = p_to.id
      WHERE pt.id = ?
    `;

    const transfers = await executeQuery(transferQuery, [id]);
    
    if (transfers.length === 0) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    const transfer = transfers[0];
    const stationFrom = transfer.station_from;
    const stationTo = transfer.station_to;
    const productFrom = transfer.product_id;
    const productTo = transfer.product_to;
    const isSameStation = stationFrom === stationTo;

    // Fetch history for both source and destination
    let historyQuery = '';
    let historyParams = [];

    if (isSameStation && productTo) {
      // Same station transfer: get history for both products
      historyQuery = `
        SELECT 
          fh.*,
          fs.station_name,
          p.pname as product_name,
          ep.name as created_by_name
        FROM filling_history fh
        LEFT JOIN filling_stations fs ON fh.fs_id = fs.id
        LEFT JOIN products p ON fh.product_id = p.id
        LEFT JOIN employee_profile ep ON fh.created_by = ep.id
        WHERE fh.fs_id = ? 
          AND (fh.product_id = ? OR fh.product_id = ?)
          AND fh.filling_date >= DATE_SUB((SELECT created_at FROM product_transfers WHERE id = ?), INTERVAL 1 DAY)
        ORDER BY fh.filling_date DESC, fh.created_at DESC
        LIMIT 50
      `;
      historyParams = [stationFrom, productFrom, productTo, id];
    } else {
      // Different station transfer: get history for both stations
      historyQuery = `
        SELECT 
          fh.*,
          fs.station_name,
          p.pname as product_name,
          ep.name as created_by_name
        FROM filling_history fh
        LEFT JOIN filling_stations fs ON fh.fs_id = fs.id
        LEFT JOIN products p ON fh.product_id = p.id
        LEFT JOIN employee_profile ep ON fh.created_by = ep.id
        WHERE ((fh.fs_id = ? AND fh.product_id = ?) OR (fh.fs_id = ? AND fh.product_id = ?))
          AND fh.filling_date >= DATE_SUB((SELECT created_at FROM product_transfers WHERE id = ?), INTERVAL 1 DAY)
        ORDER BY fh.filling_date DESC, fh.created_at DESC
        LIMIT 50
      `;
      historyParams = [stationFrom, productFrom, stationTo, productFrom, id];
    }

    const history = await executeQuery(historyQuery, historyParams);

    return NextResponse.json({
      success: true,
      transfer: transfer,
      history: history || []
    });
  } catch (error) {
    console.error("Error fetching transfer history:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer history: " + error.message },
      { status: 500 }
    );
  }
}

