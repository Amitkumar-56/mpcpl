'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaSave, FaLeaf, FaBox, FaBarcode, FaQrcode, FaCheckCircle, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function FeedContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      const res = await fetch(view === 'usage' ? `/api/farming/feed${filterType ? '?type='+filterType : ''}` : '/api/farming/feed/inventory');
      const data = await res.json();
      if (data.success) {
        if (view === 'usage') setRecords(data.data);
        else setInventory(data.data);
      }
    } catch (e) { toast.error('Fetch failed'); }
    finally { setLoading(false); }
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
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8"><div className="max-w-6xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">🌾 Feed & Nutrition</h1>
                <div className="flex items-center gap-4 mt-2">
                  <button onClick={() => setView('usage')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${view === 'usage' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Usage Logs</button>
                  <button onClick={() => setView('inventory')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${view === 'inventory' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Inventory Stock</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchRecords} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={() => setShowForm(!showForm)} className={`px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3 transition-all ${view === 'inventory' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                  <FaPlus /> {view === 'usage' ? 'Record Feeding' : 'Add New Stock'}
                </button>
              </div>
            </div>

            {showForm && (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 mb-8 animate-in slide-in-from-top-4 duration-500">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-3">
                  <div className={`w-2 h-6 rounded-full ${view === 'inventory' ? 'bg-emerald-500' : 'bg-slate-900'}`} />
                  {view === 'usage' ? 'Feeding Record' : 'Stock Intake Entry'}
                </h2>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {view === 'usage' ? (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Animal Type</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, feed_name: '' })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none">
                          <option value="cow">🐄 Cow</option><option value="goat">🐐 Goat</option><option value="chicken">🐔 Chicken</option><option value="fish">🐟 Fish</option>
                        </select></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Feed Item</label>
                        <select required value={form.feed_name} onChange={e => setForm({ ...form, feed_name: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none">
                          <option value="">-- Select --</option>{(FEEDS[form.type] || []).map(f => <option key={f} value={f}>{f}</option>)}
                        </select></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Target Batch</label>
                        <select value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none">
                          <option value="">-- All --</option>{batches.filter(b => b.type === form.type).map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                        </select></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Weight ({form.unit})</label>
                        <input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none" placeholder="0.00" /></div>
                    </>
                  ) : (
                    <>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Feed Name</label>
                        <input value={invForm.feed_name} onChange={e => setInvForm({ ...invForm, feed_name: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none" placeholder="e.g. Corn Mix" /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Category</label>
                        <select value={invForm.feed_type} onChange={e => setInvForm({ ...invForm, feed_type: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none">
                          <option value="starter">Starter</option><option value="grower">Grower</option><option value="finisher">Finisher</option><option value="supplement">Supplement</option>
                        </select></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Total Weight (kg)</label>
                        <input type="number" value={invForm.total_quantity} onChange={e => setInvForm({ ...invForm, total_quantity: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none" placeholder="0" /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Unit Price (₹)</label>
                        <input type="number" value={invForm.unit_price} onChange={e => setInvForm({ ...invForm, unit_price: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none" placeholder="0" /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Arrival Date</label>
                        <input type="date" value={invForm.arrival_date} onChange={e => setInvForm({ ...invForm, arrival_date: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none" /></div>
                      <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Expiry Date</label>
                        <input type="date" value={invForm.expiry_date} onChange={e => setInvForm({ ...invForm, expiry_date: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none" /></div>
                      <div className="col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Supplier / Vendor</label>
                        <input value={invForm.supplier} onChange={e => setInvForm({ ...invForm, supplier: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/50 focus:bg-white font-bold text-xs outline-none" placeholder="e.g. Kisan Feed Store" /></div>
                    </>
                  )}
                  <div className="lg:col-span-4 flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                    <button type="submit" disabled={submitting} className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl flex items-center gap-3 transition-all ${view === 'inventory' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                      {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> {view === 'usage' ? 'Save Record' : 'Register Stock'}</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-slate-900 text-4xl" /></div> : (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-slate-50">
                      {view === 'usage' ? 
                        ['Date', 'Type', 'Feed Item', 'Batch', 'Qty', 'Cost'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-6 py-5 text-left tracking-widest">{h}</th>) :
                        ['ID / Tag', 'Feed Name', 'Type', 'In-Stock', 'Expiry', 'Actions'].map(h => <th key={h} className="text-[9px] font-black text-slate-400 uppercase px-6 py-5 text-left tracking-widest">{h}</th>)
                      }
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {view === 'usage' ? (
                        records.length === 0 ? <tr><td colSpan={6} className="text-center py-20 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No usage logs found</td></tr> :
                        records.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-6 py-5 text-xs font-bold text-slate-400">{new Date(r.feed_date).toLocaleDateString('en-IN')}</td>
                            <td className="px-6 py-5 text-xs font-black uppercase text-slate-900">{r.type}</td>
                            <td className="px-6 py-5 text-xs font-bold text-slate-700">{r.feed_name}</td>
                            <td className="px-6 py-5 text-xs text-slate-400">{r.batch_name || '-'}</td>
                            <td className="px-6 py-5 text-xs font-black text-slate-900">{r.quantity} {r.unit}</td>
                            <td className="px-6 py-5 text-xs font-black text-rose-500">₹{Number(r.total_cost || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        inventory.length === 0 ? <tr><td colSpan={6} className="text-center py-20 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Inventory empty</td></tr> :
                        inventory.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-6 py-5">
                               <p className="text-[10px] font-black text-emerald-600 font-mono tracking-wider">{item.tag_id}</p>
                               <p className="text-[8px] text-slate-400 mt-0.5">{new Date(item.arrival_date).toLocaleDateString()}</p>
                            </td>
                            <td className="px-6 py-5 text-xs font-black text-slate-900">{item.feed_name}</td>
                            <td className="px-6 py-5"><span className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500">{item.feed_type}</span></td>
                            <td className="px-6 py-5">
                               <p className="text-xs font-black text-slate-900">{item.remaining_quantity} / {item.total_quantity} {item.unit}</p>
                               <div className="w-24 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${(item.remaining_quantity / item.total_quantity) * 100}%` }} />
                               </div>
                            </td>
                            <td className="px-6 py-5">
                               <p className={`text-[10px] font-black ${new Date(item.expiry_date) < new Date() ? 'text-rose-500' : 'text-slate-400'}`}>
                                 {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                               </p>
                            </td>
                            <td className="px-6 py-5">
                               <button onClick={() => printTag(item)} className="p-3 bg-white border border-slate-100 rounded-xl text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
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
                <div className="px-8 py-5 bg-slate-50 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Showing {view === 'usage' ? records.length : inventory.length} Entries</span>
                  {view === 'usage' && <span className="text-rose-500">Total Expense: ₹{records.reduce((s, r) => s + Number(r.total_cost || 0), 0).toLocaleString()}</span>}
                </div>
              </div>
            )}

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
