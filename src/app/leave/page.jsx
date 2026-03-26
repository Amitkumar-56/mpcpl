"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function LeaveApplicationForm() {
  const router = useRouter();
  const { user, loading: authLoading } = useSession();
  const printRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Only the 4 fields that existing POST /api/leave accepts
  const [formData, setFormData] = useState({
    leave_type: "Sick Leave",
    from_date: "",
    to_date: "",
    reason: "",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading]);

  const totalDays = () => {
    if (!formData.from_date || !formData.to_date) return 0;
    const from = new Date(formData.from_date);
    const to   = new Date(formData.to_date);
    const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const days = totalDays();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.leave_type) { setError("Please select a leave type."); return; }
    if (!formData.from_date || !formData.to_date) { setError("Please select dates."); return; }
    if (days <= 0) { setError("To Date must be on or after From Date."); return; }
    if (!formData.reason.trim()) { setError("Please provide a reason."); return; }

    try {
      setSubmitting(true);
      setError("");
      // Exact same payload as the original apply modal
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type: formData.leave_type,
          from_date:  formData.from_date,
          to_date:    formData.to_date,
          reason:     formData.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Submission failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => window.print();

  const handleReset = () => {
    setFormData({ leave_type: "Sick Leave", from_date: "", to_date: "", reason: "" });
    setSubmitted(false);
    setError("");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700" />
      </div>
    );
  }

  const leaveTypes = [
    { value: "Sick Leave",      code: "SL", color: "red"    },
    { value: "Casual Leave",    code: "CL", color: "blue"   },
    { value: "Annual Leave",    code: "AL", color: "green"  },
    { value: "Maternity Leave", code: "ML", color: "purple" },
    { value: "Paternity Leave", code: "PL", color: "indigo" },
    { value: "Unpaid Leave",    code: "UL", color: "gray"   },
  ];

  return (
    <div className="flex min-h-screen bg-stone-50">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <Sidebar />
      </div>

      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <div className="flex-shrink-0 no-print">
          <Header />
        </div>

        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-10">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="no-print mb-5 flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Leave Management
          </button>

          {/* ── Printable Form ── */}
          <div
            ref={printRef}
            className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md border border-emerald-100 overflow-hidden"
          >

            {/* Company Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-700 px-8 py-7 flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg flex-shrink-0">
                <svg viewBox="0 0 60 60" className="w-11 h-11" fill="none">
                  <circle cx="30" cy="30" r="28" fill="#d1fae5" />
                  <path d="M30 12 C30 12,14 28,14 38 a16 16 0 0 0 32 0 C46 28 30 12 30 12Z" fill="#059669" opacity="0.9"/>
                  <path d="M30 22 C30 22,22 33,22 39 a8 8 0 0 0 16 0 C38 33 30 22 30 22Z" fill="#d1fae5" opacity="0.7"/>
                </svg>
              </div>
              <div>
                <h1 className="text-white text-2xl font-bold tracking-wide">Gyanti Multiservices Pvt Ltd</h1>
                <p className="text-emerald-200 text-xs mt-1 tracking-widest uppercase">
                  NAKHA NO 1, MOHARIPUR, GORAKHPUR – 273001 &nbsp;|&nbsp; State: Uttar Pradesh
                </p>
              </div>
            </div>

            {/* Title Strip */}
            <div className="bg-emerald-50 border-b border-emerald-200 py-3 text-center">
              <span className="text-emerald-800 font-semibold tracking-[0.2em] uppercase text-sm">
                ◆ &nbsp; Leave Application Form &nbsp; ◆
              </span>
            </div>

            {/* Success Banner */}
            {submitted && (
              <div className="mx-6 mt-6 bg-emerald-50 border border-emerald-300 rounded-xl px-5 py-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">Leave request submitted successfully!</p>
                  <p className="text-emerald-600 text-sm mt-0.5">Pending approval. You can print this form now.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 sm:px-10 py-8 space-y-8">

              {/* ── 1. Employee Info ── */}
              <Section title="Employee Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  <Field label="Employee Name">
                    <UnderlineInput readOnly value={user?.name || ""} placeholder="Full Name" />
                  </Field>
                  <Field label="Employee ID">
                    <UnderlineInput readOnly value={user?.emp_code || ""} placeholder="EMP-XXXX" />
                  </Field>
                  <Field label="Department / Designation">
                    <UnderlineInput readOnly value={user?.department || user?.designation || ""} placeholder="Department / Designation" />
                  </Field>
                  <Field label="Reporting Manager">
                    <UnderlineInput readOnly value={user?.manager_name || ""} placeholder="Manager Name" />
                  </Field>
                </div>
              </Section>

              {/* ── 2. Leave Type ── */}
              <Section title="Type of Leave — Select One ✓">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {leaveTypes.map(({ value, code }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleChange("leave_type", value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        formData.leave_type === value
                          ? "border-emerald-500 bg-emerald-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.leave_type === value ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                      }`}>
                        {formData.leave_type === value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className={`font-bold text-base leading-none ${formData.leave_type === value ? "text-emerald-700" : "text-gray-700"}`}>
                          {code}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{value}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>

              {/* ── 3. Leave Dates ── */}
              <Section title="Leave Period">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 items-end">
                  <Field label="From Date *">
                    <UnderlineInput
                      type="date"
                      value={formData.from_date}
                      onChange={v => handleChange("from_date", v)}
                      min={today}
                      required
                    />
                  </Field>
                  <Field label="To Date *">
                    <UnderlineInput
                      type="date"
                      value={formData.to_date}
                      onChange={v => handleChange("to_date", v)}
                      min={formData.from_date || today}
                      required
                    />
                  </Field>
                  <Field label="No. of Days">
                    <div className="border-b-2 border-emerald-400 py-2 text-center text-xl font-bold text-emerald-700 bg-emerald-50/50 rounded-t-lg">
                      {days > 0 ? `${days} ${days === 1 ? "Day" : "Days"}` : "Auto"}
                    </div>
                  </Field>
                </div>
              </Section>

              {/* ── 4. Reason ── */}
              <Section title="Reason for Leave">
                <Field label="Please describe the reason *">
                  <textarea
                    value={formData.reason}
                    onChange={e => handleChange("reason", e.target.value)}
                    required
                    rows={4}
                    placeholder="Please describe the reason for your leave request..."
                    className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50/20 placeholder-gray-300 resize-none transition"
                  />
                </Field>
              </Section>

              {/* ── 5. Signatures ── */}
              <Section title="Declaration & Signatures">
                <div className="space-y-5">
                  <div className="max-w-xs">
                    <Field label="Application Date">
                      <UnderlineInput
                        type="date"
                        value={today}
                        readOnly
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-6 pt-2">
                    {["Employee Signature", "HR / Admin Signature", "Manager Approval"].map(sig => (
                      <div key={sig} className="flex flex-col items-center gap-2">
                        <div className="w-full h-14 border-b-2 border-dashed border-gray-300" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-center leading-tight">
                          {sig}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 no-print border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="sm:flex-none px-5 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="sm:flex-none px-5 py-2.5 border-2 border-gray-700 text-gray-700 rounded-xl font-medium hover:bg-gray-800 hover:text-white transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </button>

                {!submitted && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-2.5 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg> Submit Request</>
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-100 py-3 px-8 text-center text-xs text-gray-400">
              Gyanti Multiservices Pvt Ltd &nbsp;|&nbsp; NAKHA NO 1, MOHARIPUR, GORAKHPUR-273001, UP
            </div>
          </div>
        </main>

        <div className="flex-shrink-0 no-print">
          <Footer />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-md, .shadow-lg { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Reusable Sub-components ─── */

function Section({ title, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-emerald-100" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 whitespace-nowrap px-1">
          {title}
        </span>
        <div className="h-px flex-1 bg-emerald-100" />
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function UnderlineInput({ value, onChange, readOnly, placeholder, type = "text", min, required }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      readOnly={readOnly}
      placeholder={placeholder}
      min={min}
      required={required}
      className={`w-full border-0 border-b-2 py-2 px-0 text-sm focus:outline-none transition-colors bg-transparent
        ${readOnly
          ? "border-gray-200 text-gray-500 cursor-default"
          : "border-emerald-200 text-gray-800 focus:border-emerald-500"
        } placeholder-gray-300`}
    />
  );
}