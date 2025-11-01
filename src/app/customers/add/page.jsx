//src/app/customers/add/page.jsx
"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AddCustomer() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [stations, setStations] = useState([]);
  const [clientType, setClientType] = useState("1");

  const [permissions, setPermissions] = useState({
    Dashboard: { can_view: false, can_edit: false, can_delete: false },
    "Filling Requests": { can_view: false, can_edit: false },
    "Loading Station": { can_view: false, can_edit: false },
    "Loading History": { can_view: false, can_edit: false },
  });

  const modules = Object.keys(permissions);

  const handlePermissionChange = (module, perm) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [perm]: !prev[module][perm] },
    }));
  };

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then(setProducts);
    fetch("/api/stations")
      .then((res) => res.json())
      .then(setStations);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData(e.target);
      form.append("permissions", JSON.stringify(permissions));

      const res = await fetch("/api/customers/add", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (res.ok) {
        alert("Customer added successfully!");
        router.push("/customers");
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving the customer.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Form container */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              encType="multipart/form-data"
            >
              {/* Name, Role, Phone, Email, Password */}
              <div>
                <label>Client Name</label>
                <input
                  type="text"
                  name="client_name"
                  required
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label>Role</label>
                <select name="role" className="w-full border p-2 rounded">
                  <option value="1">Client</option>
                  <option value="3">Super Client</option>
                </select>
              </div>
              <div>
                <label>Phone</label>
                <input
                  type="number"
                  name="phone"
                  required
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* Customer Type & Billing */}
              <div>
                <label>Customer Type</label>
                <select
                  name="client_type"
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="1">Prepaid Client</option>
                  <option value="2">Postpaid Client</option>
                  <option value="3">Credit Days Client</option>
                </select>
              </div>
              <div>
                <label>Billing Type</label>
                <select
                  name="billing_type"
                  className="w-full border p-2 rounded"
                >
                  <option value="1">Billing</option>
                  <option value="2">Non Billing</option>
                </select>
              </div>

              {clientType === "2" && (
                <div>
                  <label>Credit Limit</label>
                  <input
                    type="number"
                    name="amtlimit"
                    className="w-full border p-2 rounded"
                  />
                </div>
              )}

              {clientType === "3" && (
                <>
                  <div>
                    <label>Credit Days</label>
                    <input
                      type="number"
                      name="credit_days"
                      placeholder="Enter number of days (e.g., 10)"
                      className="w-full border p-2 rounded"
                      min="1"
                      max="365"
                    />
                  </div>
                  <div>
                    <label>Credit Limit (Optional)</label>
                    <input
                      type="number"
                      name="amtlimit"
                      placeholder="Maximum credit amount"
                      className="w-full border p-2 rounded"
                    />
                  </div>
                </>
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

              {/* Address */}
              <div className="col-span-2">
                <label>Address</label>
                <textarea
                  name="address"
                  className="w-full border p-2 rounded"
                ></textarea>
              </div>
              <div>
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label>State</label>
                <select
                  name="region"
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">Select State</option>
                  <option value="andhra_pradesh">Andhra Pradesh</option>
                  <option value="arunachal_pradesh">Arunachal Pradesh</option>
                  <option value="assam">Assam</option>
                  <option value="bihar">Bihar</option>
                  <option value="chhattisgarh">Chhattisgarh</option>
                  <option value="goa">Goa</option>
                  <option value="gujarat">Gujarat</option>
                  <option value="haryana">Haryana</option>
                  <option value="himachal_pradesh">Himachal Pradesh</option>
                  <option value="jharkhand">Jharkhand</option>
                  <option value="karnataka">Karnataka</option>
                  <option value="kerala">Kerala</option>
                  <option value="madhya_pradesh">Madhya Pradesh</option>
                  <option value="maharashtra">Maharashtra</option>
                  <option value="manipur">Manipur</option>
                  <option value="meghalaya">Meghalaya</option>
                  <option value="mizoram">Mizoram</option>
                  <option value="nagaland">Nagaland</option>
                  <option value="odisha">Odisha</option>
                  <option value="punjab">Punjab</option>
                  <option value="rajasthan">Rajasthan</option>
                  <option value="sikkim">Sikkim</option>
                  <option value="tamil_nadu">Tamil Nadu</option>
                  <option value="telangana">Telangana</option>
                  <option value="tripura">Tripura</option>
                  <option value="uttar_pradesh">Uttar Pradesh</option>
                  <option value="uttarakhand">Uttarakhand</option>
                  <option value="west_bengal">West Bengal</option>
                  <option value="andaman_nicobar">
                    Andaman & Nicobar Islands
                  </option>
                  <option value="chandigarh">Chandigarh</option>
                  <option value="dadra_nagar_haveli">
                    Dadra & Nagar Haveli
                  </option>
                  <option value="daman_diu">Daman & Diu</option>
                  <option value="delhi">Delhi</option>
                  <option value="lakshadweep">Lakshadweep</option>
                  <option value="puducherry">Puducherry</option>
                </select>
              </div>
              <div>
                <label>Country</label>
                <input
                  type="text"
                  name="country"
                  defaultValue="India"
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label>Zip</label>
                <input
                  type="text"
                  name="zip"
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label>GST Name</label>
                <input
                  type="text"
                  name="gst_name"
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label>GSTIN</label>
                <input
                  type="text"
                  name="gst_number"
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* Assign Location */}
              <div className="col-span-2">
                <label>Assign Location</label>
                {stations.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="block_location[]"
                      value={s.id}
                    />
                    <span>{s.station_name}</span>
                  </div>
                ))}
              </div>

              {/* File Upload */}
              <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="mb-1 font-semibold text-gray-700">
                    Document 1
                  </label>
                  <input
                    type="file"
                    name="doc1"
                    className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 font-semibold text-gray-700">
                    Document 2
                  </label>
                  <input
                    type="file"
                    name="doc2"
                    className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="mb-1 font-semibold text-gray-700">
                    Document 3
                  </label>
                  <input
                    type="file"
                    name="doc3"
                    className="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Module Permissions */}
              <div className="col-span-2 mt-6 overflow-x-auto bg-white rounded-lg p-4 border">
                <h3 className="text-md font-semibold mb-3">
                  Assign Module Permissions
                </h3>
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
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                      >
                        <td className="p-2 border font-medium">{mod}</td>
                        <td className="p-2 border text-center">
                          <input
                            type="checkbox"
                            checked={permissions[mod].can_view}
                            onChange={() =>
                              handlePermissionChange(mod, "can_view")
                            }
                          />
                        </td>
                        <td className="p-2 border text-center">
                          <input
                            type="checkbox"
                            checked={permissions[mod].can_edit}
                            onChange={() =>
                              handlePermissionChange(mod, "can_edit")
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit / Reset */}
              <div className="col-span-2 flex justify-center gap-4 mt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Submit
                </button>
                <button
                  type="reset"
                  className="px-6 py-2 bg-gray-400 text-white rounded-lg"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
