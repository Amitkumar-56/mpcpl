'use client';

import { useEffect, useState } from 'react';

export default function StockDebugPage() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testId, setTestId] = useState('1');

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug/stock-check');
      const result = await response.json();
      setDebugInfo(result);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testStockDetails = async (id) => {
    try {
      console.log('Testing stock details for ID:', id);
      const response = await fetch(`/api/stock/${id}`);
      const result = await response.json();
      console.log('Stock details result:', result);
      alert(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Stock details error:', error);
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1>Loading debug information...</h1>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Stock Debug Page</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        {debugInfo ? (
          <div className="space-y-4">
            <div>
              <strong>Success:</strong> {debugInfo.success ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Total Records:</strong> {debugInfo.total || 0}
            </div>
            <div>
              <strong>Message:</strong> {debugInfo.message || 'No message'}
            </div>
            {debugInfo.error && (
              <div className="text-red-600">
                <strong>Error:</strong> {debugInfo.error}
              </div>
            )}
            {debugInfo.table_structure && (
              <div>
                <strong>Table Structure:</strong>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(debugInfo.table_structure, null, 2)}
                </pre>
              </div>
            )}
            {debugInfo.records && (
              <div>
                <strong>Recent Records:</strong>
                <ul className="list-disc pl-5">
                  {debugInfo.records.map((record) => (
                    <li key={record.id}>
                      ID: {record.id}, Invoice: {record.invoice_number}, Created: {record.created_at}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div>No debug information available</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Stock Details</h2>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            placeholder="Enter Stock ID"
            className="px-3 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={() => testStockDetails(testId)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Stock Details
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <button
            onClick={() => testStockDetails('1')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test ID: 1
          </button>
          <button
            onClick={() => testStockDetails('2')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test ID: 2
          </button>
          <button
            onClick={() => testStockDetails('3')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test ID: 3
          </button>
        </div>
      </div>
    </div>
  );
}
