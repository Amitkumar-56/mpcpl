// src/app/api/cst/customer-data/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get("customer_id");

    console.log("API: Fetching customer data for:", customer_id);

    if (!customer_id) {
      return NextResponse.json(
        { success: false, message: "customer_id query parameter is required" },
        { status: 400 }
      );
    }

    if (isNaN(customer_id) || customer_id <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID format" },
        { status: 400 }
      );
    }

    // Get customer details
    const customerResult = await executeQuery(
      'SELECT id, name, com_id, phone FROM customers WHERE id = ?',
      [customer_id]
    );

    if (customerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult[0];
    console.log("Found customer:", customer.name);

    // ✅ FIXED: Join products with product_codes to get pcode
    const products = await executeQuery(
      `SELECT p.id, pc.pcode, p.pname, p.type, p.min, p.bucket_size, p.full_tank as fullTank 
       FROM products p
       LEFT JOIN product_codes pc ON p.id = pc.product_id
       WHERE p.status = 'active'`
    );

    // Fetch active stations
    const stations = await executeQuery(
      `SELECT id, station_name 
       FROM filling_stations 
       WHERE status = 'active'`
    );

    console.log(`Found ${products.length} products and ${stations.length} stations`);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        com_id: customer.com_id,
        phone: customer.phone
      },
      products: products,
      stations: stations
    });

  } catch (error) {
    console.error('Error in customer-data API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message
      },
      { status: 500 }
    );
  }
}