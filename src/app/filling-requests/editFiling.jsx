"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import Sidebar from "../../components/sidebar";

// Icons Component
const Icons = ({
  request,
  onView,
  onEdit,
  onExpand,
  onCall,
  onShare,
  onPdf,
}) => {
  const stationPhone = request.station_phone && request.station_phone !== "NULL" ? request.station_phone : null;
  const hasMapLink = request.station_map_link && request.station_map_link !== "NULL";

  return (
    <div className="flex items-center space-x-1">
      {/* View Icon */}
      <button
        onClick={() => onView(request.id)}
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        title="View Details"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>

      {/* Edit Icon */}
      <button
        onClick={() => onEdit(request.id)}
        className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
        title="Edit Request"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Expand Icon */}
      <button
        onClick={() => onExpand(request)}
        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
        title="Expand Details"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Call Icon */}
      <button
        onClick={() => onCall(request.station_phone, request.loading_station)}
        disabled={!stationPhone}
        className={`p-1.5 rounded-full transition-colors ${
          stationPhone 
            ? "text-green-600 hover:bg-green-50" 
            : "text-gray-400 cursor-not-allowed"
        }`}
        title={stationPhone ? `Call Station: ${stationPhone}` : "No phone number available"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>

      {/* Share Icon */}
      <button
        onClick={() => onShare(request)}
        disabled={!hasMapLink}
        className={`p-1.5 rounded-full transition-colors ${
          hasMapLink 
            ? "text-blue-600 hover:bg-blue-50" 
            : "text-gray-400 cursor-not-allowed"
        }`}
        title={hasMapLink ? "Share Station Location" : "No map location available"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {/* PDF Icon */}
      {request.status === "Completed" && (
        <button
          onClick={() => onPdf(request.id)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
const ExpandedDetails = ({ request, onClose }) => {
  if (!request) return null;
  
  const stationPhone = request.station_phone && request.station_phone !== "NULL" ? request.station_phone : null;
  const stationEmail = request.station_email && request.station_email !== "NULL" ? request.station_email : null;
  const stationManager = request.station_manager && request.station_manager !== "NULL" ? request.station_manager : null;
  const stationMapLink = request.station_map_link && request.station_map_link !== "NULL" ? request.station_map_link : null;

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
                <span>{request.created ? new Date(request.created).toLocaleString("en-IN") : "N/A"}</span>
              </div>
              {request.completed_date && request.completed_date !== "0000-00-00 00:00:00" && (
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span>{new Date(request.completed_date).toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Request Row Component
const RequestRow = ({ request, index, onView, onEdit, onExpand, onCall, onShare, onPdf }) => {
  const statusClass = {
    Pending: "bg-yellow-100 text-yellow-800",
    Processing: "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  }[request.status] || "bg-gray-100 text-gray-800";

  return (
    <tr className="hover:bg-gray-50 transition-colors border-b">
      <td className="py-3 px-4 text-center text-sm">{index + 1}</td>
      <td className="py-3 px-4 font-mono text-sm font-semibold text-blue-600">{request.rid}</td>
      <td className="py-3 px-4 text-sm">{request.product_name || "N/A"}</td>
      <td className="py-3 px-4 text-sm">{request.loading_station || "N/A"}</td>
      <td className="py-3 px-4 text-sm font-medium">{request.vehicle_number}</td>
      <td className="py-3 px-4 text-sm">{request.customer_name || "N/A"}</td>
      <td className="py-3 px-4 text-sm">{request.driver_number}</td>
      <td className="py-3 px-4 text-sm">
        <div>{request.created ? new Date(request.created).toLocaleDateString("en-IN") : "N/A"}</div>
        <div className="text-xs text-gray-500">
          {request.created ? new Date(request.created).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
        </div>
      </td>
      <td className="py-3 px-4 text-sm">
        {request.completed_date && request.completed_date !== "0000-00-00 00:00:00"
          ? new Date(request.completed_date).toLocaleDateString("en-IN")
          : "-"}
      </td>
      <td className="py-3 px-4 text-sm">
        <div className="flex flex-col">
          <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>{request.status}</span>
          {request.status === "Processing" && request.processing_by_name && (
            <span className="text-xs text-gray-600 mt-1">By: {request.processing_by_name}</span>
          )}
          {request.status === "Completed" && request.completed_by_name && (
            <span className="text-xs text-gray-600 mt-1">By: {request.completed_by_name}</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-sm">
        {request.status === "Pending" && request.eligibility && (
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
        )}
        {request.status !== "Pending" && <span className="text-gray-400 text-xs">N/A</span>}
      </td>
      <td className="py-3 px-4 text-sm">
        {request.status === "Processing" && request.processing_by_name 
          ? request.processing_by_name
          : request.status === "Completed" && request.completed_by_name
          ? request.completed_by_name
          : request.updated_by_name || "System"}
      </td>
      <td className="py-3 px-4 text-sm">
        <Icons request={request} onView={onView} onEdit={onEdit} onExpand={onExpand} onCall={onCall} onShare={onShare} onPdf={onPdf} />
      </td>
    </tr>
  );
};

// Mobile Request Card Component
const MobileRequestCard = ({ request, index, onView, onEdit, onExpand, onCall, onShare, onPdf }) => {
  const statusClass = {
    Pending: "bg-yellow-100 text-yellow-800",
    Processing: "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    Cancelled: "bg-red-100 text-red-800",
  }[request.status] || "bg-gray-100 text-gray-800";

  const stationPhone = request.station_phone && request.station_phone !== "NULL" ? request.station_phone : null;
  const hasMapLink = request.station_map_link && request.station_map_link !== "NULL";

  return (
    <div className="border rounded-xl p-4 mb-4 bg-white shadow-md hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className="mr-3 text-sm text-gray-500">#{index + 1}</div>
          <div>
            <div className="font-semibold text-gray-800 font-mono">{request.rid}</div>
            <div className="text-sm text-gray-600">{request.product_name || "N/A"}</div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>{request.status}</span>
      </div>
      <div className="space-y-3 text-sm">
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
              {request.created ? new Date(request.created).toLocaleDateString("en-IN") : "N/A"}
              <br />
              <span className="text-xs text-gray-500">
                {request.created ? new Date(request.created).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>
          </div>
          {request.completed_date && request.completed_date !== "0000-00-00 00:00:00" && (
            <div>
              <div className="font-medium text-gray-600 text-xs">Completed</div>
              <div>{new Date(request.completed_date).toLocaleDateString("en-IN")}</div>
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

        {request.updated_by_name && (
          <div>
            <div className="font-medium text-gray-600 text-xs">Staff</div>
            <div>{request.updated_by_name}</div>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center mt-4 pt-3 border-t">
        <div className="text-xs text-gray-500">Request ID: {request.rid}</div>
        <Icons request={request} onView={onView} onEdit={onEdit} onExpand={onExpand} onCall={onCall} onShare={onShare} onPdf={onPdf} />
      </div>
    </div>
  );
};

// Quick Loading Component
const QuickLoading = () => (
  <div className="flex justify-center items-center py-10">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600 font-medium">Loading requests...</span>
  </div>
);

// StatusFilters Component
const StatusFilters = ({ currentStatus, onStatusChange }) => {
  const router = useRouter();

  const statusOptions = [
    { value: "", label: "All" },
    { value: "Pending", label: "Pending" },
    { value: "Processing", label: "Processing" },
    { value: "Completed", label: "Completed" },
  ];

  const handleReportsClick = () => {
    router.push("/reports");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {statusOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onStatusChange(option.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            currentStatus === option.value ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {option.label}
        </button>
      ))}
      <button
        onClick={handleReportsClick}
        className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
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
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by RID, Vehicle, Client, Station..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
        🔍
      </button>
    </form>
  );
};

// Main Component
export default function FillingRequests() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    recordsPerPage: 10,
    totalRecords: 0,
    totalPages: 1,
  });

  const statusFilter = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  // Fetch requests with detailed logging
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: searchParams.get("page") || "1",
          records_per_page: searchParams.get("records_per_page") || "10",
          ...(statusFilter && { status: statusFilter }),
          ...(search && { search: search }),
        });

        console.log("🔍 Fetching from:", `/api/filling-requests?${params}`);
        console.log("📡 Full URL:", `${window.location.origin}/api/filling-requests?${params}`);

        const response = await fetch(`/api/filling-requests?${params}`);
        console.log("📡 Response status:", response.status);
        console.log("📡 Response ok:", response.ok);

        if (response.ok) {
          const result = await response.json();
          console.log("📦 Full API response:", result);

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

          console.log("✅ Processed requests count:", requestsData.length);
          console.log("✅ Pagination data:", paginationData);

          setRequests(requestsData);
          setPagination(paginationData);
        } else {
          console.error("❌ Failed to fetch requests. Status:", response.status);
          const errorText = await response.text();
          console.error("❌ Error response:", errorText);
          setRequests([]);
          setPagination({
            page: 1,
            recordsPerPage: 10,
            totalRecords: 0,
            totalPages: 1,
          });
        }
      } catch (error) {
        console.error("❌ Fetch error:", error);
        console.error("❌ Error details:", error.message);
        setRequests([]);
        setPagination({
          page: 1,
          recordsPerPage: 10,
          totalRecords: 0,
          totalPages: 1,
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRequests();
    }
  }, [searchParams, statusFilter, search, user]);

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

  const handleView = useCallback((requestId) => {
    router.push(`/filling-details-admin?id=${requestId}`);
  }, [router]);

  const handleEdit = useCallback((requestId) => {
    router.push(`/filling-requests/edit?id=${requestId}`);
  }, [router]);

  const handleExpand = useCallback((request) => {
    setExpandedRequest(request);
  }, []);

  const handleCall = useCallback((stationPhone, stationName = "") => {
    console.log("📞 Calling station:", { stationName, stationPhone });
    
    if (!stationPhone || stationPhone === "NULL" || stationPhone.trim() === "") {
      alert(`📞 No phone number available for station: ${stationName || "Unknown Station"}`);
      return;
    }
    
    const cleanPhoneNumber = stationPhone.trim().replace(/[\s\-\(\)]/g, '');
    const isValidIndianNumber = /^[6-9]\d{9}$/.test(cleanPhoneNumber);
    
    if (isValidIndianNumber) {
      console.log("🇮🇳 Calling Indian number:", cleanPhoneNumber);
      window.open(`tel:+91${cleanPhoneNumber}`);
    } else if (cleanPhoneNumber.length >= 10) {
      console.log("📞 Calling international number:", cleanPhoneNumber);
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
                     `📅 Created: ${request.created ? new Date(request.created).toLocaleString("en-IN") : "N/A"}`;

      if (request.completed_date && request.completed_date !== "0000-00-00 00:00:00") {
        shareText += `\n✅ Completed: ${new Date(request.completed_date).toLocaleString("en-IN")}`;
      }

      console.log("📤 Sharing station location:", shareText);

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Station Location - ${request.loading_station}`,
            text: shareText,
            url: stationMapLink,
          });
          console.log("✅ Shared successfully via Web Share API");
        } catch (error) {
          if (error.name !== 'AbortError') {
            await navigator.clipboard.writeText(shareText);
            alert("📋 Station location copied to clipboard!");
          }
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareText);
          alert("📋 Station location copied to clipboard!\n\nYou can paste it in WhatsApp or any messaging app.");
        } catch (error) {
          const textArea = document.createElement('textarea');
          textArea.value = shareText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert("📋 Station location copied to clipboard!");
        }
      }
    } catch (error) {
      console.error("❌ Error sharing station location:", error);
      alert("Error sharing station location");
    }
  }, []);

  const handlePdf = useCallback((requestId) => {
    const request = requests.find(req => req.id === requestId);
    
    if (request && request.status !== "Completed") {
      alert("PDF can only be generated for completed requests");
      return;
    }
    
    router.push(`/filling-requests/pdf?id=${requestId}`);
  }, [requests, router]);

  const closeExpanded = useCallback(() => {
    setExpandedRequest(null);
  }, []);

  // Memoized components
  const requestItems = useMemo(() =>
    requests.map((request, index) => (
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
      />
    )), [requests, handleView, handleEdit, handleExpand, handleCall, handleShare, handlePdf]);

  const mobileRequestItems = useMemo(() =>
    requests.map((request, index) => (
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
      />
    )), [requests, handleView, handleEdit, handleExpand, handleCall, handleShare, handlePdf]);

  if (!user) return <QuickLoading />;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 px-4 py-0 overflow-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <button onClick={() => router.back()} className="mr-3 text-blue-600 hover:text-blue-800">←</button>
              Purchase Order Requests
            </h1>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <StatusFilters currentStatus={statusFilter} onStatusChange={handleStatusChange} />
              </div>
              <div className="md:w-1/3">
                <SearchBar onSearch={handleSearch} initialValue={search} />
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-4 text-sm">
              <span>Show</span>
              <select
                value={pagination.recordsPerPage}
                onChange={(e) => handleRecordsPerPageChange(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>entries</span>
            </div>

            {loading ? (
              <QuickLoading />
            ) : (
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
                        <th className="py-3 px-4 border-b">Date & Time</th>
                        <th className="py-3 px-4 border-b">Completed Date</th>
                        <th className="py-3 px-4 border-b">Status</th>
                        <th className="py-3 px-4 border-b">Eligibility Check</th>
                        <th className="py-3 px-4 border-b">Staff</th>
                        <th className="py-3 px-4 border-b">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestItems.length > 0 ? requestItems : (
                        <tr>
                          <td colSpan="13" className="py-8 text-center text-gray-500">
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
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
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
                            className={`px-3 py-1 border rounded ${
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
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {expandedRequest && <ExpandedDetails request={expandedRequest} onClose={closeExpanded} />}

          <a
            href="/create-request"
            className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Request
          </a>
        </main>
        <Footer />
      </div>
    </div>
  );
}