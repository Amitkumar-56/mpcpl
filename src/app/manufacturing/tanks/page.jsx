"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft, FaPlus, FaSearch, FaWarehouse, FaClipboardList,
  FaExchangeAlt, FaHistory, FaFlask, FaBoxOpen, FaShieldAlt, FaCog,
  FaVial, FaCheckCircle, FaSpinner, FaTools, FaGasPump, FaEdit
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankMasterContent() {
  const [mounted, setMounted] = useState(false);
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTankName, setNewTankName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const fetchTanks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tanks');
      if (response.ok) {
        const data = await response.json();
        setTanks(data);
      } else {
        toast.error('Failed to fetch tanks');
      }
    } catch (error) {
      console.error('Error fetching tanks:', error);
      toast.error('An error occurred while fetching tanks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchTanks();
  }, [fetchTanks]);

  const handleAddTank = async (e) => {
    e.preventDefault();
    if (!newTankName.trim()) { toast.error('Please enter a tank name'); return; }
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/tanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newTankName
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Tank initialized successfully!');
        setNewTankName('');
        fetchTanks();
      } else {
        toast.error(data.error || 'Failed to create tank');
      }
    } catch (error) {
      toast.error('Error creating tank');
    } finally { setIsSubmitting(false); }
  };

  const filteredTanks = (tanks || []).filter(t =>
    t?.name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  );

  const navItems = [
    { href: '/manufacturing/all-tank-stock', label: 'All Tank Stock', icon: <FaWarehouse />, color: 'from-blue-600 to-indigo-600' },
    { href: '/manufacturing/add-tank-stock', label: 'Add Tank Stock', icon: <FaPlus />, color: 'from-emerald-500 to-teal-600' },
    { href: '/manufacturing/tank-stock-requests', label: 'Tank Requests', icon: <FaClipboardList />, color: 'from-violet-500 to-purple-600' },
    { href: '/manufacturing/production', label: 'Production', icon: <FaFlask />, color: 'from-rose-500 to-pink-600' },
    { href: '/manufacturing/production-history', label: 'Production Log', icon: <FaBoxOpen />, color: 'from-slate-600 to-slate-800' },
    { href: '/manufacturing/tank-transfer', label: 'Internal Transfer', icon: <FaExchangeAlt />, color: 'from-orange-500 to-amber-600' },
    { href: '/manufacturing/tank-transfer-history', label: 'Transfer Log', icon: <FaHistory />, color: 'from-cyan-500 to-blue-600' },
    { href: '/manufacturing/security-gate', label: 'Security Gate', icon: <FaShieldAlt />, color: 'from-slate-800 to-black' },
  ];


  return (
    <div className="flex h-screen bg-white overflow-hidden text-gray-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Tank Master Hub</h1>
                <p className="text-gray-600 mt-2">Initialize and track your manufacturing storage assets</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <FaWarehouse size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Assets</p>
                  <p className="text-2xl font-bold text-gray-900">{tanks.length}</p>
                </div>
              </div>
            </div>

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
              {navItems.map((item, idx) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className="flex flex-col items-center justify-center bg-white p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 mb-3`}>
                    {React.cloneElement(item.icon, { size: 18 })}
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24">
              {/* Creation Form */}
              <div className="lg:col-span-5">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                      <FaPlus />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">New Asset</h2>
                      <p className="text-sm text-gray-600">Registration Module</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddTank} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tank Identifier</label>
                      <div className="relative">
                        <FaGasPump className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="e.g. Storage Tank ALPHA-01"
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={newTankName}
                          onChange={(e) => setNewTankName(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <FaCheckCircle />
                          <span>Initialize Tank Asset</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Tank List Table */}
              <div className="lg:col-span-7">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Active Inventory</h2>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Live Asset Synchronization
                      </div>
                    </div>

                    <div className="relative max-w-sm">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search tanks..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Tank Identity</th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan="2" className="px-6 py-12 text-center text-gray-500">
                              Loading tanks...
                            </td>
                          </tr>
                        ) : filteredTanks.length === 0 ? (
                          <tr>
                            <td colSpan="2" className="px-6 py-12 text-center">
                              <div className="text-gray-400 mb-2">
                                <FaWarehouse size={40} />
                              </div>
                              <p className="text-gray-500">No active assets found</p>
                            </td>
                          </tr>
                        ) : filteredTanks.map((tank) => (
                          <tr key={tank.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-600">
                                  {tank.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{tank.name}</div>
                                  <div className="text-sm text-gray-500">ID: TNK-{tank.id.toString().padStart(3, '0')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end gap-2">
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <FaHistory size={12} />
                                  {new Date(tank.created_at).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                                <button className="p-2 rounded border border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-500 transition-colors">
                                  <FaEdit size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-50 p-4 text-center text-sm text-gray-500 border-t border-gray-200">
                    Protected Asset Intelligence System
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default function TankMasterPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    }>
      <TankMasterContent />
    </Suspense>
  );
}
