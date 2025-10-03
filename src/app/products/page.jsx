"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BiEdit, BiShow, BiTrash } from "react-icons/bi";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const deleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Products</h1>
            <button
              onClick={() => router.push("/products/add")}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-purple-600 transition duration-200"
            >
              Add Product
            </button>
          </div>

          {loading ? (
            <div className="text-gray-500 text-center py-10">Loading...</div>
          ) : error ? (
            <div className="text-red-600 text-center py-10">{error}</div>
          ) : (
            <div className="overflow-x-auto rounded-lg shadow-lg bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Codes</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={`transition duration-150 ${
                        idx % 2 === 0 ? "bg-gray-50 hover:bg-gray-100" : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      <td className="px-6 py-4 text-gray-700">{p.id}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{p.pname}</td>
                      <td className="px-6 py-4 text-gray-600">{p.pcodes.join(", ")}</td>
                      <td className="px-6 py-4 flex justify-center gap-4">
                        <button
                          onClick={() => router.push(`/products/${p.id}`)}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          <BiShow size={22} />
                        </button>
                        <button
                                          

                          onClick={() => router.push(`/products/edit?id=${p.id}`)}
                          className="text-green-600 hover:text-green-800 transition"
                        >
                          <BiEdit size={22} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <BiTrash size={22} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
