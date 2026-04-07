"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export function InsightPreviewCard() {
  const { householdId } = useHousehold();
  const insight = useQuery(
    api.insights.getLatestInsight,
    householdId ? { householdId } : "skip"
  );

  if (!insight) return null;

  return (
    <Card className="dark:bg-gradient-to-br dark:from-[#1a1230] dark:to-[#16102a] border-indigo-100 dark:border-purple-500/20 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 dark:text-purple-400" />
          <CardTitle className="text-indigo-700 dark:text-purple-200 text-lg font-bold">AI Insight</CardTitle>
        </div>
      </CardHeader>

      <h4 className="font-bold text-slate-900 mb-2">{insight.title}</h4>
      <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-4">
        {insight.description}
      </p>

      <Link
        href="/insights"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-purple-400 hover:text-indigo-800 dark:hover:text-purple-300 transition-colors"
      >
        View all insights
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </Card>
  );
}
