'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

function StockHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState({
    filling_stations: {},
    products: [],
    rows: [],
    filters: {}
  });
  const [filters, setFilters] = useState({
    pname: '',
    from_date: '',
    to_date: ''
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const cid = searchParams.get('id');

  // Check for mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const fetchStockHistory = useCallback(async (filterParams = {}) => {
    if (fetchingRef.current) {
      console.log('⚠️ Fetch already in progress, skipping...');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const params = new URLSearchParams();
      
      if (cid) params.append('id', cid);
      if (filterParams.pname) params.append('pname', filterParams.pname);
      if (filterParams.from_date) params.append('from_date', filterParams.from_date);
      if (filterParams.to_date) params.append('to_date', filterParams.to_date);

      const url = `/api/stock-history?${params}`;
      console.log('🔍 Fetching stock history from:', url);

      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        
        if (response.status === 401 || response.status === 403) {
          console.warn('⚠️ Authentication error, returning empty data instead of throwing');
          if (!isMountedRef.current) return;
          setData({
            filling_stations: {},
            products: [],
            rows: [],
            filters: {}
          });
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Stock history API response:', {
        success: result.success,
        rowsCount: result.data?.rows?.length || 0,
        error: result.error
      });

      if (!isMountedRef.current) {
        return;
      }

      if (result.success) {
        setData(result.data || {
          filling_stations: {},
          products: [],
          rows: [],
          filters: {}
        });
        const newFilters = {
          pname: result.data?.filters?.pname || '',
          from_date: result.data?.filters?.from_date || '',
          to_date: result.data?.filters?.to_date || ''
        };
        setFilters(prev => {
          if (prev.pname === newFilters.pname && 
              prev.from_date === newFilters.from_date && 
              prev.to_date === newFilters.to_date) {
            return prev;
          }
          return newFilters;
        });
        // Reset expanded rows when new data loads
        setExpandedRows({});
      } else {
        console.error('❌ API returned error:', result.error);
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('❌ Error fetching stock history:', error);
      setData({
        filling_stations: {},
        products: [],
        rows: [],
        filters: {}
      });
    } finally {
      fetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [cid]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStockHistory();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStockHistory]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchStockHistory(filters);
  };

  const handleReset = () => {
    setFilters({
      pname: '',
      from_date: '',
      to_date: ''
    });
    fetchStockHistory({});
  };

  const handleExportToExcel = async () => {
    try {
      setExportLoading(true);
      
      const params = new URLSearchParams();
      if (cid) params.append('id', cid);
      if (filters.pname) params.append('pname', filters.pname);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const response = await fetch(`/api/export/stock?${params}`);
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `stock-history-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('Excel file downloaded successfully!');
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '0';
  };

  // Toggle expanded row
  const toggleExpand = (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  // Mobile card with accordion
  const MobileStockCard = ({ row }) => {
    const isEdited = row.trans_type?.toLowerCase() === 'edited';
    const hasRid = row.rid && row.rid.trim() !== '';
    const isExpanded = expandedRows[row.id];
    
    const handleCardClick = () => {
      if (isEdited && hasRid) {
        router.push(`/filling-requests?search=${encodeURIComponent(row.rid)}`);
      }
    };

    const handleExpandClick = (e) => {
      e.stopPropagation();
      toggleExpand(row.id);
    };

    return (
      <div 
        className={`bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden ${isEdited && hasRid ? 'cursor-pointer' : ''}`}
        onClick={handleCardClick}
      >
        {/* Header Section - Always Visible */}
        <div className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded mr-2">
                #{row.id}
              </span>
              {isEdited && (
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded border border-purple-300">
                  Edited ✏️
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {row.filling_date ? new Date(row.filling_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }) : '-'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-xs text-gray-500">Station</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {row.fs_id && data.filling_stations[row.fs_id] ? data.filling_stations[row.fs_id] : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Product</div>
              <div className="text-sm font-medium text-gray-900">{row.pname || '-'}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <div className="text-xs text-gray-500">Type</div>
              {(() => {
                const transType = row.trans_type?.toLowerCase() || '';
                let typeText;
                let badgeColor;
                
                if (transType === 'inward') {
                  typeText = 'Inward';
                  badgeColor = 'bg-green-100 text-green-800';
                } else if (transType === 'outward') {
                  typeText = 'Outward';
                  badgeColor = 'bg-red-100 text-red-800';
                } else if (transType === 'edited') {
                  typeText = 'Edited';
                  badgeColor = 'bg-purple-100 text-purple-800';
                } else if (transType === 'extra') {
                  typeText = 'Extra';
                  badgeColor = 'bg-blue-100 text-blue-800 border border-blue-300';
                } else if (transType === 'stored') {
                  typeText = 'Stored';
                  badgeColor = 'bg-orange-100 text-orange-800 border border-orange-300';
                } else {
                  typeText = row.trans_type || 'N/A';
                  badgeColor = 'bg-gray-100 text-gray-800';
                }
                
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                    {typeText}
                  </span>
                );
              })()}
            </div>
            <div>
              <div className="text-xs text-gray-500">Current Stock</div>
              <div className="text-sm font-medium text-gray-900">
                {formatNumber(row.current_stock)}L
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Loading Qty</div>
              <div className="text-sm font-medium text-gray-900">
                {isEdited ? (
                  <span className="text-purple-700 font-bold">
                    {(() => {
                      let qtyChange = 0;
                      if (row.remarks) {
                        const qtyMatch = row.remarks.match(/Qty was ([\d,]+\.?\d*)\s*L,?\s*now ([\d,]+\.?\d*)\s*L/i);
                        if (qtyMatch) {
                          const oldQty = parseFloat(qtyMatch[1].replace(/,/g, ''));
                          const newQty = parseFloat(qtyMatch[2].replace(/,/g, ''));
                          qtyChange = oldQty - newQty;
                        }
                      }
                      if (qtyChange === 0) {
                        const stockChange = parseFloat(row.available_stock || 0) - parseFloat(row.current_stock || 0);
                        qtyChange = -stockChange;
                      }
                      return qtyChange > 0 
                        ? `-${formatNumber(qtyChange)}L` 
                        : qtyChange < 0 
                        ? `+${formatNumber(Math.abs(qtyChange))}L` 
                        : '0L';
                    })()}
                  </span>
                ) : (
                  formatNumber(row.filling_qty) + 'L'
                )}
              </div>
            </div>
          </div>

          {/* Expand/Collapse Button - Loading Qty के बाद */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">More Details</div>
            <button
              onClick={handleExpandClick}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {isExpanded ? (
                <>
                  <span className="mr-1">Show Less</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span className="mr-1">Show More</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Details Section - Collapsible */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50 animate-fadeIn">
            <div className="pt-3 space-y-3">
              {/* Available Quantity */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Available Quantity</span>
                  <span className={`text-sm font-bold ${
                    parseFloat(row.available_stock || 0) <= 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {formatNumber(row.available_stock)}L
                    {parseFloat(row.available_stock || 0) <= 0 && (
                      <span className="ml-1 text-xs font-normal">(Low Stock)</span>
                    )}
                  </span>
                </div>
                {isEdited && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-xs text-purple-600">Before</div>
                      <div className="text-sm font-bold text-purple-800">{formatNumber(row.current_stock || 0)}L</div>
                    </div>
                    <div className="bg-green-50 rounded p-2">
                      <div className="text-xs text-green-600">After</div>
                      <div className="text-sm font-bold text-green-800">{formatNumber(row.available_stock)}L</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Vehicle Number (अगर है तो) */}
              {row.vehicle_number && (
                <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Vehicle Number</span>
                  <span className="text-sm font-medium text-gray-900">{row.vehicle_number}</span>
                </div>
              )}

              {/* Created By */}
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Created By</span>
                <span className="text-sm text-gray-900">
                  {row.created_by_name || row.user_name || (row.created_by ? `Emp ${row.created_by}` : '-')}
                </span>
              </div>

              {/* Remarks for Edited */}
              {isEdited && row.remarks && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="text-xs font-medium text-purple-700 mb-1">Remarks</div>
                  <p className="text-sm text-purple-800">{row.remarks}</p>
                </div>
              )}

              {/* Click hint for edited rows */}
              {isEdited && hasRid && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-blue-700">
                      Click card to view filling request #{row.rid}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Desktop table row with inline expand/collapse
  const DesktopTableRow = ({ row }) => {
    const isEdited = row.trans_type?.toLowerCase() === 'edited';
    const hasRid = row.rid && row.rid.trim() !== '';
    const isExpanded = expandedRows[row.id];
    
    const handleRowClick = () => {
      if (isEdited && hasRid) {
        router.push(`/filling-requests?search=${encodeURIComponent(row.rid)}`);
      }
    };

    const handleExpandClick = (e) => {
      e.stopPropagation();
      toggleExpand(row.id);
    };

    return (
      <>
        <tr 
          className={`hover:bg-gray-50 transition-colors ${isEdited ? 'bg-purple-100 border-l-4 border-purple-600 cursor-pointer' : ''}`}
          onClick={handleRowClick}
        >
          <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
            #{row.id}
          </td>
          <td className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-900">
            {row.fs_id && data.filling_stations[row.fs_id] ? data.filling_stations[row.fs_id] : '-'}
          </td>
          <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-900">
            {row.filling_date ? new Date(row.filling_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) : '-'}
          </td>
          <td className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-900">
            {row.pname ? <span className="font-medium">{row.pname}</span> : '-'}
          </td>
          <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap">
            {(() => {
              const transType = row.trans_type?.toLowerCase() || '';
              let typeText;
              let badgeColor;
              
              if (transType === 'inward') {
                typeText = 'Inward';
                badgeColor = 'bg-green-100 text-green-800';
              } else if (transType === 'outward') {
                typeText = 'Outward';
                badgeColor = 'bg-red-100 text-red-800';
              } else if (transType === 'edited') {
                typeText = 'Edited ';
                badgeColor = 'bg-purple-100 text-purple-800 font-bold border border-purple-300';
              } else if (transType === 'extra') {
                typeText = 'Extra';
                badgeColor = 'bg-blue-100 text-blue-800 border border-blue-300';
              } else if (transType === 'stored') {
                typeText = 'Stored';
                badgeColor = 'bg-orange-100 text-orange-800 border border-orange-300';
              } else {
                typeText = row.trans_type || 'N/A';
                badgeColor = 'bg-gray-100 text-gray-800';
              }
              
              return (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                  {typeText}
                </span>
              );
            })()}
          </td>
          <td className="px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-900">
            {(row.trans_type?.toLowerCase() === 'outward' || row.trans_type?.toLowerCase() === 'edited') && row.rid
              ? (row.vehicle_number || '')
              : ''
            }
          </td>
          <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
            {isEdited ? (
              <div className="space-y-1">
                <div className="text-xs md:text-sm font-bold text-purple-800 bg-purple-50 px-2 py-1 rounded">
                  Before: {formatNumber(row.current_stock || 0)}L
                </div>
              </div>
            ) : (
              formatNumber(row.current_stock)
            )}
          </td>
          <td className="px-3 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-900">
            <div className="flex items-center">
              <div>
                {isEdited ? (
                  <div className="text-xs md:text-sm font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                    {(() => {
                      let qtyChange = 0;
                      if (row.remarks) {
                        const qtyMatch = row.remarks.match(/Qty was ([\d,]+\.?\d*)\s*L,?\s*now ([\d,]+\.?\d*)\s*L/i);
                        if (qtyMatch) {
                          const oldQty = parseFloat(qtyMatch[1].replace(/,/g, ''));
                          const newQty = parseFloat(qtyMatch[2].replace(/,/g, ''));
                          qtyChange = oldQty - newQty;
                        }
                      }
                      if (qtyChange === 0) {
                        const stockChange = parseFloat(row.available_stock || 0) - parseFloat(row.current_stock || 0);
                        qtyChange = -stockChange;
                      }
                      return qtyChange > 0 
                        ? `-${formatNumber(qtyChange)}L` 
                        : qtyChange < 0 
                        ? `+${formatNumber(Math.abs(qtyChange))}L` 
                        : '0L';
                    })()}
                  </div>
                ) : (
                  formatNumber(row.filling_qty)
                )}
              </div>
              <button
                onClick={handleExpandClick}
                className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                title={isExpanded ? "Show Less" : "Show More"}
              >
                {isExpanded ? (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>
          </td>
        </tr>
        
        {/* Expanded Details Row - Available Qty और Created By */}
        {isExpanded && (
          <tr className="bg-gray-50">
            <td colSpan="8" className="px-3 py-3 md:px-4 md:py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Available Quantity Section */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Available Quantity</span>
                    <span className={`text-sm font-bold ${
                      parseFloat(row.available_stock || 0) <= 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {formatNumber(row.available_stock)}L
                      {parseFloat(row.available_stock || 0) <= 0 && (
                        <span className="ml-1 text-xs font-normal">(Low Stock)</span>
                      )}
                    </span>
                  </div>
                  {isEdited && row.available_stock !== null && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-purple-600 mb-1">Before Edit</div>
                        <div className="text-lg font-bold text-purple-800">{formatNumber(row.current_stock || 0)}L</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-green-600 mb-1">After Edit</div>
                        <div className="text-lg font-bold text-green-800">{formatNumber(row.available_stock)}L</div>
                      </div>
                    </div>
                  )}
                  {row.remarks && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-600 mb-1">Remarks</div>
                      <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">{row.remarks}</p>
                    </div>
                  )}
                </div>

                {/* Created By Section */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Created By</div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold text-xs">
                          {(row.created_by_name || row.user_name || 'EMP').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {row.created_by_name || row.user_name || (row.created_by ? `Employee #${row.created_by}` : 'Unknown')}
                        </div>
                        {row.created_by && !row.created_by_name && !row.user_name && (
                          <div className="text-xs text-gray-500">Employee ID: {row.created_by}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Number (if exists) */}
                  {row.vehicle_number && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Vehicle Details</div>
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">Vehicle No:</span> {row.vehicle_number}
                      </div>
                      {row.rid && (
                        <div className="text-xs text-gray-500 mt-1">
                          Request ID: {row.rid}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
              <div className="flex items-center">
                <Link 
                  href="/stock"
                  className="mr-3 md:mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900">All Stocks</h1>
                  <nav className="flex mt-1 md:mt-2">
                    <ol className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
                      <li>
                        <a href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
                          Home
                        </a>
                      </li>
                      <li className="flex items-center">
                        <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="ml-1 md:ml-2 text-gray-500">All Stocks</span>
                      </li>
                    </ol>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-8">
            {/* Filter Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 md:mb-8">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
                <h2 className="text-base md:text-lg font-semibold text-gray-900">Filter Stocks</h2>
              </div>
              <div className="p-4 md:p-6">
                <form onSubmit={handleFilterSubmit}>
                  {cid && (
                    <input type="hidden" name="id" value={cid} />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                    <div>
                      <label htmlFor="pname-filter" className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                        Product Name
                      </label>
                      <select
                        id="pname-filter"
                        name="pname"
                        value={filters.pname}
                        onChange={(e) => setFilters({...filters, pname: e.target.value})}
                        className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
                      >
                        <option value="">All Products</option>
                        {data.products.map((product, index) => (
                          <option key={index} value={product}>
                            {product}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                        From Date
                      </label>
                      <input
                        type="date"
                        id="from_date"
                        name="from_date"
                        value={filters.from_date}
                        onChange={(e) => setFilters({...filters, from_date: e.target.value})}
                        className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
                      />
                    </div>
                    <div>
                      <label htmlFor="to_date" className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                        To Date
                      </label>
                      <input
                        type="date"
                        id="to_date"
                        name="to_date"
                        value={filters.to_date}
                        onChange={(e) => setFilters({...filters, to_date: e.target.value})}
                        className="w-full px-3 py-2 md:px-4 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm md:text-base"
                    >
                      Apply Filters
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-6 py-2.5 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm md:text-base"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Data Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-gray-900">Stock History</h2>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      Total Records: {data.rows.length}
                      {isMobile && " (Tap cards to expand)"}
                    </p>
                  </div>
                  <button
                    onClick={handleExportToExcel}
                    disabled={exportLoading || data.rows.length === 0}
                    className="flex items-center justify-center px-4 py-2 md:px-6 md:py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto text-sm md:text-base"
                  >
                    {exportLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {isMobile ? 'Export Excel' : 'Export to Excel'}
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="p-3 md:p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8 md:py-12">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-gray-600">Loading stock history...</p>
                    </div>
                  </div>
                ) : data.rows.length > 0 ? (
                  <>
                    {/* Mobile View with Accordion Cards */}
                    {isMobile ? (
                      <div className="space-y-0">
                        {data.rows.map((row) => (
                          <MobileStockCard key={row.id} row={row} />
                        ))}
                      </div>
                    ) : (
                      /* Desktop View - Table */
                      <div className="overflow-x-auto lg:overflow-x-visible">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ID
                              </th>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Station
                              </th>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Product
                              </th>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                              </th>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Vehicle No
                              </th>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Stock
                              </th>
                              <th scope="col" className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Loading Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.rows.map((row) => (
                              <DesktopTableRow key={row.id} row={row} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-6 py-8 md:py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <svg className="w-12 h-12 md:w-16 md:h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-base md:text-lg font-medium text-gray-900 mb-2">No stock history found</p>
                      <p className="text-sm">Try adjusting your filters or check back later for new entries.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function StockHistory() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading stock history...</p>
        </div>
      </div>
    }>
      <StockHistoryContent />
    </Suspense>
  );
}