'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaPhone, FaMapMarkerAlt, FaStethoscope, FaUserMd, FaArrowLeft, FaSave } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function DoctorsContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', contact_number: '', address: '', clinic_name: '', specialization: '' });

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/farming/doctors');
      const data = await res.json();
      if (data.success) setDoctors(data.data);
    } catch (e) { toast.error('Failed to load doctors'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchDoctors(); }, [mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/doctors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Doctor registered!');
        setForm({ name: '', contact_number: '', address: '', clinic_name: '', specialization: '' });
        setShowForm(false);
        fetchDoctors();
      } else toast.error(data.error);
    } catch (e) { toast.error('Error'); }
    finally { setSubmitting(false); }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">👨‍⚕️ Veterinary Doctors</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medical Professionals & Vets</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchDoctors} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                  <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                    {showForm ? '✕ Close' : <><FaPlus /> Add Doctor</>}
                  </button>
                  <Link href="/farming" className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"><FaArrowLeft /> Back</Link>
                </div>
              </div>

              {showForm && (
                <div className="bg-white rounded-3xl shadow-xl border border-blue-100 p-6 mb-8 transform transition-all animate-in fade-in slide-in-from-top-4 duration-300">
                  <h2 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-6 flex items-center gap-2">🩺 Register New Doctor</h2>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Doctor Name *</label>
                      <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" placeholder="Dr. John Doe" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Contact Number *</label>
                      <input required value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" placeholder="+91..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Specialization</label>
                      <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" placeholder="Cow Expert, Surgeon..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Clinic Name</label>
                      <input value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" placeholder="City Pet Clinic" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Clinic Address</label>
                      <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className="w-full p-3 rounded-xl border border-slate-200 font-bold text-xs" placeholder="Full address..." />
                    </div>
                    <div className="md:col-span-2">
                      <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                        {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave /> Save Doctor Profile</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
              ) : (
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Doctor Name', 'Specialization', 'Contact', 'Clinic / Address', 'Status', 'Action'].map((h, i) => (
                            <th key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-6 py-4 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {doctors.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-20 text-xs text-slate-400 font-bold uppercase tracking-widest">No doctors registered yet.</td></tr>
                        ) : (
                          doctors.map(d => (
                            <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <FaUserMd />
                                  </div>
                                  <span className="text-sm font-black text-slate-900">{d.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">{d.specialization || 'General Vet'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                                  <FaPhone className="text-[10px] text-slate-400" />
                                  {d.contact_number}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="max-w-xs">
                                  <p className="text-xs font-bold text-slate-700 truncate">{d.clinic_name || '-'}</p>
                                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1"><FaMapMarkerAlt /> {d.address || 'N/A'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${d.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                  {d.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <button className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200 transition-colors"><FaSync className="text-[10px]" /></button>
                                  <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-blue-700 shadow-md">Edit</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function DoctorsPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><DoctorsContent /></Suspense>;
}
