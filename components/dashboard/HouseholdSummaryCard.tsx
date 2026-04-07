"use client";

import { useState } from "react";
import { Copy, Check, Users } from "lucide-react";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatCurrency } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-orange-400",
  "bg-pink-400",
  "bg-purple-400",
  "bg-teal-400",
  "bg-amber-400",
  "bg-blue-400",
];

export function HouseholdSummaryCard() {
  const { household, members, householdId } = useHousehold();
  const [copied, setCopied] = useState(false);

  const bills = useQuery(
    api.bills.getBillsWithShares,
    householdId ? { householdId } : "skip"
  );

  const totalOwed =
    bills
      ?.filter((b: any) => b.status !== "paid")
      .reduce((sum: number, b: any) => sum + b.totalAmount, 0) ?? 0;

  if (!household) return null;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(household.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl p-6 text-white bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-[#1a1015] dark:to-[#20152a] border border-transparent dark:border-white/10 relative overflow-hidden">
      {/* Top row: title + avatars */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-1">Your Household</h2>
          <p className="text-white/60 text-sm">
            {members.length} member{members.length !== 1 ? "s" : ""}
            {household.nickName ? ` • ${household.nickName}` : ""}
          </p>
        </div>
        <div className="flex -space-x-2.5">
          {members.slice(0, 5).map((m: any, idx: number) => (
            <div
              key={m._id}
              className={`w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}
              title={m.user?.name}
            >
              {m.user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.user.avatarUrl}
                  alt={m.user.name ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-sm font-bold">
                  {m.user?.name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-white/50 text-xs font-medium tracking-widest uppercase mb-2">
            Total Owed
          </p>
          <p className="text-5xl font-bold tracking-tight">
            {formatCurrency(totalOwed)}
          </p>
          <p className="text-white/50 text-sm mt-1.5">in expenses</p>
        </div>
        {household.monthlyBudget ? (
          <div>
            <p className="text-white/50 text-xs font-medium tracking-widest uppercase mb-2">
              Monthly Budget
            </p>
            <p className="text-5xl font-bold tracking-tight">
              {formatCurrency(household.monthlyBudget)}
            </p>
            <p className="text-white/50 text-sm mt-1.5">per month</p>
          </div>
        ) : null}
      </div>

      {/* Invite code */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-white/40" />
          <span className="text-white/40 text-xs">Invite code:</span>
          <span className="font-mono font-bold text-white/70 text-sm tracking-widest">
            {household.inviteCode}
          </span>
        </div>
        <button
          onClick={copyInviteCode}
          className="text-white/40 hover:text-white/80 transition-colors"
          title="Copy invite code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
