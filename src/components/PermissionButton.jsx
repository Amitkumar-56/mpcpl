'use client';
import { useEffect, useState } from "react";

export default function PermissionButton({ employeeId, moduleName, action }) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/check-permissions?employee_id=${employeeId}&module_name=${encodeURIComponent(moduleName)}&action=${action}`
        );
        const data = await res.json();
        setAllowed(data.allowed);
      } catch (err) {
        console.error("Permission fetch error:", err);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    if (employeeId && moduleName && action) checkPermission();
  }, [employeeId, moduleName, action]);

  if (loading)
    return <button className="bg-gray-300 p-2 rounded">Loading...</button>;

  return allowed ? (
    <button className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition">
      Allowed
    </button>
  ) : (
    <button className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition">
      Denied
    </button>
  );
}
