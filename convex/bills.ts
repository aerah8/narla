import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdMember, getCurrentUser } from "./_utils";

export const createBill = mutation({
  args: {
    householdId: v.id("households"),
    title: v.string(),
    category: v.union(
      v.literal("rent"),
      v.literal("utilities"),
      v.literal("internet"),
      v.literal("groceries"),
      v.literal("subscriptions"),
      v.literal("cleaning"),
      v.literal("entertainment"),
      v.literal("other")
    ),
    totalAmount: v.number(),
    dueDate: v.number(),
    splitType: v.union(
      v.literal("equal"),
      v.literal("custom"),
      v.literal("percentage")
    ),
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    // For custom splits: [{memberId, amount}]
    customSplits: v.optional(
      v.array(v.object({ memberId: v.id("users"), amount: v.number() }))
    ),
    // For percentage splits: [{memberId, percentage}]
    percentageSplits: v.optional(
      v.array(v.object({ memberId: v.id("users"), percentage: v.number() }))
    ),
    // Members to include (for equal split or to limit who is billed)
    memberIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const billId = await ctx.db.insert("bills", {
      householdId: args.householdId,
      title: args.title,
      category: args.category,
      totalAmount: args.totalAmount,
      dueDate: args.dueDate,
      createdBy: user._id,
      splitType: args.splitType,
      status: "unpaid",
      notes: args.notes,
      isRecurring: args.isRecurring,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Determine members to split among
    let memberIds = args.memberIds;
    if (!memberIds || memberIds.length === 0) {
      const memberships = await ctx.db
        .query("householdMembers")
        .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
        .collect();
      memberIds = memberships.map((m) => m.userId);
    }

    // Create bill shares based on split type
    if (args.splitType === "equal") {
      const perPerson = args.totalAmount / memberIds.length;
      for (const memberId of memberIds) {
        await ctx.db.insert("billShares", {
          billId,
          memberId,
          amountOwed: Math.round(perPerson * 100) / 100,
          amountPaid: 0,
          paymentStatus: "unpaid",
        });
      }
    } else if (args.splitType === "custom" && args.customSplits) {
      for (const split of args.customSplits) {
        await ctx.db.insert("billShares", {
          billId,
          memberId: split.memberId,
          amountOwed: split.amount,
          amountPaid: 0,
          paymentStatus: "unpaid",
        });
      }
    } else if (args.splitType === "percentage" && args.percentageSplits) {
      for (const split of args.percentageSplits) {
        const amount = (args.totalAmount * split.percentage) / 100;
        await ctx.db.insert("billShares", {
          billId,
          memberId: split.memberId,
          amountOwed: Math.round(amount * 100) / 100,
          amountPaid: 0,
          paymentStatus: "unpaid",
        });
      }
    }

    await ctx.db.insert("activityLog", {
      householdId: args.householdId,
      userId: user._id,
      action: "created",
      entityType: "bill",
      entityId: billId,
      description: `${user.name} added bill "${args.title}" ($${args.totalAmount})`,
      createdAt: Date.now(),
    });

    return billId;
  },
});

export const getBillsWithShares = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .order("desc")
      .collect();

    return await Promise.all(
      bills.map(async (bill) => {
        const shares = await ctx.db
          .query("billShares")
          .withIndex("by_billId", (q) => q.eq("billId", bill._id))
          .collect();

        const sharesWithUsers = await Promise.all(
          shares.map(async (s) => ({
            ...s,
            user: await ctx.db.get(s.memberId),
          }))
        );

        const createdByUser = await ctx.db.get(bill.createdBy);
        return { ...bill, shares: sharesWithUsers, createdByUser };
      })
    );
  },
});

export const getDueSoonForHousehold = query({
  args: { householdId: v.id("households"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const daysAhead = args.days ?? 7;
    const now = Date.now();
    const futureDate = now + daysAhead * 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("bills")
      .withIndex("by_household_dueDate", (q) =>
        q.eq("householdId", args.householdId)
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("dueDate"), futureDate),
          q.neq(q.field("status"), "paid")
        )
      )
      .collect();
  },
});

export const recordPayment = mutation({
  args: {
    billShareId: v.id("billShares"),
    amountPaid: v.number(),
  },
  handler: async (ctx, args) => {
    const share = await ctx.db.get(args.billShareId);
    if (!share) throw new Error("Bill share not found");

    const bill = await ctx.db.get(share.billId);
    if (!bill) throw new Error("Bill not found");

    const { user } = await assertHouseholdMember(ctx, bill.householdId);

    const newAmountPaid = share.amountPaid + args.amountPaid;
    const paymentStatus =
      newAmountPaid >= share.amountOwed
        ? "paid"
        : newAmountPaid > 0
        ? "partial"
        : "unpaid";

    await ctx.db.patch(args.billShareId, {
      amountPaid: newAmountPaid,
      paymentStatus,
      paidAt: paymentStatus === "paid" ? Date.now() : undefined,
    });

    // Check if all shares are paid
    const allShares = await ctx.db
      .query("billShares")
      .withIndex("by_billId", (q) => q.eq("billId", share.billId))
      .collect();

    const allPaid = allShares.every(
      (s) => s._id === args.billShareId ? paymentStatus === "paid" : s.paymentStatus === "paid"
    );
    const anyPaid = allShares.some(
      (s) => s._id === args.billShareId ? newAmountPaid > 0 : s.amountPaid > 0
    );

    await ctx.db.patch(share.billId, {
      status: allPaid ? "paid" : anyPaid ? "partial" : "unpaid",
      paidBy: allPaid ? user._id : undefined,
      updatedAt: Date.now(),
    });

    if (allPaid) {
      await ctx.db.insert("activityLog", {
        householdId: bill.householdId,
        userId: user._id,
        action: "paid",
        entityType: "bill",
        entityId: bill._id,
        description: `${user.name} paid bill "${bill.title}" ($${bill.totalAmount})`,
        createdAt: Date.now(),
      });
    }
  },
});

export const getMonthlySpendingSummary = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;

    const bills = await ctx.db
      .query("bills")
      .withIndex("by_household_status", (q) =>
        q.eq("householdId", args.householdId).eq("status", "paid")
      )
      .filter((q) => q.gte(q.field("createdAt"), sixMonthsAgo))
      .collect();

    // Group by month and category
    const summary: Record<string, Record<string, number>> = {};
    for (const bill of bills) {
      const date = new Date(bill.dueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!summary[monthKey]) summary[monthKey] = {};
      summary[monthKey][bill.category] = (summary[monthKey][bill.category] ?? 0) + bill.totalAmount;
    }

    return Object.entries(summary)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, categories]) => ({ month, ...categories, total: Object.values(categories).reduce((a, b) => a + b, 0) }));
  },
});

export const deleteBill = mutation({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Bill not found");
    await assertHouseholdMember(ctx, bill.householdId);

    const shares = await ctx.db
      .query("billShares")
      .withIndex("by_billId", (q) => q.eq("billId", args.billId))
      .collect();
    for (const share of shares) {
      await ctx.db.delete(share._id);
    }
    await ctx.db.delete(args.billId);
  },
});
