"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BiEdit, BiShow } from "react-icons/bi";
import { useSession } from "@/context/SessionContext";

export default function ProductsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_delete: false
  });

  // Check permissions
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  const checkPermissions = async () => {
    if (!user || !user.id) return;

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_delete: true });
      fetchProducts();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Items & Products']) {
      const productPerms = user.permissions['Items & Products'];
      if (productPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: productPerms.can_view,
          can_edit: productPerms.can_edit,
          can_delete: productPerms.can_delete
        });
        fetchProducts();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Items & Products`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchProducts();
        return;
      }
    }

    try {
      const moduleName = 'Items & Products';
      const [viewRes, editRes, deleteRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_delete`)
      ]);

      const [viewData, editData, deleteData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        deleteRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed,
        can_edit: editData.allowed,
        can_delete: deleteData.allowed
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
        fetchProducts();
      } else {
        setHasPermission(false);
        setError('You do not have permission to view products.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setError('Failed to check permissions.');
      setLoading(false);
    }
  };

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


  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Products</h1>
            {permissions.can_edit && (
              <button
                onClick={() => router.push("/products/add")}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-purple-600 transition duration-200"
              >
                Add Product
              </button>
            )}
          </div>

          {authLoading || loading ? (
            <div className="text-gray-500 text-center py-10">Loading...</div>
          ) : !hasPermission ? (
            <div className="text-red-600 text-center py-10">
              {error || 'You do not have permission to view products.'}
            </div>
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
                        {permissions.can_view && (
                          <button
                            onClick={() => router.push(`/products/${p.id}`)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="View Product"
                          >
                            <BiShow size={22} />
                          </button>
                        )}
                        {permissions.can_edit && (
                          <button
                            onClick={() => router.push(`/products/edit?id=${p.id}`)}
                            className="text-green-600 hover:text-green-800 transition"
                            title="Edit Product"
                          >
                            <BiEdit size={22} />
                          </button>
                        )}
                        {!permissions.can_view && !permissions.can_edit && !permissions.can_delete && (
                          <span className="text-gray-400 text-sm">No actions available</span>
                        )}
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
