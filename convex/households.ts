import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, assertHouseholdMember, assertHouseholdOwner } from "./_utils";

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createHousehold = mutation({
  args: {
    name: v.string(),
    nickName: v.optional(v.string()),
    memberCount: v.optional(v.number()),
    monthlyBudget: v.optional(v.number()),
    preferences: v.optional(
      v.object({
        cleaningFrequency: v.optional(
          v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("biweekly"),
            v.literal("monthly")
          )
        ),
        dietaryPreferences: v.optional(v.array(v.string())),
        shoppingStyle: v.optional(
          v.union(v.literal("bulk"), v.literal("as-needed"), v.literal("mixed"))
        ),
        reminderStyle: v.optional(
          v.union(
            v.literal("aggressive"),
            v.literal("gentle"),
            v.literal("minimal")
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Generate a unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("households")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
        .unique();
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    const householdId = await ctx.db.insert("households", {
      name: args.name,
      nickName: args.nickName,
      inviteCode,
      ownerId: user._id,
      memberCount: 1,
      monthlyBudget: args.monthlyBudget,
      preferences: args.preferences,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Auto-assign creator as owner
    await ctx.db.insert("householdMembers", {
      householdId,
      userId: user._id,
      role: "owner",
      joinedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      householdId,
      userId: user._id,
      action: "created",
      entityType: "household",
      description: `${user.name} created the household "${args.name}"`,
      createdAt: Date.now(),
    });

    return { householdId, inviteCode };
  },
});

export const joinHousehold = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const code = args.inviteCode.trim().toUpperCase();

    const household = await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .unique();

    if (!household) {
      throw new Error("Invalid invite code. Please check and try again.");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_user", (q) =>
        q.eq("householdId", household._id).eq("userId", user._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("You are already a member of this household.");
    }

    await ctx.db.insert("householdMembers", {
      householdId: household._id,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
    });

    await ctx.db.patch(household._id, {
      memberCount: household.memberCount + 1,
      updatedAt: Date.now(),
    });

    // Notify existing members
    await ctx.db.insert("notifications", {
      householdId: household._id,
      type: "member_joined",
      title: "New member joined!",
      message: `${user.name} has joined ${household.name}.`,
      isRead: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      householdId: household._id,
      userId: user._id,
      action: "joined",
      entityType: "member",
      description: `${user.name} joined the household`,
      createdAt: Date.now(),
    });

    return household._id;
  },
});

export const getHouseholdForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!membership) return null;

    return await ctx.db.get(membership.householdId);
  },
});

export const getHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    return await ctx.db.get(args.householdId);
  },
});

export const getHouseholdMembers = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      })
    );
    return members.filter((m) => m.user !== null);
  },
});

export const updateHouseholdPreferences = mutation({
  args: {
    householdId: v.id("households"),
    name: v.optional(v.string()),
    nickName: v.optional(v.string()),
    monthlyBudget: v.optional(v.number()),
    preferences: v.optional(
      v.object({
        cleaningFrequency: v.optional(
          v.union(
            v.literal("daily"),
            v.literal("weekly"),
            v.literal("biweekly"),
            v.literal("monthly")
          )
        ),
        dietaryPreferences: v.optional(v.array(v.string())),
        shoppingStyle: v.optional(
          v.union(v.literal("bulk"), v.literal("as-needed"), v.literal("mixed"))
        ),
        reminderStyle: v.optional(
          v.union(
            v.literal("aggressive"),
            v.literal("gentle"),
            v.literal("minimal")
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertHouseholdOwner(ctx, args.householdId);
    const { householdId, ...updates } = args;
    await ctx.db.patch(householdId, { ...updates, updatedAt: Date.now() });
  },
});

export const generateNewInviteCode = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdOwner(ctx, args.householdId);
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("households")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
        .unique();
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }
    await ctx.db.patch(args.householdId, { inviteCode, updatedAt: Date.now() });
    return inviteCode;
  },
});

export const removeMember = mutation({
  args: {
    householdId: v.id("households"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertHouseholdOwner(ctx, args.householdId);

    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) throw new Error("Member not found.");
    if (membership.role === "owner") throw new Error("Cannot remove the owner.");

    await ctx.db.delete(membership._id);

    const household = await ctx.db.get(args.householdId);
    if (household) {
      await ctx.db.patch(args.householdId, {
        memberCount: Math.max(1, household.memberCount - 1),
        updatedAt: Date.now(),
      });
    }

    const user = await ctx.db.get(args.userId);
    await ctx.db.insert("activityLog", {
      householdId: args.householdId,
      userId: args.userId,
      action: "removed",
      entityType: "member",
      description: `${user?.name ?? "A member"} was removed from the household`,
      createdAt: Date.now(),
    });
  },
});
