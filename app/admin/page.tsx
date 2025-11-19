"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type Institution = {
  id: string;
  name: string;
  country?: string;
  website?: string;
};

type Program = {
  id: string;
  institution_id: string;
  name: string;
  term_label: string;
  term_start_date: string;
};

type Student = {
  id: string;
  institution_id: string;
  program_id: string;
  full_name: string;
  personal_email: string;
  status: string;
  risk_level: string;
};

export default function AdminPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);

  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Fetch institutions on first render
  useEffect(() => {
    console.log("Admin API_BASE_URL:", API_BASE_URL);

    const fetchInstitutions = async () => {
      if (!API_BASE_URL) {
        setError("API base URL is not set");
        return;
      }

      setLoadingInstitutions(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/institutions`);
        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Institutions response is NOT JSON. Raw body:", text);
          throw new Error("Backend did not return JSON for institutions");
        }

        if (!res.ok) {
          throw new Error(`Failed to load institutions (${res.status})`);
        }

        const data = await res.json();
        console.log("Institutions JSON:", data);

        // Handle both shapes:
        // 1) [{...}, {...}]
        // 2) { status: "ok", institutions: [...] }
        let list: Institution[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data.institutions)) {
          list = data.institutions;
        } else {
          throw new Error("Unexpected institutions response shape");
        }

        setInstitutions(list);
        if (list.length > 0) {
          setSelectedInstitutionId(list[0].id);
        }
      } catch (err: any) {
        console.error("Error loading institutions:", err);
        setError(err.message || "Failed to load institutions");
      } finally {
        setLoadingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, []);

  // Fetch programs when institution changes
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!selectedInstitutionId || !API_BASE_URL) return;

      setLoadingPrograms(true);
      setPrograms([]);
      setSelectedProgramId("");
      setStudents([]);
      setError(null);

      try {
        const url = `${API_BASE_URL}/api/programs?institution_id=${selectedInstitutionId}`;
        const res = await fetch(url);
        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Programs response is NOT JSON. Raw body:", text);
          throw new Error("Backend did not return JSON for programs");
        }

        if (!res.ok) {
          throw new Error(`Failed to load programs (${res.status})`);
        }

        const data = await res.json();
        console.log("Programs JSON:", data);

        if (!Array.isArray(data)) {
          throw new Error("Unexpected programs response shape");
        }
        setPrograms(data);
        if (data.length > 0) {
          setSelectedProgramId(data[0].id);
        }
      } catch (err: any) {
        console.error("Error loading programs:", err);
        setError(err.message || "Failed to load programs");
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, [selectedInstitutionId]);

  // Fetch students when program changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedProgramId || !API_BASE_URL) return;

      setLoadingStudents(true);
      setStudents([]);
      setError(null);

      try {
        const url = `${API_BASE_URL}/api/students?program_id=${selectedProgramId}`;
        const res = await fetch(url);
        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Students response is NOT JSON. Raw body:", text);
          throw new Error("Backend did not return JSON for students");
        }

        if (!res.ok) {
          throw new Error(`Failed to load students (${res.status})`);
        }

        const data = await res.json();
        console.log("Students JSON:", data);

        if (!Array.isArray(data)) {
          throw new Error("Unexpected students response shape");
        }
        setStudents(data);
      } catch (err: any) {
        console.error("Error loading students:", err);
        setError(err.message || "Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedProgramId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Arrival Admin Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Track programs and students for your partner institutions.
        </p>
      </header>

      <main className="flex-1 px-6 py-4 flex flex-col gap-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Institution selector */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-2">
            1. Select Institution
          </h2>
          {loadingInstitutions ? (
            <p className="text-sm text-slate-500">Loading institutions…</p>
          ) : institutions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No institutions found. Seed some in Supabase.
            </p>
          ) : (
            <select
              className="mt-1 block w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedInstitutionId}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Programs list */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-slate-800">
              2. Programs / Cohorts
            </h2>
            {loadingPrograms && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
          </div>
          {programs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No programs found for this institution yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => setSelectedProgramId(program.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border ${
                    selectedProgramId === program.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {program.name} ({program.term_label})
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Students list */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-slate-800">
              3. Students in Selected Program
            </h2>
            {loadingStudents && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
          </div>
          {selectedProgramId === "" ? (
            <p className="text-sm text-slate-500">
              Select a program to see its students.
            </p>
          ) : students.length === 0 ? (
            <p className="text-sm text-slate-500">
              No students found for this program yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-semibold text-slate-600">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{s.full_name}</td>
                      <td className="px-3 py-2">{s.personal_email}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5">
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 ${
                            s.risk_level === "GREEN"
                              ? "bg-emerald-100 text-emerald-700"
                              : s.risk_level === "YELLOW"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {s.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
