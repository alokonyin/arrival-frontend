"use client";

import { useEffect, useState } from "react";

type Institution = {
  id: string;
  name: string;
  country: string;
  website?: string | null;
};

export default function Home() {
  const [health, setHealth] = useState("Checking backend...");
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  useEffect(() => {
    const backendBase =
      "https://a2c9799b-d236-49a9-8c7e-396f1c4d8c24-00-2elrt6cp24nmx.spock.replit.dev";

    // health
    fetch(`${backendBase}/api/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status ?? JSON.stringify(data)))
      .catch((err) => setHealth("Error: " + err.message));

    // institutions
    fetch(`${backendBase}/api/institutions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok" && Array.isArray(data.institutions)) {
          setInstitutions(data.institutions);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Arrival Frontend</h1>
        <p className="text-lg">Backend health: {health}</p>
      </div>

      <div className="max-w-xl w-full">
        <h2 className="text-xl font-semibold mb-3">Partner institutions</h2>
        {institutions.length === 0 ? (
          <p className="text-sm text-gray-500">No institutions yet.</p>
        ) : (
          <ul className="space-y-2">
            {institutions.map((inst) => (
              <li key={inst.id} className="border rounded-lg p-3 text-sm">
                <div className="font-medium">{inst.name}</div>
                <div className="text-gray-600">{inst.country}</div>
                {inst.website && (
                  <a
                    href={inst.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-xs"
                  >
                    Visit website
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
