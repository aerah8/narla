"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const count = useQuery(api.notifications.getUnreadCount) ?? 0;
  const notifications = useQuery(api.notifications.getNotificationsForUser, { limit: 10 }) ?? [];
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
              {count > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  All caught up!
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => markRead({ notificationId: n._id })}
                    className={cn(
                      "px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors",
                      !n.isRead && "bg-indigo-50/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                      )}
                      <div className={cn(!n.isRead ? "" : "ml-4")}>
                        <p className="text-sm font-medium text-slate-800">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatRelativeTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
