"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TopNav } from "@/components/layout/TopNav";
import { HouseholdContext } from "@/lib/contexts/HouseholdContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const upsertUser = useMutation(api.users.upsertUser);
  const household = useQuery(api.households.getHouseholdForUser);
  const currentUser = useQuery(api.users.getMe);
  const members = useQuery(
    api.households.getHouseholdMembers,
    household ? { householdId: household._id } : "skip"
  );

  useEffect(() => {
    if (isLoaded && user) {
      upsertUser({
        name: user.fullName ?? user.firstName ?? "User",
        email: user.primaryEmailAddress?.emailAddress ?? "",
        avatarUrl: user.imageUrl ?? undefined,
      }).catch(console.error);
    }
  }, [isLoaded, user, upsertUser]);

  useEffect(() => {
    if (household === null) {
      router.push("/onboarding");
    }
  }, [household, router]);

  if (!isLoaded || household === undefined || household === null || currentUser === undefined) {
    return (
      <div className="flex flex-col h-screen">
        <div className="h-14 border-b border-white/10" />
        <main className="flex-1 overflow-y-auto p-6">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  const isOwner =
    currentUser !== null &&
    household !== null &&
    household?.ownerId === currentUser?._id;

  return (
    <ToastProvider>
      <HouseholdContext.Provider
        value={{
          household: household ?? null,
          householdId: household?._id ?? null,
          members: (members ?? []) as any,
          currentUser: currentUser ?? null,
          isOwner,
        }}
      >
        <div className="flex flex-col min-h-screen">
          <AnimatedBackground />
          <TopNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </HouseholdContext.Provider>
    </ToastProvider>
  );
}
