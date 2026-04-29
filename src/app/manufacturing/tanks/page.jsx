"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, 
  FaPlus, 
  FaTrash, 
  FaSearch, 
  FaWarehouse 
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const Header = dynamic(() => import('@/components/Header'), { ssr: false });
const Sidebar = dynamic(() => import('@/components/sidebar'), { ssr: false });
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false });

export default function TankMasterPage() {
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
    fetchTanks();
  }, [fetchTanks]);

  const handleAddTank = async (e) => {
    e.preventDefault();
    if (!newTankName.trim()) {
      toast.error('Please enter a tank name');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/tanks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTankName }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Tank created successfully');
        setNewTankName('');
        fetchTanks();
      } else {
        toast.error(data.error || 'Failed to create tank');
      }
    } catch (error) {
      console.error('Error creating tank:', error);
      toast.error('An error occurred while creating the tank');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTanks = tanks.filter(tank => 
    tank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Toaster position="top-right" />
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar activePage="Manufacturing" />
      </div>

      <div className="lg:ml-64 flex flex-col flex-1 min-h-screen">
        <Header />

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumbs */}
            <nav className="mb-6 flex items-center space-x-2 text-sm text-slate-500">
              <Link href="/dashboard" className="hover:text-blue-600">Home</Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Tank Master</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <FaWarehouse className="text-blue-600" />
                  Tank Master
                </h1>
                <p className="text-slate-500 mt-1">Manage your manufacturing tanks here.</p>
              </div>
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200"
              >
                <FaArrowLeft /> Back
              </button>
            </div>

            {/* Create Tank Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Create New Tank</h2>
              <form onSubmit={handleAddTank} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="Enter Tank Name (e.g. Tank A, Storage 1)" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={newTankName}
                    onChange={(e) => setNewTankName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaPlus />
                  )}
                  Create Tank
                </button>
              </form>
            </div>

            {/* Tank List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-800">Existing Tanks</h2>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search tanks..." 
                    className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">#</th>
                      <th className="px-6 py-4 font-semibold">Tank Name</th>
                      <th className="px-6 py-4 font-semibold">Created Date</th>
                      {/* Actions placeholder if needed later */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center gap-3 text-slate-500">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            Loading tanks...
                          </div>
                        </td>
                      </tr>
                    ) : filteredTanks.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                          {searchTerm ? 'No tanks match your search.' : 'No tanks found. Create your first tank above!'}
                        </td>
                      </tr>
                    ) : (
                      filteredTanks.map((tank, index) => (
                        <tr key={tank.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-500 font-mono text-sm">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{tank.name}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {new Date(tank.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
