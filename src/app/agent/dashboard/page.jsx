"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AgentSidebar from "@/components/agentSidebar";
import AgentHeader from "@/components/agentHeader";

export default function AgentDashboard() {
  const router = useRouter();
  const [agent, setAgent] = useState(() => {
    // Initialize from localStorage immediately - no loading
    if (typeof window !== 'undefined') {
      const agentData = localStorage.getItem("agent");
      const agentToken = localStorage.getItem("agent_token");
      if (agentData && agentToken) {
        try {
          return JSON.parse(agentData);
        } catch (err) {
          console.error("Error parsing agent data:", err);
        }
      }
    }
    return null;
  });

  useEffect(() => {
    // Only redirect if no agent data
    if (!agent) {
      const agentData = localStorage.getItem("agent");
      const agentToken = localStorage.getItem("agent_token");
      if (!agentData || !agentToken) {
        router.push("/agent/login");
      }
    }
  }, [agent, router]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-red-50 via-red-50 to-pink-50">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <AgentSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 w-full flex flex-col min-h-screen">
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white shadow-sm">
          <AgentHeader />
        </div>

        {/* Scrollable Main Content */}
        <main className="pt-16 lg:pt-20 flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Agent Dashboard</h1>

            {/* Welcome Message - Red Theme */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg p-6 mb-6 text-white">
              <h2 className="text-2xl font-bold mb-2">
                Welcome, {agent?.name || 'Agent'}!
              </h2>
              <p className="text-red-100">
                You are logged in as Agent ID: <span className="font-semibold text-white">{agent?.agent_id || '-'}</span>
              </p>
            </div>

            {/* Stats Cards - Red Theme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Agent Status</p>
                    <p className="text-2xl font-bold text-red-600">Active</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">✓</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Agent ID</p>
                    <p className="text-xl font-bold text-gray-900">{agent?.agent_id || '-'}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Profile</p>
                    <p className="text-sm font-semibold text-gray-900">Complete</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-6 bg-red-600 mr-3 rounded"></span>
                Profile Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="text-gray-900 font-medium">{agent?.email || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <p className="text-gray-900 font-medium">{agent?.phone || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Full Name</p>
                  <p className="text-gray-900 font-medium">{agent?.first_name} {agent?.last_name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Agent Type</p>
                  <p className="text-gray-900 font-medium">Agent</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

