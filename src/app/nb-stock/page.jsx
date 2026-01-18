// /app/non-billing-stocks/page.js
'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NonBillingStocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  // Fetch stocks data
  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/nb-stock');
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setStocks(data.data);
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching stocks:', err);
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-64 z-40">
          <Header />
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 pt-16 overflow-y-auto">
          <div className="p-6">
            {/* Floating Action Button - Fixed Position */}
            <Link
              href="/nb-stock/create-nb-expense"
              className="fixed bottom-10 right-10 z-50 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 hover:shadow-xl hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              NB-Stock-Expense
            </Link>

            {/* Breadcrumb Navigation */}
            <div className="mb-6">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
                      <svg className="w-3 h-3 mr-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                      </svg>
                      Home
                    </Link>
                  </li>
                  <li aria-current="page">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Non-Billing Stocks</span>
                    </div>
                  </li>
                </ol>
              </nav>
              
              <div className="flex items-center justify-between mt-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <button
                    onClick={() => router.back()}
                    className="mr-4 text-purple-600 hover:text-purple-800 transition-colors p-1 hover:bg-purple-50 rounded-lg"
                    aria-label="Go back"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  Non-Billing Stocks
                </h1>
               
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-500">Total Items</div>
                <div className="text-2xl font-bold text-gray-900">{stocks.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-500">Total Stock Quantity</div>
                <div className="text-2xl font-bold text-blue-600">
                  {stocks.reduce((sum, item) => sum + (parseInt(item.stock) || 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-500">Unique Stations</div>
                <div className="text-2xl font-bold text-green-600">
                  {[...new Set(stocks.map(item => item.station_id))].length}
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Stock Details</h2>

                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                      <span className="ml-3 text-gray-600">Loading stock data...</span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="text-red-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <p className="text-gray-700">{error}</p>
                      <button
                        onClick={fetchStocks}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : stocks.length === 0 ? (
                    <div className="text-center py-12">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="mt-4 text-gray-700">No stock records found</p>
                      <Link
                        href="/create-nb-expense"
                        className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Add First Stock
                      </Link>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Station Details
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product Details
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock Quantity
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Updated
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stocks.map((stock) => (
                          <tr 
                            key={stock.id} 
                            className="hover:bg-gray-50 transition-colors duration-150"
                          >
                            {/* Station Details */}
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {stock.station_name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Station ID: {stock.station_id}
                              </div>
                            </td>
                            
                            {/* Product Details */}
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {stock.product_name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Product ID: {stock.product_id}
                              </div>
                            </td>
                            
                            {/* Stock Quantity */}
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                  parseInt(stock.stock) > 1000 
                                    ? 'bg-green-100 text-green-800' 
                                    : parseInt(stock.stock) > 100 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {parseInt(stock.stock).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            
                            {/* Last Updated */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {stock.last_updated}
                            </td>
                            
                            {/* Actions */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                <Link
                                  href={`/nb-stock/nb-stock-history?station_id=${stock.station_id}`}
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                  title="View History"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                  </svg>
                                  History
                                </Link>
                                
                               
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Fixed Footer at bottom */}
        <div className="sticky bottom-0 right-0 left-64 bg-white border-t border-gray-200">
          <Footer />
        </div>
      </div>
    </div>
  );
}