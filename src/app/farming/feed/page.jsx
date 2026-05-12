'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaLeaf, FaBox, FaBarcode, FaQrcode, FaCheckCircle, FaTrash, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function FeedContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('usage'); // 'usage' or 'inventory'
  const [records, setRecords] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [filterType, setFilterType] = useState('');

  const [form, setForm] = useState({
    type: 'cow', batch_id: '', feed_name: '', quantity: '', unit: 'kg',
    total_cost: '', feed_date: new Date().toISOString().split('T')[0], notes: ''
  });

  const [invForm, setInvForm] = useState({
    feed_name: '', feed_type: 'starter', total_quantity: '', unit: 'kg',
    unit_price: '', supplier: '', arrival_date: new Date().toISOString().split('T')[0],
    expiry_date: '', notes: ''
  });

  const FEEDS = {
    cow: ['Green Fodder', 'Dry Fodder', 'Concentrate Feed', 'Silage', 'Cotton Seed Cake', 'Mineral Mix', 'Jaggery', 'Salt'],
    goat: ['Green Fodder', 'Dry Fodder', 'Grain Mix', 'Tree Leaves', 'Mineral Mix'],
    chicken: ['Layer Feed', 'Broiler Feed', 'Grower Feed', 'Starter Feed', 'Corn', 'Soybean Meal', 'Calcium Shell'],
    fish: ['Floating Feed', 'Sinking Feed', 'Natural Feed', 'Supplementary Feed', 'Rice Bran', 'Mustard Cake'],
    honey: ['Sugar Syrup', 'Pollen Substitute', 'Fondant', 'Bee Candy'],
  };

  const fetchRecords = async () => {
    try {
      const res = await fetch(view === 'usage' ? `/api/farming/feed${filterType ? '?type='+filterType : ''}` : '/api/farming/feed/inventory');
      const data = await res.json();
      if (data.success) {
        if (view === 'usage') setRecords(data.data);
        else setInventory(data.data);
      }
    } catch (e) { toast.error('Fetch failed'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const endpoint = view === 'usage' ? '/api/farming/feed' : '/api/farming/feed/inventory';
      const body = view === 'usage' ? form : invForm;
      const res = await fetch(endpoint, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) 
      });
      const data = await res.json();
      if (data.success) {
        toast.success(view === 'usage' ? 'Feed usage recorded!' : 'Stock added with Tag: ' + data.tag_id);
        setShowForm(false);
        fetchRecords();
      } else toast.error(data.error);
    } catch (e) { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  const printTag = async (item) => {
    const card = document.getElementById(`feed-tag-${item.id}`);
    if (!card) return toast.error('Template missing');
    try {
      toast.loading('Generating Label...', { id: 'tag-print' });
      const canvas = await html2canvas(card, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 10, 10, 60, (canvas.height * 60) / canvas.width);
      pdf.save(`${item.tag_id}_Label.pdf`);
      toast.success('Label ready!', { id: 'tag-print' });
    } catch (e) { toast.error('Print error'); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted) {
      fetchRecords();
      fetch('/api/farming/batches?status=active').then(r => r.json()).then(d => { if (d.success) setBatches(d.data); });
    }
  }, [mounted, view, filterType]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/20 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8"><div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent tracking-tighter">🌾 Feed & Nutrition</h1>
                <div className="flex items-center gap-4 mt-3">
                  <button onClick={() => setView('usage')} className={`text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md hover:scale-105 ${view === 'usage' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-white/20'}`}>Usage Logs</button>
                  <button onClick={() => setView('inventory')} className={`text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md hover:scale-105 ${view === 'inventory' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-white/20'}`}>Inventory Stock</button>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/farming" className="bg-white/80 backdrop-blur-sm border border-white/20 p-4 rounded-2xl shadow-lg hover:bg-white transition-all hover:scale-105">
                  <FaArrowLeft className="text-slate-600" />
                </Link>
                <button onClick={fetchRecords} className="bg-white/80 backdrop-blur-sm border border-white/20 p-4 rounded-2xl shadow-lg hover:bg-white transition-all hover:scale-105"><FaSync className="text-green-600" /></button>
                <button onClick={() => setShowForm(!showForm)} className={`px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-xl flex items-center gap-3 transition-all hover:scale-105 ${view === 'inventory' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white' : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'}`}>
                  <FaPlus /> {view === 'usage' ? 'Record Feeding' : 'Add New Stock'}
                </button>
              </div>
            </div>

            {showForm && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-3 h-8 rounded-full ${view === 'inventory' ? 'bg-gradient-to-b from-emerald-500 to-teal-500' : 'bg-gradient-to-b from-green-500 to-emerald-500'}`} />
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{view === 'usage' ? 'Feeding Record' : 'Stock Intake Entry'}</h2>
                    <p className="text-sm text-slate-600 mt-1">{view === 'usage' ? 'Record feed consumption for your livestock' : 'Add new feed stock to inventory'}</p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {view === 'usage' ? (
                    <>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Animal Type</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, feed_name: '' })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all">
                          <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option>
                        </select></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Feed Item</label>
                        <select required value={form.feed_name} onChange={e => setForm({ ...form, feed_name: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all">
                          <option value="">-- Select --</option>{(FEEDS[form.type] || []).map(f => <option key={f} value={f}>{f}</option>)}
                        </select></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-teal-500 rounded-full"></span>Target Batch</label>
                        <select value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all">
                          <option value="">-- All --</option>{batches.filter(b => b.type === form.type).map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                        </select></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-lime-500 rounded-full"></span>Weight ({form.unit})</label>
                        <input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all" placeholder="0.00" /></div>
                    </>
                  ) : (
                    <>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Feed Name</label>
                        <input value={invForm.feed_name} onChange={e => setInvForm({ ...invForm, feed_name: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all" placeholder="e.g. Corn Mix" /></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-teal-500 rounded-full"></span>Category</label>
                        <select value={invForm.feed_type} onChange={e => setInvForm({ ...invForm, feed_type: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all">
                          <option value="starter">Starter</option><option value="grower">Grower</option><option value="finisher">Finisher</option><option value="supplement">Supplement</option>
                        </select></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-lime-500 rounded-full"></span>Total Weight (kg)</label>
                        <input type="number" value={invForm.total_quantity} onChange={e => setInvForm({ ...invForm, total_quantity: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all" placeholder="0" /></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Unit Price (₹)</label>
                        <input type="number" value={invForm.unit_price} onChange={e => setInvForm({ ...invForm, unit_price: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all" placeholder="0" /></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Arrival Date</label>
                        <input type="date" value={invForm.arrival_date} onChange={e => setInvForm({ ...invForm, arrival_date: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all" /></div>
                      <div><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-teal-500 rounded-full"></span>Expiry Date</label>
                        <input type="date" value={invForm.expiry_date} onChange={e => setInvForm({ ...invForm, expiry_date: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all" /></div>
                      <div className="col-span-2"><label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block ml-1 flex items-center gap-2"><span className="w-2 h-2 bg-lime-500 rounded-full"></span>Supplier / Vendor</label>
                        <input value={invForm.supplier} onChange={e => setInvForm({ ...invForm, supplier: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-green-100 bg-white/60 backdrop-blur-sm focus:bg-white font-bold text-xs outline-none hover:bg-white transition-all" placeholder="e.g. Kisan Feed Store" /></div>
                    </>
                  )}
                  <div className="lg:col-span-4 flex justify-end gap-4 mt-8">
                    <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider text-slate-600 bg-white/60 backdrop-blur-sm border border-white/20 hover:bg-white transition-all hover:scale-105">Cancel</button>
                    <button type="submit" disabled={submitting} className={`px-12 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider text-white shadow-xl flex items-center gap-3 transition-all hover:scale-105 ${view === 'inventory' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>
                      {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> {view === 'usage' ? 'Save Record' : 'Register Stock'}</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 border-b border-white/20">
                      {view === 'usage' ? 
                        ['Date', 'Type', 'Feed Item', 'Batch', 'Qty', 'Cost'].map(h => <th key={h} className="text-xs font-bold text-slate-600 uppercase px-6 py-5 text-left tracking-wider">{h}</th>) :
                        ['ID / Tag', 'Feed Name', 'Type', 'In-Stock', 'Expiry', 'Actions'].map(h => <th key={h} className="text-xs font-bold text-slate-600 uppercase px-6 py-5 text-left tracking-wider">{h}</th>)
                      }
                    </tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {view === 'usage' ? (
                        records.length === 0 ? <tr><td colSpan={6} className="text-center py-20">
                          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">No usage logs found</div>
                            <div className="text-xs text-slate-400 mt-2">Start recording feed consumption</div>
                          </div>
                        </td></tr> :
                        records.map(r => (
                          <tr key={r.id} className="hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all">
                            <td className="px-6 py-5 text-xs font-semibold text-slate-600">{new Date(r.feed_date).toLocaleDateString('en-IN')}</td>
                            <td className="px-6 py-5 text-xs font-bold uppercase bg-gradient-to-r from-green-100 to-emerald-100 px-3 py-2 rounded-lg text-green-700">{r.type}</td>
                            <td className="px-6 py-5 text-xs font-bold text-slate-800">{r.feed_name}</td>
                            <td className="px-6 py-5 text-xs text-slate-500">{r.batch_name || '-'}</td>
                            <td className="px-6 py-5 text-xs font-bold text-slate-900">{r.quantity} {r.unit}</td>
                            <td className="px-6 py-5 text-xs font-bold text-rose-600">₹{Number(r.total_cost || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        inventory.length === 0 ? <tr><td colSpan={6} className="text-center py-20">
                          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Inventory empty</div>
                            <div className="text-xs text-slate-400 mt-2">Add new feed stock to get started</div>
                          </div>
                        </td></tr> :
                        inventory.map(item => (
                          <tr key={item.id} className="hover:bg-gradient-to-r hover:from-green-50/30 hover:to-emerald-50/30 transition-all">
                            <td className="px-6 py-5">
                               <p className="text-xs font-bold text-emerald-600 font-mono tracking-wider">{item.tag_id}</p>
                               <p className="text-xs text-slate-500 mt-1">{new Date(item.arrival_date).toLocaleDateString()}</p>
                            </td>
                            <td className="px-6 py-5 text-xs font-bold text-slate-900">{item.feed_name}</td>
                            <td className="px-6 py-5"><span className="px-3 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg text-xs font-bold uppercase tracking-wider text-emerald-700">{item.feed_type}</span></td>
                            <td className="px-6 py-5">
                               <p className="text-xs font-bold text-slate-900">{item.remaining_quantity} / {item.total_quantity} {item.unit}</p>
                               <div className="w-24 h-2 bg-white/60 rounded-full mt-2 overflow-hidden border border-green-100">
                                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${(item.remaining_quantity / item.total_quantity) * 100}%` }} />
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <p className={`text-xs font-bold ${new Date(item.expiry_date) < new Date() ? 'text-rose-600' : 'text-slate-500'}`}>
                                 {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                               </p>
                            </td>
                            <td className="px-6 py-5">
                               <button onClick={() => printTag(item)} className="p-3 bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl text-slate-700 hover:bg-gradient-to-r hover:from-emerald-600 hover:to-teal-600 hover:text-white transition-all shadow-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                  <FaQrcode /> Tag
                               </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary Footer */}
                <div className="px-8 py-6 bg-gradient-to-r from-green-50/50 to-emerald-50/50 flex justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-wider border-t border-white/20">
                  <span>Showing {view === 'usage' ? records.length : inventory.length} Entries</span>
                  <span className="flex items-center gap-4">
                    <span className="text-slate-400">Last updated: {new Date().toLocaleTimeString('en-IN')}</span>
                    {view === 'usage' && <span className="text-rose-600">Total Expense: ₹{records.reduce((s, r) => s + Number(r.total_cost || 0), 0).toLocaleString()}</span>}
                  </span>
                </div>
              </div>

            {/* Hidden Tag Templates for Inventory */}
            <div className="absolute left-[-9999px]">
               {inventory.map(item => (
                 <div key={item.id} id={`feed-tag-${item.id}`} className="w-[300px] p-6 bg-white border-4 border-slate-900 rounded-[2rem] text-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">FEED INVENTORY TAG</p>
                    <h3 className="text-2xl font-black text-slate-900 mb-1">{item.feed_name}</h3>
                    <p className="text-[9px] font-bold text-emerald-600 font-mono mb-6">{item.tag_id}</p>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl mb-6 flex flex-col gap-2">
                       <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Weight</span>
                          <span className="text-[9px] font-black text-slate-900">{item.total_quantity} {item.unit}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Arrived</span>
                          <span className="text-[9px] font-black text-slate-900">{new Date(item.arrival_date).toLocaleDateString()}</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-6 border-t border-slate-100 pt-6">
                       <div className="flex-1 flex flex-col items-center border-r border-slate-100 pr-4">
                          <FaBarcode className="text-4xl text-slate-900 mb-1" />
                          <p className="text-[8px] font-mono font-black text-slate-900 tracking-[0.2em]">{item.tag_id}</p>
                       </div>
                       <div className="text-center">
                          <img 
                             src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/farming/feed/profile/' + item.tag_id : '')}`}
                             alt="QR"
                             className="w-12 h-12 mix-blend-multiply"
                          />
                          <p className="text-[5px] font-black text-slate-400 mt-1 uppercase">Scan for Stock</p>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

          </div></div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function FeedPage() { return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-slate-900 text-4xl mx-auto" /></div>}><FeedContent /></Suspense>; }
