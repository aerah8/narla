import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdMember, getCurrentUser } from "./_utils";

export const markComplete = mutation({
  args: {
    assignmentId: v.id("choreAssignments"),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(
      ctx,
      (await ctx.db.get(args.assignmentId))!.householdId
    );

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.status === "completed") throw new Error("Already completed");

    await ctx.db.patch(args.assignmentId, {
      status: "completed",
      completedAt: Date.now(),
      completedBy: user._id,
    });

    const chore = await ctx.db.get(assignment.choreId);
    if (!chore) return;

    if (chore.frequency === "one-time") {
      // One-time chores are deactivated after completion
      await ctx.db.patch(chore._id, { isActive: false, updatedAt: Date.now() });
    } else {
      const nextDue = getNextDueDate(chore.frequency);
      await ctx.db.insert("choreAssignments", {
        choreId: chore._id,
        householdId: chore.householdId,
        assignedTo: assignment.assignedTo,
        dueDate: nextDue,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    await ctx.db.insert("activityLog", {
      householdId: chore.householdId,
      userId: user._id,
      action: "completed",
      entityType: "chore",
      entityId: chore._id,
      description: `${user.name} completed "${chore.name}"`,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      householdId: chore.householdId,
      type: "chore_completed",
      title: "Chore completed!",
      message: `${user.name} completed "${chore.name}"`,
      isRead: false,
      relatedEntityId: chore._id,
      createdAt: Date.now(),
    });
  },
});

export const getDueTodayForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const assignments = await ctx.db
      .query("choreAssignments")
      .withIndex("by_household_dueDate", (q) =>
        q.eq("householdId", args.householdId)
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("dueDate"), today.getTime()),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    return await Promise.all(
      assignments.map(async (a) => {
        const chore = await ctx.db.get(a.choreId);
        const assignedUser = await ctx.db.get(a.assignedTo);
        return { ...a, chore, assignedUser };
      })
    );
  },
});

export const getOverdueForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const assignments = await ctx.db
      .query("choreAssignments")
      .withIndex("by_household_status", (q) =>
        q.eq("householdId", args.householdId).eq("status", "pending")
      )
      .filter((q) => q.lt(q.field("dueDate"), yesterday.getTime()))
      .collect();

    return await Promise.all(
      assignments.map(async (a) => {
        const chore = await ctx.db.get(a.choreId);
        const assignedUser = await ctx.db.get(a.assignedTo);
        return { ...a, chore, assignedUser };
      })
    );
  },
});

export const getCompletedForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const assignments = await ctx.db
      .query("choreAssignments")
      .withIndex("by_household_status", (q) =>
        q.eq("householdId", args.householdId).eq("status", "completed")
      )
      .order("desc")
      .take(50);

    return await Promise.all(
      assignments.map(async (a) => {
        const chore = await ctx.db.get(a.choreId);
        const assignedUser = await ctx.db.get(a.assignedTo);
        const completedByUser = a.completedBy ? await ctx.db.get(a.completedBy) : null;
        return { ...a, chore, assignedUser, completedByUser };
      })
    );
  },
});

export const getWorkloadSummary = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const completed = await ctx.db
      .query("choreAssignments")
      .withIndex("by_household_status", (q) =>
        q.eq("householdId", args.householdId).eq("status", "completed")
      )
      .filter((q) => q.gte(q.field("completedAt"), thirtyDaysAgo))
      .collect();

    const members = await ctx.db
      .query("householdMembers")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    const workload = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        const memberChores = completed.filter((a) => a.assignedTo === m.userId);
        const totalMinutes = await Promise.all(
          memberChores.map(async (a) => {
            const chore = await ctx.db.get(a.choreId);
            return chore?.estimatedMinutes ?? 0;
          })
        );
        return {
          userId: m.userId,
          name: user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl,
          completedCount: memberChores.length,
          totalMinutes: totalMinutes.reduce((a, b) => a + b, 0),
        };
      })
    );

    return workload;
  },
});

function getNextDueDate(frequency: string): number {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  switch (frequency) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    default: d.setDate(d.getDate() + 7);
  }
  return d.getTime();
}
