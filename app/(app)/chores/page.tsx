"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { ChoreCard } from "@/components/chores/ChoreCard";
import { AddChoreModal } from "@/components/chores/AddChoreModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckSquare, Plus, RefreshCw, BarChart2 } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "upcoming" | "overdue" | "completed";

export default function ChoresPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWorkload, setShowWorkload] = useState(true);
  const { householdId } = useHousehold();
  const { success, error } = useToast();

  const upcomingChores = useQuery(
    api.chores.getChoresForHousehold,
    householdId ? { householdId } : "skip"
  );
  const overdueChores = useQuery(
    api.choreAssignments.getOverdueForHousehold,
    householdId ? { householdId } : "skip"
  );
  const completedChores = useQuery(
    api.choreAssignments.getCompletedForHousehold,
    householdId ? { householdId } : "skip"
  );
  const workload = useQuery(
    api.choreAssignments.getWorkloadSummary,
    householdId ? { householdId } : "skip"
  );

  const rotateAssignments = useMutation(api.chores.rotateAssignments);

  const handleRotate = async () => {
    if (!householdId) return;
    try {
      await rotateAssignments({ householdId });
      success("Chores rotated!");
    } catch (e) {
      error(String(e));
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "upcoming", label: "Upcoming", count: upcomingChores?.length },
    { key: "overdue", label: "Overdue", count: overdueChores?.length },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chores</h1>
          <p className="text-slate-500 text-sm mt-0.5">Shared household responsibilities.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={handleRotate}
          >
            Rotate
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={BarChart2}
            onClick={() => setShowWorkload((v) => !v)}
          >
            Workload
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Add Chore
          </Button>
        </div>
      </div>

      {/* Workload summary */}
      {showWorkload && workload && workload.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Member Workload (last 30 days)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={workload} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [
                  name === "completedCount" ? `${value} chores` : `${value} min`,
                  name === "completedCount" ? "Completed" : "Total Minutes",
                ]}
              />
              <Bar dataKey="completedCount" fill="#6366F1" radius={[4, 4, 0, 0]} name="completedCount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <Badge
                variant={key === "overdue" ? "danger" : "primary"}
                size="sm"
              >
                {count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "upcoming" && (
        <div className="space-y-3">
          {upcomingChores === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : upcomingChores.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No chores yet"
              description="Add your first chore to start tracking household responsibilities."
              actionLabel="Add Chore"
              onAction={() => setShowAddModal(true)}
            />
          ) : (
            upcomingChores.map((chore) => (
              <ChoreCard
                key={chore._id}
                chore={chore}
                assignment={chore.currentAssignment}
                assignedUser={chore.assignedUser}
              />
            ))
          )}
        </div>
      )}

      {tab === "overdue" && (
        <div className="space-y-3">
          {overdueChores === undefined ? (
            <div className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ) : overdueChores.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No overdue chores"
              description="You're all caught up! Great work keeping the apartment tidy."
            />
          ) : (
            overdueChores.map((assignment) => (
              <ChoreCard
                key={assignment._id}
                chore={assignment.chore ?? { _id: assignment.choreId, name: "Unknown", frequency: "weekly" }}
                assignment={assignment}
                assignedUser={assignment.assignedUser}
              />
            ))
          )}
        </div>
      )}

      {tab === "completed" && (
        <div className="space-y-3">
          {completedChores === undefined ? (
            <div className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ) : completedChores.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No completed chores yet"
              description="Complete a chore and it'll show up here."
            />
          ) : (
            completedChores.map((assignment) => (
              <ChoreCard
                key={assignment._id}
                chore={assignment.chore ?? { _id: assignment.choreId, name: "Unknown", frequency: "weekly" }}
                assignment={assignment}
                assignedUser={assignment.assignedUser}
              />
            ))
          )}
        </div>
      )}

      {householdId && (
        <AddChoreModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          householdId={householdId}
        />
      )}
    </div>
  );
}
