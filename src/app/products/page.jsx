"use client";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BiEdit, BiShow, BiChevronDown, BiChevronUp } from "react-icons/bi";
import { useSession } from "@/context/SessionContext";
import EntityLogs from "@/components/EntityLogs";

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
  const [expandedProducts, setExpandedProducts] = useState({});
  
  const toggleProductLogs = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

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
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 text-xl sm:text-2xl transition-colors"
              title="Go Back"
            >
              ←
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Products</h1>
            {permissions.can_edit && (
              <button
                onClick={() => router.push("/products/add")}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:from-purple-700 hover:to-purple-600 transition duration-200 text-sm sm:text-base"
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
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-lg shadow-lg bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Codes</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p, idx) => (
                      <React.Fragment key={p.id}>
                        <tr
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
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => toggleProductLogs(p.id)}
                              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mx-auto"
                              title="View Activity Logs"
                            >
                              {expandedProducts[p.id] ? (
                                <>
                                  <BiChevronUp size={20} />
                                  <span className="ml-1 text-sm">Hide Logs</span>
                                </>
                              ) : (
                                <>
                                  <BiChevronDown size={20} />
                                  <span className="ml-1 text-sm">Show Logs</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        {/* Expandable Logs Row */}
                          {expandedProducts[p.id] && (
                            <tr className="bg-gray-50">
                            <td colSpan="5" className="px-6 py-4">
                              <div className="max-w-4xl">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Logs for {p.pname}</h3>
                                <EntityLogs entityType="product" entityId={p.id} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">ID</div>
                        <div className="text-lg font-bold text-purple-600">#{p.id}</div>
                      </div>
                      <div className="flex gap-2">
                        {permissions.can_view && (
                          <button
                            onClick={() => router.push(`/products/${p.id}`)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                            title="View Product"
                          >
                            <BiShow size={18} />
                          </button>
                        )}
                        {permissions.can_edit && (
                          <button
                            onClick={() => router.push(`/products/edit?id=${p.id}`)}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                            title="Edit Product"
                          >
                            <BiEdit size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">Product Name</div>
                      <div className="text-base font-semibold text-gray-900">{p.pname}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Product Codes</div>
                      <div className="text-sm text-gray-700 flex flex-wrap gap-1">
                        {p.pcodes.map((code, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
