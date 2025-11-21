"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type ChecklistItem = {
  checklist_step_id: string;
  title: string;
  description?: string;
  category?: string;
  is_required: boolean;
  sort_order: number;
  status: string; // PENDING or DONE
  completed_at?: string | null;
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

  // Collapsible category state
  const [categoryCollapsed, setCategoryCollapsed] = useState<Record<string, boolean>>({});

  // Group checklist by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const toggleCategory = (category: string) => {
    setCategoryCollapsed(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Request support state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestRecipientType, setRequestRecipientType] = useState<"UNIVERSITY" | "NGO" | null>(null);
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
    if (!API_BASE_URL || !studentId || !requestType || !requestDescription.trim() || !requestRecipientType) {
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
            recipient_type: requestRecipientType,
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
      setRequestRecipientType(null);
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRequestRecipientType("UNIVERSITY");
                setShowRequestModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Request University Support
            </button>
            <button
              onClick={() => {
                setRequestRecipientType("NGO");
                setShowRequestModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Request Financial Support
            </button>
          </div>
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
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, categoryItems]) => {
              const completedCount = categoryItems.filter(item => item.status === "DONE").length;
              const totalCount = categoryItems.length;

              return (
                <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {categoryCollapsed[category] ? (
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      <span className="font-semibold text-sm text-slate-800 uppercase tracking-wide">
                        {category}
                      </span>
                      <span className="text-xs text-slate-600">
                        {completedCount} / {totalCount} completed
                      </span>
                    </div>
                    {completedCount === totalCount && (
                      <span className="text-emerald-600 text-xs font-medium">
                        ✓ All done
                      </span>
                    )}
                  </button>

                  {/* Category Items */}
                  {!categoryCollapsed[category] && (
                    <ul className="divide-y divide-slate-200">
                      {categoryItems.map((item) => {
                        const isDone = item.status === "DONE";

                        return (
                          <li
                            key={item.checklist_step_id}
                            className="px-3 py-3 flex items-start justify-between gap-3 hover:bg-slate-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                  {item.title}
                                </span>
                                {item.is_required && !isDone && (
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
                              {isDone && item.completed_at && (
                                <p className="text-[10px] text-emerald-600 mt-1">
                                  ✓ Marked complete
                                </p>
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
                                  disabled={savingId === item.checklist_step_id}
                                  className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
              );
            })}
          </div>
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
              {requestRecipientType === "UNIVERSITY"
                ? "Request University Support"
                : "Request Financial Support"}
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
                  {requestRecipientType === "NGO" ? (
                    <>
                      <option value="SEVIS Fee Support">SEVIS Fee Support ($350)</option>
                      <option value="DS-160 Fee Support">DS-160 Fee Support ($160)</option>
                      <option value="Flight Booking">Flight Booking Assistance</option>
                      <option value="Laptop Grant">Laptop or Tech Grant</option>
                      <option value="Emergency Funds">Emergency Funds</option>
                      <option value="Winter Clothing">Winter Clothing Support</option>
                      <option value="Other Financial">Other Financial Support</option>
                    </>
                  ) : (
                    <>
                      <option value="I-20 Delay">I-20 Delay Concern</option>
                      <option value="Housing Question">Housing Question</option>
                      <option value="Visa Appointment">Visa Appointment Help</option>
                      <option value="Visa Delay">Visa Delay Concern</option>
                      <option value="Health/Immunization">Health/Immunization Question</option>
                      <option value="Orientation">Orientation Question</option>
                      <option value="Campus Logistics">Campus Logistics</option>
                      <option value="Other University">Other University Support</option>
                    </>
                  )}
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
