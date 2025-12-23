"use client";

import AgentHeader from "@/components/agentHeader";
import AgentSidebar from "@/components/agentSidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AgentProfilePage() {
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

  if (!agent) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AgentSidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <AgentHeader />
        
        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">User Profile</h1>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent ID
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <p className="text-gray-900">{agent.agent_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                      <p className="text-gray-900">{agent.first_name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                      <p className="text-gray-900">{agent.last_name}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <p className="text-gray-900">{agent.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <p className="text-gray-900">{agent.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

