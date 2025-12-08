import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { vehicle_no } = await request.json();

    if (!vehicle_no) {
      return NextResponse.json(
        { error: "Vehicle number is required" },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      "SELECT licence_plate, item, qty, status, created_at FROM toolbox_asign WHERE licence_plate = ?",
      [vehicle_no]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "No records found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
