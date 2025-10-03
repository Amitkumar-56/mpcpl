"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RetailerDashboard() {
  const router = useRouter();
  const [retailer, setRetailer] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("retailer_token");
    if (!token) {
      router.push("/retailers/login");
    } else {
      // In real app → decode JWT or call API to fetch retailer details
      setRetailer({ name: "Retailer User" });
    }
  }, [router]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Retailer Dashboard</h1>
      {retailer && <p>Welcome, {retailer.name}!</p>}
    </div>
  );
}
