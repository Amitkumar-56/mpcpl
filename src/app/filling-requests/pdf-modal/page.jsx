"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar";
import jsPDF from "jspdf";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Main PDF Modal Component
function PDFModalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("id");
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const [request, setRequest] = useState(null);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [error, setError] = useState(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  // Fetch request data
  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId || !user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // ✅ FIX: Use 'id' parameter to match URL
        const response = await fetch(`/api/generate-pdf?id=${requestId}`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success) {
            setRequest(result.request);
          } else {
            throw new Error(result.error || "Failed to fetch request data");
          }
        } else {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          const errorMsg = errorData.error || errorData.details || `HTTP error! status: ${response.status}`;
          console.error('❌ API Error Response:', errorData);
          throw new Error(errorMsg);
        }
      } catch (error) {
        console.error("❌ Error fetching request:", error);
        console.error("Error details:", {
          message: error.message,
          requestId: requestId,
          user: user?.id
        });
        setError(error.message || "Failed to load request data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId, user]);

  // PDF Generation Function
  const generatePDF = () => {
    if (!request) return;

    try {
      setGenerating(true);
      setError(null);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryColor = [41, 128, 185];
      const secondaryColor = [52, 152, 219];
      const darkColor = [44, 62, 80];
      const lightColor = [236, 240, 241];
      const successColor = [39, 174, 96];
      
      // Add header with background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("PETROLEUM COMPANY LTD", pageWidth / 2, 15, { align: "center" });
      
      // Invoice Title
      doc.setFontSize(16);
      doc.text("FILLING REQUEST INVOICE", pageWidth / 2, 28, { align: "center" });
      
      let yPosition = 50;
      
      // Activity Logs Section
      doc.setFillColor(...lightColor);
      doc.rect(20, yPosition, pageWidth - 40, 35, 'F');
      
      doc.setTextColor(...darkColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("ACTIVITY LOGS", 25, yPosition + 8);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      if (request.created_by_name) {
        doc.text(`Created By: ${request.created_by_name} (${request.created_by_type || 'unknown'})`, 25, yPosition + 16);
        if (request.created_date) {
          doc.text(`Created Date: ${new Date(request.created_date).toLocaleString('en-IN')}`, 25, yPosition + 22);
        }
      }
      
      if (request.processed_by_name) {
        doc.text(`Processed By: ${request.processed_by_name}`, 110, yPosition + 16);
        if (request.processed_date) {
          doc.text(`Processed Date: ${new Date(request.processed_date).toLocaleString('en-IN')}`, 110, yPosition + 22);
        }
      }
      
      if (request.completed_by_name) {
        doc.text(`Completed By: ${request.completed_by_name}`, 110, yPosition + 28);
        if (request.completed_date) {
          doc.text(`Completed Date: ${new Date(request.completed_date).toLocaleString('en-IN')}`, 110, yPosition + 32);
        }
      }
      
      yPosition += 45;
      
      // Request ID and Dates section
      doc.setFillColor(...lightColor);
      doc.rect(20, yPosition, pageWidth - 40, 20, 'F');
      
      doc.setTextColor(...darkColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`REQUEST ID: ${request.rid}`, 25, yPosition + 8);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Created: ${request.formatted_created}`, 25, yPosition + 15);
      
      if (request.completed_date && request.completed_date !== "0000-00-00 00:00:00") {
        doc.text(`Completed: ${request.formatted_completed}`, 110, yPosition + 15);
      }
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...successColor);
      doc.text(`Status: ${request.status}`, pageWidth - 25, yPosition + 8, { align: "right" });
      
      yPosition += 30;
      
      // Customer Information Section
      doc.setTextColor(...darkColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER INFORMATION", 20, yPosition);
      
      doc.setDrawColor(...secondaryColor);
      doc.line(20, yPosition + 2, 85, yPosition + 2);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${request.customer_name || 'N/A'}`, 25, yPosition);
      doc.text(`Phone: ${request.customer_phone || 'N/A'}`, 25, yPosition + 6);
      
      if (request.customer_address) {
        const addressLines = doc.splitTextToSize(`Address: ${request.customer_address}`, 160);
        doc.text(addressLines, 25, yPosition + 12);
        yPosition += (addressLines.length * 4) + 12;
      } else {
        yPosition += 18;
      }
      
      // Filling Details Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FILLING DETAILS", 20, yPosition);
      doc.line(20, yPosition + 2, 60, yPosition + 2);
      yPosition += 10;
      
      // Create a table for filling details
      doc.setFillColor(...lightColor);
      doc.rect(20, yPosition, pageWidth - 40, 25, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Product", 25, yPosition + 8);
      doc.text("Quantity", 80, yPosition + 8);
      doc.text("Vehicle Number", 120, yPosition + 8);
      doc.text("Driver Phone", 170, yPosition + 8);
      
      doc.setFont("helvetica", "normal");
      doc.text(request.product_name || 'N/A', 25, yPosition + 16);
      doc.text(`${request.qty} liters`, 80, yPosition + 16);
      doc.text(request.vehicle_number || 'N/A', 120, yPosition + 16);
      doc.text(request.driver_number || 'N/A', 170, yPosition + 16);
      
      yPosition += 35;
      
      // Station Information
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("STATION INFORMATION", 20, yPosition);
      doc.line(20, yPosition + 2, 75, yPosition + 2);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Station Name: ${request.loading_station || 'N/A'}`, 25, yPosition);
      
      if (request.station_address) {
        const stationAddress = doc.splitTextToSize(`Address: ${request.station_address}`, 160);
        doc.text(stationAddress, 25, yPosition + 6);
        yPosition += (stationAddress.length * 4) + 10;
      } else {
        yPosition += 16;
      }
      
      // Financial Information
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("FINANCIAL INFORMATION", 20, yPosition);
      doc.line(20, yPosition + 2, 85, yPosition + 2);
      yPosition += 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 100, 0);
      doc.text(`Customer Balance: ₹${request.customer_balance || '0'}`, 25, yPosition);
      
      yPosition += 15;
      
      // Remarks Section
      if (request.remark) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkColor);
        doc.text("REMARKS", 20, yPosition);
        doc.line(20, yPosition + 2, 45, yPosition + 2);
        
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const remarks = doc.splitTextToSize(request.remark, 160);
        doc.text(remarks, 25, yPosition);
        yPosition += (remarks.length * 4) + 15;
      }
      
      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 270, pageWidth - 20, 270);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text("This is a computer generated invoice. No signature required.", pageWidth / 2, 275, { align: "center" });
      doc.text(`Generated on: ${request.current_date}`, pageWidth / 2, 280, { align: "center" });
      
      // Save PDF
      const fileName = `Filling_Request_${request.rid}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      setPdfGenerated(true);
      
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      setError("Error generating PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleDownloadPDF = () => {
    generatePDF();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading request details...</p>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={handleBack}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Request not found</p>
                <button
                  onClick={handleBack}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg">
            {/* Company Name Header */}
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <h1 className="text-2xl font-bold text-center">PETROLEUM COMPANY LTD</h1>
              <p className="text-center mt-2 text-blue-100">FILLING REQUEST INVOICE</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Activity Logs Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Activity Logs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {request.created_by_name && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-700">Created By</p>
                      <p className="text-sm text-gray-800">{request.created_by_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {request.created_by_type === 'customer' ? '(Customer)' : request.created_by_type === 'employee' ? '(Employee)' : ''}
                      </p>
                      {request.created_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.created_date).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}
                  {request.processed_by_name && (
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-700">Processed By</p>
                      <p className="text-sm text-gray-800">{request.processed_by_name}</p>
                      {request.processed_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.processed_date).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}
                  {request.completed_by_name && (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <p className="text-sm font-medium text-green-700">Completed By</p>
                      <p className="text-sm text-gray-800">{request.completed_by_name}</p>
                      {request.completed_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.completed_date).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Request Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Request ID:</span> {request.rid}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        request.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        request.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                    </p>
                    <p><span className="font-medium">Created:</span> {request.formatted_created}</p>
                    {request.completed_date && request.completed_date !== "0000-00-00 00:00:00" && (
                      <p><span className="font-medium">Completed:</span> {request.formatted_completed}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {request.customer_name || 'N/A'}</p>
                    <p><span className="font-medium">Phone:</span> {request.customer_phone || 'N/A'}</p>
                    {request.customer_address && (
                      <p><span className="font-medium">Address:</span> {request.customer_address}</p>
                    )}
                    <p><span className="font-medium">Balance:</span> ₹{request.customer_balance || '0'}</p>
                  </div>
                </div>
              </div>

              {/* Filling Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Filling Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-600">Product</p>
                      <p className="text-gray-800">{request.product_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Quantity</p>
                      <p className="text-gray-800">{request.qty} liters</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Vehicle Number</p>
                      <p className="text-gray-800">{request.vehicle_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Driver Phone</p>
                      <p className="text-gray-800">{request.driver_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Station Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Station Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Station Name:</span> {request.loading_station || 'N/A'}</p>
                    {request.station_address && (
                      <p><span className="font-medium">Address:</span> {request.station_address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {request.remark && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Remarks</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-800">{request.remark}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={handleBack}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Go Back
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={generating || pdfGenerated}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : pdfGenerated ? (
                    'PDF Downloaded'
                  ) : (
                    'Download PDF'
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Loading Component
function PDFModalLoading() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <span className="ml-3">Loading PDF Details...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Main Export with Suspense
export default function PDFModalPage() {
  return (
    <Suspense fallback={<PDFModalLoading />}>
      <PDFModalContent />
    </Suspense>
  );
}

