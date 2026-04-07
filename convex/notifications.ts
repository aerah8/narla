import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getNotificationsForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    // Get user-specific notifications
    const userNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);

    return userNotifications;
  },
});

export const getHouseholdNotifications = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .order("desc")
      .take(20);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_isRead", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_isRead", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});
