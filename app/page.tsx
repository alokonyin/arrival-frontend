"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [health, setHealth] = useState("Checking backend...");

  useEffect(() => {
    // change this URL depending on where your backend is running:
    // - local dev:  http://localhost:8000/api/health
    // - replit/vercel backend: https://YOUR-BACKEND-URL/api/health
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => {
        // assume backend returns { status: "ok" } or similar
        setHealth(data.status ?? JSON.stringify(data));
      })
      .catch((err) => {
        setHealth("Error: " + err.message);
      });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Arrival Frontend</h1>
        <p className="text-lg">Backend health: {health}</p>
      </div>
    </main>
  );
}
