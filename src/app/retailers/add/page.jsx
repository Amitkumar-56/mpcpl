// src/app/retailers/add/page.jsx
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AddRetailer() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [retailerType, setRetailerType] = useState("1");

  const [permissions, setPermissions] = useState({
    Dashboard: { can_view: false, can_edit: false },
    "Filling Requests": { can_view: false, can_edit: false },
    "Loading Station": { can_view: false, can_edit: false },
    "Loading History": { can_view: false, can_edit: false },
    Reports: { can_view: false, can_edit: false },
  });

  const modules = Object.keys(permissions);

  const handlePermissionChange = (module, perm) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [perm]: !prev[module][perm] },
    }));
  };

  useEffect(() => {
    fetch("/api/products").then((res) => res.json()).then(setProducts);
    fetch("/api/stations").then((res) => res.json()).then(setStations);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData(e.target);
      form.append("permissions", JSON.stringify(permissions));

      const res = await fetch("/api/retailers/add", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (res.ok) {
        alert("Retailer added successfully!");
        router.push("/retailers");
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving the retailer.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Add New Retailer</h1>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              encType="multipart/form-data"
            >
              {/* Retailer Info */}
              <div>
                <label>Retailer Name</label>
                <input type="text" name="retailer_name" required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label>Role</label>
                <select name="role" className="w-full border p-2 rounded">
                  <option value="1">Retailer</option>
                  <option value="2">Distributor</option>
                </select>
              </div>
              <div>
                <label>Phone</label>
                <input type="number" name="phone" required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label>Email</label>
                <input type="email" name="email" className="w-full border p-2 rounded" />
              </div>
              <div>
                <label>Password</label>
                <input type="password" name="password" className="w-full border p-2 rounded" />
              </div>

              {/* Retailer Type */}
              <div>
                <label>Retailer Type</label>
                <select
                  name="retailer_type"
                  value={retailerType}
                  onChange={(e) => setRetailerType(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="1">Prepaid</option>
                  <option value="2">Postpaid</option>
                </select>
              </div>
              {retailerType === "2" && (
                <div>
                  <label>Credit Limit</label>
                  <input type="number" name="credit_limit" className="w-full border p-2 rounded" />
                </div>
              )}

              {/* Products */}
              <div className="col-span-2">
                <label>Select Products</label>
                {products.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <input type="checkbox" name="products[]" value={p.id} />
                    <span>{p.pname}</span>
                  </div>
                ))}
              </div>

              {/* Assign Location */}
              <div className="col-span-2">
                <label>Assign Location</label>
                {stations.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input type="checkbox" name="block_location[]" value={s.id} />
                    <span>{s.station_name}</span>
                  </div>
                ))}
              </div>

              {/* File Upload */}
              <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label>Document 1</label>
                  <input type="file" name="doc1" />
                </div>
                <div className="flex flex-col">
                  <label>Document 2</label>
                  <input type="file" name="doc2" />
                </div>
                <div className="flex flex-col">
                  <label>Document 3</label>
                  <input type="file" name="doc3" />
                </div>
              </div>

              {/* Permissions */}
              <div className="col-span-2 mt-6 overflow-x-auto bg-white rounded-lg p-4 border">
                <h3 className="text-md font-semibold mb-3">Assign Module Permissions</h3>
                <table className="w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Module</th>
                      <th className="p-2 border">View</th>
                      <th className="p-2 border">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="p-2 border">{mod}</td>
                        <td className="p-2 border text-center">
                          <input
                            type="checkbox"
                            checked={permissions[mod].can_view}
                            onChange={() => handlePermissionChange(mod, "can_view")}
                          />
                        </td>
                        <td className="p-2 border text-center">
                          <input
                            type="checkbox"
                            checked={permissions[mod].can_edit}
                            onChange={() => handlePermissionChange(mod, "can_edit")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Buttons */}
              <div className="col-span-2 flex justify-center gap-4 mt-4">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                  Submit
                </button>
                <button type="reset" className="px-6 py-2 bg-gray-400 text-white rounded-lg">
                  Reset
                </button>
              </div>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
