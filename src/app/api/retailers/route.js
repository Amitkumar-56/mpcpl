import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT * FROM retailers ORDER BY id DESC");
    return new Response(JSON.stringify({ success: true, retailers: rows }), { status: 200 });
  } catch (err) {
    console.error("Error fetching retailers:", err);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), { status: 500 });
  }
}
