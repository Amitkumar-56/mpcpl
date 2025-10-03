import mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import dbConfig from "../../../lib/db";
export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute("SELECT * FROM employee_profile LIMIT 1");
    await connection.end();

    if (rows.length === 0) return NextResponse.json(null);
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
