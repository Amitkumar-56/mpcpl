"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function RetailerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const retailers = JSON.parse(localStorage.getItem("users")) || [];
    const retailer = retailers.find(
      (r) => r.email === email && r.password === password
    );

    if (retailer) {
      localStorage.setItem("user", JSON.stringify(retailer));
      router.push("/dashboard");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md transition-transform transform hover:scale-105">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-800">
          Retailer Login
        </h1>

        {error && (
          <p className="text-red-500 mb-4 text-center animate-pulse">{error}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex flex-col">
            <label className="mb-1 text-gray-600 font-medium">Email</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-col relative">
            <label className="mb-1 text-gray-600 font-medium">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-gray-500 text-sm sm:text-base">
          Forgot your password? <span className="text-blue-600 hover:underline cursor-pointer">Reset</span>
        </p>
      </div>
    </div>
  );
}
