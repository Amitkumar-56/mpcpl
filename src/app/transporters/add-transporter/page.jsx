// src/app/transporters/add-transporter/page.jsx
"use client";

import { useState } from "react";

import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";

export default function AddTransporterPage() {
  const [formData, setFormData] = useState({
    transporter_name: "",
    email: "",
    phone: "",
    address: "",
    adhar_front: null,
    adhar_back: null,
  });

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle form reset
  const handleReset = () => {
    setFormData({
      transporter_name: "",
      email: "",
      phone: "",
      address: "",
      adhar_front: null,
      adhar_back: null,
    });
    setMessage("");
  };

  // Convert file to Base64
  const fileToBase64 = (file) => {
    if (!file) return Promise.resolve(null);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      // Convert files to base64
      const [adhar_front_base64, adhar_back_base64] = await Promise.all([
        fileToBase64(formData.adhar_front),
        fileToBase64(formData.adhar_back)
      ]);

      const payload = {
        transporter_name: formData.transporter_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        adhar_front: adhar_front_base64,
        adhar_back: adhar_back_base64,
      };

      const res = await fetch("/api/transporters/add-transporter", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to add transporter");
      }

      setMessage(data.message || "Transporter added successfully!");

      if (data.success) {
        // Redirect after successful submission
        setTimeout(() => {
          window.location.href = "/transporters";
        }, 2000);
      }
    } catch (error) {
      console.error("Submission error:", error);
      setMessage(error.message || "Error submitting form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        {/* Scrollable main area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="min-h-screen flex justify-center py-10 px-4">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
              <h1 className="text-2xl font-bold text-center text-purple-700 mb-6">
                Add New Transporter
              </h1>

              {message && (
                <div
                  className={`p-3 mb-4 text-center rounded ${
                    message.includes("success") || message.includes("Success")
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-red-100 text-red-700 border border-red-300"
                  }`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="transporter_name" className="block text-gray-700 mb-1 font-medium">
                    Transporter Name *
                  </label>
                  <input
                    id="transporter_name"
                    type="text"
                    name="transporter_name"
                    value={formData.transporter_name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter transporter name"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-gray-700 mb-1 font-medium">
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-gray-700 mb-1 font-medium">
                      Phone *
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-gray-700 mb-1 font-medium">
                    Address *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    rows="4"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter complete address"
                  ></textarea>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="adhar_front" className="block text-gray-700 mb-1 font-medium">
                      Aadhar Front
                    </label>
                    <input
                      id="adhar_front"
                      type="file"
                      name="adhar_front"
                      onChange={handleChange}
                      disabled={isSubmitting}
                      accept="image/*,.pdf"
                      className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {formData.adhar_front && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {formData.adhar_front.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="adhar_back" className="block text-gray-700 mb-1 font-medium">
                      Aadhar Back
                    </label>
                    <input
                      id="adhar_back"
                      type="file"
                      name="adhar_back"
                      onChange={handleChange}
                      disabled={isSubmitting}
                      accept="image/*,.pdf"
                      className="w-full border border-gray-300 rounded-lg p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {formData.adhar_back && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {formData.adhar_back.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg transition duration-200 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    className="bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition duration-200 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}