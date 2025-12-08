"use client";
import { useState } from "react";

export default function ViewAsignTools() {
  const [vehicleNo, setVehicleNo] = useState("");
  const [data, setData] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    setErrorMsg("");
    setData([]);

    const res = await fetch("/api/view_asign-tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_no: vehicleNo }),
    });

    const result = await res.json();

    if (!res.ok) {
      setErrorMsg(result.error || "Something went wrong");
      return;
    }

    setData(result.data);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">

      <h1 className="text-3xl font-bold mb-6">Toolbox Assignments</h1>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <label className="block mb-2 text-lg font-medium">Enter Vehicle Number</label>
        <input
          type="text"
          placeholder="Enter licence plate"
          className="border rounded-md p-3 w-full mb-4"
          value={vehicleNo}
          onChange={(e) => setVehicleNo(e.target.value)}
        />

        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-4 mb-4 rounded-lg">
          {errorMsg}
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-4">
            Details for Vehicle: {vehicleNo}
          </h2>

          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">Serial No</th>
                <th className="border px-4 py-2">Licence Plate</th>
                <th className="border px-4 py-2">Item</th>
                <th className="border px-4 py-2">Quantity</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="text-center">
                  <td className="border px-4 py-2">{index + 1}</td>
                  <td className="border px-4 py-2">{row.licence_plate}</td>
                  <td className="border px-4 py-2">{row.item}</td>
                  <td className="border px-4 py-2">{row.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
