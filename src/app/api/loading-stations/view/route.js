import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Station ID is required" },
        { status: 400 }
      );
    }

    // Fetch station details
    const stationQuery = `
      SELECT 
        id, station_name, address, gst_name, gst_number, 
        email, phone, manager, created, status 
      FROM filling_stations 
      WHERE id = ?
    `;
    
    const stationResult = await executeQuery(stationQuery, [id]);
    
    if (!stationResult || stationResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    const station = stationResult[0];

    // Fetch product stocks for this station
    const productsQuery = `
      SELECT 
        nb.product_id, 
        p.pname, 
        nb.stock
      FROM non_billing_stocks nb
      INNER JOIN products p ON nb.product_id = p.id
      WHERE nb.station_id = ?
    `;
    
    const productsResult = await executeQuery(productsQuery, [id]);
    const products = productsResult || [];

    return NextResponse.json({
      success: true,
      data: {
        station,
        products
      }
    });

  } catch (error) {
    console.error('Error fetching station details:', error);
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