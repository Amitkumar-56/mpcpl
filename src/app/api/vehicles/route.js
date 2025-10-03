import { executeQuery } from "@/lib/db"; // Your database helper

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const recordsPerPage = 10;
    const offset = (page - 1) * recordsPerPage;

    // Total records
    const totalRes = await executeQuery(`SELECT COUNT(*) as total FROM vehicles`);
    const totalRecords = totalRes[0].total;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    // Vehicles with driver info
    const vehicles = await executeQuery(`
      SELECT v.id, v.vehicle_name, v.licence_plate, v.phone, v.status, e.name as driver_name
      FROM vehicles v
      LEFT JOIN employee_profile e ON v.driver_id = e.id
      LIMIT ${recordsPerPage} OFFSET ${offset}
    `);

    return new Response(JSON.stringify({ vehicles, totalPages, currentPage: page }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to fetch vehicles" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
