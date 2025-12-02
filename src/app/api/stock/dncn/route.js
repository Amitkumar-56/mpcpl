// src/app/api/stock/dncn/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    // Fetch stock data
    const stockQuery = `
      SELECT 
        s.*,
        sup.name as supplier_name,
        p.pname as product_name,
        fs.station_name
      FROM stock s
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      WHERE s.id = ?
    `;
    const stockResult = await executeQuery(stockQuery, [id]);

    if (stockResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock record not found' },
        { status: 404 }
      );
    }

    const stock = stockResult[0];

    // Fetch logs - try to get from stock_logs or edit_logs table
    let logs = [];
    try {
      // Try stock_logs table first
      const stockLogsQuery = `
        SELECT 
          sl.*,
          ep.name as changed_by_name
        FROM stock_logs sl
        LEFT JOIN employee_profile ep ON sl.changed_by = ep.id
        WHERE sl.stock_id = ?
        ORDER BY sl.created_at DESC
      `;
      logs = await executeQuery(stockLogsQuery, [id]);
    } catch (error) {
      console.log('stock_logs table may not exist, trying alternative...');
      // If stock_logs doesn't exist, create a log entry from stock data itself
      logs = [{
        action: 'Stock Entry Created',
        status: stock.status,
        created_at: stock.created_at,
        updated_at: stock.updated_at,
        remarks: 'Initial stock entry'
      }];
    }

    // If no logs found, create a basic log from stock data
    if (logs.length === 0) {
      logs = [{
        action: 'Stock Entry',
        status: stock.status,
        created_at: stock.created_at,
        updated_at: stock.updated_at,
        dncn: stock.dncn,
        t_dncn: stock.t_dncn,
        remarks: 'Stock entry information'
      }];
    }

    return NextResponse.json({
      success: true,
      stock,
      logs
    });
  } catch (error) {
    console.error('Error fetching DNCN data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

