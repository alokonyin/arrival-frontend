"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [health, setHealth] = useState("Checking backend...");

  useEffect(() => {
  fetch("https://a2c9799b-d236-49a9-8c7e-396f1c4d8c24-00-2elrt6cp24nmx.spock.replit.dev/api/health")
    .then(res => res.json())
    .then(data => {
      setHealth(data.status ?? JSON.stringify(data));
    })
    .catch(err => {
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
