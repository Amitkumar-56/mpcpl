"use client";

import { useSession } from "@/context/SessionContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Sidebar from "../../components/sidebar";

// OTP Modal Component - Fully Responsive
// OTP Modal Component - Fully Responsive
const OtpModal = ({ 
  requestId, 
  requestRid, 
  generatedOtp,
  onClose, 
  onVerify,
  onResend 
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Initialize refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Focus on first input when modal opens
  useEffect(() => {
    if (inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0].focus();
      }, 100);
    }
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Auto-submit if all digits filled
    if (newOtp.every(digit => digit !== "") && index === 5) {
      handleVerify();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, idx) => {
        if (idx < 6) {
          newOtp[idx] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus last input
      setTimeout(() => {
        if (inputRefs.current[5]) {
          inputRefs.current[5].focus();
        }
      }, 10);
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onVerify(requestId, otpString);
      // Close modal will be handled by parent on success
    } catch (err) {
      setError(err.message || "OTP verification failed");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    
    setLoading(true);
    setError("");
    try {
      const success = await onResend(requestId);
      if (success) {
        setTimer(60);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        if (inputRefs.current[0]) {
          setTimeout(() => {
            inputRefs.current[0].focus();
          }, 100);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex justify-between items-center p-4 md:p-6 border-b z-10">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">OTP Verification</h3>
            <p className="text-sm text-gray-600 mt-1 truncate">
              Request ID: <span className="font-mono font-semibold">{requestRid}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="ml-4 p-1 md:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            disabled={loading}
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6">
          <div className="text-center mb-4 md:mb-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-lg md:text-xl font-semibold text-gray-900">Enter OTP</h4>
            <p className="text-gray-600 mt-2 text-sm md:text-base">
              Enter the 6-digit OTP sent to the customer
            </p>
            
            {/* ✅ FIXED: ALWAYS SHOW TEST OTP (NO CONDITION) */}
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-semibold">
                ✅ Test OTP Available
              </p>
              <p className="text-xs text-green-600 mt-1">
                Use this 6-digit OTP for testing (Works everywhere)
              </p>
              {generatedOtp && (
                <div className="mt-2">
                  <p className="text-xs text-green-600 mb-1">Test OTP:</p>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-green-300">
                    <span className="font-mono font-bold text-lg text-green-700">
                      {generatedOtp}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedOtp);
                        alert('OTP copied to clipboard!');
                      }}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded flex items-center"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-green-500 mt-2">
                Enter any 6-digit number to proceed
              </p>
            </div>
          </div>

          {/* OTP Inputs - Responsive */}
          <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-10 h-10 md:w-12 md:h-12 text-center text-xl md:text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors"
                disabled={loading}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Resend OTP */}
          <div className="text-center mb-4 md:mb-6">
            <p className="text-gray-600 text-sm">
              Didn't receive OTP?{" "}
              <button
                onClick={handleResend}
                disabled={!canResend || loading}
                className={`font-medium ${
                  canResend 
                    ? "text-blue-600 hover:text-blue-800" 
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                {canResend ? "Resend OTP" : `Resend in ${timer}s`}
              </button>
            </p>
          </div>

          {/* Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="order-2 sm:order-1 flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || otp.join("").length !== 6}
              className="order-1 sm:order-2 flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm md:text-base"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                "Verify & Process"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// Icons Component
const Icons = ({
  request,
  onView,
  onEdit,
  onExpand,
  onCall,
  onShare,
  onPdf,
  onShowDetails,
  permissions = { can_view: true, can_edit: true, can_create: false, isAdmin: false },
  userRole = null,
  onOtpVerify = null
}) => {
  const stationPhone = request.station_phone && request.station_phone !== "NULL" ? request.station_phone : null;
  const hasMapLink = request.station_map_link && request.station_map_link !== "NULL";
  
  // View button logic
  const canView = permissions.can_view && (
    (userRole === 3 || userRole === 4 || userRole === 5 || userRole === 7) ||
    (request.status === "Pending" && request.eligibility === "Yes") ||
    request.status === "Processing" ||
    request.status === "Completed"
  );

  // Edit button logic based on role
  const canEdit = userRole === 1 ? false : 
                  userRole === 2 ? (request.eligibility === "Yes" && request.status === "Pending") || request.status === "Completed" :
                  permissions.can_edit;

  // Get button title
  const getViewButtonTitle = () => {
    if (!permissions.can_view) return "No view permission";
    
    if (request.status === "Pending") {
      if (request.eligibility === "Yes") {
        return "View & Process Request (OTP Required)";
      } else {
        return `Cannot view: ${request.eligibility_reason || "Not eligible"}`;
      }
    } else if (request.status === "Processing") {
      return "View Processing Request";
    } else if (request.status === "Completed") {
      return "View Completed Request";
    }
    return "View Request";
  };

  return (
    <div className="flex items-center space-x-1">
      {/* View Icon */}
      {permissions.can_view ? (
        <button
          onClick={() => {
            if (userRole === 3 || userRole === 4 || userRole === 5 || userRole === 7) {
              onView(request.id);
            } else if (request.status === "Pending" && request.eligibility === "Yes" && onOtpVerify) {
              onOtpVerify(request);
            } else {
              onView(request.id);
            }
          }}
          disabled={!canView}
          className={`p-1.5 rounded-full transition-colors ${
            canView 
              ? "text-blue-600 hover:bg-blue-50 cursor-pointer" 
              : "text-gray-400 cursor-not-allowed opacity-50"
          }`}
          title={getViewButtonTitle()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      ) : null}

      {/* Edit Icon */}
      {canEdit && (
        <button
          onClick={() => onEdit(request.id)}
          disabled={!canEdit}
          className={`p-1.5 rounded-full transition-colors ${
            canEdit
              ? "text-green-600 hover:bg-green-50 cursor-pointer"
              : "text-gray-400 cursor-not-allowed opacity-50"
          }`}
          title={canEdit ? "Edit Request" : "Cannot edit"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      {!(userRole === 1 || userRole === 2) && (
        <button
          onClick={() => onExpand(request)}
          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-full transition-colors cursor-pointer"
          title="Expand Details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      )}

      {/* Details Icon */}
      <button
        onClick={() => onShowDetails(request)}
        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer"
        title="Show Created/Completed By"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Call Icon */}
      <button
        onClick={() => stationPhone && onCall(stationPhone, request.loading_station)}
        disabled={!stationPhone}
        className={`p-1.5 rounded-full transition-colors ${
          stationPhone 
            ? "text-green-600 hover:bg-green-50 cursor-pointer" 
            : "text-gray-400 cursor-not-allowed opacity-50"
        }`}
        title={stationPhone ? `Call Station\nStation: ${request.loading_station}\nPhone: ${stationPhone}` : "No phone number"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>

      {/* Share Icon */}
      <button
        onClick={() => hasMapLink && onShare(request)}
        disabled={!hasMapLink}
        className={`p-1.5 rounded-full transition-colors ${
          hasMapLink 
            ? "text-blue-600 hover:bg-blue-50 cursor-pointer" 
            : "text-gray-400 cursor-not-allowed opacity-50"
        }`}
        title={hasMapLink ? "Share Station Location" : "No map location"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {/* WhatsApp Icon */}
      {request.customer_phone && (
        <button
          onClick={() => {
            const message = encodeURIComponent(
              `Filling Request Details\n\n` +
              `Request ID: ${request.rid}\n` +
              `Vehicle: ${request.vehicle_number || 'N/A'}\n` +
              `Product: ${request.product_name || 'N/A'}\n` +
              `Quantity: ${request.qty} liters\n` +
              `Station: ${request.loading_station || 'N/A'}\n` +
              `Status: ${request.status}`
            );
            const cleanPhone = request.customer_phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${message}`;
            window.open(whatsappUrl, '_blank');
          }}
          className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors cursor-pointer"
          title={`Send via WhatsApp to customer`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335 .157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </button>
      )}

      {/* PDF Icon */}
      {request.status === "Completed" && permissions.isAdmin && (
        <button
          onClick={() => onPdf(request.id)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
          title="Download PDF Invoice"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Expanded Details Component
const ExpandedDetails = ({ request, onClose, userRole = null }) => {
  if (!request) return null;
  
  const stationPhone = request.station_phone && request.station_phone !== "NULL" ? request.station_phone : null;
  const stationEmail = request.station_email && request.station_email !== "NULL" ? request.station_email : null;
  const stationManager = request.station_manager && request.station_manager !== "NULL" ? request.station_manager : null;
  const stationMapLink = request.station_map_link && request.station_map_link !== "NULL" ? request.station_map_link : null;

  const isStaff = userRole === 1;
  const isIncharge = userRole === 2;
  const isCompleted = request.status === "Completed";
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold">Request Details - {request.rid}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Staff limited view for completed requests */}
          {isStaff && isCompleted ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Vehicle Number</label>
                <p className="font-semibold">{request.vehicle_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Driver Phone</label>
                <p>{request.driver_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Product</label>
                <p>{request.product_name || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  request.status === "Completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {request.status}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Request ID</label>
                  <p className="font-mono font-semibold">{request.rid}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    request.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                    request.status === "Processing" ? "bg-blue-100 text-blue-800" :
                    request.status === "Completed" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {request.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Vehicle Number</label>
                  <p>{request.vehicle_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Driver Phone</label>
                  <p>{request.driver_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Client Name</label>
                  <p>{request.customer_name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Loading Station</label>
                  <p>{request.loading_station || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Product</label>
                  <p>{request.product_name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Quantity</label>
                  <p>{request.qty || "N/A"}</p>
                </div>
              </div>

              {/* Eligibility Information */}
              {request.eligibility && request.eligibility !== "N/A" && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600">Eligibility Check</label>
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      request.eligibility === "Yes" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {request.eligibility}
                    </span>
                    {request.eligibility_reason && (
                      <p className="text-sm text-gray-600 mt-1">{request.eligibility_reason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Station Contact Information */}
              {(stationPhone || stationEmail || stationManager) && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600">Station Contact Information</label>
                  <div className="mt-2 space-y-2">
                    {stationManager && (
                      <div className="flex justify-between">
                        <span>Manager:</span>
                        <span className="font-medium">{stationManager}</span>
                      </div>
                    )}
                    {stationPhone && (
                      <div className="flex justify-between">
                        <span>Station Phone:</span>
                        <a href={`tel:${stationPhone}`} className="text-blue-600 hover:underline">
                          {stationPhone}
                        </a>
                      </div>
                    )}
                    {stationEmail && (
                      <div className="flex justify-between">
                        <span>Station Email:</span>
                        <a href={`mailto:${stationEmail}`} className="text-blue-600 hover:underline">
                          {stationEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {stationMapLink && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Map Location</label>
                  <div className="mt-1">
                    <a
                      href={stationMapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      View on Google Maps
                    </a>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-600">Timeline</label>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{request.created_formatted || request.created_date_formatted || (request.created ? new Date(request.created).toLocaleString("en-IN") : "N/A")}</span>
                  </div>
                  {(request.completed_date_formatted || (request.completed_date && request.completed_date !== "0000-00-00 00:00:00")) && (
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span>
                        {request.completed_date_formatted || 
                         (request.completed_date ? 
                           new Date(request.completed_date).toLocaleString("en-IN", {
                             day: "2-digit",
                             month: "2-digit",
                             year: "numeric",
                             hour: "2-digit",
                             minute: "2-digit",
                             hour12: true,
                             timeZone: "Asia/Kolkata"
                           }) : '')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Request Row Component for Desktop
const RequestRow = ({ request, index, onView, onEdit, onExpand, onCall, onShare, onPdf, onShowDetails, onOtpVerify, permissions = { can_view: true, can_edit: true, can_create: false, isAdmin: false }, userRole = null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const statusClass = {
    Pending: "bg-yellow-100 text-yellow-800",
    Processing: "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  }[request.status] || "bg-gray-100 text-gray-800";
  const rowBgClass = {
    Pending: "",
    Processing: "bg-blue-50",
    Completed: "bg-green-50",
    Cancelled: "bg-red-50",
  }[request.status] || "";

  // Staff: Hide completed requests
  const isStaff = userRole === 1;
  const isIncharge = userRole === 2;
  
  if (isStaff && request.status === "Completed") {
    return null;
  }

  const getRequestImages = () => {
    const imgs = [];
    if (request.images) {
      try {
        const parsed = typeof request.images === 'string' ? JSON.parse(request.images) : request.images;
        if (parsed?.image1) imgs.push(parsed.image1);
        if (parsed?.image2) imgs.push(parsed.image2);
        if (parsed?.image3) imgs.push(parsed.image3);
      } catch {}
    }
    if (imgs.length === 0) {
      if (request.doc1) imgs.push(request.doc1);
      if (request.doc2) imgs.push(request.doc2);
      if (request.doc3) imgs.push(request.doc3);
    }
    return imgs.filter(Boolean);
  };

  return (
    <>
      <tr className={`transition-colors border-b ${rowBgClass}`}>
        <td className="py-3 px-4 text-center text-sm">{index + 1}</td>
        <td className="py-3 px-4 font-mono text-sm font-semibold text-blue-600">{request.rid}</td>
        <td className="py-3 px-4 text-sm">{request.product_name || "N/A"}</td>
        <td className="py-3 px-4 text-sm">{request.loading_station || "N/A"}</td>
        <td className="py-3 px-4 text-sm font-medium">{request.vehicle_number}</td>
        <td className="py-3 px-4 text-sm">{request.customer_name || "N/A"}</td>
        <td className="py-3 px-4 text-sm">{request.driver_number}</td>
        <td className="py-3 px-4 text-sm">
          <div className="flex items-center gap-2">
            {getRequestImages().slice(0,3).map((src, idx) => (
              <button
                key={idx}
                onClick={() => setImagePreview(src)}
                className="w-10 h-10 rounded overflow-hidden border hover:ring-2 hover:ring-blue-500"
                aria-label="Preview image"
              >
                <img src={src} alt="doc" className="w-full h-full object-cover" />
              </button>
            ))}
            {getRequestImages().length === 0 && (
              <span className="text-xs text-gray-500">No images</span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-sm">
          <div>{request.created_formatted ? request.created_formatted.split(' ')[0] : (request.created_date_formatted ? request.created_date_formatted.split(' ')[0] : (request.created ? new Date(request.created).toLocaleDateString("en-IN") : "N/A"))}</div>
          <div className="text-xs text-gray-500">
            {request.created_formatted ? request.created_formatted.split(' ').slice(1).join(' ') : (request.created_date_formatted ? request.created_date_formatted.split(' ').slice(1).join(' ') : (request.created ? new Date(request.created).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""))}
          </div>
        </td>
        <td className="py-3 px-4 text-sm">
          <div className="flex flex-col items-start gap-1">
            <span>
              {request.completed_date_formatted 
                ? request.completed_date_formatted.split(' ')[0]
                : (request.completed_date && request.completed_date !== "0000-00-00 00:00:00"
                  ? new Date(request.completed_date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
                  : "-")}
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center mt-1"
              title={isExpanded ? "Hide Details" : "Show Details"}
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-green-50 border-b">
          <td colSpan="10" className="py-3 px-4">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>{request.status}</span>
                    {request.status === "Pending" && (!request.deal_price || request.eligibility_reason === "Price not set") && (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 border border-red-200">
                        Price not set
                      </span>
                    )}
                    {request.status === "Processing" && request.processing_by_name && (
                      <span className="text-xs text-gray-600">By: {request.processing_by_name}</span>
                    )}
                  </div>
                </div>

                {/* Eligibility Check */}
                {request.status === "Pending" && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Eligibility Check</div>
                    {request.eligibility ? (
                      <div className="flex flex-col items-start">
                        <span className={`inline-block px-2 py-1 rounded-full text-white text-xs ${
                          request.eligibility === "Yes" ? "bg-green-500" : "bg-red-500"
                        }`}>
                          {request.eligibility}
                        </span>
                        {request.eligibility_reason && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs">{request.eligibility_reason}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </div>
                )}

                {/* Created By */}
                {request.created_by_name && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Created By</div>
                    <div className="text-sm text-gray-900">
                      {request.created_by_name}
                    </div>
                    {(request.created_date_formatted || request.created_formatted || request.created_date || request.created) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {request.created_date_formatted || request.created_formatted || 
                         (request.created_date || request.created ? 
                           new Date(request.created_date || request.created).toLocaleString("en-IN", {
                             day: "2-digit",
                             month: "2-digit",
                             year: "numeric",
                             hour: "2-digit",
                             minute: "2-digit",
                             hour12: true
                           }) : '')}
                      </div>
                    )}
                  </div>
                )}

                {/* Processed By */}
                {request.processing_by_name && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Processed By</div>
                    <div className="text-sm text-gray-900">
                      {request.processing_by_name || "-"}
                    </div>
                    {request.processed_date_formatted && (
                      <div className="text-xs text-gray-500 mt-1">
                        {request.processed_date_formatted}
                      </div>
                    )}
                  </div>
                )}

                {/* Completed By */}
                {request.status === "Completed" && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Completed By</div>
                    <div className="text-sm text-gray-900">
                      {request.completed_by_name || "-"}
                    </div>
                    {(request.completed_date_formatted || (request.completed_date && request.completed_date !== "0000-00-00 00:00:00")) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {request.completed_date_formatted || 
                         (request.completed_date ? 
                           new Date(request.completed_date).toLocaleString("en-IN", {
                             day: "2-digit",
                             month: "2-digit",
                             year: "numeric",
                             hour: "2-digit",
                             minute: "2-digit",
                             hour12: true,
                             timeZone: "Asia/Kolkata"
                           }) : '')}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 mb-2">Actions</div>
                  <Icons 
                    request={request} 
                    onView={onView}
                    onEdit={onEdit} 
                    onExpand={onExpand} 
                    onCall={onCall} 
                    onShare={onShare} 
                    onPdf={onPdf} 
                    onShowDetails={onShowDetails} 
                    permissions={permissions} 
                    userRole={userRole}
                    onOtpVerify={onOtpVerify}
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
      {imagePreview && (
        <>
          <tr>
            <td colSpan="10" className="p-0">
              <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setImagePreview(null)}></div>
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
                  <div className="flex justify-between items-center p-3 border-b">
                    <div className="font-medium">Image Preview</div>
                    <button
                      onClick={() => setImagePreview(null)}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Close preview"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-3">
                    <img src={imagePreview} alt="preview" className="w-full h-auto object-contain max-h-[75vh]" />
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </>
      )}
    </>
  );
};

// Mobile Request Card Component
const MobileRequestCard = ({ request, index, onView, onEdit, onExpand, onCall, onShare, onPdf, onShowDetails, onOtpVerify, permissions = { can_view: true, can_edit: true, can_create: false, isAdmin: false }, userRole = null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusClass = {
    Pending: "bg-yellow-100 text-yellow-800",
    Processing: "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  }[request.status] || "bg-gray-100 text-gray-800";
  const statusBorderClass = {
    Pending: "border-l-4 border-yellow-500",
    Processing: "border-l-4 border-blue-500",
    Completed: "border-l-4 border-green-600",
    Cancelled: "border-l-4 border-red-500",
  }[request.status] || "border-l-4 border-gray-300";

  const stationPhone = request.station_phone && request.station_phone !== "NULL" ? request.station_phone : null;
  const hasMapLink = request.station_map_link && request.station_map_link !== "NULL";

  // Staff: Hide completed requests
  const isStaff = userRole === 1;
  const isIncharge = userRole === 2;
  
  if (isStaff && request.status === "Completed") {
    return null;
  }

  // For staff and completed requests: Limited view
  const isStaffViewingCompleted = isStaff && request.status === "Completed";

  return (
    <div className={`border rounded-xl p-4 mb-4 bg-white shadow-md hover:shadow-lg transition-all ${statusBorderClass}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="mr-3 text-sm text-gray-500">#{index + 1}</div>
          <div>
            <div className="font-semibold text-gray-800 font-mono">{request.rid}</div>
            <div className="text-sm text-gray-600">{request.product_name || "N/A"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>{request.status}</span>
          {request.status === "Pending" && (!request.deal_price || request.eligibility_reason === "Price not set") && (
            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 border border-red-200">
              Price not set
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3 text-sm">
        {/* Staff viewing completed: Limited information */}
        {isStaffViewingCompleted ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-medium text-gray-600 text-xs">Vehicle No</div>
                <div className="font-semibold">{request.vehicle_number}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600 text-xs">Driver Phone</div>
                <div>{request.driver_number}</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-600 text-xs">Product</div>
              <div>{request.product_name || "N/A"}</div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-medium text-gray-600 text-xs">Vehicle No</div>
                <div className="font-semibold">{request.vehicle_number}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600 text-xs">Loading Station</div>
                <div>{request.loading_station || "N/A"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-medium text-gray-600 text-xs">Client Name</div>
                <div>{request.customer_name || "N/A"}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600 text-xs">Driver Phone</div>
                <div>{request.driver_number}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-medium text-gray-600 text-xs">Date & Time</div>
                <div>
                  {request.created_formatted ? request.created_formatted.split(' ')[0] : (request.created_date_formatted ? request.created_date_formatted.split(' ')[0] : (request.created ? new Date(request.created).toLocaleDateString("en-IN") : "N/A"))}
                  <br />
                  <span className="text-xs text-gray-500">
                    {request.created_formatted ? request.created_formatted.split(' ').slice(1).join(' ') : (request.created_date_formatted ? request.created_date_formatted.split(' ').slice(1).join(' ') : (request.created ? new Date(request.created).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""))}
                  </span>
                </div>
              </div>
              {request.completed_date && request.completed_date !== "0000-00-00 00:00:00" && (
                <div>
                  <div className="font-medium text-gray-600 text-xs mb-1">Completed</div>
                  <div className="flex flex-col items-start gap-1">
                    <span>{request.completed_date_formatted ? request.completed_date_formatted.split(' ')[0] : (request.completed_date ? new Date(request.completed_date).toLocaleDateString("en-IN", { timeZone: 'Asia/Kolkata' }) : 'N/A')}</span>
                    {request.status === "Completed" && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title={isExpanded ? "Hide Creator Info" : "Show Creator Info"}
                      >
                        {isExpanded ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Eligibility Check */}
            {request.status === "Pending" && request.eligibility && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-600 text-xs">Eligibility Check</div>
                  <span className={`px-2 py-1 rounded-full text-xs text-white ${
                    request.eligibility === "Yes" ? "bg-green-500" : "bg-red-500"
                  }`}>
                    {request.eligibility}
                  </span>
                </div>
                {request.eligibility_reason && (
                  <div className="text-xs mt-1 text-gray-600">{request.eligibility_reason}</div>
                )}
              </div>
            )}

            {/* Station Contact Info */}
            {stationPhone && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-blue-600 text-xs">Station Phone</div>
                  <a href={`tel:${stationPhone}`} className="text-blue-700 font-semibold">
                    {stationPhone}
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex justify-between items-center mt-4 pt-3 border-t">
        <div className="text-xs text-gray-500">Request ID: {request.rid}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center"
            title={isExpanded ? "Hide Details" : "Show Details"}
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
          <Icons 
            request={request} 
            onView={onView} 
            onEdit={onEdit} 
            onExpand={onExpand} 
            onCall={onCall} 
            onShare={onShare} 
            onPdf={onPdf} 
            onShowDetails={onShowDetails} 
            permissions={permissions} 
            userRole={userRole}
            onOtpVerify={onOtpVerify}
          />
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && !isStaffViewingCompleted && (
        <div className="mt-3 pt-3 border-t border-green-200 bg-green-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Details</h4>
          <div className="space-y-3">
            {/* Status */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>{request.status}</span>
                {request.status === "Pending" && (!request.deal_price || request.eligibility_reason === "Price not set") && (
                  <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 border border-red-200">
                    Price not set
                  </span>
                )}
              </div>
              {request.status === "Processing" && request.processing_by_name && (
                <div className="text-xs text-gray-600 mt-1">By: {request.processing_by_name}</div>
              )}
              {request.status === "Completed" && request.completed_by_name && (
                <div className="text-xs text-gray-600 mt-1">By: {request.completed_by_name}</div>
              )}
            </div>

            {/* Eligibility Check */}
            {request.status === "Pending" && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Eligibility Check</div>
                {request.eligibility ? (
                  <>
                    <span className={`inline-block px-2 py-1 rounded-full text-white text-xs ${
                      request.eligibility === "Yes" ? "bg-green-500" : "bg-red-500"
                    }`}>
                      {request.eligibility}
                    </span>
                    {request.eligibility_reason && (
                      <div className="text-xs text-gray-500 mt-1">{request.eligibility_reason}</div>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">N/A</span>
                )}
              </div>
            )}

            {/* Created By */}
            {request.created_by_name && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Created By</div>
                <div className="text-sm text-gray-900">{request.created_by_name}</div>
                {(request.created_date_formatted || request.created_formatted || request.created_date || request.created) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {request.created_date_formatted || request.created_formatted || 
                     (request.created_date || request.created ? 
                       new Date(request.created_date || request.created).toLocaleString("en-IN", {
                         day: "2-digit",
                         month: "2-digit",
                         year: "numeric",
                         hour: "2-digit",
                         minute: "2-digit",
                         hour12: true
                       }) : '')}
                  </div>
                )}
              </div>
            )}

            {/* Processed By */}
            {request.processing_by_name && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Processed By</div>
                <div className="text-sm text-gray-900">{request.processing_by_name || "-"}</div>
              </div>
            )}

            {/* Completed By */}
            {request.status === "Completed" && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-1">Completed By</div>
                <div className="text-sm text-gray-900">{request.completed_by_name || "-"}</div>
                {request.completed_date && request.completed_date !== "0000-00-00 00:00:00" && (
                  <div className="text-xs text-gray-500 mt-1">
                    {request.completed_date_formatted || new Date(request.completed_date).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata"
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-2">Actions</div>
              <Icons 
                request={request} 
                onView={onView} 
                onEdit={onEdit} 
                onExpand={onExpand} 
                onCall={onCall} 
                onShare={onShare} 
                onPdf={onPdf} 
                onShowDetails={onShowDetails} 
                permissions={permissions} 
                userRole={null}
                onOtpVerify={onOtpVerify}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// StatusFilters Component
const StatusFilters = ({ currentStatus, onStatusChange, userRole = null }) => {
  const router = useRouter();

  // For staff (role 1) or incharge (role 2): Hide status filters
  if (userRole === 1 || userRole === 2) {
    return null;
  }

  const statusOptions = [
    { value: "", label: "All", color: "gray" },
    { value: "Pending", label: "Pending", color: "yellow" },
    { value: "Processing", label: "Processing", color: "blue" },
    { value: "Completed", label: "Completed", color: "green" },
  ];

  const handleReportsClick = () => {
    router.push("/reports");
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-gray-700 mr-2">Filter by Status:</span>
      {statusOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onStatusChange(option.value)}
          className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
            currentStatus === option.value 
              ? option.value === "" 
                ? "bg-gray-700 text-white shadow-lg" 
                : option.value === "Pending"
                ? "bg-yellow-500 text-white shadow-lg"
                : option.value === "Processing"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-green-600 text-white shadow-lg"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-sm"
          }`}
        >
          {option.label}
        </button>
      ))}
      <button
        onClick={handleReportsClick}
        className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-200 shadow-md"
      >
        Reports
      </button>
    </div>
  );
};

// SearchBar Component
const SearchBar = ({ onSearch, initialValue = "" }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by RID, Vehicle, Client, Station..."
        className="w-full px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 md:pr-12"
      />
      <button 
        type="submit" 
        className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 md:p-1.5"
        aria-label="Search"
      >
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  );
};

// Main Component
export default function FillingRequests() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useSession();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: false,
    can_edit: false,
    can_create: false
  });
  const [pagination, setPagination] = useState({
    page: 1,
    recordsPerPage: 10,
    totalRecords: 0,
    totalPages: 1,
  });

  // OTP Modal State
  const [otpModal, setOtpModal] = useState({
    isOpen: false,
    requestId: null,
    requestRid: "",
    generatedOtp: "",
    phoneNumber: null
  });

  const statusFilter = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const userRole = user ? Number(user.role) : null;
  const isStaff = userRole === 1;
  const isIncharge = userRole === 2;

  // Check permissions
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      checkPermissions();
    }
  }, [user, authLoading, router]);

  const checkPermissions = async () => {
    if (!user || !user.id) {
      setHasPermission(false);
      setPermissions({ can_view: false, can_edit: false, can_create: false });
      return;
    }

    // Admin (role 5) has full access
    if (Number(user.role) === 5) {
      setHasPermission(true);
      setPermissions({ can_view: true, can_edit: true, can_create: true });
      return;
    }

    // Check cached permissions first
    if (user.permissions && user.permissions['Filling Requests']) {
      const fillingPerms = user.permissions['Filling Requests'];
      if (fillingPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: fillingPerms.can_view,
          can_edit: isStaff ? false : (fillingPerms.can_edit || false),
          can_create: fillingPerms.can_create || false
        });
        return;
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false, can_create: false });
        return;
      }
    }

    // Check cache
    const cacheKey = `perms_${user.id}_Filling Requests`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const cachedPerms = JSON.parse(cached);
      if (cachedPerms.can_view) {
        setHasPermission(true);
        setPermissions({
          can_view: cachedPerms.can_view,
          can_edit: isStaff ? false : (cachedPerms.can_edit || false),
          can_create: cachedPerms.can_create || false
        });
        return;
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false, can_create: false });
        return;
      }
    }

    try {
      const moduleName = 'Filling Requests';
      const [viewRes, editRes, createRes] = await Promise.all([
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_view`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_edit`),
        fetch(`/api/check-permissions?employee_id=${user.id}&module_name=${encodeURIComponent(moduleName)}&action=can_create`)
      ]);

      const [viewData, editData, createData] = await Promise.all([
        viewRes.json(),
        editRes.json(),
        createRes.json()
      ]);

      const perms = {
        can_view: viewData.allowed || false,
        can_edit: isStaff ? false : (editData.allowed || false),
        can_create: createData.allowed || false
      };

      // Cache permissions
      sessionStorage.setItem(cacheKey, JSON.stringify(perms));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      if (perms.can_view) {
        setHasPermission(true);
        setPermissions(perms);
      } else {
        setHasPermission(false);
        setPermissions({ can_view: false, can_edit: false, can_create: false });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      setPermissions({ can_view: false, can_edit: false, can_create: false });
    }
  };

  // Export function
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search: search }),
      });
      
      const response = await fetch(`/api/filling-requests/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `filling_requests_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const params = new URLSearchParams({
          page: searchParams.get("page") || "1",
          records_per_page: searchParams.get("records_per_page") || "10",
          ...(statusFilter && { status: statusFilter }),
          ...(search && { search: search }),
        });

        const response = await fetch(`/api/filling-requests?${params}`);

        if (response.ok) {
          const result = await response.json();

          let requestsData = [];
          let paginationData = {
            page: 1,
            recordsPerPage: 10,
            totalRecords: 0,
            totalPages: 1,
          };

          if (result.requests && Array.isArray(result.requests)) {
            requestsData = result.requests;
            paginationData = {
              page: result.currentPage || 1,
              recordsPerPage: result.recordsPerPage || 10,
              totalRecords: result.totalRecords || 0,
              totalPages: result.totalPages || 1,
            };
          } else if (Array.isArray(result)) {
            requestsData = result;
            paginationData.totalRecords = result.length;
          }

          setRequests(requestsData);
          setPagination(paginationData);
        } else {
          console.error("Failed to fetch requests. Status:", response.status);
          setRequests([]);
          setPagination({
            page: 1,
            recordsPerPage: 10,
            totalRecords: 0,
            totalPages: 1,
          });
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setRequests([]);
        setPagination({
          page: 1,
          recordsPerPage: 10,
          totalRecords: 0,
          totalPages: 1,
        });
      }
    };

    // Only fetch data if user is authenticated AND has permission
    if (user && hasPermission && !authLoading) {
      fetchRequests();
    } else if (user && !hasPermission && !authLoading) {
      setRequests([]);
      setPagination({
        page: 1,
        recordsPerPage: 10,
        totalRecords: 0,
        totalPages: 1,
      });
    }
  }, [searchParams, statusFilter, search, user, hasPermission, authLoading]);

  // Filter requests based on role
  useEffect(() => {
    if (requests.length > 0) {
      let filtered = requests;
      
      // Staff: Hide completed requests
      if (isStaff) {
        filtered = filtered.filter(request => request.status !== "Completed");
      }
      
      setFilteredRequests(filtered);
    } else {
      setFilteredRequests([]);
    }
  }, [requests, isStaff]);

  // Handlers
  const handleStatusChange = useCallback((newStatus) => {
    const params = new URLSearchParams(searchParams);
    if (newStatus) params.set("status", newStatus);
    else params.delete("status");
    params.set("page", "1");
    router.push(`/filling-requests?${params.toString()}`);
  }, [router, searchParams]);

  const handleSearch = useCallback((searchTerm) => {
    const params = new URLSearchParams(searchParams);
    if (searchTerm) params.set("search", searchTerm);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/filling-requests?${params.toString()}`);
  }, [router, searchParams]);

  const handleRecordsPerPageChange = useCallback((value) => {
    const params = new URLSearchParams(searchParams);
    params.set("records_per_page", value);
    params.set("page", "1");
    router.push(`/filling-requests?${params.toString()}`);
  }, [router, searchParams]);

  const handlePageChange = useCallback((newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage);
    router.push(`/filling-requests?${params.toString()}`);
  }, [router, searchParams]);

  // OTP Verification Handlers
  const handleOtpVerify = useCallback((request) => {
    // Check eligibility
    if (request.status === "Pending" && request.eligibility === "Yes") {
      // Generate random OTP (6 digits)
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Show OTP modal with generated OTP
      setOtpModal({
        isOpen: true,
        requestId: request.id,
        requestRid: request.rid,
        generatedOtp: generatedOtp,
        phoneNumber: request.driver_number || request.customer_phone || null
      });
    } else {
      alert(`Cannot process request:\n${request.eligibility_reason || "Not eligible"}`);
    }
  }, []);

  const verifyOtp = async (requestId, otp) => {
    try {
      console.log('✅ Verifying OTP for request:', requestId);
      
      const request = requests.find(req => req.id === requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Check if we're in development mode
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname.includes('dev') ||
                           window.location.hostname.includes('staging') ||
                           window.location.hostname.includes('127.0.0.1');

      console.log('🌐 Environment check:', {
        hostname: window.location.hostname,
        isDevelopment: isDevelopment
      });

      // API call to verify OTP and process
      const processResponse = await fetch('/api/process-request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId: requestId,
          otp: otp,
          userId: user?.id,
          isDevelopment: isDevelopment
        })
      });
      
      const processResult = await processResponse.json();
      
      if (processResponse.ok && processResult.success) {
        // Close OTP modal
        setOtpModal({ isOpen: false, requestId: null, requestRid: "", generatedOtp: "", phoneNumber: null });
        
        // Show success message
        alert(`✅ Request processed successfully!\n\nRequest ID: ${request.rid}\nNew Status: Processing`);
        
        // Update local state
        setRequests(prevRequests => 
          prevRequests.map(req => 
            req.id === requestId 
              ? { ...req, status: 'Processing', eligibility: 'N/A' }
              : req
          )
        );
        
        // Navigate to details page after 1 second
        setTimeout(() => {
          router.push(`/filling-details-admin?id=${requestId}`);
        }, 1000);
        
        return true;
      } else {
        throw new Error(processResult.error || 'Failed to process request');
      }
    } catch (error) {
      throw new Error(error.message || "Request processing failed");
    }
  };

  const resendOtp = async (requestId) => {
    try {
      // Generate new OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Update modal with new OTP
      setOtpModal(prev => ({
        ...prev,
        generatedOtp: newOtp
      }));
      
      console.log('🔄 New OTP generated:', newOtp);
      return true;
    } catch (error) {
      throw new Error(error.message || "Failed to resend OTP");
    }
  };

  const closeOtpModal = () => {
    setOtpModal({ isOpen: false, requestId: null, requestRid: "", generatedOtp: "", phoneNumber: null });
  };

  // Original handleView function
  const handleView = useCallback(async (requestId) => {
    try {
      const request = requests.find(req => req.id === requestId);
      
      if (!request) {
        alert("Request not found");
        return;
      }
      router.push(`/filling-details-admin?id=${requestId}`);
      
    } catch (error) {
      alert("Error processing request. Please try again.");
    }
  }, [requests, router]);

  const handleEdit = useCallback((requestId) => {
    router.push(`/filling-requests/edit?id=${requestId}`);
  }, [router]);

  const handleExpand = useCallback((request) => {
    setExpandedRequest(request);
  }, []);

  const handleCall = useCallback((stationPhone, stationName = "") => {
    if (!stationPhone || stationPhone === "NULL" || stationPhone.trim() === "") {
      alert(`📞 No phone number available for station: ${stationName || "Unknown Station"}`);
      return;
    }
    
    const cleanPhoneNumber = stationPhone.trim().replace(/[\s\-\(\)]/g, '');
    const isValidIndianNumber = /^[6-9]\d{9}$/.test(cleanPhoneNumber);
    
    if (isValidIndianNumber) {
      window.open(`tel:+91${cleanPhoneNumber}`);
    } else if (cleanPhoneNumber.length >= 10) {
      window.open(`tel:${cleanPhoneNumber}`);
    } else {
      alert(`❌ Invalid phone number for station "${stationName}": ${stationPhone}`);
    }
  }, []);

  const handleShare = useCallback(async (request) => {
    try {
      const stationMapLink = request.station_map_link && request.station_map_link !== "NULL" ? request.station_map_link : null;
      
      if (!stationMapLink) {
        alert("🗺️ No Google Maps location available for this station");
        return;
      }

      let shareText = `⛽ Filling Request Details\n\n` +
                     `📋 Request ID: ${request.rid}\n` +
                     `🚚 Vehicle: ${request.vehicle_number}\n` +
                     `👤 Client: ${request.customer_name || "N/A"}\n` +
                     `⛽ Product: ${request.product_name || "N/A"}\n` +
                     `📦 Quantity: ${request.qty} liters\n` +
                     `🏭 Station: ${request.loading_station || "N/A"}\n` +
                     `📍 Location: ${stationMapLink}\n` +
                     `🔄 Status: ${request.status}\n\n` +
                     `📅 Created: ${request.created_formatted || request.created_date_formatted || (request.created ? new Date(request.created).toLocaleString("en-IN") : "N/A")}`;

      if (request.completed_date && request.completed_date !== "0000-00-00 00:00:00") {
        shareText += `\n✅ Completed: ${request.completed_date_formatted || new Date(request.completed_date).toLocaleString("en-IN")}`;
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Station Location - ${request.loading_station}`,
            text: shareText,
            url: stationMapLink,
          });
        } catch (error) {
          if (error.name !== 'AbortError') {
            await navigator.clipboard.writeText(shareText);
            alert("📋 Station location copied to clipboard!");
          }
        }
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("📋 Station location copied to clipboard!\n\nYou can paste it in WhatsApp or any messaging app.");
      }
    } catch (error) {
      console.error("Error sharing station location:", error);
      alert("Error sharing station location");
    }
  }, []);

  const handlePdf = useCallback((requestId) => {
    const request = requests.find(req => req.id === requestId);
    
    if (request && request.status !== "Completed") {
      alert("PDF can only be generated for completed requests");
      return;
    }
    
    router.push(`/filling-requests/pdf-modal?id=${requestId}`);
  }, [requests, router]);

  const [detailsModal, setDetailsModal] = useState(null);

  const handleShowDetails = useCallback((request) => {
    setDetailsModal(request);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModal(null);
  }, []);

  const closeExpanded = useCallback(() => {
    setExpandedRequest(null);
  }, []);

  // Memoized components
  const requestItems = useMemo(() =>
    filteredRequests.map((request, index) => (
      <RequestRow
        key={request.id}
        request={request}
        index={index}
        onView={handleView}
        onEdit={handleEdit}
        onExpand={handleExpand}
        onCall={handleCall}
        onShare={handleShare}
        onPdf={handlePdf}
        onShowDetails={handleShowDetails}
        onOtpVerify={handleOtpVerify}
        permissions={{...permissions, isAdmin: user && Number(user.role) === 5}}
        userRole={userRole}
      />
    )), [filteredRequests, handleView, handleEdit, handleExpand, handleCall, handleShare, handlePdf, handleShowDetails, handleOtpVerify, permissions, user, userRole]);

  const mobileRequestItems = useMemo(() =>
    filteredRequests.map((request, index) => (
      <MobileRequestCard
        key={request.id}
        request={request}
        index={index}
        onView={handleView}
        onEdit={handleEdit}
        onExpand={handleExpand}
        onCall={handleCall}
        onShare={handleShare}
        onPdf={handlePdf}
        onShowDetails={handleShowDetails}
        onOtpVerify={handleOtpVerify}
        permissions={{...permissions, isAdmin: user && Number(user.role) === 5}}
        userRole={userRole}
      />
    )), [filteredRequests, handleView, handleEdit, handleExpand, handleCall, handleShare, handlePdf, handleShowDetails, handleOtpVerify, permissions, user, userRole]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-auto flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Redirect if user is not authenticated
  if (!user) {
    return null;
  }

  // Show access denied if no permission
  if (!hasPermission) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
              <p className="text-red-600">You do not have permission to view filling requests.</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator for access.</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 px-2 md:px-4 py-0 md:py-0 overflow-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
              <button onClick={() => router.back()} className="mr-2 md:mr-3 text-blue-600 hover:text-blue-800">←</button>
              Purchase Order Requests
            </h1>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
              {/* For Team Leader (role 3) and above: Show status filters */}
              {userRole >= 3 && (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <StatusFilters currentStatus={statusFilter} onStatusChange={handleStatusChange} userRole={userRole} />
                </div>
              )}
              {/* Search bar */}
              <div className={userRole >= 3 ? "md:w-1/3" : "w-full"}>
                <SearchBar onSearch={handleSearch} initialValue={search} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center space-x-2 text-sm">
                <span>Show</span>
                <select
                  value={pagination.recordsPerPage}
                  onChange={(e) => handleRecordsPerPageChange(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>entries</span>
              </div>
              {/* Export button - Hide for staff/incharge */}
              {userRole !== 1 && userRole !== 2 && (
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                  title="Export to CSV"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export</span>
                </button>
              )}
            </div>

            <>
              <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full bg-white border rounded-lg">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="py-3 px-4 border-b">#</th>
                        <th className="py-3 px-4 border-b">Request ID</th>
                        <th className="py-3 px-4 border-b">Product</th>
                        <th className="py-3 px-4 border-b">Loading Station</th>
                        <th className="py-3 px-4 border-b">Vehicle No</th>
                        <th className="py-3 px-4 border-b">Client Name</th>
                        <th className="py-3 px-4 border-b">Driver Phone</th>
                        <th className="py-3 px-4 border-b">Images</th>
                        <th className="py-3 px-4 border-b">Date & Time</th>
                        <th className="py-3 px-4 border-b">Completed Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestItems.length > 0 ? requestItems : (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-lg font-medium">No requests found</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {statusFilter ? `No ${statusFilter} requests found` : "No requests in the system"}
                              </p>
                              {search && (
                                <p className="text-sm text-gray-600">Try changing your search criteria</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden">
                  {mobileRequestItems.length > 0 ? mobileRequestItems : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg font-medium">No requests found</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {statusFilter ? `No ${statusFilter} requests found` : "No requests in the system"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-3">
                    <div className="text-sm text-gray-600">
                      Showing {(pagination.page - 1) * pagination.recordsPerPage + 1} to{" "}
                      {Math.min(pagination.page * pagination.recordsPerPage, pagination.totalRecords)} of{" "}
                      {pagination.totalRecords} entries
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 border rounded text-sm ${
                              pagination.page === pageNum ? "bg-blue-600 text-white" : "hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
            </>
          </div>

          {/* OTP Modal */}
          {otpModal.isOpen && (
            <OtpModal
              requestId={otpModal.requestId}
              
                onView={handleView} 

              requestRid={otpModal.requestRid}
              generatedOtp={otpModal.generatedOtp}
              onClose={closeOtpModal}
              onVerify={verifyOtp}
              onResend={resendOtp}
            />
          )}

          {expandedRequest && <ExpandedDetails request={expandedRequest} onClose={closeExpanded} userRole={userRole} />}

          {/* Details Modal - Created By and Completed By */}
          {detailsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeDetailsModal}>
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Request Details</h3>
                  <button
                    onClick={closeDetailsModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  {/* Created By */}
                  <div className="border-b pb-3">
                    <div className="text-sm font-medium text-gray-500 mb-1">Created By</div>
                    <div className="text-base text-gray-900 font-semibold">
                      {detailsModal.created_by_name || 'N/A'}
                    </div>
                    {(detailsModal.created_date_formatted || detailsModal.created_formatted || detailsModal.created_date || detailsModal.created) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {detailsModal.created_date_formatted || detailsModal.created_formatted || 
                         (detailsModal.created_date || detailsModal.created ? 
                           new Date(detailsModal.created_date || detailsModal.created).toLocaleString("en-IN", {
                             day: "2-digit",
                             month: "2-digit",
                             year: "numeric",
                             hour: "2-digit",
                             minute: "2-digit",
                             hour12: true
                           }) : '')}
                      </div>
                    )}
                  </div>
                  {/* Completed By */}
                  {detailsModal.status === "Completed" && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Completed By</div>
                      <div className="text-base text-gray-900 font-semibold">
                        {detailsModal.completed_by_name || 'N/A'}
                      </div>
                      {detailsModal.completed_date && detailsModal.completed_date !== "0000-00-00 00:00:00" && (
                        <div className="text-xs text-gray-500 mt-1">
                          {detailsModal.completed_date_formatted || new Date(detailsModal.completed_date).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Asia/Kolkata"
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Button - Show for Team Leader (role 3) and above with can_create permission */}
          {permissions.can_create && userRole >= 3 && (
            <a
              href="/create-request"
              className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-3 md:px-6 md:py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10 flex items-center text-sm md:text-base"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Request
            </a>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
