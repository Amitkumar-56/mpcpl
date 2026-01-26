import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const comId = idParam ? parseInt(idParam) : null;

    if (!comId || Number.isNaN(comId)) {
      return NextResponse.json(
        { success: false, error: "Customer ID (com_id) required" },
        { status: 400 }
      );
    }

    const customers = await executeQuery(
      `SELECT id, name, phone FROM customers WHERE id = ?`,
      [comId]
    );

    if (customers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customers[0];

    const history = await executeQuery(
      `SELECT 
         id,
         com_id,
         amount,
         payment_date,
         payment_type,
         transaction_id,
         utr_no,
         comments,
         created_at,
         status
       FROM recharge_wallets
       WHERE com_id = ?
       ORDER BY COALESCE(payment_date, created_at) DESC, id DESC`,
      [comId]
    );

    const totalRows = await executeQuery(
      `SELECT COALESCE(SUM(amount),0) as total_amount, COUNT(*) as count FROM recharge_wallets WHERE com_id = ?`,
      [comId]
    );
    const total_amount = totalRows[0]?.total_amount || 0;
    const count = totalRows[0]?.count || 0;

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone
      },
      history: history || [],
      total_amount,
      count
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
