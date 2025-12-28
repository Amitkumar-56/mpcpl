// src/app/supplier/login/page.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import Image from "next/image";

export default function SupplierLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/suppliers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      const data = await res.json();

      console.log('Login response:', { status: res.status, data });

      if (!res.ok) {
        setError(data.error || `Login failed: ${res.status} ${res.statusText}`);
        setIsLoading(false);
        return;
      }

      if (!data.success) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // ✅ Supplier data को localStorage में save करें
      localStorage.setItem("supplier", JSON.stringify(data.supplier));
      
      // ✅ Also save to sessionStorage for consistency
      sessionStorage.setItem("supplier", JSON.stringify(data.supplier));
      
      // ✅ Save supplier token for API verification (if needed)
      if (data.token) {
        localStorage.setItem("supplier_token", data.token);
        sessionStorage.setItem("supplier_token", data.token);
      }
      
      // ✅ Use window.location for reliable redirect (prevents race conditions)
      // Small delay to ensure localStorage is set
      setTimeout(() => {
        window.location.href = "/supplier/dashboard";
      }, 100);
      
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error - Please check your connection and try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-100 to-white px-4">
      <div className="flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Left Side */}
        <div className="w-full md:w-1/2 flex justify-center items-center bg-green-100 md:min-h-full md:p-0 h-10 md:h-auto p-2">
          <div className="text-center">
            <Image 
              src="/LOGO_NEW.jpg" 
              alt="MPCL Logo" 
              width={200} 
              height={200} 
              className="mx-auto mb-4 rounded-lg"
            />
            <h1 className="text-xl md:text-6xl font-bold text-green-600">Supplier</h1>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 p-8 flex justify-center items-center">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Supplier Login
            </h2>

            <form onSubmit={handleLogin}>
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

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold hover:from-green-500 hover:to-green-700 transition disabled:opacity-50"
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

            <p className="text-center text-gray-600 mt-6 text-sm">
              Login with your supplier credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

