"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, Clock, Calendar, Repeat2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate, getDaysUntil } from "@/lib/utils";
import { useToast } from "@/lib/contexts/ToastContext";
import { cn } from "@/lib/utils";

interface ChoreCardProps {
  chore: {
    _id: string;
    name: string;
    description?: string;
    frequency: string;
    estimatedMinutes?: number;
    points?: number;
  };
  assignment?: {
    _id: string;
    dueDate: number;
    status: string;
  } | null;
  assignedUser?: { name: string; avatarUrl?: string } | null;
}

export function ChoreCard({ chore, assignment, assignedUser }: ChoreCardProps) {
  const { success, error } = useToast();
  const markComplete = useMutation(api.choreAssignments.markComplete);
  const deleteChore = useMutation(api.chores.deleteChore);

  const daysUntil = assignment ? getDaysUntil(assignment.dueDate) : null;
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueToday = daysUntil === 0;

  const handleComplete = async () => {
    if (!assignment) return;
    try {
      await markComplete({ assignmentId: assignment._id as any });
      success("Chore marked complete!");
    } catch (e) {
      error(String(e));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteChore({ choreId: chore._id as any });
      success("Chore removed.");
    } catch (e) {
      error(String(e));
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow group",
        isOverdue ? "border-l-4 border-l-red-400 border-slate-200" : "border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Complete button */}
        {assignment && assignment.status === "pending" && (
          <button
            onClick={handleComplete}
            className="w-8 h-8 rounded-full border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all group"
            title="Mark as complete"
          >
            <CheckCircle2 className="w-4 h-4 text-transparent group-hover:text-indigo-500 transition-colors" />
          </button>
        )}
        {assignment?.status === "completed" && (
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("font-medium text-slate-900", assignment?.status === "completed" && "line-through text-slate-400")}>
              {chore.name}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isOverdue && <Badge variant="danger" size="sm">Overdue</Badge>}
              {isDueToday && !isOverdue && <Badge variant="warning" size="sm">Today</Badge>}
              {chore.points && <Badge variant="primary" size="sm">+{chore.points}pts</Badge>}
            </div>
          </div>

          {chore.description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{chore.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Repeat2 className="w-3.5 h-3.5" />
              <span className="capitalize">{chore.frequency}</span>
            </div>
            {chore.estimatedMinutes && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{chore.estimatedMinutes}m</span>
              </div>
            )}
            {assignment && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {isOverdue
                    ? `${Math.abs(daysUntil!)}d overdue`
                    : daysUntil === 0
                    ? "Due today"
                    : `Due in ${daysUntil}d`}
                </span>
              </div>
            )}
            {assignedUser && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 font-bold" style={{ fontSize: 9 }}>
                    {assignedUser.name.charAt(0)}
                  </span>
                </div>
                <span>{assignedUser.name}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
          title="Remove chore"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
