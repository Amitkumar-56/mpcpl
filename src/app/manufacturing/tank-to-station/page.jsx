'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function TankToStationContent() {
  const [mounted, setMounted] = useState(false);
  const [tankStocks, setTankStocks] = useState([]);
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedTankId, setSelectedTankId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [quantityLitre, setQuantityLitre] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/manufacturing/tank-to-station');
      const data = await response.json();
      if (data.success) {
        setTankStocks(data.tankStocks);
        setStations(data.stations);
        setProducts(data.products);
      } else {
        toast.error('Failed to fetch data: ' + data.error);
      }
    } catch (error) {
      toast.error('Sync error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    setMounted(true);
    fetchData(); 
  }, []);

  const selectedTank = tankStocks.find(t => t.tank_id.toString() === selectedTankId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTankId || !selectedStationId || !selectedProductId || (!quantityKg && !quantityLitre)) {
      return toast.error('Please fill all required fields');
    }

    if (selectedTank) {
      if (quantityKg && parseFloat(quantityKg) > parseFloat(selectedTank.kg_stock)) {
        return toast.error('Quantity exceeds available KG stock');
      }
      if (quantityLitre && parseFloat(quantityLitre) > parseFloat(selectedTank.litre_stock)) {
        return toast.error('Quantity exceeds available Litre stock');
      }
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/manufacturing/tank-to-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tank_id: selectedTankId,
          station_id: selectedStationId,
          product_id: selectedProductId,
          quantity_kg: quantityKg,
          quantity_litre: quantityLitre,
          remarks
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Stock Transferred Successfully');
        setSelectedTankId('');
        setSelectedStationId('');
        setSelectedProductId('');
        setQuantityKg('');
        setQuantityLitre('');
        setRemarks('');
        fetchData(); 
      } else {
        toast.error('Error: ' + data.error);
      }
    } catch (error) {
      toast.error('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Manufacturing" />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-8">Tank to Station Transfer</h1>
            
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Tank</label>
                    <select 
                      required 
                      value={selectedTankId} 
                      onChange={(e) => setSelectedTankId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose Tank</option>
                      {tankStocks.map(tank => (
                        <option key={tank.tank_id} value={tank.tank_id}>
                          {tank.tank_name} {tank.pname ? `(${tank.pname})` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedTank && (
                      <div className="mt-2 text-sm text-gray-600">
                        KG: {selectedTank.kg_stock} | LTR: {selectedTank.litre_stock}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Station</label>
                    <select 
                      required 
                      value={selectedStationId} 
                      onChange={(e) => setSelectedStationId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose Station</option>
                      {stations.map(station => (
                        <option key={station.id} value={station.id}>{station.station_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
                    <select 
                      required 
                      value={selectedProductId} 
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose Product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.pname} {product.codes ? `(${product.codes})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (KG)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter KG" 
                        value={quantityKg}
                        onChange={(e) => setQuantityKg(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (LTR)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter Liters" 
                        value={quantityLitre}
                        onChange={(e) => setQuantityLitre(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea 
                    value={remarks} 
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Transfer Stock'}
                  </button>
                  <button 
                    type="button" 
                    onClick={fetchData}
                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                  >
                    Refresh
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function TankToStationPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>}>
      <TankToStationContent />
    </Suspense>
  );
}
