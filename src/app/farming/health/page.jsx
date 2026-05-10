'use client';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FaSpinner, FaSync, FaPlus, FaStethoscope, FaUserMd, FaArrowLeft, FaSave, FaHistory, FaThermometerHalf, FaFileMedical, FaDownload, FaBiohazard, FaTint, FaEnvelope } from 'react-icons/fa';
import { useSession } from '@/context/SessionContext';
import { toast, Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Footer from '@/components/Footer';

function HealthContent() {
  const { user } = useSession();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [form, setForm] = useState({
    animal_id: '', type: 'cow', doctor_id: '', treatment_type: 'checkup',
    disease_name: '', medicine_name: '', dosage: '', cost: '',
    treatment_date: new Date().toISOString().split('T')[0],
    next_followup: '', symptoms: '', notes: '',
    temperature: '', blood_report: '', recipient_email: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resH, resD, resA] = await Promise.all([
        fetch(`/api/farming/health?page=${page}&limit=10`),
        fetch('/api/farming/doctors'),
        fetch('/api/farming/animals?status=active&limit=100')
      ]);

      const [dataH, dataD, dataA] = await Promise.all([resH.json(), resD.json(), resA.json()]);

      if (dataH.success) {
        setRecords(dataH.data);
        setTotalPages(dataH.pagination?.totalPages || 1);
        setTotalRecords(dataH.pagination?.total || 0);
      }
      if (dataD.success) setDoctors(dataD.data);
      if (dataA.success) setAnimals(dataA.data);
    } catch (e) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const fetchDiseases = async (type) => {
    try {
      const res = await fetch(`/api/farming/diseases?type=${type}`);
      const data = await res.json();
      if (data.success) setDiseases(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchData(); }, [mounted, page]);
  useEffect(() => { if (mounted && form.type) fetchDiseases(form.type); }, [mounted, form.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/farming/health', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Medical record saved!');
        if (data.fever_detected) {
          toast('⚠️ High Fever Detected!', { icon: '🔥', duration: 5000 });
        }
        setShowForm(false);
        setForm({ ...form, animal_id: '', disease_name: '', medicine_name: '', cost: '', symptoms: '', notes: '', temperature: '', blood_report: '' });
        fetchData();
      } else toast.error(data.error);
    } catch (e) { toast.error('Error saving report'); }
    finally { setSubmitting(false); }
  };

  const handleDownloadPDF = (r) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // --- HELPER: DECORATIVE CORNER ---
      const drawCorner = (x, y, rotation) => {
        doc.setDrawColor(5, 150, 105);
        doc.setLineWidth(2);
        doc.saveGraphicsState();
        // Simple L-shape corner
        if (rotation === 0) { // Top-Left
          doc.line(x, y, x + 20, y);
          doc.line(x, y, x, y + 20);
        } else if (rotation === 90) { // Top-Right
          doc.line(x, y, x - 20, y);
          doc.line(x, y, x, y + 20);
        } else if (rotation === 180) { // Bottom-Right
          doc.line(x, y, x - 20, y);
          doc.line(x, y, x, y - 20);
        } else if (rotation === 270) { // Bottom-Left
          doc.line(x, y, x + 20, y);
          doc.line(x, y, x, y - 20);
        }
        doc.restoreGraphicsState();
      };

      // --- BACKGROUND ---
      doc.setFillColor(252, 252, 253);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Decorative Corners
      drawCorner(10, 10, 0);
      drawCorner(pageWidth - 10, 10, 90);
      drawCorner(pageWidth - 10, pageHeight - 10, 180);
      drawCorner(10, pageHeight - 10, 270);

      // --- HEADER ---
      doc.setFillColor(15, 23, 42);
      doc.rect(15, 15, pageWidth - 30, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text("MPCPL FARMING", pageWidth / 2, 35, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(5, 150, 105);
      doc.text("HEALTH SURVEILLANCE & VETERINARY DIAGNOSTICS", pageWidth / 2, 42, { align: 'center' });

      // --- MAIN CONTENT AREA ---
      let currentY = 70;

      // 1. ANIMAL PROFILE TABLE
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, pageWidth - 30, 8, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("ANIMAL PROFILE DATA", 20, currentY + 5.5);

      currentY += 8;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);

      const drawTableRow = (y, label1, val1, label2, val2) => {
        doc.line(15, y, pageWidth - 15, y);
        doc.line(pageWidth / 2, y, pageWidth / 2, y + 10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label1, 20, y + 6);
        doc.text(label2, (pageWidth / 2) + 5, y + 6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(val1 || "N/A", 60, y + 6);
        doc.text(val2 || "N/A", (pageWidth / 2) + 45, y + 6);
      };

      drawTableRow(currentY, "TAG ID:", r.animal_tag, "SPECIES:", r.type.toUpperCase());
      currentY += 10;
      drawTableRow(currentY, "ANIMAL NAME:", r.animal_name, "RECORD ID:", `#${r.id.toString().padStart(6, '0')}`);
      currentY += 10;
      drawTableRow(currentY, "TEMPERATURE:", `${r.temperature || 'N/A'} °F`, "BLOOD REPORT:", r.blood_report || "N/A");
      currentY += 10;
      doc.line(15, currentY, pageWidth - 15, currentY);

      // 2. DIAGNOSTIC ANALYSIS
      currentY += 15;
      doc.setFillColor(15, 23, 42);
      doc.rect(15, currentY, pageWidth - 30, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text("CLINICAL DIAGNOSTIC ANALYSIS", 20, currentY + 5.5);

      currentY += 15;
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text("HEALTH STATUS:", 20, currentY);

      const isSick = r.disease_name && r.disease_name !== '';
      doc.setFillColor(isSick ? 220 : 5, isSick ? 38 : 150, isSick ? 38 : 105);
      doc.roundedRect(60, currentY - 5, 40, 7, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(isSick ? "UNDER TREATMENT" : "OPTIMAL HEALTH", 80, currentY, { align: 'center' });

      currentY += 12;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.text("PRIMARY DIAGNOSIS:", 20, currentY);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(r.disease_name || "NO CLINICAL DISORDER DETECTED", 60, currentY);

      currentY += 10;
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text("CLINICAL SYMPTOMS:", 20, currentY);
      doc.setTextColor(15, 23, 42);
      const symptomsSplit = doc.splitTextToSize(r.symptoms || "Standard healthy baseline. No external abnormalities observed.", pageWidth - 80);
      doc.text(symptomsSplit, 60, currentY);

      currentY += (symptomsSplit.length * 5) + 10;

      // 3. TREATMENT & PRESCRIPTION
      doc.setFillColor(241, 245, 249);
      doc.rect(15, currentY, pageWidth - 30, 8, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text("TREATMENT PROTOCOL & MEDICINES", 20, currentY + 5.5);

      currentY += 15;
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text("MEDICATION LIST:", 20, currentY);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      const medsSplit = doc.splitTextToSize(r.medicine_name || "No medication required at this stage.", pageWidth - 80);
      doc.text(medsSplit, 60, currentY);

      currentY += (medsSplit.length * 5) + 10;
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text("TREATMENT TYPE:", 20, currentY);
      doc.setTextColor(15, 23, 42);
      doc.text(r.treatment_type.toUpperCase(), 60, currentY);

      // --- FINANCIALS & SIGN-OFF ---
      currentY = pageHeight - 75;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(15, currentY, pageWidth - 15, currentY);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL SERVICE FEE", 20, currentY + 10);
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`INR ${Number(r.cost).toLocaleString('en-IN')}.00`, 20, currentY + 18);

      // Signature Area
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("VETERINARY OFFICER", pageWidth - 60, currentY + 10);
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(r.doctor_name || "Signatory", pageWidth - 60, currentY + 25);
      doc.setDrawColor(203, 213, 225);
      doc.line(pageWidth - 65, currentY + 20, pageWidth - 20, currentY + 20);

      // Official Footer
      doc.setFillColor(15, 23, 42);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text("CONFIDENTIAL MEDICAL RECORD | MPCPL FARMING SOLUTIONS | GENERATED: " + new Date().toLocaleString(), pageWidth / 2, pageHeight - 7, { align: 'center' });

      doc.save(`MPCPL_HEALTH_REPORT_${r.animal_tag}.pdf`);
      toast.success('Ultra-HD Report Generated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleSendEmail = async (r) => {
    const email = prompt("Enter recipient email (Leave blank for Admin only):");
    if (email === null) return;

    try {
      toast.loading("Sending report...");
      const res = await fetch('/api/farming/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "Animal Health Report",
          recipient_email: email || '',
          data: [
            { label: 'Date', value: new Date(r.treatment_date).toLocaleDateString() },
            { label: 'Animal Tag', value: r.animal_tag },
            { label: 'Species', value: r.type },
            { label: 'Doctor', value: r.doctor_name },
            { label: 'Temperature', value: r.temperature ? r.temperature + '°F' : 'N/A' },
            { label: 'Blood Report', value: r.blood_report || 'N/A' },
            { label: 'Diagnosis', value: r.disease_name || 'Healthy' },
            { label: 'Examination', value: r.treatment_type },
            { label: 'Symptoms', value: r.symptoms },
            { label: 'Medicines', value: r.medicine_name }
          ]
        })
      });
      const data = await res.json();
      toast.dismiss();
      if (data.success) toast.success("Report sent successfully!");
      else toast.error(data.error);
    } catch (e) { toast.dismiss(); toast.error("Failed to send email"); }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFF] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header title="Farming CRM" />
        <main className="flex-1 overflow-y-auto pb-32">
          <div className="p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">Health & Veterinary</h1>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <span className="w-8 h-[2px] bg-emerald-600"></span> Live Diagnostics & Records
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={fetchData} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-600 hover:text-emerald-600 active:scale-95"><FaSync className={loading ? 'animate-spin' : ''} /></button>
                  {(Number(user?.role) === 5 || Number(user?.role) === 2) && (
                    <button onClick={() => setShowForm(!showForm)} className={`${showForm ? 'bg-slate-800' : 'bg-emerald-600'} text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:shadow-emerald-200 transition-all flex items-center gap-3 active:scale-95`}>
                      {showForm ? '✕ Close Portal' : <><FaPlus className="text-xs" /> New Examination</>}
                    </button>
                  )}
                  <Link href="/farming/diseases" className="bg-blue-50 border border-blue-100 text-blue-600 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 active:scale-95">
                    <FaBiohazard className="text-xs" /> Disease Guide
                  </Link>
                  <Link href="/farming" className="bg-white border border-slate-200 text-slate-900 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:scale-95">
                    <FaArrowLeft className="text-xs" /> Dashboard
                  </Link>
                </div>
              </div>

              {/* Quick Stats */}
              {!showForm && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {[
                    { label: 'Total Reports', value: records.length, icon: FaFileMedical, color: 'blue' },
                    { label: 'Sick Animals', value: records.filter(r => r.disease_name).length, icon: FaThermometerHalf, color: 'red' },
                    { label: 'Total Cost', value: `₹${records.reduce((acc, r) => acc + Number(r.cost), 0).toLocaleString('en-IN')}`, icon: FaSave, color: 'emerald' },
                    { label: 'Doctors Active', value: doctors.length, icon: FaUserMd, color: 'indigo' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:translate-y-[-4px] transition-all duration-300">
                      <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 text-xl shadow-inner`}>
                        <stat.icon />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-xl font-black text-slate-900">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Filter & Search Bar */}
              {!showForm && (
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 relative w-full">
                    <input
                      type="text"
                      placeholder="Search by Tag ID or Doctor name..."
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-xs font-bold focus:border-emerald-500 focus:bg-white transition-all outline-none"
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <FaSync className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <select
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="bg-slate-50 border-2 border-slate-50 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-all cursor-pointer"
                    >
                      <option value="">All Species</option>
                      <option value="cow">Cows</option>
                      <option value="goat">Goats</option>
                      <option value="chicken">Chickens</option>
                      <option value="fish">Fish</option>
                    </select>
                    <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-3 active:scale-95 whitespace-nowrap group">
                      <FaFileMedical className="text-emerald-400 group-hover:scale-110 transition-transform" /> Export Summary
                    </button>
                  </div>
                </div>
              )}

              {showForm && (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-emerald-100 overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <div className="bg-emerald-600 p-8 text-white flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tighter">Medical Examination Portal</h2>
                      <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest opacity-80">Capture real-time health diagnostics</p>
                    </div>
                    <FaStethoscope className="text-4xl text-emerald-400 opacity-50" />
                  </div>
                  <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8 bg-gradient-to-b from-white to-emerald-50/20">
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 text-emerald-600">Animal Type *</label>
                      <select required value={form.type} onChange={e => { setForm({ ...form, type: e.target.value, animal_id: '', disease_name: '' }); }} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-slate-50 font-black text-xs">
                        <option value="cow">🐄 Cow</option>
                        <option value="goat">🐐 Goat</option>
                        <option value="chicken">🐔 Chicken</option>
                        <option value="fish">🐟 Fish</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Select Animal *</label>
                      <select required value={form.animal_id} onChange={e => setForm({ ...form, animal_id: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs">
                        <option value="">-- Choose Animal --</option>
                        {animals.filter(a => a.type === form.type).map(a => (
                          <option key={a.id} value={a.id}>{a.tag_id} - {a.name || 'Unnamed'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Vet Doctor *</label>
                      <select required value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs">
                        <option value="">-- Select Doctor --</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.specialization || 'General'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Examination Type</label>
                      <select value={form.treatment_type} onChange={e => setForm({ ...form, treatment_type: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs">
                        <option value="checkup">Regular Checkup</option>
                        <option value="vaccination">Vaccination (Tika)</option>
                        <option value="medication">Medication (Dawai)</option>
                        <option value="deworming">Deworming</option>
                        <option value="surgery">Surgery</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Diagnosed Disease</label>
                      <select value={form.disease_name} onChange={e => setForm({ ...form, disease_name: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs">
                        <option value="">-- No Disease / Healthy --</option>
                        {diseases.map(d => <option key={d.id} value={d.disease_name}>{d.disease_name}</option>)}
                        <option value="Other">Other (Enter in notes)</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Treatment Cost (₹)</label>
                      <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" placeholder="0.00" />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-emerald-600 uppercase block mb-1 flex items-center gap-2">
                        <FaThermometerHalf /> Temperature (°F)
                      </label>
                      <input type="number" step="0.1" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" placeholder="e.g. 101.5" />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-blue-600 uppercase block mb-1 flex items-center gap-2">
                        <FaTint /> Blood Report / Sample
                      </label>
                      <input type="text" value={form.blood_report} onChange={e => setForm({ ...form, blood_report: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-blue-50 bg-white font-bold text-xs" placeholder="e.g. Normal, Anemic, etc." />
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Recipient Email (Optional)</label>
                      <input type="email" value={form.recipient_email} onChange={e => setForm({ ...form, recipient_email: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-bold text-xs" placeholder="customer@example.com" />
                      <p className="text-[8px] text-slate-400 mt-1 italic">Admin will receive a copy by default.</p>
                    </div>

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Symptoms (Lakshan)</label>
                        <textarea value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} rows={3} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" placeholder="High fever, not eating, sujan etc..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Medicine & Prescription</label>
                        <textarea value={form.medicine_name} onChange={e => setForm({ ...form, medicine_name: e.target.value })} rows={3} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" placeholder="Name of medicine, dosage instructions..." />
                      </div>
                    </div>

                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Treatment Date</label>
                      <input type="date" value={form.treatment_date} onChange={e => setForm({ ...form, treatment_date: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Next Follow-up (optional)</label>
                      <input type="date" value={form.next_followup} onChange={e => setForm({ ...form, next_followup: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-emerald-50 bg-white font-bold text-xs" />
                    </div>

                    <div className="md:col-span-3 pt-6">
                      <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.3em] shadow-2xl hover:shadow-emerald-300 flex items-center justify-center gap-4 transform active:scale-95 transition-all group">
                        {submitting ? <FaSpinner className="animate-spin" /> : <><FaSave className="group-hover:rotate-12 transition-transform" /> Finalize & Save Report</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-32"><FaSpinner className="animate-spin text-emerald-600 text-5xl" /></div>
              ) : (
                <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden mb-20">
                   <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
                       <FaHistory className="text-emerald-600" /> Examination History
                     </h3>
                     <div className="flex items-center gap-4">
                       {selectedIds.length > 0 && (
                         <button 
                           onClick={async () => {
                             const toastId = toast.loading(`Sending ${selectedIds.length} reports...`);
                             try {
                               const selectedData = records.filter(r => selectedIds.includes(r.id));
                               const res = await fetch('/api/farming/send-report', {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({
                                   title: `Bulk Health Report (${selectedIds.length} Animals)`,
                                   data: selectedData.map(r => ({
                                     label: `${r.animal_tag || 'N/A'} (${r.type})`,
                                     value: `${r.disease_name || 'Healthy'} - ${r.temperature}°F - Fees: ₹${r.cost || 0}`
                                   })),
                                   footer_note: `Selected batch of ${selectedIds.length} records.`
                                 })
                               });
                               const d = await res.json();
                               if (d.success) {
                                 toast.success('Bulk email sent!', { id: toastId });
                                 setSelectedIds([]);
                               } else throw new Error(d.error);
                             } catch (e) {
                               toast.error(e.message || 'Failed to send bulk report', { id: toastId });
                             }
                           }}
                           className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:scale-105 transition-all"
                         >
                           <FaEnvelope /> Send {selectedIds.length} Selected
                         </button>
                       )}
                       <div className="flex items-center gap-2">
                         <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">Live Records</span>
                       </div>
                     </div>
                   </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                       <thead>
                         <tr className="bg-white">
                           <th className="px-8 py-6 text-left border-b border-slate-100">
                             <input 
                               type="checkbox" 
                               checked={selectedIds.length === records.length && records.length > 0}
                               onChange={(e) => {
                                 if (e.target.checked) setSelectedIds(records.map(r => r.id));
                                 else setSelectedIds([]);
                               }}
                               className="w-4 h-4 rounded-md border-2 border-emerald-100 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
                             />
                           </th>
                           {['Animal Information', 'Category', 'Diagnosing Vet', 'Temp/Blood', 'Diagnosis Status', 'Examination', 'Fees', 'Record Date', 'Action'].map((h, i) => (
                             <th key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 py-6 text-left border-b border-slate-100">{h}</th>
                           ))}
                         </tr>
                       </thead>
                      <tbody>
                        {records.filter(r => {
                          const matchesSearch = !searchQuery ||
                            r.animal_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesType = !selectedType || r.type === selectedType;
                          return matchesSearch && matchesType;
                        }).length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-20 text-xs text-slate-400 font-bold uppercase tracking-widest bg-slate-50/30">No matching records found.</td></tr>
                        ) : (
                          records.filter(r => {
                            const matchesSearch = !searchQuery ||
                              r.animal_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              r.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesType = !selectedType || r.type === selectedType;
                            return matchesSearch && matchesType;
                           }).map(r => (
                             <tr key={r.id} className={`group border-b border-slate-50 hover:bg-blue-50/30 transition-all duration-200 ${selectedIds.includes(r.id) ? 'bg-emerald-50/40' : ''}`}>
                               <td className="px-8 py-6">
                                 <input 
                                   type="checkbox" 
                                   checked={selectedIds.includes(r.id)}
                                   onChange={(e) => {
                                     if (e.target.checked) setSelectedIds(prev => [...prev, r.id]);
                                     else setSelectedIds(prev => prev.filter(id => id !== r.id));
                                   }}
                                   className="w-4 h-4 rounded-md border-2 border-emerald-100 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
                                 />
                               </td>
                               <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="font-black text-[13px] text-slate-900">{r.animal_tag || '-'}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">{r.animal_name || 'No Name'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className="capitalize text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">{r.type}</span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-[11px] font-black text-emerald-600 shadow-sm">
                                    {r.doctor_name?.charAt(0) || 'V'}
                                  </div>
                                  <span className="text-xs font-black text-slate-700">{r.doctor_name || '-'}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[10px] font-black flex items-center gap-1 ${parseFloat(r.temperature) > 102.5 ? 'text-red-600' : 'text-slate-600'}`}>
                                    <FaThermometerHalf className="text-[8px]" /> {r.temperature ? `${r.temperature}°F` : '-'}
                                    {parseFloat(r.temperature) > 102.5 && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md text-[8px] animate-pulse">FEVER</span>}
                                  </span>
                                  <span className="text-[9px] font-bold text-blue-500 flex items-center gap-1">
                                    <FaTint className="text-[7px]" /> {r.blood_report || '-'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className={`text-[10px] font-black px-4 py-2 rounded-full border shadow-sm ${r.disease_name ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                  {r.disease_name || 'HEALTHY'}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-[10px] font-bold uppercase text-slate-500 tracking-tighter italic">{r.treatment_type}</td>
                              <td className="px-8 py-6">
                                <span className="text-[13px] font-black text-slate-900 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">₹{Number(r.cost).toLocaleString('en-IN')}</span>
                              </td>
                              <td className="px-8 py-6 text-[11px] font-black text-slate-400">{new Date(r.treatment_date).toLocaleDateString('en-IN')}</td>
                              <td className="px-8 py-6">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDownloadPDF(r)}
                                    className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
                                    title="Download PDF"
                                  >
                                    <FaDownload />
                                  </button>
                                  <button
                                    onClick={() => handleSendEmail(r)}
                                    className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
                                    title="Email Report"
                                  >
                                    <FaEnvelope />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                     </table>
                   </div>
                   {/* Pagination Controls */}
                   <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       Showing Page {page} of {totalPages} ({totalRecords} records)
                     </p>
                     <div className="flex gap-2">
                       <button 
                         disabled={page === 1}
                         onClick={() => setPage(p => Math.max(1, p - 1))}
                         className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-all active:scale-95"
                       >
                         Previous
                       </button>
                       <button 
                         disabled={page === totalPages}
                         onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                         className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white border border-emerald-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                       >
                         Next Page
                       </button>
                     </div>
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

export default function HealthPage() {
  return <Suspense fallback={<div className="p-20 text-center"><FaSpinner className="animate-spin text-blue-600 text-4xl mx-auto" /></div>}><HealthContent /></Suspense>;
}
