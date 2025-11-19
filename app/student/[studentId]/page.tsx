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

export default function StudentChecklistPage() {
  const params = useParams();
  const studentId = params?.studentId as string | undefined;

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
        throw new Error(`Failed to update step (${res.status})`);
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
                        className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
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
