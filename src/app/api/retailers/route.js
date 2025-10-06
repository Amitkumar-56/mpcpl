import { executeQuery } from "@/lib/db";

export async function GET() {
  try {
    // Fetch retailers from DB
    const [rows] = await executeQuery.query("SELECT * FROM retailers ORDER BY id DESC");

    // Return array directly for simpler frontend usage
    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (err) {
    console.error("Error fetching retailers:", err);
    return new Response(JSON.stringify([]), { status: 500 }); // Return empty array on error
  }
}
