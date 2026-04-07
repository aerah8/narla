"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { formatRelativeTime } from "@/lib/utils";
import { Trash2, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/lib/contexts/ToastContext";

const AVATAR_COLORS: Record<string, string> = {
  chore: "bg-indigo-500",
  bill: "bg-emerald-500",
  grocery: "bg-amber-500",
  inventory: "bg-blue-500",
  household: "bg-purple-500",
  member: "bg-pink-500",
  receipt: "bg-orange-500",
};

export function ActivityFeed() {
  const { householdId } = useHousehold();
  const { success, error } = useToast();
  const [showPast, setShowPast] = useState(false);

  const activities = useQuery(
    api.activityLog.getRecentActivity,
    householdId ? { householdId, limit: 10 } : "skip"
  );
  const pastActivities = useQuery(
    api.activityLog.getPastActivity,
    householdId && showPast ? { householdId, limit: 20 } : "skip"
  );
  const clearActivity = useMutation(api.activityLog.clearActivity);

  const handleClear = async () => {
    if (!householdId) return;
    try {
      await clearActivity({ householdId });
      success("Activity cleared!");
    } catch (e) {
      error(String(e));
    }
  };

  const ActivityItem = ({ a }: { a: any }) => (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white ${
          AVATAR_COLORS[a.entityType] ?? "bg-slate-400"
        }`}
      >
        {a.user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.user.avatarUrl}
            alt={a.user.name ?? ""}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          a.user?.name?.charAt(0).toUpperCase() ?? "?"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-snug">{a.description}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(a.createdAt)}</p>
      </div>
    </div>
  );

  const hasPastActivity = activities !== undefined && activities.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
        <div className="flex items-center gap-2">
          {activities && activities.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
              title="Clear my recent activity"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </CardHeader>

      {!activities || activities.length === 0 ? (
        <div className="py-4 text-center text-sm text-slate-400">
          No recent activity.
        </div>
      ) : (
        <div className="space-y-4">
          {(activities as any[]).map((a) => (
            <ActivityItem key={a._id} a={a} />
          ))}
        </div>
      )}

      {hasPastActivity && (
        <div className="mt-4 border-t border-slate-100 dark:border-white/8 pt-3">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showPast ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Past activity (last 30 days)
          </button>
          {showPast && (
            <div className="mt-3 space-y-4">
              {!pastActivities ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : pastActivities.length === 0 ? (
                <p className="text-xs text-slate-400">No past activity in the last 30 days.</p>
              ) : (
                (pastActivities as any[]).map((a) => <ActivityItem key={a._id} a={a} />)
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
