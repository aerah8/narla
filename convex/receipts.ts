import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createReceiptRecord = mutation({
  args: {
    householdId: v.id("households"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("receiptUploads", {
      householdId: args.householdId,
      uploadedBy: user._id,
      storageId: args.storageId,
      processingStatus: "pending",
      createdAt: Date.now(),
    });
  },
});

export const processReceipt = action({
  args: {
    receiptId: v.id("receiptUploads"),
    storageId: v.string(),
  },
  handler: async (ctx, args): Promise<Array<{
    name: string;
    quantity?: number;
    unit?: string;
    price?: number;
    category?: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Update status to processing
    await ctx.runMutation(api.receipts.updateReceiptStatus, {
      receiptId: args.receiptId,
      status: "processing",
    });

    try {
      // Fetch image from Convex storage
      const imageUrl = await ctx.storage.getUrl(args.storageId);
      if (!imageUrl) throw new Error("Could not retrieve image URL");

      // Fetch the image as base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const bytes = new Uint8Array(imageBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Image = btoa(binary);
      const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";

      // Call Claude Vision
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: contentType,
                    data: base64Image,
                  },
                },
                {
                  type: "text",
                  text: `You are a grocery receipt parser. Extract all purchased items from this receipt image.
Return ONLY a valid JSON array with no other text, markdown, or explanation:
[{"name":"string","quantity":number,"unit":"string","price":number,"category":"produce|dairy|meat|pantry|frozen|beverages|household|personal_care|snacks|other"}]
- Use sensible category values from the allowed list
- quantity should be a number (default 1 if not shown)
- unit should be "each", "lb", "oz", "kg", "L", "ml", "pack", or similar
- price should be the item price as a number
- If you cannot confidently read an item, skip it
Return only the JSON array.`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
      }

      const data = await response.json() as { content: Array<{ type: string; text: string }> };
      const text = data.content[0]?.text ?? "[]";

      // Parse JSON, handle markdown code blocks
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const extractedItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      // Store extracted items
      await ctx.runMutation(api.receipts.updateReceiptStatus, {
        receiptId: args.receiptId,
        status: "completed",
        extractedItems,
      });

      return extractedItems;
    } catch (error) {
      await ctx.runMutation(api.receipts.updateReceiptStatus, {
        receiptId: args.receiptId,
        status: "failed",
        errorMessage: String(error),
      });
      throw error;
    }
  },
});

export const updateReceiptStatus = mutation({
  args: {
    receiptId: v.id("receiptUploads"),
    status: v.union(
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.receiptId, {
      processingStatus: args.status,
      extractedItems: args.extractedItems,
      errorMessage: args.errorMessage,
    });
  },
});

export const getReceiptsForHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("receiptUploads")
      .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
      .order("desc")
      .take(20);
  },
});
