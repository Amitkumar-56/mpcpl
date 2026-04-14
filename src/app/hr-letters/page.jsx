"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { BiFile, BiCalendar, BiMoney, BiUser, BiCheckCircle, BiDownload, BiArrowBack } from "react-icons/bi";

const LETTER_TYPES = [
  {
    id: "offer",
    name: "Offer Letter",
    description: "Job offer for new candidates",
    icon: BiFile,
    color: "blue",
  },
  {
    id: "appointment",
    name: "Appointment Letter",
    description: "Confirmation of employment",
    icon: BiCheckCircle,
    color: "green",
  },
  {
    id: "joining",
    name: "Joining Letter",
    description: "Welcome letter for new joinee",
    icon: BiUser,
    color: "purple",
  },
  {
    id: "agreement",
    name: "Employment Agreement",
    description: "Terms and conditions of employment",
    icon: BiFile,
    color: "indigo",
  },
  {
    id: "salary",
    name: "Salary Slip",
    description: "Monthly salary statement",
    icon: BiMoney,
    color: "yellow",
    requiresMonth: true,
  },
  {
    id: "termination",
    name: "Termination Letter",
    description: "Employment termination notice",
    icon: BiFile,
    color: "red",
  },
  {
    id: "relieving",
    name: "Relieving Letter",
    description: "Experience & relieving certificate",
    icon: BiCheckCircle,
    color: "blue",
  },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Loading fallback component
function HRLettersLoading() {
  return (
    <div className="flex h-screen bg-[#f4f6fb]">
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-white shadow-sm animate-pulse" />
        <div className="flex-1 p-6 overflow-auto space-y-6">
          <div className="h-10 bg-gray-200 rounded-lg w-1/4 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component content
function HRLettersContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [includePF, setIncludePF] = useState(true); // PF option for salary slip
  const [letterPreview, setLetterPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) {
      if (![3, 4, 5].includes(user.role)) { router.push("/dashboard"); return; }
      fetchEmployees();
    }
  }, [user, authLoading, router]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(Array.isArray(data.data) ? data.data : []);
      } else {
        console.error('API Error:', data.error);
        setEmployees([]);
      }
    } catch (e) { 
      console.error('Fetch error:', e);
      setEmployees([]);
    }
  };

  const handleGenerateLetter = async (letter) => {
    if (!selectedEmployee) { setError("Please select an employee first."); return; }
    if (letter.requiresMonth && (!selectedMonth || !selectedYear)) {
      setError("Please select month and year for salary slip."); return;
    }
    try {
      setLoading(true);
      setGeneratingId(letter.id);
      setError("");

      let url = `/api/hr-letters?type=${letter.id}&employee_id=${selectedEmployee}`;
      if (letter.requiresMonth) url += `&month=${selectedMonth}&year=${selectedYear}&include_pf=${includePF}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setLetterPreview(data.data);
        setPreviewTitle(letter.name);
        setShowPreviewModal(true);
      } else {
        setError(data.error || "Failed to generate letter.");
      }
    } catch (e) {
      setError("Failed to generate letter.");
    } finally {
      setLoading(false);
      setGeneratingId(null);
    }
  };

  const handleDownloadPDF = () => {
    if (!letterPreview) return;
    const win = window.open("", "_blank");
    win.document.write(letterPreview.content);
    win.document.close();
    win.onload = () => win.print();
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        .hr-page * { box-sizing: border-box; }

        .hr-page {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #f4f6f9;
          color: #1a1a2e;
        }

        /* ── Page header ── */
        .page-hero {
          background: linear-gradient(135deg, #0f2447 0%, #1a3c6e 60%, #2a5298 100%);
          padding: 28px 32px 32px;
          border-radius: 0 0 24px 24px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        }
        .page-hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          background: rgba(255,255,255,0.04);
          border-radius: 50%;
        }
        .page-hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: 40%;
          width: 300px; height: 300px;
          background: rgba(255,255,255,0.03);
          border-radius: 50%;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.65);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 16px;
          background: none;
          border: none;
          padding: 0;
          transition: color 0.2s;
        }
        .back-btn:hover { color: #fff; }
        .hero-title {
          font-family: 'Instrument Serif', serif;
          font-size: 32px;
          color: #fff;
          font-weight: 400;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
          position: relative;
          z-index: 1;
        }
        .hero-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.55);
          font-weight: 300;
          position: relative;
          z-index: 1;
        }

        /* ── Selection card ── */
        .selection-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
          border: 1px solid #eaecf0;
        }
        .card-heading {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 16px;
        }
        .fields-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 768px) { .fields-row { grid-template-columns: 1fr; } }

        .field-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .field-group label span { color: #e53e3e; }
        .field-select {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13.5px;
          color: #111;
          background: #fafafa;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }
        .field-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); background: #fff; }

        /* ── Error banner ── */
        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Letters grid ── */
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 16px;
        }
        .letters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .letter-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          border: 1.5px solid #eaecf0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s;
          cursor: default;
        }
        .letter-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.1);
        }

        .letter-card-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 14px;
        }
        .letter-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .letter-info { flex: 1; min-width: 0; }
        .letter-name {
          font-size: 14.5px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .letter-desc { font-size: 12px; color: #9ca3af; line-height: 1.4; }

        .month-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 6px;
          padding: 3px 8px;
          margin-bottom: 10px;
        }

        .gen-btn {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: opacity 0.2s, transform 0.15s;
        }
        .gen-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(0.99); }
        .gen-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .gen-btn .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── How-to card ── */
        .how-to-card {
          background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 20px 24px;
        }
        .how-to-title {
          font-family: 'Instrument Serif', serif;
          font-size: 17px;
          color: #1d4ed8;
          margin-bottom: 12px;
        }
        .how-to-steps { list-style: none; padding: 0; margin: 0; }
        .how-to-steps li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 8px;
          font-size: 13px;
          color: #1e40af;
        }
        .step-num {
          width: 20px; height: 20px;
          background: #1d4ed8;
          color: #fff;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          animation: fadeIn 0.18s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-box {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.25);
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.22s ease;
        }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
        }
        .modal-title {
          font-family: 'Instrument Serif', serif;
          font-size: 20px;
          color: #111;
        }
        .modal-actions { display: flex; gap: 10px; align-items: center; }

        .btn-download {
          background: linear-gradient(135deg, #1a3c5e, #2a6099);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.18s;
        }
        .btn-download:hover { opacity: 0.88; }

        .btn-close {
          width: 34px; height: 34px;
          border-radius: 50%;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #6b7280;
          transition: background 0.15s;
        }
        .btn-close:hover { background: #f3f4f6; color: #111; }

        .modal-preview {
          overflow-y: auto;
          flex: 1;
          background: #f8f9fa;
        }
        .modal-preview-inner {
          padding: 24px;
        }
        .preview-frame {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        /* Loading spinner */
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #1a3c5e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>

      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
          <Sidebar />
        </div>
        <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
          <div className="flex-shrink-0"><Header /></div>

          <main className="flex-1 overflow-y-auto hr-page">
            <div className="container mx-auto px-4 py-0 max-w-6xl">

              {/* Hero */}
              <div className="page-hero">
                <button className="back-btn" onClick={() => router.back()}>
                  ← Back
                </button>
                <div className="hero-title">HR Letters Generator</div>
                <div className="hero-subtitle">
                  Generate professional, print-ready HR documents in seconds
                </div>
              </div>

              {/* Selection card */}
              <div className="selection-card">
                <div className="card-heading">Step 1 — Select Employee & Period</div>
                <div className="fields-row">
                  <div className="field-group">
                    <label>Employee <span>*</span></label>
                    <select
                      className="field-select"
                      value={selectedEmployee}
                      onChange={(e) => { setSelectedEmployee(e.target.value); setError(""); }}
                    >
                      <option value="">— Choose Employee —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.emp_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Month <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Salary Slip)</span></label>
                    <select
                      className="field-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Year <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Salary Slip)</span></label>
                    <select
                      className="field-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={includePF}
                        onChange={(e) => setIncludePF(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Include PF Deduction <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Salary Slip)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Letters grid */}
              <div className="section-label">Step 2 — Choose Letter Type</div>
              <div className="letters-grid">
                {LETTER_TYPES.map((letter) => {
                  const isGenerating = generatingId === letter.id && loading;
                  return (
                    <div
                      key={letter.id}
                      className="letter-card"
                      style={{ borderColor: selectedEmployee ? letter.border : "#eaecf0" }}
                    >
                      <div className="letter-card-top">
                        <div
                          className="letter-icon"
                          style={{ background: letter.bg }}
                        >
                          <letter.icon />
                        </div>
                        <div className="letter-info">
                          <div className="letter-name">{letter.name}</div>
                          <div className="letter-desc">{letter.description}</div>
                        </div>
                      </div>

                      {letter.requiresMonth && (
                        <div
                          className="month-tag"
                          style={{ background: letter.bg, color: letter.color }}
                        >
                          🗓 Requires month & year
                        </div>
                      )}

                      <button
                        className={`w-full rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 py-3 px-4 border-2 ${
                          selectedEmployee && !loading
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl border-blue-500 transform hover:scale-105"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300"
                        }`}
                        onClick={() => handleGenerateLetter(letter)}
                        disabled={!selectedEmployee || loading}
                      >
                        {isGenerating ? (
                          <>
                            <div className="spinner" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            Generate Letter
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* How to use */}
              <div className="how-to-card">
                <div className="how-to-title">How to Use</div>
                <ul className="how-to-steps">
                  {[
                    "Select an employee from the dropdown",
                    "For salary slips, also pick the month and year",
                    "Click Generate on the desired letter type",
                    "Preview the letter in the modal window",
                    "Use Download PDF to print or save the document",
                  ].map((step, i) => (
                    <li key={i}>
                      <div className="step-num">{i + 1}</div>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ height: 32 }} />
            </div>
          </main>

          <div className="flex-shrink-0"><Footer /></div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && letterPreview && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowPreviewModal(false); setLetterPreview(null); } }}>
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">📄 {previewTitle}</div>
              <div className="modal-actions">
                <button className="btn-download" onClick={handleDownloadPDF}>
                  ⬇️ Download PDF
                </button>
                <button className="btn-close" onClick={() => { setShowPreviewModal(false); setLetterPreview(null); }}>
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-preview">
              <div className="modal-preview-inner">
                <div className="preview-frame">
                  <div dangerouslySetInnerHTML={{ __html: letterPreview.content }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Main exported component with Suspense boundary
export default function HRLetters() {
  return (
    <Suspense fallback={<HRLettersLoading />}>
      <HRLettersContent />
    </Suspense>
  );
}