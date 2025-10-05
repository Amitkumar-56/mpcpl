"use client";
import Footer from "components/Footer";
import Header from "components/Header";
import Sidebar from "components/sidebar";
import { useRouter } from "next/navigation"; // ✅ Import this
import { useState } from "react";

export default function AddStationPage() {
  const router = useRouter(); // ✅ Initialize router

  const [formData, setFormData] = useState({
    manager: "",
    phone: "",
    email: "",
    gstName: "",
    gstNumber: "",
    mapsLink: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name, value) => {
    switch (name) {
      case "manager":
        if (!value.trim()) return "Manager name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return "";
      case "phone":
        if (!value.trim()) return "Phone number is required";
        if (!/^[0-9+\-\s()]{10,}$/.test(value))
          return "Enter a valid phone number";
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Enter a valid email address";
        return "";
      case "gstName":
        if (!value.trim()) return "GST name is required";
        return "";
      case "gstNumber":
        if (!value.trim()) return "GST number is required";
        if (value.trim().length < 3) return "GST number is too short";
        return "";
      case "mapsLink":
        if (value && !value.startsWith("http"))
          return "Please enter a valid URL starting with http:// or https://";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return alert("Please fix errors before submitting.");
    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1000)); // mock API
      alert("Form submitted successfully!");
    } catch {
      alert("Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      manager: "",
      phone: "",
      email: "",
      gstName: "",
      gstNumber: "",
      mapsLink: "",
    });
    setErrors({});
    setTouched({});
  };

  const isFormValid =
    Object.values(errors).every((e) => !e) &&
    Object.values(formData).some((v) => v.trim() !== "");

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-screen relative"> {/* ✅ Add relative */}
        <Header />

        {/* ✅ Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 relative">
          {/* ✅ Back Button Fixed */}
          <button
            onClick={() => router.push("/loading-stations")}
            className="absolute top-6 left-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md z-10"
          >
            ← Back to Stations
          </button>

          <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-6 md:p-10 mt-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Supplier Information
            </h2>

            {/* ✅ Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Manager + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: "Manager *", name: "manager", type: "text" },
                  { label: "Phone *", name: "phone", type: "text" },
                ].map(({ label, name, type }) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none ${
                        errors[name] ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                    {errors[name] && (
                      <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Email + GST Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: "Email *", name: "email", type: "email" },
                  { label: "GST Name *", name: "gstName", type: "text" },
                ].map(({ label, name, type }) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none ${
                        errors[name] ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder={`Enter ${label.toLowerCase()}`}
                    />
                    {errors[name] && (
                      <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  GST Number *
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none ${
                    errors.gstNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter GST number"
                />
                {errors.gstNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.gstNumber}</p>
                )}
              </div>

              {/* Maps Link */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Google Maps Link
                </label>
                <input
                  type="text"
                  name="mapsLink"
                  value={formData.mapsLink}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none ${
                    errors.mapsLink ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter Google Maps link"
                />
                {errors.mapsLink && (
                  <p className="text-red-500 text-sm mt-1">{errors.mapsLink}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                <a
                  href={formData.mapsLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full sm:w-auto text-center px-5 py-2 rounded-lg font-medium text-white ${
                    formData.mapsLink && !errors.mapsLink
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  onClick={(e) => {
                    if (!formData.mapsLink || errors.mapsLink) e.preventDefault();
                  }}
                >
                  View Location on Google Maps
                </a>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`px-6 py-2 text-white rounded-lg font-medium ${
                      isFormValid && !isSubmitting
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
