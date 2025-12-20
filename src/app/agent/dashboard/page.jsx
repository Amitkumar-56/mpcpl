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
    <div className="flex h-screen bg-gray-50">
      <AgentSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <AgentHeader />
        
        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

            {/* Welcome Message */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome, {agent?.name || 'Agent'}!
              </h2>
              <p className="text-gray-600">
                You are logged in as Agent ID: <span className="font-semibold">{agent?.agent_id || '-'}</span>
              </p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{agent?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900 font-medium">{agent?.phone || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

