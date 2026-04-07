import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { assertHouseholdMember } from "./_utils";
import { Id } from "./_generated/dataModel";

export const getInsightsForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    return await ctx.db
      .query("insights")
      .withIndex("by_household_generatedAt", (q) =>
        q.eq("householdId", args.householdId)
      )
      .order("desc")
      .take(20);
  },
});

export const getLatestInsight = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    return await ctx.db
      .query("insights")
      .withIndex("by_household_generatedAt", (q) =>
        q.eq("householdId", args.householdId)
      )
      .order("desc")
      .first();
  },
});

export const markInsightRead = mutation({
  args: { insightId: v.id("insights") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.insightId, { isRead: true });
  },
});

export const storeInsight = mutation({
  args: {
    householdId: v.id("households"),
    type: v.union(
      v.literal("grocery_forecast"),
      v.literal("chore_pattern"),
      v.literal("spending_summary"),
      v.literal("habit_observation"),
      v.literal("low_stock"),
      v.literal("bill_alert"),
      v.literal("chore_imbalance"),
      v.literal("general")
    ),
    title: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("insights", {
      ...args,
      isRead: false,
      generatedAt: Date.now(),
    });
  },
});

export const generateInsights = action({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Gather household data
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const [completedChores, overdueBills, lowStockItems, recentGroceries] =
      await Promise.all([
        ctx.runQuery(api.choreAssignments.getCompletedForHousehold, {
          householdId: args.householdId,
        }),
        ctx.runQuery(api.bills.getDueSoonForHousehold, {
          householdId: args.householdId,
          days: 0,
        }),
        ctx.runQuery(api.inventory.getLowStockItems, {
          householdId: args.householdId,
        }),
        ctx.runQuery(api.groceries.getItemsByStatus, {
          householdId: args.householdId,
          status: "bought",
        }),
      ]);

    const workload = await ctx.runQuery(api.choreAssignments.getWorkloadSummary, {
      householdId: args.householdId,
    });

    // Build summary for Claude
    const choresSummary = `${completedChores.length} chores completed in the past 30 days.`;
    const workloadSummary = workload
      .map((w) => `${w.name}: ${w.completedCount} chores (${w.totalMinutes} mins)`)
      .join(", ");
    const overdueBillsSummary =
      overdueBills.length > 0
        ? `${overdueBills.length} overdue bills: ${overdueBills.map((b) => `${b.title} ($${b.totalAmount})`).join(", ")}`
        : "No overdue bills";
    const lowStockSummary =
      lowStockItems.length > 0
        ? lowStockItems.map((i) => i.name).join(", ")
        : "No low stock items";
    const groceriesSummary = `${recentGroceries.length} items purchased recently.`;

    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let generatedInsights: Array<{
      type: string;
      title: string;
      description: string;
      priority: "low" | "medium" | "high";
    }> = [];

    if (anthropicKey) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1500,
            messages: [
              {
                role: "user",
                content: `You are an AI co-pilot for a shared apartment. Analyze this household's data and generate 4-5 helpful, practical insights.

Household data (last 30 days):
- Chores: ${choresSummary}
- Member workload: ${workloadSummary}
- Bills: ${overdueBillsSummary}
- Low stock items: ${lowStockSummary}
- Recent grocery purchases: ${groceriesSummary}

Generate insights that are helpful, neutral, and conversational — like a supportive roommate assistant.

Return ONLY a JSON array with no markdown or other text:
[{
  "type": "grocery_forecast|chore_pattern|spending_summary|habit_observation|chore_imbalance|low_stock|bill_alert|general",
  "title": "short title (max 8 words)",
  "description": "2-3 sentence actionable description that feels helpful and friendly, not robotic",
  "priority": "low|medium|high"
}]`,
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json() as { content: Array<{ type: string; text: string }> };
          const text = data.content[0]?.text ?? "[]";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            generatedInsights = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.error("Claude API failed, using rule-based fallback:", e);
      }
    }

    // Rule-based fallback if no AI insights
    if (generatedInsights.length === 0) {
      generatedInsights = generateRuleBasedInsights({
        completedChoresCount: completedChores.length,
        overdueBillsCount: overdueBills.length,
        lowStockCount: lowStockItems.length,
        workload,
        overdueBills,
        lowStockItems,
      });
    }

    // Validate types before storing
    const validTypes = [
      "grocery_forecast", "chore_pattern", "spending_summary",
      "habit_observation", "low_stock", "bill_alert", "chore_imbalance", "general"
    ];
    const validPriorities = ["low", "medium", "high"];

    // Store insights
    const insightIds = [];
    for (const insight of generatedInsights) {
      const type = validTypes.includes(insight.type) ? insight.type : "general";
      const priority = validPriorities.includes(insight.priority) ? insight.priority : "medium";

      const id = await ctx.runMutation(api.insights.storeInsight, {
        householdId: args.householdId,
        type: type as "grocery_forecast" | "chore_pattern" | "spending_summary" | "habit_observation" | "low_stock" | "bill_alert" | "chore_imbalance" | "general",
        title: insight.title,
        description: insight.description,
        priority: priority as "low" | "medium" | "high",
      });
      insightIds.push(id);
    }

    return { count: insightIds.length };
  },
});

function generateRuleBasedInsights(data: {
  completedChoresCount: number;
  overdueBillsCount: number;
  lowStockCount: number;
  workload: Array<{ name: string; completedCount: number; totalMinutes: number }>;
  overdueBills: Array<{ title: string; totalAmount: number }>;
  lowStockItems: Array<{ name: string }>;
}) {
  const insights = [];

  if (data.overdueBillsCount > 0) {
    const billNames = data.overdueBills.slice(0, 3).map((b) => b.title).join(", ");
    insights.push({
      type: "bill_alert",
      title: `${data.overdueBillsCount} bill${data.overdueBillsCount > 1 ? "s" : ""} need attention`,
      description: `You have ${data.overdueBillsCount} unpaid bill${data.overdueBillsCount > 1 ? "s" : ""}: ${billNames}. Taking care of these now prevents late fees and keeps your household finances on track.`,
      priority: "high" as const,
    });
  }

  if (data.lowStockCount > 0) {
    const items = data.lowStockItems.slice(0, 4).map((i) => i.name).join(", ");
    insights.push({
      type: "low_stock",
      title: `${data.lowStockCount} item${data.lowStockCount > 1 ? "s" : ""} running low`,
      description: `${items} ${data.lowStockCount === 1 ? "is" : "are"} below your low-stock threshold. Consider adding ${data.lowStockCount === 1 ? "it" : "them"} to your grocery list before you run out.`,
      priority: "medium" as const,
    });
  }

  if (data.workload.length > 1) {
    const sorted = [...data.workload].sort((a, b) => b.completedCount - a.completedCount);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    if (top.completedCount > 0 && bottom.completedCount < top.completedCount / 2) {
      insights.push({
        type: "chore_imbalance",
        title: "Chore distribution looks uneven",
        description: `${top.name} has completed ${top.completedCount} chores this month while ${bottom.name} has done ${bottom.completedCount}. Consider using the rotation tool to balance the workload more fairly.`,
        priority: "medium" as const,
      });
    }
  }

  if (data.completedChoresCount > 0) {
    insights.push({
      type: "chore_pattern",
      title: "Household is staying on top of chores",
      description: `Your household completed ${data.completedChoresCount} chore${data.completedChoresCount !== 1 ? "s" : ""} in the past 30 days. Keep up the great work — consistent routines make shared living much easier.`,
      priority: "low" as const,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "general",
      title: "Your household is off to a good start",
      description: "Start adding chores, grocery items, and bills to get personalized insights about your household's habits and patterns. The more data you add, the smarter NARLA gets.",
      priority: "low" as const,
    });
  }

  return insights;
}
