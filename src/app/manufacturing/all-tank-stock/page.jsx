'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaPlus, FaSearch, FaWarehouse, FaSync, 
  FaSpinner, FaMinus
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function AllTankStockContent() {
  const [mounted, setMounted] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setMounted(true);
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/manufacturing/all-tank-stock');
        const data = await response.json();
        setStocks(data.success ? data.data : []);
      } catch (error) {
        toast.error('Failed to sync stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
  }, []);

  const filteredStocks = (stocks || []).filter(stock => 
    stock?.tank_name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 pb-48">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-xl mb-6">
                <FaWarehouse className="text-white text-2xl" />
              </div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">Tank Inventory</h1>
              <p className="text-slate-500 font-medium">Monitor and manage your tank stock levels</p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search tanks by name..." 
                    className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-700 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Link 
                href="/manufacturing/add-tank-stock" 
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
              >
                <FaPlus size={16} />
                Add Stock
              </Link>
            </div>

            {/* Tank Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tank Name</th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">KG Stock</th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Litre Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-slate-100 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-slate-100 rounded"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-slate-100 rounded"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredStocks.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-12">
                          <FaWarehouse className="text-slate-200 text-5xl mx-auto mb-4" />
                          <p className="text-slate-400 font-medium">No stock records found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStocks.map((stock) => {
                        const kgStock = parseFloat(stock?.kg_stock || 0);
                        const litreStock = parseFloat(stock?.litre_stock || 0);

                        const getStockColor = (value) => {
                          if (value > 0) return 'bg-green-100 text-green-800';
                          if (value < 0) return 'bg-red-100 text-red-800';
                          return 'bg-yellow-100 text-yellow-800';
                        };

                        return (
                          <tr key={stock.tank_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                                  {stock?.tank_name?.[0] || 'T'}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-slate-900">{stock?.tank_name || 'Unnamed Tank'}</div>
                                  <div className="text-xs text-slate-500">ID: #{stock?.tank_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                                  <FaPlus size={10} />
                                </button>
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockColor(kgStock)}`}>
                                  {kgStock.toLocaleString()}
                                </span>
                                <button className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                                  <FaMinus size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                                  <FaPlus size={10} />
                                </button>
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockColor(litreStock)}`}>
                                  {litreStock.toLocaleString()}
                                </span>
                                <button className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                                  <FaMinus size={10} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
        
        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-lg border-t border-slate-100">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function AllTankStockPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    }>
      <AllTankStockContent />
    </Suspense>
  );
}
