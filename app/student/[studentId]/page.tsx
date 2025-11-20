"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type DocumentInfo = {
  id: string;
  file_name: string;
  public_url: string;
  review_status?: "PENDING" | "APPROVED" | "REJECTED" | null;
  reviewer_notes?: string | null;
  uploaded_at?: string;
};

type ChecklistItem = {
  checklist_step_id: string;
  title: string;
  description?: string;
  category?: string;
  is_required: boolean;
  sort_order: number;
  status: string; // PENDING or DONE
  completed_at?: string | null;
  requires_document: boolean;
  has_document: boolean;
  document_url?: string | null;
  document?: DocumentInfo | null;
  review_status?: "PENDING" | "APPROVED" | "REJECTED" | null;
  reviewer_notes?: string | null;
};

export default function StudentChecklistPage() {
  const params = useParams();
  const studentId = params?.studentId as string | undefined;

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    const fetchChecklist = async () => {
      if (!API_BASE_URL || !studentId) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/student-checklist?student_id=${studentId}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load checklist (${res.status})`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error("Unexpected checklist response");
        }
        setItems(data);
      } catch (err: any) {
        console.error("Student checklist error:", err);
        setError(err.message || "Failed to load checklist");
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, [studentId]);

  const handleMarkDone = async (checklistStepId: string) => {
    if (!API_BASE_URL || !studentId) return;

    try {
      setSavingId(checklistStepId);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/student-checklist/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          checklist_step_id: checklistStepId,
          status: "DONE",
        }),
      });

      if (!res.ok) {
        // Try to get detailed error message from backend
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.detail || `Failed to update step (${res.status})`;
        throw new Error(errorMessage);
      }

      // Re-fetch checklist to get updated statuses
      const refreshed = await fetch(
        `${API_BASE_URL}/api/student-checklist?student_id=${studentId}`
      );
      const data = await refreshed.json();
      setItems(data);
    } catch (err: any) {
      console.error("Mark done error:", err);
      setError(err.message || "Failed to update step");
    } finally {
      setSavingId(null);
    }
  };

  const handleFileChange = (checklistStepId: string, file: File | null) => {
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, [checklistStepId]: file }));
    } else {
      setSelectedFiles((prev) => {
        const updated = { ...prev };
        delete updated[checklistStepId];
        return updated;
      });
    }
  };

  const handleUpload = async (checklistStepId: string) => {
    if (!API_BASE_URL || !studentId) return;

    const file = selectedFiles[checklistStepId];
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setUploadingId(checklistStepId);
      setError(null);

      const formData = new FormData();
      formData.append("student_id", studentId);
      formData.append("checklist_step_id", checklistStepId);
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/student-documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Failed to upload document (${res.status})`);
      }

      // Clear selected file for this step
      handleFileChange(checklistStepId, null);

      // Re-fetch checklist to get updated document status
      const refreshed = await fetch(
        `${API_BASE_URL}/api/student-checklist?student_id=${studentId}`
      );
      const data = await refreshed.json();
      setItems(data);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload document");
    } finally {
      setUploadingId(null);
    }
  };

  if (!studentId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-600">
          Missing student ID in the URL.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          Your Arrival Checklist
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Complete each step below to get ready for your arrival on campus.
        </p>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading checklist…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">
            Your program has not set up an arrival checklist yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const isDone = item.status === "DONE";
              // Handle both nested document object and flat fields
              const hasDoc = item.has_document || !!item.document;
              const docUrl = item.document?.public_url || item.document_url;
              const reviewStatus = item.document?.review_status || item.review_status;
              const reviewerNotes = item.document?.reviewer_notes || item.reviewer_notes;

              return (
                <li
                  key={item.checklist_step_id}
                  className="border rounded-lg px-3 py-2 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {item.title}
                      </span>
                      {item.is_required && (
                        <span className="text-[10px] text-rose-600 font-semibold">
                          REQUIRED
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-600 mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.category && (
                      <span className="inline-flex mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                        {item.category}
                      </span>
                    )}
                    {isDone && item.completed_at && (
                      <p className="text-[10px] text-emerald-600 mt-1">
                        Marked complete.
                      </p>
                    )}

                    {/* Document upload controls */}
                    {item.requires_document && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        {hasDoc && docUrl ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-600 font-medium">
                                Document uploaded
                              </span>
                              <a
                                href={docUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 underline hover:text-blue-800"
                              >
                                View
                              </a>
                            </div>

                            {/* Review status */}
                            {reviewStatus === "APPROVED" && (
                              <p className="text-[10px] text-emerald-600 font-medium">
                                ✅ Approved by staff
                              </p>
                            )}

                            {reviewStatus === "PENDING" && (
                              <p className="text-[10px] text-amber-600">
                                ⏳ Pending review by your program
                              </p>
                            )}

                            {reviewStatus === "REJECTED" && (
                              <div className="space-y-0.5">
                                <p className="text-[10px] text-red-600 font-medium">
                                  ❌ Rejected - Please upload a new version
                                </p>
                                {reviewerNotes && (
                                  <p className="text-[10px] text-red-600 italic">
                                    Reason: {reviewerNotes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="block text-[10px] text-slate-600 font-medium">
                              Upload required document:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                onChange={(e) =>
                                  handleFileChange(
                                    item.checklist_step_id,
                                    e.target.files?.[0] || null
                                  )
                                }
                                className="text-[10px] text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-[10px] file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                              />
                              <button
                                onClick={() =>
                                  handleUpload(item.checklist_step_id)
                                }
                                disabled={
                                  !selectedFiles[item.checklist_step_id] ||
                                  uploadingId === item.checklist_step_id
                                }
                                className="rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                              >
                                {uploadingId === item.checklist_step_id
                                  ? "Uploading..."
                                  : "Upload"}
                              </button>
                            </div>
                            {!isDone && (
                              <p className="text-[10px] text-amber-600 mt-1">
                                ⚠️ You must upload a document before marking this step complete.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    {isDone ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-700">
                        Done
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkDone(item.checklist_step_id)}
                        disabled={
                          savingId === item.checklist_step_id ||
                          (item.requires_document && !hasDoc)
                        }
                        className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        title={
                          item.requires_document && !hasDoc
                            ? "Please upload the required document first"
                            : ""
                        }
                      >
                        {savingId === item.checklist_step_id
                          ? "Saving..."
                          : "Mark as done"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
