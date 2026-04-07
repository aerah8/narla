import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdMember } from "./_utils";

export const getRecentActivity = query({
  args: {
    householdId: v.id("households"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();
    const clearedAt = membership?.activityClearedAt ?? 0;

    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .order("desc")
      .filter((q) => q.gt(q.field("createdAt"), clearedAt))
      .take(args.limit ?? 10);

    return await Promise.all(
      activities.map(async (a) => ({
        ...a,
        user: await ctx.db.get(a.userId),
      }))
    );
  },
});

export const getPastActivity = query({
  args: {
    householdId: v.id("households"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();
    const clearedAt = membership?.activityClearedAt;
    if (!clearedAt) return [];

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .order("desc")
      .filter((q) =>
        q.and(
          q.lte(q.field("createdAt"), clearedAt),
          q.gte(q.field("createdAt"), thirtyDaysAgo)
        )
      )
      .take(args.limit ?? 20);

    return await Promise.all(
      activities.map(async (a) => ({
        ...a,
        user: await ctx.db.get(a.userId),
      }))
    );
  },
});

export const clearActivity = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();
    if (!membership) throw new Error("Membership not found");

    await ctx.db.patch(membership._id, { activityClearedAt: Date.now() });
  },
});
