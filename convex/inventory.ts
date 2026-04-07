import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdMember, getCurrentUser } from "./_utils";

export const addItem = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    category: v.union(
      v.literal("pantry"),
      v.literal("fridge"),
      v.literal("freezer"),
      v.literal("bathroom"),
      v.literal("cleaning"),
      v.literal("laundry"),
      v.literal("miscellaneous")
    ),
    quantity: v.number(),
    unit: v.string(),
    lowStockThreshold: v.optional(v.number()),
    expirationDate: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const itemId = await ctx.db.insert("inventoryItems", {
      householdId: args.householdId,
      name: args.name,
      category: args.category,
      quantity: args.quantity,
      unit: args.unit,
      lowStockThreshold: args.lowStockThreshold,
      expirationDate: args.expirationDate,
      source: args.source,
      updatedBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      householdId: args.householdId,
      userId: user._id,
      action: "added",
      entityType: "inventory",
      entityId: itemId,
      description: `${user.name} added "${args.name}" to inventory`,
      createdAt: Date.now(),
    });

    return itemId;
  },
});

export const useItem = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    amountUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    const { user } = await assertHouseholdMember(ctx, item.householdId);

    const amountUsed = args.amountUsed ?? 1;
    const newQuantity = Math.max(0, item.quantity - amountUsed);

    await ctx.db.patch(args.itemId, {
      quantity: newQuantity,
      updatedBy: user._id,
      updatedAt: Date.now(),
    });

    // Create low stock notification if below threshold
    if (item.lowStockThreshold && newQuantity <= item.lowStockThreshold) {
      await ctx.db.insert("notifications", {
        householdId: item.householdId,
        type: "low_stock",
        title: "Low stock alert",
        message: `"${item.name}" is running low (${newQuantity} ${item.unit} remaining).`,
        isRead: false,
        relatedEntityId: args.itemId,
        createdAt: Date.now(),
      });
    }

    await ctx.db.insert("activityLog", {
      householdId: item.householdId,
      userId: user._id,
      action: "used",
      entityType: "inventory",
      entityId: args.itemId,
      description: `${user.name} used ${amountUsed} ${item.unit} of "${item.name}"`,
      createdAt: Date.now(),
    });
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    lowStockThreshold: v.optional(v.number()),
    expirationDate: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    const { user } = await assertHouseholdMember(ctx, item.householdId);

    const { itemId, ...updates } = args;
    await ctx.db.patch(itemId, {
      ...updates,
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("inventoryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    await assertHouseholdMember(ctx, item.householdId);
    await ctx.db.delete(args.itemId);
  },
});

export const incrementItem = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    quantity: v.number(),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    // Find existing item by name (case-insensitive)
    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    const existing = items.find(
      (i) => i.name.toLowerCase() === args.name.toLowerCase()
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
    }
    // If no existing item, we don't auto-create — only manual inventory additions
  },
});

export const addOrIncrementItem = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    quantity: v.number(),
    unit: v.string(),
    category: v.union(
      v.literal("pantry"), v.literal("fridge"), v.literal("freezer"),
      v.literal("bathroom"), v.literal("cleaning"), v.literal("laundry"),
      v.literal("miscellaneous")
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    const existing = items.find((i) => i.name.toLowerCase() === args.name.toLowerCase());

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("inventoryItems", {
        householdId: args.householdId,
        name: args.name,
        category: args.category,
        quantity: args.quantity,
        unit: args.unit,
        updatedBy: user._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getLowStockItems = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    return items.filter(
      (i) => i.lowStockThreshold != null && i.quantity <= i.lowStockThreshold
    );
  },
});

export const getExpiringItems = query({
  args: { householdId: v.id("households"), withinDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const days = args.withinDays ?? 7;
    const threshold = Date.now() + days * 24 * 60 * 60 * 1000;

    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();

    return items.filter(
      (i) => i.expirationDate != null && i.expirationDate <= threshold
    );
  },
});

export const getItemsByCategory = query({
  args: {
    householdId: v.id("households"),
    category: v.optional(
      v.union(
        v.literal("pantry"),
        v.literal("fridge"),
        v.literal("freezer"),
        v.literal("bathroom"),
        v.literal("cleaning"),
        v.literal("laundry"),
        v.literal("miscellaneous")
      )
    ),
  },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);

    if (args.category) {
      return await ctx.db
        .query("inventoryItems")
        .withIndex("by_household_category", (q) =>
          q.eq("householdId", args.householdId).eq("category", args.category!)
        )
        .collect();
    }

    return await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .collect();
  },
});
