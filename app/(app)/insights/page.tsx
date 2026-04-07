"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Sparkles, RefreshCw, TrendingUp, ShoppingCart, CheckSquare,
  DollarSign, Lightbulb, AlertCircle, BarChart2,
} from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { formatRelativeTime } from "@/lib/utils";
import { useMutation } from "convex/react";
import { useState } from "react";

const typeConfig: Record<string, { icon: typeof Sparkles; color: string; label: string }> = {
  grocery_forecast: { icon: ShoppingCart, color: "text-amber-600 bg-amber-50", label: "Grocery" },
  chore_pattern: { icon: CheckSquare, color: "text-indigo-600 bg-indigo-50", label: "Chores" },
  spending_summary: { icon: DollarSign, color: "text-emerald-600 bg-emerald-50", label: "Spending" },
  habit_observation: { icon: TrendingUp, color: "text-blue-600 bg-blue-50", label: "Habits" },
  low_stock: { icon: AlertCircle, color: "text-orange-600 bg-orange-50", label: "Low Stock" },
  bill_alert: { icon: AlertCircle, color: "text-red-600 bg-red-50", label: "Bills" },
  chore_imbalance: { icon: BarChart2, color: "text-purple-600 bg-purple-50", label: "Fairness" },
  general: { icon: Lightbulb, color: "text-slate-600 bg-slate-100", label: "General" },
};

const priorityVariant: Record<string, "danger" | "warning" | "info"> = {
  high: "danger",
  medium: "warning",
  low: "info",
};

export default function InsightsPage() {
  const { householdId } = useHousehold();
  const { success, error } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [insightsTab, setInsightsTab] = useState<"unread" | "read">("unread");

  const insights = useQuery(
    api.insights.getInsightsForHousehold,
    householdId ? { householdId } : "skip"
  );
  const markRead = useMutation(api.insights.markInsightRead);
  const generateInsights = useAction(api.insights.generateInsights);

  const handleGenerate = async () => {
    if (!householdId) return;
    setIsGenerating(true);
    try {
      const result = await generateInsights({ householdId });
      success(`Generated ${result.count} new insights!`);
    } catch (e) {
      error(`Could not generate insights: ${String(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const unreadInsights = insights?.filter(i => !i.isRead) ?? [];
  const readInsights = insights?.filter(i => i.isRead) ?? [];

  const lastGenerated = insights?.[0]?.generatedAt;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            AI-powered observations about your household.
          </p>
        </div>
        <div className="text-right">
          <Button
            icon={RefreshCw}
            isLoading={isGenerating}
            onClick={handleGenerate}
            variant="primary"
            size="sm"
          >
            {isGenerating ? "Generating..." : "Generate Insights"}
          </Button>
          {lastGenerated && (
            <p className="text-xs text-slate-400 mt-1">
              Last updated {formatRelativeTime(lastGenerated)}
            </p>
          )}
        </div>
      </div>

      {/* Intro banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-indigo-900 mb-1">AI Household Assistant</h2>
          <p className="text-sm text-indigo-700">
            NARLA analyzes your household data — chores, spending, inventory, and grocery patterns
            — to surface helpful observations and recommendations. Click &quot;Generate Insights&quot; to get started.
          </p>
        </div>
      </div>

      {/* Insights tabs + grid */}
      {insights === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No insights yet"
          description="Click 'Generate Insights' to let NARLA analyze your household data and surface helpful recommendations."
          actionLabel="Generate Insights"
          onAction={handleGenerate}
        />
      ) : (
        <>
          {/* Tab pills */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setInsightsTab("unread")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                insightsTab === "unread"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Unread
              {unreadInsights.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold bg-indigo-600 text-white rounded-full">
                  {unreadInsights.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setInsightsTab("read")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                insightsTab === "read"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Read
            </button>
          </div>

          {/* Filtered list */}
          {insightsTab === "unread" ? (
            unreadInsights.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No unread insights"
                description="You've read all your insights. Generate new ones or check the Read tab."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unreadInsights.map((insight) => {
                  const config = typeConfig[insight.type] ?? typeConfig.general;
                  const Icon = config.icon;
                  return (
                    <div
                      key={insight._id}
                      className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-indigo-400 p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-slate-500">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={priorityVariant[insight.priority] ?? "info"} size="sm">
                            {insight.priority}
                          </Badge>
                          <button
                            onClick={() => markRead({ insightId: insight._id })}
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                            title="Mark as read"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">{insight.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{insight.description}</p>
                      <p className="text-xs text-slate-400 mt-3">
                        {formatRelativeTime(insight.generatedAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            readInsights.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No read insights"
                description="Insights you've dismissed will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {readInsights.map((insight) => {
                  const config = typeConfig[insight.type] ?? typeConfig.general;
                  const Icon = config.icon;
                  return (
                    <div
                      key={insight._id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-slate-500">{config.label}</span>
                        </div>
                        <Badge variant={priorityVariant[insight.priority] ?? "info"} size="sm">
                          {insight.priority}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">{insight.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{insight.description}</p>
                      <p className="text-xs text-slate-400 mt-3">
                        {formatRelativeTime(insight.generatedAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
