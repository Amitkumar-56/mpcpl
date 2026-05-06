'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft, FaFlask, FaWarehouse, FaClipboardList,
  FaCheckCircle, FaClock, FaPlus, FaTrash, FaBoxOpen,
  FaVial, FaHistory, FaSpinner, FaMicrochip, FaTools, FaSync,
  FaFilter, FaSearch, FaEdit, FaEye, FaChartBar, FaTruck,
  FaExchangeAlt, FaBarcode, FaMapMarkerAlt, FaUser, FaGasPump,
  FaLevelUpAlt, FaTint, FaWeight, FaRecycle, FaOilCan, FaLeaf,
  FaArrowRight, FaIndustry, FaCog
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function MaterialFlowContent() {
  const [mounted, setMounted] = useState(false);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFlowModal, setShowFlowModal] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [rawRes, finishedRes, tankRes, productionRes] = await Promise.all([
        fetch('/api/manufacturing/raw-materials-other'),
        fetch('/api/manufacturing/finished-goods'),
        fetch('/api/manufacturing/tanks'),
        fetch('/api/manufacturing/production')
      ]);

      const rawData = await rawRes.json();
      const finishedData = await finishedRes.json();
      const tankData = await tankRes.json();
      const productionData = await productionRes.json();

      setRawMaterials(Array.isArray(rawData) ? rawData : []);
      setFinishedGoods(Array.isArray(finishedData) ? finishedData : []);
      setTanks(Array.isArray(tankData) ? tankData : []);
      setProductionHistory(Array.isArray(productionData?.data) ? productionData.data : []);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTankInfo = (tankId) => {
    return tanks.find(t => t.id === tankId);
  };

  const getMaterialFlow = () => {
    const flow = [];

    // Raw materials with their tanks
    rawMaterials.forEach(material => {
      const tank = getTankInfo(material.tank_id);
      if (tank) {
        flow.push({
          id: `raw_${material.id}`,
          name: material.material_name,
          type: 'raw_material',
          category: material.category,
          quantity_kg: parseFloat(material.quantity_kg || 0),
          quantity_litre: parseFloat(material.quantity_litre || 0),
          tank: tank,
          tank_id: material.tank_id,
          batch_number: material.batch_number,
          supplier_name: material.supplier_name,
          icon: <FaFlask className="text-blue-600" />,
          color: 'blue'
        });
      }
    });

    // Finished goods with their tanks
    finishedGoods.forEach(product => {
      const tank = getTankInfo(product.tank_id);
      if (tank) {
        flow.push({
          id: `finished_${product.id}`,
          name: product.product_name,
          type: 'finished_good',
          category: product.category,
          quantity_kg: parseFloat(product.quantity_kg || 0),
          quantity_litre: parseFloat(product.quantity_litre || 0),
          tank: tank,
          tank_id: product.tank_id,
          batch_number: product.batch_number,
          quality_grade: product.quality_grade,
          icon: product.category === 'bio_diesel' ? <FaLeaf className="text-green-600" /> :
            product.category === 'grease' ? <FaOilCan className="text-orange-600" /> :
              <FaRecycle className="text-red-600" />,
          color: product.category === 'bio_diesel' ? 'green' :
            product.category === 'grease' ? 'orange' : 'red'
        });
      }
    });

    return flow;
  };

  const materialFlow = getMaterialFlow();

  const filteredFlow = materialFlow.filter(item => {
    const matchesSearch = item?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      item?.tank?.name?.toLowerCase()?.includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const getProductionFlow = () => {
    const flowMap = new Map();

    productionHistory.forEach(production => {
      const sourceTank = getTankInfo(production.from_tank_id);
      if (sourceTank) {
        production.outputs?.forEach(output => {
          const destTank = getTankInfo(output.to_tank_id);
          if (destTank) {
            const key = `${sourceTank.id}_${destTank.id}`;
            if (!flowMap.has(key)) {
              flowMap.set(key, {
                source: sourceTank,
                destination: destTank,
                totalKg: 0,
                totalLitre: 0,
                batches: []
              });
            }
            const flow = flowMap.get(key);
            flow.totalKg += parseFloat(output.kg_output || 0);
            flow.totalLitre += parseFloat(output.litre_output || 0);
            flow.batches.push({
              productionId: production.id,
              batchNumber: production.batch_number,
              kg: parseFloat(output.kg_output || 0),
              litre: parseFloat(output.litre_output || 0),
              date: production.created_at,
              productName: output.product_name
            });
          }
        });
      }
    });

    return Array.from(flowMap.values());
  };

  const productionFlow = getProductionFlow();

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'methanol': return <FaFlask className="text-blue-600" />;
      case 'bio_diesel': return <FaLeaf className="text-green-600" />;
      case 'grease': return <FaOilCan className="text-orange-600" />;
      case 'waste_material': return <FaRecycle className="text-red-600" />;
      default: return <FaBoxOpen className="text-gray-600" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'methanol': return 'blue';
      case 'bio_diesel': return 'green';
      case 'grease': return 'orange';
      case 'waste_material': return 'red';
      default: return 'gray';
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden font-sans text-slate-900">
      <Toaster position="top-right" />
      <Sidebar activePage="Manufacturing" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-48">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Material Flow Tracking</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete Production Pipeline</p>
              </div>
              <div className="flex gap-2">
                <Link href="/manufacturing/setup" className="flex items-center justify-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100">
                  <FaCog /> Database Setup
                </Link>
                <Link href="/manufacturing/production" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100">
                  <FaIndustry /> New Production
                </Link>
                <button onClick={fetchData} className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                  <FaSync size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaFlask className="text-blue-600" size={16} />
                  <span className="text-sm font-bold text-blue-800">Raw Materials</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{rawMaterials.length}</div>
                <div className="text-xs text-blue-600">Items in stock</div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaBoxOpen className="text-green-600" size={16} />
                  <span className="text-sm font-bold text-green-800">Finished Goods</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{finishedGoods.length}</div>
                <div className="text-xs text-green-600">Products available</div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaWarehouse className="text-purple-600" size={16} />
                  <span className="text-sm font-bold text-purple-800">Total Tanks</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{tanks.length}</div>
                <div className="text-xs text-purple-600">Storage units</div>
              </div>

              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaExchangeAlt className="text-orange-600" size={16} />
                  <span className="text-sm font-bold text-orange-800">Production Batches</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{productionHistory.length}</div>
                <div className="text-xs text-orange-600">Completed batches</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4 sm:p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-100 font-medium text-sm focus:bg-white focus:border-blue-400 outline-none transition-all appearance-none"
                  >
                    <option value="all">All Types</option>
                    <option value="raw_material">Raw Materials</option>
                    <option value="finished_good">Finished Goods</option>
                  </select>
                </div>
                <div className="flex items-center justify-center bg-slate-50 rounded-xl px-4">
                  <span className="text-sm font-bold text-slate-600">Total: {filteredFlow.length} items</span>
                </div>
              </div>
            </div>

            {/* Material Flow Visualization */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Current Material Distribution</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Raw Materials Section */}
                <div>
                  <h3 className="text-md font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <FaFlask className="text-blue-600" />
                    Raw Materials
                  </h3>
                  <div className="space-y-3">
                    {filteredFlow.filter(item => item.type === 'raw_material').map(item => (
                      <div key={item.id} className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <span className="font-medium text-blue-900">{item.name}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-${getCategoryColor(item.category)}-100 text-${getCategoryColor(item.category)}-800`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-blue-600">Weight</div>
                            <div className="font-bold text-blue-900">{item.quantity_kg.toLocaleString()} KG</div>
                          </div>
                          <div>
                            <div className="text-blue-600">Volume</div>
                            <div className="font-bold text-blue-900">{item.quantity_litre.toLocaleString()} LTR</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-blue-700">
                          <div>Tank: {item.tank?.name}</div>
                          {item.batch_number && <div>Batch: {item.batch_number}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Finished Goods Section */}
                <div>
                  <h3 className="text-md font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <FaBoxOpen className="text-green-600" />
                    Finished Goods
                  </h3>
                  <div className="space-y-3">
                    {filteredFlow.filter(item => item.type === 'finished_good').map(item => (
                      <div key={item.id} className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <span className="font-medium text-green-900">{item.name}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-${getCategoryColor(item.category)}-100 text-${getCategoryColor(item.category)}-800`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-green-600">Weight</div>
                            <div className="font-bold text-green-900">{item.quantity_kg.toLocaleString()} KG</div>
                          </div>
                          <div>
                            <div className="text-green-600">Volume</div>
                            <div className="font-bold text-green-900">{item.quantity_litre.toLocaleString()} LTR</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-green-700">
                          <div>Tank: {item.tank?.name}</div>
                          {item.batch_number && <div>Batch: {item.batch_number}</div>}
                          {item.quality_grade && <div>Grade: {item.quality_grade}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Production Flow History */}
            {productionFlow.length > 0 && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Production Flow History</h2>

                <div className="space-y-4">
                  {productionFlow.map((flow, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium text-sm">
                            {flow.source.name}
                          </div>
                          <FaArrowRight className="text-slate-400" />
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-medium text-sm">
                            {flow.destination.name}
                          </div>
                        </div>
                        <div className="text-sm text-slate-600">
                          Total transferred: {flow.totalKg.toLocaleString()} KG / {flow.totalLitre.toLocaleString()} LTR
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {flow.batches.length} batches
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFlowModal(flow)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="View Details"
                      >
                        <FaEye size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#F8FAFF]">
          <Footer />
        </div>
      </div>

      {/* Flow Details Modal */}
      {showFlowModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Production Flow Details</h2>
              <button onClick={() => setShowFlowModal(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-bold">
                  {showFlowModal.source.name}
                </div>
                <FaArrowRight className="text-slate-600 text-xl" />
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold">
                  {showFlowModal.destination.name}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Total: {showFlowModal.totalKg.toLocaleString()} KG / {showFlowModal.totalLitre.toLocaleString()} LTR
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Batch History</h3>
              <div className="space-y-2">
                {showFlowModal.batches.map((batch, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-slate-900">{batch.productName || 'Unknown Product'}</div>
                        <div className="text-sm text-slate-600">Batch: {batch.batchNumber || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{new Date(batch.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{batch.kg.toLocaleString()} KG</div>
                        <div className="font-bold text-slate-900">{batch.litre.toLocaleString()} LTR</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaterialFlowPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-blue-600 text-4xl" />
      </div>
    }>
      <MaterialFlowContent />
    </Suspense>
  );
}
