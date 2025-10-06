"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function StationViewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [station, setStation] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

   // In your client component's fetchStation function
async function fetchStation() {
  try {
    const res = await fetch(`/api/stations/view?id=${id}`);
    const data = await res.json();

    if (res.ok) {
      setStation(data.station);
      setProducts(data.products);
    } else {
      console.error("API Error:", data.error);
      setStation(null);
    }
  } catch (err) {
    console.error("Error fetching station:", err);
  } finally {
    setLoading(false);
  }
}
    

    fetchStation();
  }, [id]);

  if (loading) {
    return <p className="text-center mt-10 text-lg">Loading...</p>;
  }

  if (!station) {
    return <p className="text-center mt-10 text-red-500">No station found.</p>;
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      {/* Header buttons */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center gap-2"
        >
          ⬅ Back
        </button>
        <a
          href="/loading-stations/add"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700"
        >
          + Add Station
        </a>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-4">
        Station Details (ID: {station.id})
      </h1>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full table-auto border border-gray-200">
          <tbody>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Station Name</th>
              <td className="px-4 py-2">{station.station_name}</td>
            </tr>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Address</th>
              <td className="px-4 py-2">{station.address}</td>
            </tr>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">GST Name</th>
              <td className="px-4 py-2">{station.gst_name}</td>
            </tr>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">GST Number</th>
              <td className="px-4 py-2">{station.gst_number}</td>
            </tr>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <td className="px-4 py-2">{station.email}</td>
            </tr>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Phone</th>
              <td className="px-4 py-2">{station.phone}</td>
            </tr>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Manager</th>
              <td className="px-4 py-2">{station.manager}</td>
            </tr>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <td className="px-4 py-2">{station.created}</td>
            </tr>

            {/* Product stocks */}
            {products.length > 0 ? (
              products.map((p) => (
                <tr key={p.product_id} className="border-b">
                  <th className="px-4 py-2 text-left font-medium">{p.pname}</th>
                  <td className="px-4 py-2">{p.stock}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" className="text-center py-4 text-gray-500">
                  No products found for this station.
                </td>
              </tr>
            )}

            <tr>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <td>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    station.status === "Enable"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {station.status}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
