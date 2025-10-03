//src/app/cst/login/page.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cst/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (Number(data.customer.roleid) !== 1) {
        setError("Access denied");
        return;
      }

      localStorage.setItem("customer", JSON.stringify(data.customer));
      router.push("/cst/cstdashboard");
    } catch (err) {
      console.error(err);
      setError("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-white px-4">
      <div className="flex flex-col md:flex-row w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Left Side */}
        <div className="w-full md:w-1/2 flex justify-center items-center bg-blue-100 md:min-h-full md:p-0 h-10 md:h-auto p-2">
          <h1 className="text-xl md:text-6xl font-bold text-blue-600">Customer</h1>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 p-8 flex justify-center items-center">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Customer Login
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

              {error && <p className="text-red-500 text-center mb-4">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold hover:from-blue-500 hover:to-blue-700 transition"
              >
                {isLoading ? "Logging in..." : "Continue"}
              </button>
            </form>

            <p className="text-center text-gray-600 mt-6 text-sm">
              Login with your customer credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
