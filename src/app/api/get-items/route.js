
// src/app/api/get-items/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const items = await executeQuery("SELECT id, item_name FROM items", []);
  return NextResponse.json({ items });
}
