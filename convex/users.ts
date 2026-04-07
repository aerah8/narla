import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Upserts the current Clerk user into Convex.
 * Call this on every authenticated page load — it's idempotent.
 */
export const upsertUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        avatarUrl: args.avatarUrl,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      notificationPreferences: {
        choreReminders: true,
        billReminders: true,
        lowStockAlerts: true,
        activityUpdates: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const updateNotificationPreferences = mutation({
  args: {
    choreReminders: v.boolean(),
    billReminders: v.boolean(),
    lowStockAlerts: v.boolean(),
    activityUpdates: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      notificationPreferences: args,
      updatedAt: Date.now(),
    });
  },
});
