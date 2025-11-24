"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import StudentMessages from "@/components/StudentMessages";

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

export default function StudentChecklistPage() {
  const params = useParams();
  const studentId = params?.studentId as string | undefined;

  // Tab state
  const [activeTab, setActiveTab] = useState<'checklist' | 'messages'>('checklist');

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


  if (!studentId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-600">
          Missing student ID in the URL.
        </p>
      </main>
    );
  }

  const incompleteCount = items.filter(item => item.status !== "DONE").length;
  const unreadCount = 0; // TODO: Get from conversation API

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navbar with Tabs */}
        <nav className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'checklist'
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            My Checklist
            {incompleteCount > 0 && (
              <span className="ml-2 text-xs text-slate-500">
                ({incompleteCount} left)
              </span>
            )}
            {activeTab === 'checklist' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'messages'
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Messages
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
                {unreadCount}
              </span>
            )}
            {activeTab === 'messages' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </nav>

        {/* Checklist Tab Content */}
        {activeTab === 'checklist' && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-slate-900 mb-1">
                  Your Arrival Checklist
                </h1>
            <p className="text-sm text-slate-500 mb-3">
              Complete each step below to get ready for your arrival on campus.
            </p>
            {items.length > 0 && (
              <div className="mt-2">
                {(() => {
                  const completedCount = items.filter(item => item.status === "DONE").length;
                  const totalCount = items.length;
                  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700">
                          Overall Progress
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          {completedCount} of {totalCount} steps completed
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            progressPct === 100
                              ? "bg-emerald-500"
                              : progressPct >= 50
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {progressPct === 100
                          ? "🎉 All done! You're ready for arrival."
                          : progressPct >= 50
                          ? "Great progress! Keep it up."
                          : "Let's get started on your checklist."}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Need help? Use the <strong>Messages</strong> tab to chat with your admin.
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
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

          </div>
        )}

        {/* Messages Tab Content */}
        {activeTab === 'messages' && (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-4">
              Messages
            </h1>
            <p className="text-sm text-slate-500 mb-4">
              Chat with your program admin for help and support.
            </p>
            {studentId && <StudentMessages studentId={studentId} />}
          </div>
        )}
      </div>
    </main>
  );
}
