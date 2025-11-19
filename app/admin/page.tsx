"use client";

import { useEffect, useState } from "react";

// Force rebuild: 2025-11-19T23:05:00Z
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

type ChecklistStep = {
  id: string;
  program_id: string;
  title: string;
  description?: string;
  category?: string;
  is_required: boolean;
  sort_order: number;
};

type StudentDocument = {
  id: string;
  file_name: string;
  public_url: string;
  reviewed_status: string;
  reviewer_notes?: string | null;
  uploaded_at?: string | null;
  step_title?: string | null;
  step_category?: string | null;
};

export default function AdminPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");

  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [checklist, setChecklist] = useState<ChecklistStep[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);

  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // form state for creating a new checklist step
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepCategory, setNewStepCategory] = useState("");
  const [newStepDescription, setNewStepDescription] = useState("");
  const [creatingStep, setCreatingStep] = useState(false);

  const apiBase = API_BASE_URL;

  // Fetch institutions on first render
  useEffect(() => {
    const fetchInstitutions = async () => {
      if (!apiBase) {
        setError("API base URL is not set");
        return;
      }
      setLoadingInstitutions(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/api/institutions`);
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
  }, [apiBase]);

  // Fetch programs when institution changes
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!selectedInstitutionId || !apiBase) return;
      setLoadingPrograms(true);
      setPrograms([]);
      setSelectedProgramId("");
      setStudents([]);
      setSelectedStudentId("");
      setChecklist([]);
      setDocuments([]);
      setError(null);
      try {
        const url = `${apiBase}/api/programs?institution_id=${selectedInstitutionId}`;
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
  }, [selectedInstitutionId, apiBase]);

  // Fetch students when program changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedProgramId || !apiBase) return;
      setLoadingStudents(true);
      setStudents([]);
      setSelectedStudentId("");
      setChecklist([]);
      setDocuments([]);
      setError(null);
      try {
        const url = `${apiBase}/api/students?program_id=${selectedProgramId}`;
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
        if (data.length > 0) {
          setSelectedStudentId(data[0].id);
        }
      } catch (err: any) {
        console.error("Error loading students:", err);
        setError(err.message || "Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedProgramId, apiBase]);

  // Fetch checklist for selected program
  useEffect(() => {
    const fetchChecklist = async () => {
      if (!selectedProgramId || !apiBase) return;
      setLoadingChecklist(true);
      setChecklist([]);
      setError(null);
      try {
        const url = `${apiBase}/api/program-checklist?program_id=${selectedProgramId}`;
        const res = await fetch(url);
        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Checklist response is NOT JSON. Raw body:", text);
          throw new Error("Backend did not return JSON for checklist");
        }

        if (!res.ok) {
          throw new Error(`Failed to load checklist (${res.status})`);
        }

        const data = await res.json();
        console.log("Checklist JSON:", data);

        if (!Array.isArray(data)) {
          throw new Error("Unexpected checklist response shape");
        }
        setChecklist(data);
      } catch (err: any) {
        console.error("Error loading checklist:", err);
        setError(err.message || "Failed to load checklist");
      } finally {
        setLoadingChecklist(false);
      }
    };

    fetchChecklist();
  }, [selectedProgramId, apiBase]);

  // Fetch documents when selected student changes
  const fetchDocuments = async (studentId: string) => {
    if (!studentId || !apiBase) return;
    setLoadingDocuments(true);
    setDocuments([]);
    setError(null);
    try {
      const url = `${apiBase}/api/admin/documents/student/${studentId}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to load documents (${res.status})`);
      }

      const data: StudentDocument[] = await res.json();
      setDocuments(data);
    } catch (err: any) {
      console.error("Error loading documents:", err);
      setError(err.message || "Failed to load documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchDocuments(selectedStudentId);
    } else {
      setDocuments([]);
    }
  }, [selectedStudentId]);

  // Create a new checklist step
  const handleCreateStep = async () => {
    if (!apiBase || !selectedProgramId || !newStepTitle.trim()) return;
    setCreatingStep(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/program-checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: selectedProgramId,
          title: newStepTitle.trim(),
          description: newStepDescription.trim() || null,
          category: newStepCategory.trim() || null,
          is_required: true,
          sort_order: checklist.length + 1,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create step (${res.status})`);
      }

      setNewStepTitle("");
      setNewStepCategory("");
      setNewStepDescription("");

      // refresh checklist
      const refreshed = await fetch(
        `${apiBase}/api/program-checklist?program_id=${selectedProgramId}`
      );
      const data = await refreshed.json();
      setChecklist(data);
    } catch (err: any) {
      console.error("Error creating checklist step:", err);
      setError(err.message || "Failed to create checklist step");
    } finally {
      setCreatingStep(false);
    }
  };

  // Approve / reject document
  const reviewDocument = async (
    docId: string,
    action: "APPROVE" | "REJECT",
    notes: string
  ) => {
    if (!apiBase) return;
    const path = action === "APPROVE" ? "approve" : "reject";
    try {
      const res = await fetch(
        `${apiBase}/api/admin/documents/${docId}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewer: "Admin",
            reviewer_notes: notes || null,
          }),
        }
      );
      if (!res.ok) {
        console.error("Failed to review document", await res.text());
        return;
      }
      if (selectedStudentId) {
        fetchDocuments(selectedStudentId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Arrival Admin Dashboard [BUILD v2025-11-19]
        </h1>
        <p className="text-sm text-slate-500">
          Track programs, students, and review documents for your partner institutions.
        </p>
      </header>

      <main className="flex-1 px-6 py-4 flex flex-col gap-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 1. Institution selector */}
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

        {/* 2. Programs list */}
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

        {/* 3. Students list */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-slate-800">
              3. Students in Selected Program
            </h2>
            {loadingStudents && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
          </div>
          {students.length === 0 ? (
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
                    <tr
                      key={s.id}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${
                        selectedStudentId === s.id
                          ? "bg-blue-100 hover:bg-blue-100"
                          : "hover:bg-slate-100"
                      }`}
                      onClick={() => setSelectedStudentId(s.id)}
                      title="Click to view documents"
                    >
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

        {/* 4. Checklist for this program */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-slate-800">
              4. Arrival Checklist for this Program
            </h2>
            {loadingChecklist && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
          </div>

          {selectedProgramId === "" ? (
            <p className="text-sm text-slate-500">
              Select a program to see its checklist.
            </p>
          ) : checklist.length === 0 ? (
            <p className="text-sm text-slate-500">
              No steps defined yet. Add the first arrival step for this
              program.
            </p>
          ) : (
            <ul className="space-y-2 mb-4">
              {checklist.map((step) => (
                <li
                  key={step.id}
                  className="border rounded-lg p-3 text-sm flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{step.title}</div>
                    {step.description && (
                      <div className="text-slate-600 text-xs">
                        {step.description}
                      </div>
                    )}
                    {step.category && (
                      <div className="text-xs text-slate-500">
                        {step.category}
                      </div>
                    )}
                  </div>
                  {step.is_required && (
                    <span className="text-xs uppercase text-red-500">
                      REQUIRED
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* New step form */}
          {selectedProgramId && (
            <div className="border-t pt-3 mt-3">
              <h3 className="text-sm font-medium text-slate-800 mb-2">
                Add a new checklist step
              </h3>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  type="text"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Step title (e.g. Upload passport)"
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                />
                <input
                  type="text"
                  className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Category (e.g. visa, docs)"
                  value={newStepCategory}
                  onChange={(e) => setNewStepCategory(e.target.value)}
                />
              </div>
              <textarea
                placeholder="Optional description or instructions"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                value={newStepDescription}
                onChange={(e) => setNewStepDescription(e.target.value)}
              />
              <button
                onClick={handleCreateStep}
                disabled={creatingStep || !newStepTitle.trim()}
                className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
              >
                {creatingStep ? "Adding…" : "Add Step"}
              </button>
            </div>
          )}
        </section>

        {/* 5. Documents for selected student */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-slate-800">
              5. Documents for Selected Student
            </h2>
            {loadingDocuments && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
          </div>

          {!selectedStudentId ? (
            <p className="text-sm text-slate-500">
              Select a student to view their uploaded documents.
            </p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-500">
              This student has not uploaded any documents yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onReview={reviewDocument}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function DocumentRow({
  doc,
  onReview,
}: {
  doc: StudentDocument;
  onReview: (id: string, action: "APPROVE" | "REJECT", notes: string) => void;
}) {
  const [notes, setNotes] = useState(doc.reviewer_notes ?? "");
  const [loading, setLoading] = useState<"APPROVE" | "REJECT" | null>(null);

  const handle = async (action: "APPROVE" | "REJECT") => {
    setLoading(action);
    try {
      await onReview(doc.id, action, notes);
    } finally {
      setLoading(null);
    }
  };

  const statusLabel = doc.reviewed_status || "PENDING";

  const statusClasses =
    statusLabel === "APPROVED"
      ? "bg-emerald-100 text-emerald-700"
      : statusLabel === "REJECTED"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-700";

  return (
    <li className="border rounded-lg p-3 text-sm flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium">{doc.file_name}</div>
          <div className="text-xs text-slate-500">
            {doc.step_title ?? "Unlinked step"}
            {doc.step_category ? ` · ${doc.step_category}` : ""}
          </div>
          <div className="mt-1 text-xs">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 ${statusClasses}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
        <a
          href={doc.public_url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline text-xs"
        >
          View file
        </a>
      </div>

      <textarea
        className="w-full border rounded-md px-2 py-1 text-xs"
        placeholder="Reviewer notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => handle("APPROVE")}
          disabled={loading !== null}
          className="px-3 py-1 rounded-md text-xs bg-emerald-600 text-white disabled:opacity-50 hover:bg-emerald-700"
        >
          {loading === "APPROVE" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => handle("REJECT")}
          disabled={loading !== null}
          className="px-3 py-1 rounded-md text-xs bg-red-600 text-white disabled:opacity-50 hover:bg-red-700"
        >
          {loading === "REJECT" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </li>
  );
}
