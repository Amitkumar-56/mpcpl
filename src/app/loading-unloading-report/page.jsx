'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Loading component for Suspense fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-900 font-black tracking-widest animate-pulse">LOADING REPORT...</p>
      </div>
    </div>
  );
}

// Main report component
function LoadingUnloadingReportContent() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [party, setParty] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });
  const [summary, setSummary] = useState({ total_qty: 0, total_ltr: 0, total_records: 0 });

  // Premium UI State
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, party]);

  useEffect(() => {
    if (user && !sessionLoading) {
      fetchReportData();
    }
  }, [user, sessionLoading, startDate, endDate, party, currentPage]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      let url = `/api/loading-unloading-report?user_id=${user.id}&role=${user.role || ''}&limit=25&page=${currentPage}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (party) url += `&party=${encodeURIComponent(party)}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        const shipmentData = Array.isArray(result.shipments) ? result.shipments : [];
        setShipments(shipmentData);
        setPagination(result.pagination);
        
        let pageLtr = 0;
        shipmentData.forEach(s => {
          const kg = Number(s.net_weight_loading) || 0;
          const dens = Number(s.density_loading) || 0;
          if (dens > 0) pageLtr += (kg / dens);
        });

        setSummary({
          total_qty: result.summary.total_kg || 0,
          total_ltr: pageLtr,
          total_records: result.pagination.totalRecords
        });
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (sessionLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-900 font-black tracking-widest animate-pulse">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <div className="flex-shrink-0 no-print shadow-2xl z-20">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-shrink-0 no-print z-10">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 print:p-0 print:overflow-visible print:bg-white custom-scrollbar">
          {/* Advanced Print Controls */}
          <style jsx global>{`
            @media print {
              @page { size: landscape; margin: 8mm; }
              .no-print { display: none !important; }
              body { background: white !important; -webkit-print-color-adjust: exact; color: #000 !important; }
              .print-container { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
              table { width: 100% !important; border-collapse: collapse !important; border: 2px solid #000 !important; }
              th, td { border: 1px solid #000 !important; padding: 10px 6px !important; font-size: 11pt !important; color: #000 !important; }
              th { background: #f0f0f0 !important; font-weight: 900 !important; text-transform: uppercase !important; }
              .report-header-print { margin-bottom: 30px !important; text-align: center !important; }
            }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          `}</style>

          <div className="max-w-full mx-auto print-container">
            {/* Compact Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 no-print bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
                <div>
                   <h1 className="text-xl font-black text-slate-800 tracking-tight">Loading & Unloading Report</h1>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Material Analytics v2.0</p>
                </div>
              </div>
              
              {/* Inline Stats */}
              <div className="flex flex-wrap items-center gap-6 px-6 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Total Kg:</span>
                    <span className="text-sm font-black text-blue-700">{summary.total_qty.toLocaleString()}</span>
                 </div>
                 <div className="w-px h-4 bg-slate-200"></div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Total Ltr:</span>
                    <span className="text-sm font-black text-indigo-700">{Math.round(summary.total_ltr).toLocaleString()}</span>
                 </div>
                 <div className="w-px h-4 bg-slate-200"></div>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Entries:</span>
                    <span className="text-sm font-black text-emerald-700">{summary.total_records}</span>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs transition-all"
                >
                  BACK
                </button>
                <button
                  onClick={handlePrint}
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-black font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  PRINT
                </button>
              </div>
            </div>

            {/* Compact Filters */}
            <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 mb-6 no-print">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                     <div className="flex-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Party Name</label>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={party}
                          onChange={(e) => setParty(e.target.value)}
                          className="w-full bg-transparent text-xs font-bold outline-none"
                        />
                     </div>
                     {party && (
                       <button onClick={() => setParty('')} className="text-slate-300 hover:text-red-500">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                     )}
                  </div>
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); setParty(''); }}
                    className="py-2 px-4 text-[10px] font-black text-slate-400 hover:text-slate-900 border-2 border-dashed border-slate-100 rounded-xl hover:border-slate-300 transition-all uppercase"
                  >
                    Reset Filters
                  </button>
               </div>
            </div>

            {/* Report Table Card */}
            <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 print:shadow-none print:border-none">
              {/* Printed Branding */}
              <div className="hidden print:block p-12 text-center border-b-8 border-slate-900 mb-12 report-header-print">
                <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">Gyanti Multiservices Pvt Ltd</h1>
                <p className="text-2xl font-bold text-slate-400 uppercase tracking-[0.4em]">Intelligence Distribution Report</p>
                
                <div className="mt-10 grid grid-cols-3 gap-8 py-8 border-t-2 border-slate-100">
                   <div className="text-left">
                      <p className="text-xs font-black text-slate-300 uppercase mb-2">Report Target</p>
                      <p className="text-xl font-black text-slate-900">{party || 'Global Fleet'}</p>
                   </div>
                   <div className="text-center">
                       <p className="text-xs font-black text-slate-300 uppercase mb-2">Temporal Range</p>
                       <p className="text-xl font-black text-slate-900 px-4 py-1 bg-slate-50 rounded-full inline-block">
                         {startDate || 'Init'} — {endDate || 'Now'}
                       </p>
                   </div>
                   <div className="text-right">
                       <p className="text-xs font-black text-slate-300 uppercase mb-2">Timestamp</p>
                       <p className="text-xl font-black text-slate-900 italic underline decoration-slate-200 decoration-4">
                         {new Date().toLocaleDateString('en-GB')}
                       </p>
                   </div>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1200px] print:min-w-full">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 print:bg-gray-50 print:text-black">
                      <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider w-[8%]">Date</th>
                      <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider w-[10%] text-blue-700">Tanker ID</th>
                      <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider w-[14%] text-slate-600">Consignee</th>
                      
                      {/* Loading Segment */}
                      <th className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-center bg-blue-50 w-[7%]">Load (Kg)</th>
                      <th className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-center bg-blue-50 w-[6%]">Load (Dns)</th>
                      <th className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-center bg-blue-100 w-[7%]">Load (Ltr)</th>
                      
                      {/* Unloading Segment */}
                      <th className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-center bg-emerald-50 w-[7%]">Unload (Kg)</th>
                      <th className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-center bg-emerald-50 w-[6%]">Unload (Dns)</th>
                      <th className="px-2 py-3 font-bold text-[10px] uppercase tracking-wider text-center bg-emerald-100 w-[7%]">Unload (Ltr)</th>
                      
                      <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider w-[12%]">Dispatch</th>
                      <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider w-[8%]">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="11" className="px-6 py-20 text-center text-slate-300 font-bold uppercase tracking-widest animate-pulse">
                          Fetching Data...
                        </td>
                      </tr>
                    ) : shipments.length > 0 ? (
                      shipments.map((shipment, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-all print:break-inside-avoid">
                          <td className="px-3 py-2 text-[10px] font-bold text-slate-900 tabular-nums">
                            {shipment.final_loading_datetime ? new Date(shipment.final_loading_datetime).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="px-3 py-2 text-[10px] font-bold text-blue-600">
                            {shipment.tanker}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-slate-800 font-bold uppercase truncate max-w-[140px]">
                            {shipment.consignee || '—'}
                          </td>
                          
                          {/* Data Values - Loading */}
                          <td className="px-2 py-2 text-center bg-blue-50/20 text-[10px] font-bold text-slate-900 tabular-nums">
                            {shipment.net_weight_loading?.toLocaleString() || '0'} 
                          </td>
                          <td className="px-2 py-2 text-center bg-blue-50/20 text-[9px] font-medium text-slate-500 tabular-nums">
                            {shipment.density_loading || '0.000'}
                          </td>
                          <td className="px-2 py-2 text-center bg-blue-100/30 text-[10px] font-black text-blue-800 tabular-nums">
                             {shipment.net_weight_loading > 0 && shipment.density_loading > 0 
                               ? Math.round(shipment.net_weight_loading / shipment.density_loading).toLocaleString() 
                               : '0'}
                          </td>

                          {/* Data Values - Unloading */}
                          <td className="px-2 py-2 text-center bg-emerald-50/20 text-[10px] font-bold text-slate-900 tabular-nums">
                            {shipment.net_weight_unloading?.toLocaleString() || '0'}
                          </td>
                          <td className="px-2 py-2 text-center bg-emerald-50/20 text-[9px] font-medium text-slate-500 tabular-nums">
                            {shipment.density_unloading || '0.000'}
                          </td>
                          <td className="px-2 py-2 text-center bg-emerald-100/30 text-[10px] font-black text-emerald-800 tabular-nums">
                             {shipment.net_weight_unloading > 0 && shipment.density_unloading > 0 
                               ? Math.round(shipment.net_weight_unloading / shipment.density_unloading).toLocaleString() 
                               : '0'}
                          </td>

                          <td className="px-3 py-2 text-[10px] text-slate-500 font-bold uppercase truncate max-w-[150px]">
                            {shipment.dispatch || '—'}
                          </td>
                          <td className="px-3 py-2">
                             <div className="text-[9px] text-slate-400 leading-tight">L: {shipment.entered_by_loading || '—'}</div>
                             <div className="text-[9px] text-slate-400 leading-tight">U: {shipment.entered_by_unloading || '—'}</div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="11" className="px-6 py-20 text-center">
                           <p className="text-xl font-black text-slate-200 uppercase tracking-widest">No Records Found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Master Footer */}
                  {!loading && shipments.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td colSpan="3" className="px-3 py-4 text-right uppercase tracking-widest text-[10px] text-slate-400">Page Totals</td>
                        <td className="px-3 py-4 text-center text-blue-800 text-sm">
                           {summary.total_qty.toLocaleString()} <span className="text-[9px]">Kg</span>
                        </td>
                        <td></td>
                        <td className="px-3 py-4 text-center text-blue-900 text-sm font-black italic">
                           {Math.round(summary.total_ltr).toLocaleString()} <span className="text-[9px]">Ltr</span>
                        </td>
                        <td colSpan="5" className="px-6 py-4 text-right text-slate-400 text-[10px] uppercase">
                           Total Entries: {summary.total_records}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Pagination Engine */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-12 no-print bg-slate-900 p-8 rounded-[3rem] shadow-2xl">
                <div className="space-y-1">
                   <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Data Stream Pagination</p>
                   <p className="text-white font-black text-xl tracking-tight">
                    Window <span className="text-blue-400">{currentPage}</span> of <span className="text-blue-400">{pagination.totalPages}</span>
                   </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="group px-8 py-4 bg-slate-800 border border-slate-700 text-white rounded-[2rem] hover:bg-slate-700 disabled:opacity-20 disabled:grayscale transition-all font-black flex items-center gap-3"
                  >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    PREVIOUS STACK
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                    disabled={currentPage === pagination.totalPages}
                    className="group px-12 py-4 bg-blue-600 text-white rounded-[2rem] hover:bg-blue-500 disabled:opacity-20 disabled:grayscale transition-all font-black shadow-2xl shadow-blue-500/30 flex items-center gap-3"
                  >
                    NEXT WINDOW
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}

            {/* Premium Print Certification */}
            <div className="hidden print:block mt-32">
               <div className="flex justify-between items-end border-t-8 border-slate-900 pt-16 px-10">
                  <div className="space-y-6">
                     <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Official Certification & Audit</p>
                     <div className="flex items-center gap-8">
                        <div className="space-y-4">
                           <div className="w-72 border-b-4 border-slate-900"></div>
                           <p className="text-xs font-black text-slate-800 uppercase">Station Manager Signature</p>
                        </div>
                        <div className="space-y-4">
                           <div className="w-72 border-b-4 border-slate-900"></div>
                           <p className="text-xs font-black text-slate-800 uppercase">Account Head Approval</p>
                        </div>
                     </div>
                  </div>
                  <div className="text-right space-y-2">
                     <div className="inline-block p-4 border-4 border-slate-100 rounded-[2rem]">
                         <div className="w-24 h-24 border-8 border-slate-50 flex items-center justify-center rounded-3xl opacity-20">
                            <span className="font-black text-5xl">GM</span>
                         </div>
                     </div>
                     <p className="text-[10px] text-slate-400 font-black italic mt-4 uppercase tracking-[0.3em]">SECURE SYSTEM GENERATED ARTIFACT</p>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="no-print mt-20 opacity-40 hover:opacity-100 transition-opacity">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

// Export with Suspense boundary
export default function LoadingUnloadingReport() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoadingUnloadingReportContent />
    </Suspense>
  );
}