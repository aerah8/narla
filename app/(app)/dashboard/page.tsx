"use client";

import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { HouseholdSummaryCard } from "@/components/dashboard/HouseholdSummaryCard";
import { TodaySection } from "@/components/dashboard/TodaySection";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { InsightPreviewCard } from "@/components/dashboard/InsightPreviewCard";
import { LowStockWidget } from "@/components/dashboard/LowStockWidget";
import { QuickActionsBar } from "@/components/dashboard/QuickActionsBar";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { household } = useHousehold();

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
          Dashboard
          {household && (
            <span className="text-slate-400 font-normal text-lg">
              • {household.name}
            </span>
          )}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {greeting()} • {dateStr}
        </p>
      </div>

      {/* Full-width Household Card */}
      <HouseholdSummaryCard />

      {/* Quick Actions */}
      <QuickActionsBar />

      {/* Two independent columns — each stacks its own content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left column */}
        <div className="space-y-5">
          <TodaySection />
          <InsightPreviewCard />
        </div>
        {/* Right column */}
        <div className="space-y-5">
          <ActivityFeed />
          <LowStockWidget />
        </div>
      </div>
    </div>
  );
}
