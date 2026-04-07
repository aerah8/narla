"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { getDaysUntil, formatCurrency } from "@/lib/utils";
import { CheckCircle2, CheckSquare, Receipt, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/lib/contexts/ToastContext";

export function TodaySection() {
  const { householdId } = useHousehold();
  const { success, error } = useToast();

  const dueChores = useQuery(
    api.choreAssignments.getDueTodayForHousehold,
    householdId ? { householdId } : "skip"
  );
  const dueBills = useQuery(
    api.bills.getDueSoonForHousehold,
    householdId ? { householdId, days: 7 } : "skip"
  );

  const markComplete = useMutation(api.choreAssignments.markComplete);

  const handleComplete = async (assignmentId: string) => {
    try {
      await markComplete({ assignmentId: assignmentId as any });
      success("Chore marked as complete!");
    } catch (e) {
      error(String(e));
    }
  };

  const midnight = new Date(new Date().setHours(0, 0, 0, 0));
  const overdue = dueChores?.filter(
    (a: any) => new Date(a.dueDate) < midnight
  ) ?? [];
  const today = dueChores?.filter(
    (a: any) => new Date(a.dueDate) >= midnight
  ) ?? [];

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">Today</CardTitle>
        <span className="text-xs text-slate-400">{dateStr}</span>
      </CardHeader>

      <div className="space-y-5">
        {/* Chores */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Chores</span>
          </div>
          {dueChores === undefined ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : dueChores.length === 0 ? (
            <p className="text-sm text-slate-400 py-1">No chores due — you&apos;re all caught up!</p>
          ) : (
            <div className="space-y-1.5">
              {[...overdue, ...today].slice(0, 5).map((assignment) => (
                <div
                  key={assignment._id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 group transition-colors"
                >
                  <button
                    onClick={() => handleComplete(assignment._id)}
                    className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-pink-400 dark:border-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3 text-transparent group-hover:text-pink-400 transition-colors" />
                  </button>
                  <span className="text-sm text-slate-700 flex-1 truncate">
                    {assignment.chore?.name ?? "Unknown chore"}
                  </span>
                  <div className="flex items-center gap-1">
                    {overdue.includes(assignment) && (
                      <Badge variant="danger" size="sm">Overdue</Badge>
                    )}
                    {assignment.chore?.estimatedMinutes && (
                      <span className="text-xs text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {assignment.chore.estimatedMinutes}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bills */}
        <div className="border-t border-slate-100 dark:border-white/8 pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Bills Due Soon</span>
          </div>
          {dueBills === undefined ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : dueBills.length === 0 ? (
            <p className="text-sm text-slate-400 py-1">No bills due this week.</p>
          ) : (
            <div className="space-y-2">
              {dueBills.slice(0, 4).map((bill: any) => {
                const daysUntil = getDaysUntil(bill.dueDate);
                const isOverdue = daysUntil < 0;
                return (
                  <div
                    key={bill._id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8"
                  >
                    {/* Letter avatar */}
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {bill.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-slate-700 flex-1 truncate">{bill.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatCurrency(bill.totalAmount)}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isOverdue
                            ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {isOverdue ? "Overdue" : daysUntil === 0 ? "Today" : "Due"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
