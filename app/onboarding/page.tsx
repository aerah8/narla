"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Home, Users, ArrowRight, ArrowLeft, Plus, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Step = "welcome" | "create" | "join";

const dietaryOptions = [
  "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher", "None"
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState<Step>("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    nickName: "",
    memberCount: "2",
    monthlyBudget: "",
    cleaningFrequency: "weekly" as "daily" | "weekly" | "biweekly" | "monthly",
    dietaryPreferences: [] as string[],
    shoppingStyle: "as-needed" as "bulk" | "as-needed" | "mixed",
    reminderStyle: "gentle" as "aggressive" | "gentle" | "minimal",
  });

  // Join form state
  const [inviteCode, setInviteCode] = useState("");

  const upsertUser = useMutation(api.users.upsertUser);
  const createHousehold = useMutation(api.households.createHousehold);
  const joinHousehold = useMutation(api.households.joinHousehold);
  const existingHousehold = useQuery(api.households.getHouseholdForUser);

  // Sync Clerk user to Convex — onboarding is outside (app)/ so we do it here too
  useEffect(() => {
    if (user) {
      upsertUser({
        name: user.fullName ?? user.firstName ?? "User",
        email: user.primaryEmailAddress?.emailAddress ?? "",
        avatarUrl: user.imageUrl ?? undefined,
      }).catch(console.error);
    }
  }, [user, upsertUser]);

  // If user already has a household, redirect (must be in useEffect, not render body)
  useEffect(() => {
    if (existingHousehold) {
      router.push("/dashboard");
    }
  }, [existingHousehold, router]);

  // While loading or redirecting, show nothing
  if (existingHousehold === undefined || existingHousehold) return null;

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setError("Please enter a household name.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await createHousehold({
        name: createForm.name.trim(),
        nickName: createForm.nickName.trim() || undefined,
        memberCount: parseInt(createForm.memberCount) || 2,
        monthlyBudget: createForm.monthlyBudget
          ? parseFloat(createForm.monthlyBudget)
          : undefined,
        preferences: {
          cleaningFrequency: createForm.cleaningFrequency,
          dietaryPreferences: createForm.dietaryPreferences,
          shoppingStyle: createForm.shoppingStyle,
          reminderStyle: createForm.reminderStyle,
        },
      });
      router.push("/dashboard");
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await joinHousehold({ inviteCode: inviteCode.trim() });
      router.push("/dashboard");
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDiet = (option: string) => {
    setCreateForm((f) => ({
      ...f,
      dietaryPreferences: f.dietaryPreferences.includes(option)
        ? f.dietaryPreferences.filter((d) => d !== option)
        : [...f.dietaryPreferences, option],
    }));
  };

  return (
    <main className="flex items-start justify-center px-4 pb-16 pt-8">
      <div className="w-full max-w-lg">
        {/* Welcome Step */}
        {step === "welcome" && (
          <div className="text-center">
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <Image src="/narla-logo.png" alt="narla" width={200} height={100} className="w-auto" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome to narla
              </h1>
              <p className="text-slate-500 text-lg">
                Your AI-powered apartment co-pilot.
                <br />
                Let&apos;s get your household set up.
              </p>
            </div>

            <div className="grid gap-4 mb-6">
              <button
                onClick={() => setStep("create")}
                className="group flex items-start gap-4 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-300 dark:hover:border-pink-500/50 hover:shadow-md transition-all text-left"
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-pink-500/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-pink-500/25 transition-colors">
                  <Plus className="w-6 h-6 text-indigo-600 dark:text-pink-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 text-lg mb-1">
                    Create a new household
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Set up your apartment and invite roommates to join.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 mt-1 flex-shrink-0 transition-colors ml-auto" />
              </button>

              <button
                onClick={() => setStep("join")}
                className="group flex items-start gap-4 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-indigo-300 dark:hover:border-pink-500/50 hover:shadow-md transition-all text-left"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-pink-500/15 transition-colors">
                  <Users className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-pink-400 transition-colors" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 text-lg mb-1">
                    Join an existing household
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Enter an invite code from your roommate.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 mt-1 flex-shrink-0 transition-colors ml-auto" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Hi, {user?.firstName ?? "there"}! Let&apos;s find your apartment home.
            </p>
          </div>
        )}

        {/* Create Household Step */}
        {step === "create" && (
          <div>
            <button
              onClick={() => { setStep("welcome"); setError(""); }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Create your household
              </h1>
              <p className="text-slate-500">Tell us a bit about your place.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              {/* Household Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Household name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. The Loft, 42 Oak Ave"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                />
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nickname <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={createForm.nickName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nickName: e.target.value }))}
                  placeholder="e.g. Our Place, The Den"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                />
              </div>

              {/* Size + Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Expected members
                  </label>
                  <select
                    value={createForm.memberCount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, memberCount: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition bg-white"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n} people</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Monthly budget <span className="text-slate-400 font-normal">(USD)</span>
                  </label>
                  <input
                    type="number"
                    value={createForm.monthlyBudget}
                    onChange={(e) => setCreateForm((f) => ({ ...f, monthlyBudget: e.target.value }))}
                    placeholder="e.g. 2400"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
                  />
                </div>
              </div>

              {/* Cleaning Frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cleaning frequency
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["daily", "weekly", "biweekly", "monthly"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCreateForm((form) => ({ ...form, cleaningFrequency: f }))}
                      className={cn(
                        "py-2 rounded-lg text-xs font-medium capitalize border transition",
                        createForm.cleaningFrequency === f
                          ? "bg-indigo-600 text-white border-indigo-600 dark:bg-pink-600 dark:border-pink-600"
                          : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300 dark:hover:border-pink-500/50"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Preferences */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Dietary preferences <span className="text-slate-400 font-normal">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleDiet(opt)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                        createForm.dietaryPreferences.includes(opt)
                          ? "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/40"
                          : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300 dark:hover:border-pink-500/40"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reminder Style */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reminder style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "gentle", label: "Gentle", desc: "Light nudges" },
                    { value: "aggressive", label: "Aggressive", desc: "Strong reminders" },
                    { value: "minimal", label: "Minimal", desc: "Only essentials" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() =>
                        setCreateForm((f) => ({ ...f, reminderStyle: s.value as "aggressive" | "gentle" | "minimal" }))
                      }
                      className={cn(
                        "p-3 rounded-lg border text-left transition",
                        createForm.reminderStyle === s.value
                          ? "bg-indigo-50 border-indigo-300 dark:bg-pink-500/15 dark:border-pink-500/40"
                          : "bg-white border-slate-200 hover:border-indigo-200 dark:hover:border-pink-500/30"
                      )}
                    >
                      <div className="text-xs font-medium text-slate-800">{s.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-700 disabled:opacity-60 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isLoading ? "Creating..." : "Create Household"}
              </button>
            </div>
          </div>
        )}

        {/* Join Household Step */}
        {step === "join" && (
          <div>
            <button
              onClick={() => { setStep("welcome"); setError(""); }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Join a household
              </h1>
              <p className="text-slate-500">
                Enter the 8-character invite code from your roommate.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Invite code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCD1234"
                  maxLength={8}
                  className="w-full px-3 py-3 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-xl font-mono uppercase tracking-widest text-center transition"
                />
                <p className="text-xs text-slate-400 mt-1.5 text-center">
                  Codes are case-insensitive
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                onClick={handleJoin}
                disabled={isLoading || inviteCode.length < 6}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-700 disabled:opacity-60 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Home className="w-4 h-4" />
                )}
                {isLoading ? "Joining..." : "Join Household"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
