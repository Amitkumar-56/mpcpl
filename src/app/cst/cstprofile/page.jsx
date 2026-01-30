"use client";
import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";

export default function CstProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("customer") : null;
    if (!saved) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      fetchProfile(parsed.id);
    } catch {
      setError("Invalid customer data");
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (id) => {
    try {
      const res = await fetch(`/api/cst/profile?customer_id=${id}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch profile");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-2">{error}</div>
          <a href="/cst/login" className="bg-blue-600 text-white px-4 py-2 rounded">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <CstHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">My Profile</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <div className="font-medium text-gray-900">{profile?.name || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <div className="font-medium text-gray-900">{profile?.email || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <div className="font-medium text-gray-900">{profile?.phone || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <div className="font-medium text-gray-900">
                  {profile?.status === 1 || profile?.status === "1" || profile?.status === "active" ? "Active" : "Inactive"}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Company ID</label>
                <div className="font-medium text-gray-900">{profile?.com_id || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Client Type</label>
                <div className="font-medium text-gray-900">
                  {profile?.client_type === 2 || profile?.client_type === '2' ? 'Postpaid' :
                    profile?.client_type === 1 || profile?.client_type === '1' ? 'Prepaid' :
                      profile?.client_type === 3 || profile?.client_type === '3' ? 'Day Limit' : '-'}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Day Limit</label>
                <div className="font-medium text-gray-900">{profile?.day_limit || "-"}</div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Role</label>
                <div className="font-medium text-gray-900">{profile?.role_name || profile?.roleid || "-"}</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-500">Allowed Stations</label>
                <div className="font-medium text-gray-900">
                  {profile?.allowed_stations || profile?.blocklocation || "-"}
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
