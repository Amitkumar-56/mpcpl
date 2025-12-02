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
          
          let errorMsg = errorData.error || `HTTP error! status: ${response.status}`;
          if (errorData.details) {
            if (typeof errorData.details === 'object') {
              errorMsg += `: ${errorData.details.message || errorData.details.sqlMessage || JSON.stringify(errorData.details)}`;
            } else {
              errorMsg += `: ${errorData.details}`;
            }
          }
          
          console.error('❌ API Error Response:', errorData);
          throw new Error(errorMsg);
        }
      } catch (error) {
        console.error("❌ Error fetching request:", error);
        setError(error.message || "Failed to load request data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId, user]);

  // PDF Generation Function - Single Page (without Financial Information)
  const generatePDF = () => {
    if (!request) return;

    try {
      setGenerating(true);
      setError(null);
      
      // Create PDF in portrait mode (A4 size: 210x297 mm)
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryColor = [41, 128, 185];
      const darkColor = [44, 62, 80];
      const lightColor = [240, 244, 247];
      
      // ========== HEADER SECTION ==========
      // Company Name - Main Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 18, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("GYANTI MULTISERVICES PVT. LTD.", pageWidth / 2, 10, { align: "center" });
      
      // Registered Office
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Registered Office: Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007", pageWidth / 2, 15, { align: "center" });
      
      // ========== INVOICE TITLE ==========
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text("FILLING REQUEST INVOICE", pageWidth / 2, 25, { align: "center" });
      
      // Horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 28, pageWidth - 15, 28);
      
      let yPos = 35;
      
      // ========== REQUEST INFO SECTION ==========
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("REQUEST INFORMATION", 15, yPos);
      
      yPos += 7;
      
      // Request ID and Status
      doc.setFillColor(...lightColor);
      doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text(`REQUEST ID: ${request.rid}`, 20, yPos + 5);
      
      doc.setTextColor(0, 150, 0);
      doc.text(`Status: ${request.status}`, pageWidth - 20, yPos + 5, { align: "right" });
      
      yPos += 20;
      
      // Dates
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Created: ${request.formatted_created}`, 20, yPos);
      
      if (request.completed_date && request.completed_date !== "0000-00-00 00:00:00") {
        doc.text(`Completed: ${request.formatted_completed}`, pageWidth / 2, yPos);
      }
      
      yPos += 10;
      
      // ========== ACTIVITY LOGS ==========
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkColor);
      doc.text("ACTIVITY LOGS", 15, yPos);
      
      yPos += 7;
      
      // Activity logs container
      doc.setFillColor(...lightColor);
      doc.roundedRect(15, yPos, pageWidth - 30, 30, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      if (request.created_by_name) {
        doc.setTextColor(60, 60, 60);
        doc.text(`Created By: ${request.created_by_name}`, 20, yPos + 8);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text(`(${request.created_by_type || 'unknown'})`, 20, yPos + 12);
        doc.setFontSize(9);
        if (request.created_date) {
          doc.text(new Date(request.created_date).toLocaleString('en-IN'), 20, yPos + 18);
        }
      }
      
      if (request.processed_by_name) {
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Processed By: ${request.processed_by_name}`, pageWidth / 2, yPos + 8);
        if (request.processed_date) {
          doc.setTextColor(100, 100, 100);
          doc.text(new Date(request.processed_date).toLocaleString('en-IN'), pageWidth / 2, yPos + 18);
        }
      }
      
      if (request.completed_by_name) {
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Completed By: ${request.completed_by_name}`, pageWidth - 20, yPos + 8, { align: "right" });
        if (request.completed_date) {
          doc.setTextColor(100, 100, 100);
          doc.text(new Date(request.completed_date).toLocaleString('en-IN'), pageWidth - 20, yPos + 18, { align: "right" });
        }
      }
      
      yPos += 35;
      
      // ========== CUSTOMER INFORMATION ==========
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkColor);
      doc.text("CUSTOMER INFORMATION", 15, yPos);
      
      yPos += 7;
      
      // Customer info container
      doc.setFillColor(...lightColor);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      
      doc.text(`Name: ${request.customer_name || 'N/A'}`, 20, yPos + 7);
      doc.text(`Phone: ${request.customer_phone || 'N/A'}`, 20, yPos + 13);
      
      if (request.customer_address) {
        const addressLines = doc.splitTextToSize(`${request.customer_address}`, 80);
        doc.text("Address:", 20, yPos + 19);
        doc.text(addressLines, 45, yPos + 19);
        yPos += Math.max(addressLines.length * 4, 0);
      }
      
      yPos += 30;
      
      // ========== FILLING DETAILS ==========
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkColor);
      doc.text("FILLING DETAILS", 15, yPos);
      
      yPos += 7;
      
      // Filling details table
      doc.setFillColor(...lightColor);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
      
      // Table headers
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Product", 20, yPos + 7);
      doc.text("Quantity", 70, yPos + 7);
      doc.text("Vehicle No.", 120, yPos + 7);
      doc.text("Driver Phone", 160, yPos + 7);
      
      // Table data
      doc.setFont("helvetica", "normal");
      doc.text(request.product_name || 'N/A', 20, yPos + 14);
      doc.text(`${request.qty} liters`, 70, yPos + 14);
      doc.text(request.vehicle_number || 'N/A', 120, yPos + 14);
      doc.text(request.driver_number || 'N/A', 160, yPos + 14);
      
      yPos += 25;
      
      // ========== STATION INFORMATION ==========
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkColor);
      doc.text("STATION INFORMATION", 15, yPos);
      
      yPos += 7;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      
      doc.text(`Station: ${request.loading_station || 'N/A'}`, 20, yPos);
      
      if (request.station_address) {
        yPos += 6;
        doc.text(`Address: ${request.station_address}`, 20, yPos);
      }
      
      yPos += 15;
      
      // ========== REMARKS SECTION (if exists) ==========
      if (request.remark) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkColor);
        doc.text("REMARKS", 15, yPos);
        
        yPos += 7;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const remarks = doc.splitTextToSize(request.remark, pageWidth - 40);
        doc.text(remarks, 20, yPos);
        yPos += (remarks.length * 5) + 10;
      }
      
      // ========== FOOTER ==========
      doc.setDrawColor(220, 220, 220);
      doc.line(15, 250, pageWidth - 15, 250);
      
      // Company details at bottom
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("GSTIN: 09AAGCG6220R1Z3 | CIN No.: U15549UP2016PTC088333 | E-Mail: accounts@gyanti.in", pageWidth / 2, 255, { align: "center" });
      
      // Generated date
      doc.text(`Generated on: ${request.current_date}`, pageWidth / 2, 260, { align: "center" });
      
      // Disclaimer
      doc.text("This is a computer generated invoice. No signature required.", pageWidth / 2, 265, { align: "center" });
      
      // ========== SAVE PDF ==========
      const fileName = `GYANTI_Filling_Request_${request.rid}_${new Date().toISOString().split('T')[0]}.pdf`;
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
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <h1 className="text-xl font-bold text-center">GYANTI MULTISERVICES PVT. LTD.</h1>
              <p className="text-center text-sm mt-1 text-blue-100">FILLING REQUEST INVOICE</p>
              <div className="text-center text-xs mt-2 text-blue-200">
                <p>Registered Office: Nakha No. 1, Moharipur, Gorakhpur, Uttar Pradesh – 273007</p>
                <p>GSTIN: 09AAGCG6220R1Z3 | CIN No.: U15549UP2016PTC088333 | E-Mail: accounts@gyanti.in</p>
              </div>
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