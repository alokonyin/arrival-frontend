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

type StudentRequest = {
  id: string;
  student_id: string;
  request_type: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export default function StudentChecklistPage() {
  const params = useParams();
  const studentId = params?.studentId as string | undefined;

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [programType, setProgramType] = useState<"UNIVERSITY" | "NGO" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  // Request support state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [requestType, setRequestType] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

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

  // Fetch student requests
  const fetchRequests = async () => {
    if (!API_BASE_URL || !studentId) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/student/${studentId}/requests`
      );
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setRequests(data);
    } catch (err: any) {
      console.error("Failed to load requests:", err);
    }
  };

  // Submit a new request
  const handleSubmitRequest = async () => {
    if (!API_BASE_URL || !studentId || !requestType || !requestDescription.trim()) {
      setError("Please select a request type and provide a description");
      return;
    }

    setSubmittingRequest(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/student/${studentId}/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_type: requestType,
            description: requestDescription,
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to submit request");
      }

      // Success - refresh requests and close modal
      await fetchRequests();
      setShowRequestModal(false);
      setRequestType("");
      setRequestDescription("");
    } catch (err: any) {
      console.error("Submit request error:", err);
      setError(err.message || "Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Load requests on mount
  useEffect(() => {
    fetchRequests();
  }, [studentId]);

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
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">
              Your Arrival Checklist
            </h1>
            <p className="text-sm text-slate-500">
              Complete each step below to get ready for your arrival on campus.
            </p>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Request Support
          </button>
        </div>

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
                        {hasDoc && docUrl && reviewStatus !== "REJECTED" ? (
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
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {/* Show rejection message if document was rejected */}
                            {reviewStatus === "REJECTED" && (
                              <div className="mb-2 space-y-0.5">
                                <p className="text-[10px] text-red-600 font-medium">
                                  ❌ Document rejected - Please upload a new version
                                </p>
                                {reviewerNotes && (
                                  <p className="text-[10px] text-red-600 italic">
                                    Reason: {reviewerNotes}
                                  </p>
                                )}
                                {hasDoc && docUrl && (
                                  <a
                                    href={docUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-blue-600 underline hover:text-blue-800"
                                  >
                                    View rejected document
                                  </a>
                                )}
                              </div>
                            )}

                            <label className="block text-[10px] text-slate-600 font-medium">
                              {reviewStatus === "REJECTED" ? "Upload new version:" : "Upload required document:"}
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
                                  : reviewStatus === "REJECTED"
                                  ? "Upload New"
                                  : "Upload"}
                              </button>
                            </div>
                            {!isDone && reviewStatus !== "REJECTED" && (
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
                          (item.requires_document && reviewStatus !== "APPROVED")
                        }
                        className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        title={
                          item.requires_document && reviewStatus !== "APPROVED"
                            ? reviewStatus === "REJECTED"
                              ? "Document was rejected. Please upload a new version."
                              : reviewStatus === "PENDING"
                              ? "Waiting for document approval"
                              : "Please upload the required document first"
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

        {/* Student Requests Section */}
        {requests.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Your Support Requests
            </h2>
            <ul className="space-y-3">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="border rounded-lg p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">
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
                      {request.admin_notes && (
                        <p className="text-slate-500 text-xs italic">
                          Admin response: {request.admin_notes}
                        </p>
                      )}
                      <p className="text-slate-400 text-[10px] mt-1">
                        Submitted {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Request Support Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Request Support
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What do you need help with?
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a request type...</option>
                  <option value="SEVIS Fee Support">SEVIS Fee Support ($350)</option>
                  <option value="DS-160 Fee Support">DS-160 Fee Support ($160)</option>
                  <option value="Flight Booking">Flight Booking Assistance</option>
                  <option value="Laptop Grant">Laptop or Tech Grant</option>
                  <option value="Emergency Funds">Emergency Funds</option>
                  <option value="Visa Appointment">Visa Appointment Help</option>
                  <option value="Housing Question">Housing Question</option>
                  <option value="I-20 Delay">I-20 Delay Concern</option>
                  <option value="Visa Delay">Visa Delay Concern</option>
                  <option value="Other">Other Support</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Please describe your request
                </label>
                <textarea
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide details about what you need help with..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestType("");
                  setRequestDescription("");
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={submittingRequest || !requestType || !requestDescription.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submittingRequest ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
