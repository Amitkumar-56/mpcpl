// src/app/login/page.js
"use client";

import { useSession } from '@/context/SessionContext'; // ✅ YEH LINE ADD KAREN
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaEnvelope, FaLock, FaMobileAlt } from "react-icons/fa";

export default function LoginPage() {
  const { login } = useSession(); // ✅ YEH LINE ADD KAREN
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  const [error, setError] = useState("");

  // Email + Password Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle HTTP errors
        if (res.status === 401 || res.status === 403) {
          setError(data.message || "Invalid credentials or account deactivated");
        } else if (res.status === 500) {
          setError(data.message || "Server error. Please try again later.");
        } else {
          setError(data.message || "Login failed. Please try again.");
        }
        return;
      }

      if (data.success) {
        // ✅ Session Context का login function use करें
        login({
          id: data.userId,
          emp_code: data.emp_code,
          name: data.name,
          email: data.email,
          role: data.role,
          fs_id: data.fs_id,
          fl_id: data.fl_id,
          permissions: data.permissions,
          station: data.station,
          client: data.client,
        }, data.token); // Password parameter removed - no longer needed for SSO

        // ✅ Use window.location.href for reliable redirect (prevents race conditions)
        // Small delay to ensure localStorage is set
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.message && err.message.includes('fetch')) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile / OTP Login
  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login-otp", {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle HTTP errors
        if (res.status === 401 || res.status === 403) {
          setError(data.message || "Mobile number not found or account deactivated");
        } else if (res.status === 500) {
          setError(data.message || "Server error. Please try again later.");
        } else {
          setError(data.message || "Login failed. Please try again.");
        }
        return;
      }

      if (data.success) {
        // ✅ Session Context का login function use करें
        login({
          id: data.userId,
          emp_code: data.emp_code,
          name: data.name,
          email: data.email,
          role: data.role,
          fs_id: data.fs_id,
          fl_id: data.fl_id,
          permissions: data.permissions,
          station: data.station,
          client: data.client,
        }, data.token); // Password parameter removed - no longer needed for SSO

        // ✅ Use window.location.href for reliable redirect (prevents race conditions)
        // Small delay to ensure localStorage is set
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      } else {
        setError(data.message || "Failed to verify OTP");
      }
    } catch (err) {
      console.error("OTP login error:", err);
      if (err.message && err.message.includes('fetch')) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-white px-4">
      <div className="flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Left Side */}
        <div className="w-full md:w-1/2 flex justify-center items-center bg-blue-100 
                        md:min-h-full md:p-0 
                        h-10 md:h-auto p-2">
          <h1 className="text-xl md:text-6xl font-bold text-blue-600">MPCL</h1>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 p-8 flex justify-center items-center">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Employee Login
            </h2>

            {/* Tabs */}
            <div className="flex justify-center mb-6 border-b border-gray-300">
              <button
                className={`px-6 py-2 text-sm font-medium ${
                  activeTab === "email"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("email")}
              >
                E-mail
              </button>
              <button
                className={`px-6 py-2 text-sm font-medium ${
                  activeTab === "mobile"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("mobile")}
              >
                Mobile Number
              </button>
            </div>

            {/* Email Login */}
            {activeTab === "email" && (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <div className="flex items-center border rounded-lg px-3 w-full">
                    <FaEnvelope className="text-gray-400 mr-2" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-3 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center border rounded-lg px-3 w-full">
                    <FaLock className="text-gray-400 mr-2" />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-3 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between mb-6 text-sm">
                  <label className="flex items-center text-gray-600">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={remember}
                      onChange={() => setRemember(!remember)}
                    />
                    Remember me
                  </label>
                  <a href="#" className="text-blue-500 hover:underline">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold hover:from-blue-500 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Logging in...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>
            )}

            {/* Mobile Login */}
            {activeTab === "mobile" && (
              <form onSubmit={handleOtpLogin}>
                <div className="mb-4">
                  <div className="flex items-center border rounded-lg px-3 w-full">
                    <FaMobileAlt className="text-gray-400 mr-2" />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full py-3 outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold hover:from-blue-500 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending OTP...
                    </span>
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </form>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            <p className="text-center text-gray-600 mt-6 text-sm">
              Login with your employee credentials
            </p>

            <div className="mt-8">
              <h3 className="text-center text-gray-800 font-semibold mb-4">
                Other Login Portals
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href="/cst/login"
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                >
                  Customer Login
                </a>
                <a
                  href="/supplier/login"
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                >
                  Supplier Login
                </a>
                <a
                  href="/agent/login"
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                >
                  Agent Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
