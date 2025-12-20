"use client";

import { useState } from "react";
import { FaUser } from "react-icons/fa";

export default function AgentHeader() {

  // Initialize agent from localStorage immediately - no useEffect needed
  const [agent] = useState(() => {
    if (typeof window !== 'undefined') {
      const agentData = localStorage.getItem("agent");
      if (agentData) {
        try {
          return JSON.parse(agentData);
        } catch (err) {
          console.error("Error parsing agent data:", err);
        }
      }
    }
    return null;
  });

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Agent Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            {agent && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {agent.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                  <p className="text-xs text-gray-500">{agent.agent_id}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

