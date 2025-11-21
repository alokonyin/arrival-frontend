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
  program_type?: "UNIVERSITY" | "NGO";
};

type Student = {
  id: string;
  institution_id: string;
  program_id: string;
  full_name: string;
  personal_email: string;
  status: string;
  risk_level: string;
  target_university?: string;
  progress_fraction?: number; // 0-1 from backend
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

type StudentRequest = {
  id: string;
  student_id: string;
  student_name?: string;
  request_type: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
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
  const [requests, setRequests] = useState<StudentRequest[]>([]);

  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [requestNotes, setRequestNotes] = useState<Record<string, string>>({});

  // form state for creating a new checklist step
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepCategory, setNewStepCategory] = useState("");
  const [newStepDescription, setNewStepDescription] = useState("");
  const [creatingStep, setCreatingStep] = useState(false);

  // template application state
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // collapsible sections state
  const [studentsCollapsed, setStudentsCollapsed] = useState(false);
  const [checklistCategoryCollapsed, setChecklistCategoryCollapsed] = useState<Record<string, boolean>>({});

  // bulk student upload state (NGO programs)
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // form state for creating a new program
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramTermLabel, setNewProgramTermLabel] = useState("");
  const [newProgramStartDate, setNewProgramStartDate] = useState("");
  const [newProgramType, setNewProgramType] = useState<"UNIVERSITY" | "NGO">("UNIVERSITY");
  const [creatingProgram, setCreatingProgram] = useState(false);

  const apiBase = API_BASE_URL;

  // Get selected program object
  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const isUniversityProgram = selectedProgram?.program_type === "UNIVERSITY";
  const isNGOProgram = selectedProgram?.program_type === "NGO";

  // Group checklist by category
  const groupedChecklist = checklist.reduce((acc, step) => {
    const category = step.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(step);
    return acc;
  }, {} as Record<string, ChecklistStep[]>);

  const toggleCategory = (category: string) => {
    setChecklistCategoryCollapsed(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

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

  // Fetch requests for the selected program
  const fetchRequests = async (programId: string, recipientType?: "UNIVERSITY" | "NGO") => {
    if (!programId || !apiBase) return;
    setLoadingRequests(true);
    setRequests([]);
    setError(null);
    try {
      let url = `${apiBase}/api/admin/requests?program_id=${programId}`;
      if (recipientType) {
        url += `&recipient_type=${recipientType}`;
      }
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to load requests (${res.status})`);
      }

      const data: StudentRequest[] = await res.json();
      setRequests(data);
    } catch (err: any) {
      console.error("Error loading requests:", err);
      setError(err.message || "Failed to load requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (selectedProgramId) {
      if (isNGOProgram) {
        // NGO admins see only NGO requests (financial support)
        fetchRequests(selectedProgramId, "NGO");
      } else if (isUniversityProgram) {
        // University admins see only UNIVERSITY requests (institutional support)
        fetchRequests(selectedProgramId, "UNIVERSITY");
      }
    } else {
      setRequests([]);
    }
  }, [selectedProgramId, isNGOProgram, isUniversityProgram]);

  // Handle request approval
  const handleApproveRequest = async (requestId: string, notes: string) => {
    if (!apiBase) return;
    setReviewingRequestId(requestId);
    setError(null);

    try {
      const res = await fetch(
        `${apiBase}/api/admin/requests/${requestId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_notes: notes }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to approve request (${res.status})`);
      }

      // Refresh requests with appropriate recipient_type filter
      if (selectedProgramId) {
        const recipientType = isNGOProgram ? "NGO" : isUniversityProgram ? "UNIVERSITY" : undefined;
        await fetchRequests(selectedProgramId, recipientType);
      }

      // Clear notes
      setRequestNotes((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    } catch (err: any) {
      console.error("Error approving request:", err);
      setError(err.message || "Failed to approve request");
    } finally {
      setReviewingRequestId(null);
    }
  };

  // Handle request rejection
  const handleRejectRequest = async (requestId: string, notes: string) => {
    if (!apiBase) return;
    setReviewingRequestId(requestId);
    setError(null);

    try {
      const res = await fetch(
        `${apiBase}/api/admin/requests/${requestId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_notes: notes }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to reject request (${res.status})`);
      }

      // Refresh requests with appropriate recipient_type filter
      if (selectedProgramId) {
        const recipientType = isNGOProgram ? "NGO" : isUniversityProgram ? "UNIVERSITY" : undefined;
        await fetchRequests(selectedProgramId, recipientType);
      }

      // Clear notes
      setRequestNotes((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });
    } catch (err: any) {
      console.error("Error rejecting request:", err);
      setError(err.message || "Failed to reject request");
    } finally {
      setReviewingRequestId(null);
    }
  };

  // Create a new program
  const handleCreateProgram = async () => {
    if (!apiBase || !selectedInstitutionId || !newProgramName.trim() || !newProgramTermLabel.trim() || !newProgramStartDate) {
      setError("Please fill in all required fields");
      return;
    }

    setCreatingProgram(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/api/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_id: selectedInstitutionId,
          name: newProgramName.trim(),
          term_label: newProgramTermLabel.trim(),
          term_start_date: newProgramStartDate,
          program_type: newProgramType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to create program (${res.status})`);
      }

      // Reset form
      setNewProgramName("");
      setNewProgramTermLabel("");
      setNewProgramStartDate("");
      setNewProgramType("UNIVERSITY");
      setShowProgramForm(false);

      // Refresh programs list
      if (selectedInstitutionId) {
        const refreshed = await fetch(
          `${apiBase}/api/programs?institution_id=${selectedInstitutionId}`
        );
        const data = await refreshed.json();
        setPrograms(data);
      }
    } catch (err: any) {
      console.error("Create program error:", err);
      setError(err.message || "Failed to create program");
    } finally {
      setCreatingProgram(false);
    }
  };

  // Create a new checklist step
  // Apply checklist template
  const handleApplyTemplate = async (templateType: "UNIVERSITY" | "NGO") => {
    if (!apiBase || !selectedProgramId) return;
    setApplyingTemplate(true);
    setError(null);

    try {
      const res = await fetch(
        `${apiBase}/api/programs/${selectedProgramId}/apply-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: templateType }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to apply template (${res.status})`);
      }

      // Refresh checklist to show newly added steps
      const refreshed = await fetch(
        `${apiBase}/api/program-checklist?program_id=${selectedProgramId}`
      );
      const data = await refreshed.json();
      setChecklist(data);
    } catch (err: any) {
      console.error("Error applying template:", err);
      setError(err.message || "Failed to apply checklist template");
    } finally {
      setApplyingTemplate(false);
    }
  };

  // Parse bulk text for student upload
  const parseBulkText = (text: string) => {
    // Expect lines like: Full Name, email@example.com, Stanford University
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          full_name: parts[0] ?? "",
          personal_email: parts[1] ?? "",
          target_university: parts[2] ?? "",
        };
      })
      .filter((s) => s.full_name && s.personal_email && s.target_university);
  };

  // Handle bulk student upload
  const handleBulkAdd = async () => {
    if (!apiBase || !selectedProgramId || !bulkText.trim()) return;

    setBulkLoading(true);
    setBulkError(null);

    try {
      const students = parseBulkText(bulkText);
      if (students.length === 0) {
        setBulkError("No valid lines found. Use format: Name, email, university");
        return;
      }

      const res = await fetch(
        `${apiBase}/api/students/programs/${selectedProgramId}/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `Bulk add failed (${res.status})`);
      }

      // Parse response to ensure it's valid JSON
      await res.json().catch(() => ({}));

      // Refresh students list
      if (selectedProgramId) {
        console.log("Refreshing students after bulk add...");
        const refreshed = await fetch(
          `${apiBase}/api/students?program_id=${selectedProgramId}`
        );
        console.log("Refresh response status:", refreshed.status);
        if (refreshed.ok) {
          const data = await refreshed.json();
          console.log("Refreshed students data:", data);
          setStudents(data);
        } else {
          console.error("Failed to refresh students:", refreshed.status);
        }
      }

      setBulkText("");
      setBulkError(null);
    } catch (err: any) {
      console.error("Bulk add error:", err);
      setBulkError(err.message ?? "Failed to add students");
    } finally {
      setBulkLoading(false);
    }
  };

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
          Arrival Admin Dashboard
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
            <div className="flex items-center gap-2">
              {loadingPrograms && (
                <span className="text-xs text-slate-500">Loading…</span>
              )}
              {selectedInstitutionId && !showProgramForm && (
                <button
                  onClick={() => setShowProgramForm(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Create Program
                </button>
              )}
            </div>
          </div>

          {showProgramForm && (
            <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Create New Program
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Program Name *
                  </label>
                  <input
                    type="text"
                    value={newProgramName}
                    onChange={(e) => setNewProgramName(e.target.value)}
                    placeholder="e.g., Undergrad Fall 2026"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Term Label *
                  </label>
                  <input
                    type="text"
                    value={newProgramTermLabel}
                    onChange={(e) => setNewProgramTermLabel(e.target.value)}
                    placeholder="e.g., Fall 2026"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={newProgramStartDate}
                    onChange={(e) => setNewProgramStartDate(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Program Type *
                  </label>
                  <select
                    value={newProgramType}
                    onChange={(e) => setNewProgramType(e.target.value as "UNIVERSITY" | "NGO")}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UNIVERSITY">🎓 University / College</option>
                    <option value="NGO">🤝 Community Program / NGO</option>
                  </select>
                </div>
              </div>
              <div className="text-xs text-slate-600 mb-3 p-2 bg-white rounded border border-slate-200">
                <strong>Program Type:</strong>
                <ul className="mt-1 space-y-1 ml-4 list-disc">
                  <li><strong>University:</strong> Document review, immigration tracking, visa compliance</li>
                  <li><strong>NGO:</strong> Funding requests, self-report tracking, financial support</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowProgramForm(false);
                    setNewProgramName("");
                    setNewProgramTermLabel("");
                    setNewProgramStartDate("");
                    setNewProgramType("UNIVERSITY");
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProgram}
                  disabled={creatingProgram || !newProgramName.trim() || !newProgramTermLabel.trim() || !newProgramStartDate}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingProgram ? "Creating..." : "Create Program"}
                </button>
              </div>
            </div>
          )}

          {programs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No programs found for this institution yet. Click "Create Program" to add one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => setSelectedProgramId(program.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border flex items-center gap-2 ${
                    selectedProgramId === program.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span>{program.name} ({program.term_label})</span>
                  {program.program_type && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      program.program_type === "UNIVERSITY"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    } ${selectedProgramId === program.id ? "opacity-90" : ""}`}>
                      {program.program_type === "UNIVERSITY" ? "🎓 UNIV" : "🤝 NGO"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 3. Students list */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStudentsCollapsed(!studentsCollapsed)}
                className="text-slate-600 hover:text-slate-800 transition-colors"
                aria-label={studentsCollapsed ? "Expand students" : "Collapse students"}
              >
                {studentsCollapsed ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              <h2 className="text-lg font-medium text-slate-800">
                3. Students in Selected Program
                {students.length > 0 && (
                  <span className="ml-2 text-sm text-slate-500">({students.length})</span>
                )}
              </h2>
            </div>
            {loadingStudents && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
          </div>
          {!studentsCollapsed && (students.length === 0 ? (
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
                    {isNGOProgram && <th className="px-3 py-2">University</th>}
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">Progress</th>
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
                      {isNGOProgram && (
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {s.target_university || "—"}
                        </td>
                      )}
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
                      <td className="px-3 py-2">
                        {(() => {
                          const p = s.progress_fraction ?? 0;
                          const pct = Math.round(p * 100);
                          return (
                            <div className="w-32">
                              <div className="h-1.5 w-full bg-slate-200 rounded-full mb-1">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    pct === 100
                                      ? "bg-emerald-500"
                                      : pct >= 50
                                      ? "bg-blue-500"
                                      : "bg-amber-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-600">{pct}%</span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        {/* Bulk Add Students (NGO programs only) */}
        {isNGOProgram && selectedProgramId && (
          <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-md font-semibold text-slate-800 mb-2">
              Bulk Add Students
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Add multiple students at once. One student per line:<br />
              <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                Name, email@example.com, Target University
              </code>
            </p>
            <textarea
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2 font-mono"
              rows={6}
              placeholder={`Joyce Achieng, joyce@example.com, Stanford University\nKelvin Mwangi, kelvin@example.com, MIT\nAmina Deng, amina@example.com, Harvard University`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            {bulkError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {bulkError}
              </div>
            )}
            <button
              onClick={handleBulkAdd}
              disabled={bulkLoading || !bulkText.trim()}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkLoading ? "Adding students..." : "Add Students"}
            </button>
          </section>
        )}

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
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                No steps defined yet. You can apply a template or add steps manually.
              </p>

              {/* Template Application Buttons */}
              {selectedProgram?.program_type && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">
                    Apply Checklist Template
                  </h3>
                  <p className="text-xs text-slate-600 mb-3">
                    {selectedProgram.program_type === "UNIVERSITY"
                      ? "Apply a pre-built university arrival checklist with visa documents, health forms, housing, and travel steps."
                      : "Apply a pre-built NGO checklist focused on self-reporting visa progress, travel plans, and support needs."}
                  </p>
                  <button
                    onClick={() => handleApplyTemplate(selectedProgram.program_type as "UNIVERSITY" | "NGO")}
                    disabled={applyingTemplate}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {applyingTemplate
                      ? "Applying Template..."
                      : `Apply ${selectedProgram.program_type === "UNIVERSITY" ? "University" : "NGO"} Template`}
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    This will add {selectedProgram.program_type === "UNIVERSITY" ? "15" : "16"} pre-configured checklist steps.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {Object.entries(groupedChecklist).map(([category, steps]) => (
                <div key={category} className="border rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {checklistCategoryCollapsed[category] ? (
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      <span className="font-semibold text-sm text-slate-800 uppercase tracking-wide">
                        {category}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({steps.length} {steps.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                  </button>

                  {/* Category Items */}
                  {!checklistCategoryCollapsed[category] && (
                    <ul className="divide-y divide-slate-200">
                      {steps.map((step) => (
                        <li
                          key={step.id}
                          className="p-3 text-sm flex justify-between items-center hover:bg-slate-50"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{step.title}</div>
                            {step.description && (
                              <div className="text-slate-600 text-xs mt-1">
                                {step.description}
                              </div>
                            )}
                          </div>
                          {step.is_required && (
                            <span className="text-xs uppercase text-red-500 font-semibold ml-3">
                              REQUIRED
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
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

        {/* 5. Student Support Requests (Both UNIVERSITY and NGO programs) */}
        {selectedProgramId && (
          <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-slate-800">
                5. Student Support Requests
              </h2>
              <div className="flex items-center gap-2">
                {loadingRequests && (
                  <span className="text-xs text-slate-500">Loading…</span>
                )}
                {selectedProgram?.program_type && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    selectedProgram.program_type === "NGO"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {selectedProgram.program_type === "NGO" ? "NGO Mode" : "University Mode"}
                  </span>
                )}
              </div>
            </div>

            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">
                No student requests yet. Students can submit support requests using the "Request Support" buttons in their dashboard.
              </p>
            ) : (
              <ul className="space-y-3">
                {requests.map((request) => (
                  <li
                    key={request.id}
                    className="border rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">
                            {request.student_name || "Student"}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-600">
                            {request.request_type}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              request.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-700"
                                : request.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {request.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs mb-1">
                          {request.description}
                        </p>
                        <p className="text-slate-400 text-[10px]">
                          Submitted {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {request.status === "PENDING" && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <textarea
                          value={requestNotes[request.id] || ""}
                          onChange={(e) =>
                            setRequestNotes((prev) => ({
                              ...prev,
                              [request.id]: e.target.value,
                            }))
                          }
                          placeholder="Add notes for the student (optional)..."
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleApproveRequest(
                                request.id,
                                requestNotes[request.id] || ""
                              )
                            }
                            disabled={reviewingRequestId === request.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {reviewingRequestId === request.id
                              ? (isNGOProgram ? "Approving..." : "Responding...")
                              : (isNGOProgram ? "Approve" : "Respond")}
                          </button>
                          <button
                            onClick={() =>
                              handleRejectRequest(
                                request.id,
                                requestNotes[request.id] || ""
                              )
                            }
                            disabled={reviewingRequestId === request.id}
                            className={`px-3 py-1.5 text-white text-xs font-medium rounded hover:bg-opacity-90 disabled:opacity-50 ${
                              isNGOProgram ? "bg-red-600 hover:bg-red-700" : "bg-slate-600 hover:bg-slate-700"
                            }`}
                          >
                            {reviewingRequestId === request.id
                              ? (isNGOProgram ? "Rejecting..." : "Closing...")
                              : (isNGOProgram ? "Reject" : "Close")}
                          </button>
                        </div>
                      </div>
                    )}

                    {request.status !== "PENDING" && request.admin_notes && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-500 italic">
                          Staff response: {request.admin_notes}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
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
