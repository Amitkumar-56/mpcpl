"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaUser, FaLock } from "react-icons/fa";

export default function AgentLoginPage() {
  const router = useRouter();
  const [agentId, setAgentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Save agent data to localStorage
        localStorage.setItem("agent", JSON.stringify(data.agent));
        localStorage.setItem("agent_token", "agent_" + Date.now());
        
        router.push("/agent/dashboard");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Agent Login</h1>
            <p className="text-gray-600">Enter your Agent email or ID and password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Email or ID
              </label>
              <div className="flex items-center border rounded-lg px-3 w-full">
                <FaUser className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Enter Agent email or ID"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full py-3 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="flex items-center border rounded-lg px-3 w-full">
                <FaLock className="text-gray-400 mr-2" />
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account? Contact administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

