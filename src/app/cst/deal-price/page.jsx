// src/app/cst/deal-price/page.jsx
'use client';

import CstHeader from "@/components/cstHeader";
import Sidebar from "@/components/cstsidebar";
import Footer from "@/components/Footer";
import { useEffect, useMemo, useState } from "react";

export default function CstDealPricePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);

  const [selectedStation, setSelectedStation] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("customer");
      if (!saved) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(saved);
      // Only main customer allowed
      if (Number(parsed.roleid) !== 1) {
        setError("Sub-user is not allowed to view Deal Prices");
        setLoading(false);
        return;
      }
      setUser(parsed);
    } catch (e) {
      setError("Invalid customer data");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchAllowed = async () => {
      if (!user?.id) return;
      try {
        const cid = user.id;
        const stRes = await fetch(`/api/cst/customer-stations?customer_id=${cid}`, { cache: 'no-store' });
        const stData = await stRes.json();
        setStations(Array.isArray(stData.stations) ? stData.stations : []);
        const prRes = await fetch(`/api/cst/customer-products?customer_id=${cid}`, { cache: 'no-store' });
        const prData = await prRes.json();
        setProducts(Array.isArray(prData.products) ? prData.products : []);
        const dpRes = await fetch(`/api/cst/deal-price?customer_id=${cid}`, { cache: 'no-store' });
        const dpData = await dpRes.json();
        setPrices(Array.isArray(dpData) ? dpData : []);
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchAllowed();
  }, [user?.id]);

  const allowedStationIds = useMemo(() => stations.map(s => s.id), [stations]);
  const allowedProductIds = useMemo(() => products.map(p => p.product_id ?? p.id), [products]);

  const filtered = useMemo(() => {
    return prices
      .filter(p => allowedStationIds.includes(p.station_id))
      .filter(p => allowedProductIds.includes(p.product_id))
      .filter(p => {
        if (!searchText) return true;
        const t = `${p.station_name || ''} ${p.product_name || ''} ${p.sub_product_code || ''}`.toLowerCase();
        return t.includes(searchText.toLowerCase());
      })
      .filter(p => {
        if (selectedStation) return String(p.station_id) === String(selectedStation);
        return true;
      })
      .filter(p => {
        if (selectedProduct) return String(p.product_id) === String(selectedProduct);
        return true;
      })
      .sort((a, b) => {
        const sa = (a.station_name || '').localeCompare(b.station_name || '');
        if (sa !== 0) return sa;
        return (a.product_name || '').localeCompare(b.product_name || '');
      });
  }, [prices, allowedStationIds, allowedProductIds, searchText, selectedStation, selectedProduct]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-2">{error}</div>
          <a href="/cst/cstdashboard" className="bg-blue-600 text-white px-4 py-2 rounded">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="hidden md:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 md:ml-64 min-w-0 min-h-screen">
        <div className="fixed top-0 left-0 md:left-64 right-0 z-40 bg-white">
          <CstHeader />
        </div>
        <main className="pt-16 flex-1 overflow-y-auto bg-gray-100 min-h-0">
          <div className="p-4 md:p-8 pb-28">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Deal Prices</h1>
                <p className="text-gray-600">Only stations and products allowed to this customer</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Station</label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All</option>
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.station_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Product</label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">All</option>
                    {products.map(p => (
                      <option key={p.product_id ?? p.id} value={p.product_id ?? p.id}>
                        {p.product_name ?? p.pname}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">Search</label>
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search station/product/code"
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {filtered.length} of {prices.length}
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    // re-run effect by toggling user to force fetch or call same function
                    (async () => {
                      try {
                        const cid = user.id;
                        const dpRes = await fetch(`/api/cst/deal-price?customer_id=${cid}`, { cache: 'no-store' });
                        const dpData = await dpRes.json();
                        setPrices(Array.isArray(dpData) ? dpData : []);
                      } catch (e) {
                        setError(e.message || "Refresh failed");
                      } finally {
                        setLoading(false);
                      }
                    })();
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border rounded"
                >
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-2/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                      <th className="w-2/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="w-1/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Code</th>
                      <th className="w-1/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((row, idx) => (
                      <tr key={`${row.station_id}-${row.product_id}-${row.sub_product_id}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 break-words">{row.station_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 break-words">{row.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 break-words">{row.sub_product_code || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">₹{Number(row.price || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No deal prices found for the selected filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6">
              <Footer />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
