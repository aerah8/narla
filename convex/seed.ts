import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seeds demo data for presentation/testing purposes.
 * Creates a full demo household "The Loft" with realistic data.
 *
 * Call this from the Convex dashboard or a temporary dev page.
 * WARNING: This creates data in your Convex database — only use for demo/dev environments.
 */
export const seedDemoData = mutation({
  args: {
    ownerClerkId: v.string(), // The Clerk ID of the user who should own the household
  },
  handler: async (ctx, args) => {
    // Find or validate owner user
    const owner = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.ownerClerkId))
      .unique();
    if (!owner) throw new Error("Owner user not found. Sign in first.");

    // Check if demo household already exists
    const existing = await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", "DEMO1234"))
      .unique();
    if (existing) throw new Error("Demo household already exists.");

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Create demo household
    const householdId = await ctx.db.insert("households", {
      name: "The Loft",
      nickName: "Our Place",
      inviteCode: "DEMO1234",
      ownerId: owner._id,
      memberCount: 1,
      monthlyBudget: 2400,
      preferences: {
        cleaningFrequency: "weekly",
        dietaryPreferences: ["vegetarian"],
        shoppingStyle: "as-needed",
        reminderStyle: "gentle",
      },
      createdAt: now - 30 * DAY,
      updatedAt: now,
    });

    // Add owner as member
    await ctx.db.insert("householdMembers", {
      householdId,
      userId: owner._id,
      role: "owner",
      joinedAt: now - 30 * DAY,
    });

    // Create demo chores
    const choreData = [
      { name: "Vacuum Living Room", frequency: "weekly" as const, estimatedMinutes: 20, points: 15 },
      { name: "Clean Bathroom", frequency: "weekly" as const, estimatedMinutes: 30, points: 20 },
      { name: "Take Out Trash", frequency: "weekly" as const, estimatedMinutes: 10, points: 10 },
      { name: "Wash Dishes", frequency: "daily" as const, estimatedMinutes: 15, points: 8 },
      { name: "Mop Kitchen Floor", frequency: "biweekly" as const, estimatedMinutes: 25, points: 18 },
      { name: "Clean Fridge", frequency: "monthly" as const, estimatedMinutes: 40, points: 25 },
      { name: "Wipe Countertops", frequency: "daily" as const, estimatedMinutes: 5, points: 5 },
      { name: "Laundry Common Areas", frequency: "weekly" as const, estimatedMinutes: 60, points: 20 },
    ];

    for (let i = 0; i < choreData.length; i++) {
      const c = choreData[i];
      const choreId = await ctx.db.insert("chores", {
        householdId,
        name: c.name,
        frequency: c.frequency,
        estimatedMinutes: c.estimatedMinutes,
        points: c.points,
        isActive: true,
        createdBy: owner._id,
        createdAt: now - 25 * DAY,
        updatedAt: now,
      });

      // Mix of statuses
      if (i < 3) {
        // Completed recently
        await ctx.db.insert("choreAssignments", {
          choreId,
          householdId,
          assignedTo: owner._id,
          dueDate: now - 2 * DAY,
          status: "completed",
          completedAt: now - 1 * DAY,
          completedBy: owner._id,
          createdAt: now - 7 * DAY,
        });
        // Create next assignment
        await ctx.db.insert("choreAssignments", {
          choreId,
          householdId,
          assignedTo: owner._id,
          dueDate: now + 5 * DAY,
          status: "pending",
          createdAt: now - 1 * DAY,
        });
      } else if (i < 5) {
        // Overdue
        await ctx.db.insert("choreAssignments", {
          choreId,
          householdId,
          assignedTo: owner._id,
          dueDate: now - 3 * DAY,
          status: "pending",
          createdAt: now - 10 * DAY,
        });
      } else {
        // Upcoming
        await ctx.db.insert("choreAssignments", {
          choreId,
          householdId,
          assignedTo: owner._id,
          dueDate: now + (i * 3) * DAY,
          status: "pending",
          createdAt: now - 5 * DAY,
        });
      }
    }

    // Create demo bills
    const billsData = [
      { title: "Monthly Rent", category: "rent" as const, totalAmount: 1800, daysOffset: 5, status: "unpaid" as const },
      { title: "Electric Bill", category: "utilities" as const, totalAmount: 87.50, daysOffset: -2, status: "paid" as const },
      { title: "Internet", category: "internet" as const, totalAmount: 60, daysOffset: 10, status: "unpaid" as const },
      { title: "Spotify Family", category: "subscriptions" as const, totalAmount: 16.99, daysOffset: 15, status: "partial" as const },
      { title: "Cleaning Supplies Run", category: "cleaning" as const, totalAmount: 45, daysOffset: -10, status: "paid" as const },
    ];

    for (const b of billsData) {
      const billId = await ctx.db.insert("bills", {
        householdId,
        title: b.title,
        category: b.category,
        totalAmount: b.totalAmount,
        dueDate: now + b.daysOffset * DAY,
        createdBy: owner._id,
        paidBy: b.status === "paid" ? owner._id : undefined,
        splitType: "equal",
        status: b.status,
        createdAt: now - 7 * DAY,
        updatedAt: now,
      });

      await ctx.db.insert("billShares", {
        billId,
        memberId: owner._id,
        amountOwed: b.totalAmount,
        amountPaid: b.status === "paid" ? b.totalAmount : b.status === "partial" ? b.totalAmount * 0.5 : 0,
        paymentStatus: b.status,
        paidAt: b.status === "paid" ? now - 5 * DAY : undefined,
      });
    }

    // Create demo grocery items
    const groceryItems = [
      { name: "Milk", category: "dairy" as const, quantity: 1, unit: "gallon", status: "needed" as const, priority: "high" as const },
      { name: "Eggs", category: "dairy" as const, quantity: 12, unit: "count", status: "needed" as const, priority: "high" as const },
      { name: "Bread", category: "pantry" as const, quantity: 1, unit: "loaf", status: "bought" as const, priority: "medium" as const },
      { name: "Bananas", category: "produce" as const, quantity: 1, unit: "bunch", status: "needed" as const, priority: "medium" as const },
      { name: "Chicken Breast", category: "meat" as const, quantity: 2, unit: "lb", status: "needed" as const, priority: "medium" as const },
      { name: "Pasta", category: "pantry" as const, quantity: 2, unit: "boxes", status: "bought" as const, priority: "low" as const },
      { name: "Olive Oil", category: "pantry" as const, quantity: 1, unit: "bottle", status: "needed" as const, priority: "low" as const },
      { name: "Dish Soap", category: "household" as const, quantity: 1, unit: "bottle", status: "needed" as const, priority: "high" as const },
      { name: "Paper Towels", category: "household" as const, quantity: 2, unit: "rolls", status: "bought" as const, priority: "medium" as const },
      { name: "Orange Juice", category: "beverages" as const, quantity: 1, unit: "carton", status: "needed" as const, priority: "low" as const },
    ];

    for (const g of groceryItems) {
      await ctx.db.insert("groceryItems", {
        householdId,
        name: g.name,
        category: g.category,
        quantity: g.quantity,
        unit: g.unit,
        priority: g.priority,
        status: g.status,
        addedBy: owner._id,
        purchasedBy: g.status === "bought" ? owner._id : undefined,
        createdAt: now - 3 * DAY,
        updatedAt: now,
      });
    }

    // Create demo inventory items
    const inventoryData = [
      { name: "Rice", category: "pantry" as const, quantity: 2, unit: "kg", lowStockThreshold: 1, expiresInDays: null },
      { name: "Coffee", category: "pantry" as const, quantity: 0.2, unit: "kg", lowStockThreshold: 0.5, expiresInDays: null },
      { name: "Shampoo", category: "bathroom" as const, quantity: 1, unit: "bottle", lowStockThreshold: 1, expiresInDays: null },
      { name: "Toilet Paper", category: "bathroom" as const, quantity: 3, unit: "rolls", lowStockThreshold: 4, expiresInDays: null },
      { name: "Laundry Detergent", category: "laundry" as const, quantity: 0.8, unit: "kg", lowStockThreshold: 1, expiresInDays: null },
      { name: "Leftover Pasta", category: "fridge" as const, quantity: 1, unit: "container", lowStockThreshold: null, expiresInDays: 3 },
      { name: "Yogurt", category: "fridge" as const, quantity: 2, unit: "cups", lowStockThreshold: null, expiresInDays: 5 },
      { name: "Frozen Peas", category: "freezer" as const, quantity: 1, unit: "bag", lowStockThreshold: null, expiresInDays: null },
      { name: "All-Purpose Cleaner", category: "cleaning" as const, quantity: 1, unit: "bottle", lowStockThreshold: 1, expiresInDays: null },
      { name: "Olive Oil", category: "pantry" as const, quantity: 0.3, unit: "L", lowStockThreshold: 0.5, expiresInDays: null },
    ];

    for (const inv of inventoryData) {
      await ctx.db.insert("inventoryItems", {
        householdId,
        name: inv.name,
        category: inv.category,
        quantity: inv.quantity,
        unit: inv.unit,
        lowStockThreshold: inv.lowStockThreshold ?? undefined,
        expirationDate: inv.expiresInDays ? now + inv.expiresInDays * DAY : undefined,
        updatedBy: owner._id,
        createdAt: now - 7 * DAY,
        updatedAt: now,
      });
    }

    // Create demo insights
    const insightData = [
      {
        type: "chore_pattern" as const,
        title: "Vacuum and trash are done on time",
        description: "Your household has been consistent about vacuuming and taking out the trash every week. These are your most reliable chores — great teamwork!",
        priority: "low" as const,
      },
      {
        type: "low_stock" as const,
        title: "Coffee and olive oil are running low",
        description: "Based on your current inventory, coffee and olive oil are below your set thresholds. They've been added to your suggested grocery items.",
        priority: "medium" as const,
      },
      {
        type: "bill_alert" as const,
        title: "Rent is due in 5 days",
        description: "Your monthly rent of $1,800 is coming up soon. Make sure everyone has their share ready to avoid any delays.",
        priority: "high" as const,
      },
      {
        type: "spending_summary" as const,
        title: "Household spent $124.50 this month",
        description: "You've paid $87.50 for utilities and $45 for cleaning supplies this month. Rent is coming up next, which will be your largest expense.",
        priority: "low" as const,
      },
      {
        type: "grocery_forecast" as const,
        title: "Milk and eggs are frequently restocked",
        description: "Based on your purchase history, milk and eggs are your most frequently bought items. Consider keeping a standing reminder to grab these each week.",
        priority: "low" as const,
      },
    ];

    for (const ins of insightData) {
      await ctx.db.insert("insights", {
        householdId,
        ...ins,
        isRead: false,
        generatedAt: now - Math.floor(Math.random() * 3) * DAY,
      });
    }

    // Create demo activity log
    const activities = [
      { action: "completed", entityType: "chore" as const, description: `${owner.name} completed "Vacuum Living Room"`, daysAgo: 1 },
      { action: "added", entityType: "grocery" as const, description: `${owner.name} added "Milk" to the grocery list`, daysAgo: 1 },
      { action: "paid", entityType: "bill" as const, description: `${owner.name} paid bill "Electric Bill" ($87.50)`, daysAgo: 5 },
      { action: "created", entityType: "household" as const, description: `${owner.name} created the household "The Loft"`, daysAgo: 30 },
      { action: "completed", entityType: "chore" as const, description: `${owner.name} completed "Take Out Trash"`, daysAgo: 2 },
      { action: "added", entityType: "inventory" as const, description: `${owner.name} added "Coffee" to inventory`, daysAgo: 7 },
      { action: "bought", entityType: "grocery" as const, description: `${owner.name} bought "Bread"`, daysAgo: 2 },
      { action: "created", entityType: "bill" as const, description: `${owner.name} added bill "Monthly Rent" ($1800)`, daysAgo: 3 },
    ];

    for (const a of activities) {
      await ctx.db.insert("activityLog", {
        householdId,
        userId: owner._id,
        action: a.action,
        entityType: a.entityType,
        description: a.description,
        createdAt: now - a.daysAgo * DAY,
      });
    }

    return {
      householdId,
      inviteCode: "DEMO1234",
      message: "Demo data created successfully! The Loft is ready.",
    };
  },
});
