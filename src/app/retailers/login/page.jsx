"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RetailerLoginPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/retailers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          emailOrPhone.includes("@")
            ? { email: emailOrPhone, password }
            : { phone: emailOrPhone, password }
        ),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("retailer_token", data.token);
        router.push("/retailers/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Retailer Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1">Email or Phone</label>
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              required
              className="w-full border rounded p-2"
              placeholder="Enter email or phone"
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded p-2"
              placeholder="Enter password"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
