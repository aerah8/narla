import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { assertHouseholdMember, getCurrentUser } from "./_utils";

const GROCERY_TO_INVENTORY_CAT: Record<string, string> = {
  produce: "fridge",
  dairy: "fridge",
  meat: "fridge",
  pantry: "pantry",
  frozen: "freezer",
  beverages: "pantry",
  household: "cleaning",
  personal_care: "bathroom",
  snacks: "pantry",
  other: "miscellaneous",
};

export const addItem = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    category: v.union(
      v.literal("produce"),
      v.literal("dairy"),
      v.literal("meat"),
      v.literal("pantry"),
      v.literal("frozen"),
      v.literal("beverages"),
      v.literal("household"),
      v.literal("personal_care"),
      v.literal("snacks"),
      v.literal("other")
    ),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const itemId = await ctx.db.insert("groceryItems", {
      householdId: args.householdId,
      name: args.name,
      category: args.category,
      quantity: args.quantity,
      unit: args.unit,
      estimatedPrice: args.estimatedPrice,
      priority: args.priority ?? "medium",
      status: "needed",
      addedBy: user._id,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      householdId: args.householdId,
      userId: user._id,
      action: "added",
      entityType: "grocery",
      entityId: itemId,
      description: `${user.name} added "${args.name}" to the grocery list`,
      createdAt: Date.now(),
    });

    return itemId;
  },
});

export const markBought = mutation({
  args: { itemId: v.id("groceryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    const { user } = await assertHouseholdMember(ctx, item.householdId);

    await ctx.db.patch(args.itemId, {
      status: "bought",
      purchasedBy: user._id,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      householdId: item.householdId,
      userId: user._id,
      action: "bought",
      entityType: "grocery",
      entityId: args.itemId,
      description: `${user.name} bought "${item.name}"`,
      createdAt: Date.now(),
    });

    // Sync to inventory: increment if exists, create if not
    const qty = item.quantity ?? 1;
    const unit = item.unit ?? "each";
    const inventoryCat = (GROCERY_TO_INVENTORY_CAT[item.category] ?? "miscellaneous") as
      "pantry" | "fridge" | "freezer" | "bathroom" | "cleaning" | "laundry" | "miscellaneous";

    const inventoryItems = await ctx.db
      .query("inventoryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", item.householdId))
      .collect();
    const match = inventoryItems.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );
    if (match) {
      await ctx.db.patch(match._id, {
        quantity: match.quantity + qty,
        updatedBy: user._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("inventoryItems", {
        householdId: item.householdId,
        name: item.name,
        category: inventoryCat,
        quantity: qty,
        unit,
        updatedBy: user._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const markSkipped = mutation({
  args: { itemId: v.id("groceryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    await assertHouseholdMember(ctx, item.householdId);
    await ctx.db.patch(args.itemId, { status: "skipped", updatedAt: Date.now() });
  },
});

export const markNeeded = mutation({
  args: { itemId: v.id("groceryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    await assertHouseholdMember(ctx, item.householdId);
    await ctx.db.patch(args.itemId, { status: "needed", updatedAt: Date.now() });
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("groceryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    await assertHouseholdMember(ctx, item.householdId);
    await ctx.db.delete(args.itemId);
  },
});

export const getItemsByStatus = query({
  args: {
    householdId: v.id("households"),
    status: v.optional(v.union(v.literal("needed"), v.literal("bought"), v.literal("skipped"))),
  },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);

    let items;
    if (args.status) {
      items = await ctx.db
        .query("groceryItems")
        .withIndex("by_household_status", (q) =>
          q.eq("householdId", args.householdId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    } else {
      items = await ctx.db
        .query("groceryItems")
        .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
        .order("desc")
        .collect();
    }

    return await Promise.all(
      items.map(async (item) => ({
        ...item,
        addedByUser: await ctx.db.get(item.addedBy),
      }))
    );
  },
});

export const getFrequentItems = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await assertHouseholdMember(ctx, args.householdId);
    const bought = await ctx.db
      .query("groceryItems")
      .withIndex("by_household_status", (q) =>
        q.eq("householdId", args.householdId).eq("status", "bought")
      )
      .collect();

    const counts: Record<string, { name: string; category: string; count: number }> = {};
    for (const item of bought) {
      const key = item.name.toLowerCase();
      if (!counts[key]) counts[key] = { name: item.name, category: item.category, count: 0 };
      counts[key].count++;
    }

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },
});

export const bulkAddFromReceipt = mutation({
  args: {
    householdId: v.id("households"),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.optional(v.number()),
        unit: v.optional(v.string()),
        estimatedPrice: v.optional(v.number()),
        category: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await assertHouseholdMember(ctx, args.householdId);

    const validCategories = [
      "produce", "dairy", "meat", "pantry", "frozen",
      "beverages", "household", "personal_care", "snacks", "other"
    ];

    const ids = [];
    for (const item of args.items) {
      const category = validCategories.includes(item.category ?? "")
        ? (item.category as "produce" | "dairy" | "meat" | "pantry" | "frozen" | "beverages" | "household" | "personal_care" | "snacks" | "other")
        : "other";

      const id = await ctx.db.insert("groceryItems", {
        householdId: args.householdId,
        name: item.name,
        category,
        quantity: item.quantity,
        unit: item.unit,
        estimatedPrice: item.estimatedPrice,
        priority: "medium",
        status: "bought",
        addedBy: user._id,
        purchasedBy: user._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      ids.push(id);
    }

    await ctx.db.insert("activityLog", {
      householdId: args.householdId,
      userId: user._id,
      action: "uploaded",
      entityType: "receipt",
      description: `${user.name} uploaded a receipt with ${args.items.length} items`,
      createdAt: Date.now(),
    });

    return ids;
  },
});

export const inferGroceryItem = action({
  args: { name: v.string() },
  handler: async (_ctx, args): Promise<{
    category: string;
    unit: string;
    estimatedPrice: number | null;
  }> => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return { category: "other", unit: "each", estimatedPrice: null };
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          messages: [{
            role: "user",
            content: `For the grocery item "${args.name}", return ONLY a JSON object with no other text:
{"category":"produce|dairy|meat|pantry|frozen|beverages|household|personal_care|snacks|other","unit":"each|lb|oz|kg|g|L|ml|pack|bottle|box|bag|roll|bunch|dozen|gallon","estimatedPrice":number_or_null}
Use typical US grocery store prices. Return null for estimatedPrice if uncertain.`,
          }],
        }),
      });

      if (!response.ok) return { category: "other", unit: "each", estimatedPrice: null };

      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const text = data.content[0]?.text ?? "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { category: "other", unit: "each", estimatedPrice: null };
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category ?? "other",
        unit: parsed.unit ?? "each",
        estimatedPrice: typeof parsed.estimatedPrice === "number" ? parsed.estimatedPrice : null,
      };
    } catch {
      return { category: "other", unit: "each", estimatedPrice: null };
    }
  },
});
