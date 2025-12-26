// src/app/api/suppliers/stats/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('id');

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier ID required" }, { status: 400 });
    }

    // Get total invoices count
    const invoicesQuery = `
      SELECT COUNT(*) as total 
      FROM supplierinvoice 
      WHERE supplier_id = ?
    `;
    const invoicesResult = await executeQuery(invoicesQuery, [supplierId]);
    const totalInvoices = invoicesResult[0]?.total || 0;

    // Get pending amount
    const pendingQuery = `
      SELECT COALESCE(SUM(remaining_amount), 0) as pending 
      FROM supplierinvoice 
      WHERE supplier_id = ? AND remaining_amount > 0
    `;
    const pendingResult = await executeQuery(pendingQuery, [supplierId]);
    const pendingAmount = parseFloat(pendingResult[0]?.pending || 0);

    // Get total stock (if supplier has stock records)
    const stockQuery = `
      SELECT COUNT(*) as total 
      FROM stock 
      WHERE supplier_id = ?
    `;
    const stockResult = await executeQuery(stockQuery, [supplierId]);
    const totalStock = stockResult[0]?.total || 0;

    // Get recent orders (last 30 days)
    const ordersQuery = `
      SELECT COUNT(*) as total 
      FROM supplierinvoice 
      WHERE supplier_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    const ordersResult = await executeQuery(ordersQuery, [supplierId]);
    const recentOrders = ordersResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      totalInvoices,
      pendingAmount,
      totalStock,
      recentOrders,
    });
  } catch (error) {
    console.error("Error fetching supplier stats:", error);
    return NextResponse.json(
      { error: "Server error", totalInvoices: 0, pendingAmount: 0, totalStock: 0, recentOrders: 0 },
      { status: 500 }
    );
  }
}

