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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();

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
        }, data.token);

        router.push("/dashboard");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json();

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
        }, data.token);

        router.push("/dashboard");
      } else {
        setError(data.message || "Failed to verify OTP");
      }
    } catch (err) {
      console.error("OTP login error:", err);
      setError("Network error. Please try again.");
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
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold hover:from-blue-500 hover:to-blue-700 transition"
                >
                  {isLoading ? "Logging in..." : "Continue"}
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
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold hover:from-blue-500 hover:to-blue-700 transition"
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            )}

            {error && <p className="text-red-500 text-center mt-4">{error}</p>}

            <p className="text-center text-gray-600 mt-6 text-sm">
              Login with your employee credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}