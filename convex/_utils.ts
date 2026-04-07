import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Gets the current authenticated user's Convex record.
 * Throws if not authenticated.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) {
    throw new Error("User not found. Please complete onboarding.");
  }
  return user;
}

/**
 * Verifies the current user is a member of the given household.
 * Returns the membership record. Throws if not a member.
 */
export async function assertHouseholdMember(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">
) {
  const user = await getCurrentUser(ctx);
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_user", (q) =>
      q.eq("householdId", householdId).eq("userId", user._id)
    )
    .unique();
  if (!membership) {
    throw new Error("Access denied: not a member of this household.");
  }
  return { user, membership };
}

/**
 * Verifies the current user is the owner of the given household.
 * Returns the membership record. Throws if not owner.
 */
export async function assertHouseholdOwner(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">
) {
  const { user, membership } = await assertHouseholdMember(ctx, householdId);
  if (membership.role !== "owner") {
    throw new Error("Access denied: only the household owner can do this.");
  }
  return { user, membership };
}
