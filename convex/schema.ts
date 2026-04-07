import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ───────────────────────────────────────────────────────────────
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    notificationPreferences: v.optional(
      v.object({
        choreReminders: v.boolean(),
        billReminders: v.boolean(),
        lowStockAlerts: v.boolean(),
        activityUpdates: v.boolean(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  // ─── Households ──────────────────────────────────────────────────────────
  households: defineTable({
    name: v.string(),
    nickName: v.optional(v.string()),
    inviteCode: v.string(),
    ownerId: v.id("users"),
    memberCount: v.number(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_ownerId", ["ownerId"]),

  // ─── Household Members ───────────────────────────────────────────────────
  householdMembers: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(),
    activityClearedAt: v.optional(v.number()),
  })
    .index("by_householdId", ["householdId"])
    .index("by_userId", ["userId"])
    .index("by_household_user", ["householdId", "userId"]),

  // ─── Chores ──────────────────────────────────────────────────────────────
  chores: defineTable({
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
    isActive: v.boolean(),
    points: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_householdId", ["householdId"]),

  // ─── Chore Assignments ───────────────────────────────────────────────────
  choreAssignments: defineTable({
    choreId: v.id("chores"),
    householdId: v.id("households"),
    assignedTo: v.id("users"),
    dueDate: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("overdue")
    ),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_choreId", ["choreId"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_household_status", ["householdId", "status"])
    .index("by_household_dueDate", ["householdId", "dueDate"]),

  // ─── Bills ───────────────────────────────────────────────────────────────
  bills: defineTable({
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
    createdBy: v.id("users"),
    paidBy: v.optional(v.id("users")),
    splitType: v.union(
      v.literal("equal"),
      v.literal("custom"),
      v.literal("percentage")
    ),
    status: v.union(
      v.literal("unpaid"),
      v.literal("partial"),
      v.literal("paid")
    ),
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_household_status", ["householdId", "status"])
    .index("by_household_dueDate", ["householdId", "dueDate"]),

  // ─── Bill Shares ─────────────────────────────────────────────────────────
  billShares: defineTable({
    billId: v.id("bills"),
    memberId: v.id("users"),
    amountOwed: v.number(),
    amountPaid: v.number(),
    paymentStatus: v.union(
      v.literal("unpaid"),
      v.literal("partial"),
      v.literal("paid")
    ),
    paidAt: v.optional(v.number()),
  })
    .index("by_billId", ["billId"])
    .index("by_memberId", ["memberId"]),

  // ─── Grocery Items ───────────────────────────────────────────────────────
  groceryItems: defineTable({
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
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.union(
      v.literal("needed"),
      v.literal("bought"),
      v.literal("skipped")
    ),
    addedBy: v.id("users"),
    purchasedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_household_status", ["householdId", "status"])
    .index("by_household_category", ["householdId", "category"]),

  // ─── Inventory Items ─────────────────────────────────────────────────────
  inventoryItems: defineTable({
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
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_household_category", ["householdId", "category"]),

  // ─── Receipt Uploads ─────────────────────────────────────────────────────
  receiptUploads: defineTable({
    householdId: v.id("households"),
    uploadedBy: v.id("users"),
    storageId: v.optional(v.string()),
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    extractedItems: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.optional(v.number()),
          unit: v.optional(v.string()),
          price: v.optional(v.number()),
          category: v.optional(v.string()),
        })
      )
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_householdId", ["householdId"]),

  // ─── Insights ────────────────────────────────────────────────────────────
  insights: defineTable({
    householdId: v.id("households"),
    type: v.union(
      v.literal("grocery_forecast"),
      v.literal("chore_pattern"),
      v.literal("spending_summary"),
      v.literal("habit_observation"),
      v.literal("low_stock"),
      v.literal("bill_alert"),
      v.literal("chore_imbalance"),
      v.literal("general")
    ),
    title: v.string(),
    description: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    isRead: v.boolean(),
    generatedAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_household_isRead", ["householdId", "isRead"])
    .index("by_household_generatedAt", ["householdId", "generatedAt"]),

  // ─── Notifications ───────────────────────────────────────────────────────
  notifications: defineTable({
    householdId: v.id("households"),
    userId: v.optional(v.id("users")),
    type: v.union(
      v.literal("chore_due"),
      v.literal("chore_overdue"),
      v.literal("bill_due"),
      v.literal("bill_overdue"),
      v.literal("low_stock"),
      v.literal("member_joined"),
      v.literal("chore_completed"),
      v.literal("general")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedEntityId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_user_isRead", ["userId", "isRead"])
    .index("by_householdId", ["householdId"]),

  // ─── Activity Log ────────────────────────────────────────────────────────
  activityLog: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.union(
      v.literal("chore"),
      v.literal("bill"),
      v.literal("grocery"),
      v.literal("inventory"),
      v.literal("household"),
      v.literal("member"),
      v.literal("receipt")
    ),
    entityId: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
  }).index("by_householdId", ["householdId"]),
});
