'use client';

import React, { useState } from 'react';

export default function ExportButton({ data = [], fileName = 'export', columns = [] }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    try {
      setExporting(true);
      
      if (!data || data.length === 0) {
        alert('No data to export');
        setExporting(false);
        return;
      }

      // Prepare CSV content
      const headers = columns.map(col => `"${col.header}"`).join(',');
      
      const rows = data.map(row => {
        return columns.map(col => {
          let value = row[col.key];
          
          // Handle nested keys if necessary
          if (value === null || value === undefined) value = '';
          
          // Handle objects/arrays
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          
          // Convert to string
          const stringValue = String(value);
          
          // Escape quotes and wrap in quotes
          return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',');
      });
      
      const csvContent = [headers, ...rows].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting || data.length === 0}
      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {exporting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </>
      )}
    </button>
  );
}
