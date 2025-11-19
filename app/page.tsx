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
    const backendBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    console.log("Home backend base URL:", backendBase);

    if (!backendBase) {
      setHealth("Error: API base URL is not set");
      return;
    }

    // ---- HEALTH CHECK ----
    (async () => {
      try {
        const res = await fetch(`${backendBase}/api/health`);
        const contentType = res.headers.get("content-type") || "";

        // If backend sends HTML or something weird, show it
        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Health response is NOT JSON. Raw body:", text);
          setHealth("Error: backend did not return JSON");
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("Health JSON:", data);
        setHealth(data.status ?? JSON.stringify(data));
      } catch (err: any) {
        console.error("Health fetch error:", err);
        setHealth("Error: " + (err.message || String(err)));
      }
    })();

    // ---- INSTITUTIONS ----
    (async () => {
      try {
        const res = await fetch(`${backendBase}/api/institutions`);
        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Institutions response is NOT JSON. Raw body:", text);
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("Institutions JSON:", data);

        // Handle both shapes:
        // 1) [{...}, {...}]
        // 2) { status: "ok", institutions: [...] }
        if (Array.isArray(data)) {
          setInstitutions(data as Institution[]);
        } else if (
          data.status === "ok" &&
          Array.isArray(data.institutions)
        ) {
          setInstitutions(data.institutions as Institution[]);
        } else {
          console.error("Unexpected institutions response shape:", data);
        }
      } catch (err) {
        console.error("Institutions fetch error:", err);
      }
    })();
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

