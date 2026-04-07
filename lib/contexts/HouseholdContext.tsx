"use client";

import { createContext, useContext } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";

interface HouseholdMemberWithUser {
  _id: Id<"householdMembers">;
  householdId: Id<"households">;
  userId: Id<"users">;
  role: "owner" | "member";
  joinedAt: number;
  user: Doc<"users"> | null;
}

interface HouseholdContextValue {
  household: Doc<"households"> | null;
  householdId: Id<"households"> | null;
  members: HouseholdMemberWithUser[];
  currentUser: Doc<"users"> | null;
  isOwner: boolean;
}

export const HouseholdContext = createContext<HouseholdContextValue>({
  household: null,
  householdId: null,
  members: [],
  currentUser: null,
  isOwner: false,
});

export function useHousehold() {
  return useContext(HouseholdContext);
}
