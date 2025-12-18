//src/app/transporters/page.jsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";

// Loading component for Suspense fallback
function TransportersLoading() {
  return (
    <div className="flex justify-center items-center min-h-screen text-lg font-semibold">
      Loading transporters...
    </div>
  );
}

// Main transporters content component
function TransportersContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      fetchTransporters();
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Transporters']) {
      const transporterPerms = user.permissions['Transporters'];
      if (transporterPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: transporterPerms.can_view,
          can_edit: transporterPerms.can_edit,
          can_delete: transporterPerms.can_delete
        });
        fetchTransporters();
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Transporters`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions(cachedPerms);
        fetchTransporters();
        return;
      }
    }

    try {
      const moduleName = 'Transporters';
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
        fetchTransporters();
      } else {
        setHasPermission(false);
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    }
  };

  const fetchTransporters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/transporters");
      const data = await response.json();
      if (data.success) setTransporters(data.data);
      else setError("Failed to load transporters");
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission) {
      fetchTransporters();
    }
  }, [hasPermission]);

  // You can still keep a loading state here for the initial load
  if (loading || authLoading) {
    return <TransportersLoading />;
  }

  // Check if user has view permission
  if (!hasPermission) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view Transporters.</p>
            <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Transporters List</h1>
          {permissions.can_edit && (
            <a
              href="/transporters/add-transporter"
              className="bg-purple-700 text-white px-4 py-2 rounded-full shadow hover:bg-purple-800 transition"
            >
              Add Transporter
            </a>
          )}
        </div>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {transporters.length === 0 ? (
            <p className="text-center text-gray-600">No transporters found.</p>
          ) : (
            transporters.map((t) => (
              <div
                key={t.id}
                className="border border-gray-300 rounded-lg p-4 shadow-sm bg-white"
              >
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <th className="w-1/3 text-left text-gray-700">CID</th>
                      <td>{t.id}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Name</th>
                      <td>{t.transporter_name}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Email</th>
                      <td>{t.email}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Phone</th>
                      <td>{t.phone}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Payable</th>
                      <td>₹{Number(t.total_payable).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th className="text-left text-gray-700">Actions</th>
                      <td className="space-x-2">
                        {permissions.can_view && (
                          <a
                            href={`/view-transporter?id=${t.id}`}
                            className="text-blue-600"
                            aria-label="View Transporter"
                          >
                            <i className="bi bi-eye-fill"></i>
                          </a>
                        )}
                        {permissions.can_edit && (
                          <>
                            {permissions.can_view && <span className="text-gray-300">|</span>}
                            <a
                              href={`/edit-transporter?id=${t.id}`}
                              className="text-green-600"
                              aria-label="Edit Transporter"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </a>
                          </>
                        )}
                        {permissions.can_view && (
                          <>
                            {(permissions.can_view || permissions.can_edit) && <span className="text-gray-300">|</span>}
                            <a
                              href={`/transportersinvoice?id=${t.id}`}
                              className="text-red-600"
                              aria-label="View Invoice"
                            >
                              <i className="bi bi-receipt"></i>
                            </a>
                          </>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-white rounded-lg shadow p-4 overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-gray-800 text-left">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Phone</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Payable</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transporters.length > 0 ? (
                transporters.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="p-3 border">{t.transporter_name}</td>
                    <td className="p-3 border">{t.phone}</td>
                    <td className="p-3 border">{t.email}</td>
                    <td className="p-3 border">
                      ₹{Number(t.total_payable).toLocaleString()}
                    </td>
                    <td className="p-3 border space-x-3">
                      {permissions.can_view && (
                        <a
                          href={`/view-transporter?id=${t.id}`}
                          className="text-blue-600"
                          aria-label="View Transporter"
                        >
                          <i className="bi bi-eye-fill"></i>
                        </a>
                      )}
                      {permissions.can_edit && (
                        <>
                          {permissions.can_view && <span className="text-gray-300">|</span>}
                          <a
                            href={`/edit-transporter?id=${t.id}`}
                            className="text-green-600"
                            aria-label="Edit Transporter"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </a>
                        </>
                      )}
                      {permissions.can_view && (
                        <>
                          {(permissions.can_view || permissions.can_edit) && <span className="text-gray-300">|</span>}
                          <a
                            href={`/transportersinvoice?id=${t.id}`}
                            className="text-red-600"
                            aria-label="View Invoice"
                          >
                            <i className="bi bi-receipt"></i>
                          </a>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-gray-600 p-4">
                    No transporters found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Sticky Footer */}
      <Footer />
    </div>
  );
}

// Main page component with Suspense
export default function TransportersPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content with Suspense */}
      <Suspense fallback={<TransportersLoading />}>
        <TransportersContent />
      </Suspense>
    </div>
  );
}