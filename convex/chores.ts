import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdMember, getCurrentUser } from "./_utils";
import { Id } from "./_generated/dataModel";

function getNextDueDate(frequency: string, fromDate: number = Date.now()): number {
  const d = new Date(fromDate);
  d.setHours(23, 59, 59, 0);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    default:
      d.setDate(d.getDate() + 7);
  }
  return d.getTime();
}

export const createChore = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    description: v.optional(v.string()),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("custom"),
      v.literal("one-time")
    ),
    estimatedMinutes: v.optional(v.number()),
    points: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const choreId = await ctx.db.insert("chores", {
      householdId: args.householdId,
      name: args.name,
      description: args.description,
      frequency: args.frequency,
      estimatedMinutes: args.estimatedMinutes,
      points: args.points ?? 10,
      isActive: true,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create initial assignment
    const assignedTo = args.assignedTo ?? user._id;
    const dueDate = args.dueDate ?? (args.frequency === "one-time" ? Date.now() : getNextDueDate(args.frequency, Date.now() - 86400000));

    await ctx.db.insert("choreAssignments", {
      choreId,
      householdId: args.householdId,
      assignedTo,
      dueDate,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      householdId: args.householdId,
      userId: user._id,
      action: "created",
      entityType: "chore",
      entityId: choreId,
      description: `${user.name} created chore "${args.name}"`,
      createdAt: Date.now(),
    });

    return choreId;
  },
});

export const getChoresForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const chores = await ctx.db
      .query("chores")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get pending assignments for each chore
    const choresWithAssignments = await Promise.all(
      chores.map(async (chore) => {
        const assignment = await ctx.db
          .query("choreAssignments")
          .withIndex("by_choreId", (q) => q.eq("choreId", chore._id))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .first();

        let assignedUser = null;
        if (assignment) {
          assignedUser = await ctx.db.get(assignment.assignedTo);
        }

        return { ...chore, currentAssignment: assignment, assignedUser };
      })
    );
    return choresWithAssignments;
  },
});

export const updateChore = mutation({
  args: {
    choreId: v.id("chores"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    frequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("biweekly"),
        v.literal("monthly"),
        v.literal("custom"),
        v.literal("one-time")
      )
    ),
    estimatedMinutes: v.optional(v.number()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const chore = await ctx.db.get(args.choreId);
    if (!chore) throw new Error("Chore not found");
    await assertHouseholdMember(ctx, chore.householdId);
    const { choreId, ...updates } = args;
    await ctx.db.patch(choreId, { ...updates, updatedAt: Date.now() });
  },
});

export const deleteChore = mutation({
  args: { choreId: v.id("chores") },
  handler: async (ctx, args) => {
    const chore = await ctx.db.get(args.choreId);
    if (!chore) throw new Error("Chore not found");
    await assertHouseholdMember(ctx, chore.householdId);
    await ctx.db.patch(args.choreId, { isActive: false, updatedAt: Date.now() });
  },
});

export const rotateAssignments = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);

    const members = await ctx.db
      .query("householdMembers")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) return;

    const pendingAssignments = await ctx.db
      .query("choreAssignments")
      .withIndex("by_household_status", (q) =>
        q.eq("householdId", args.householdId).eq("status", "pending")
      )
      .collect();

    // Round-robin rotate
    for (let i = 0; i < pendingAssignments.length; i++) {
      const assignment = pendingAssignments[i];
      const currentIndex = memberIds.findIndex(
        (id) => id === assignment.assignedTo
      );
      const nextIndex = (currentIndex + 1) % memberIds.length;
      await ctx.db.patch(assignment._id, { assignedTo: memberIds[nextIndex] });
    }
  },
});
