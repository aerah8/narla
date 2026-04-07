"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Copy, Check, RefreshCw, UserMinus, Home, Users, Settings,
  Cpu, Wifi, Scale, Crown
} from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function HouseholdPage() {
  const { household, householdId, members, currentUser, isOwner } = useHousehold();
  const { success, error } = useToast();
  const [copied, setCopied] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const generateNewInviteCode = useMutation(api.households.generateNewInviteCode);
  const removeMember = useMutation(api.households.removeMember);
  const updatePreferences = useMutation(api.households.updateHouseholdPreferences);

  const [prefs, setPrefs] = useState({
    cleaningFrequency: household?.preferences?.cleaningFrequency ?? "weekly",
    shoppingStyle: household?.preferences?.shoppingStyle ?? "as-needed",
    reminderStyle: household?.preferences?.reminderStyle ?? "gentle",
    dietaryPreferences: household?.preferences?.dietaryPreferences ?? [],
  });

  const copyInviteCode = () => {
    if (!household) return;
    navigator.clipboard.writeText(household.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!householdId) return;
    try {
      const newCode = await generateNewInviteCode({ householdId });
      success(`New invite code: ${newCode}`);
    } catch (e) {
      error(String(e));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!householdId) return;
    setRemoving(userId);
    try {
      await removeMember({ householdId, userId: userId as any });
      success("Member removed.");
    } catch (e) {
      error(String(e));
    } finally {
      setRemoving(null);
    }
  };

  const handleSavePreferences = async () => {
    if (!householdId) return;
    try {
      await updatePreferences({
        householdId,
        preferences: prefs as any,
      });
      success("Preferences saved!");
      setShowPrefsModal(false);
    } catch (e) {
      error(String(e));
    }
  };

  if (!household) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Household</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your shared living space.</p>
      </div>

      {/* Household profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">{household.name}</h2>
              {household.nickName && (
                <p className="text-slate-500 text-sm">{household.nickName}</p>
              )}
            </div>
          </div>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              icon={Settings}
              onClick={() => setShowPrefsModal(true)}
            >
              Edit Preferences
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <p className="text-xl font-bold text-slate-900">{members.length}</p>
            <p className="text-xs text-slate-500">Members</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <p className="text-xl font-bold text-slate-900">
              {household.monthlyBudget ? `$${household.monthlyBudget}` : "—"}
            </p>
            <p className="text-xs text-slate-500">Monthly Budget</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <p className="text-xl font-bold text-slate-900 capitalize">
              {household.preferences?.cleaningFrequency ?? "—"}
            </p>
            <p className="text-xs text-slate-500">Cleaning</p>
          </div>
        </div>

        {/* Invite code */}
        <div className="bg-indigo-50 rounded-xl p-4">
          <p className="text-xs font-medium text-indigo-600 mb-2">Household Invite Code</p>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-2xl text-indigo-900 tracking-widest flex-1">
              {household.inviteCode}
            </span>
            <button
              onClick={copyInviteCode}
              className="p-2 rounded-lg hover:bg-indigo-100 transition-colors"
              title="Copy code"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-indigo-600" />
              )}
            </button>
            {isOwner && (
              <button
                onClick={handleRegenerateCode}
                className="p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                title="Generate new code"
              >
                <RefreshCw className="w-4 h-4 text-indigo-600" />
              </button>
            )}
          </div>
          <p className="text-xs text-indigo-500 mt-1">
            Share this code with roommates to invite them.
          </p>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900">Members</h2>
          <Badge variant="default" size="sm">{members.length}</Badge>
        </div>

        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m._id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {m.user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.user.avatarUrl} alt={m.user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-700 font-bold text-sm">
                    {m.user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{m.user?.name}</span>
                  {m.role === "owner" && (
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <Badge
                    variant={m.role === "owner" ? "primary" : "default"}
                    size="sm"
                  >
                    {m.role}
                  </Badge>
                  {m.userId === currentUser?._id && (
                    <Badge variant="outline" size="sm">You</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Joined {formatDate(m.joinedAt)}
                </p>
              </div>
              {isOwner && m.role !== "owner" && m.userId !== currentUser?._id && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={UserMinus}
                  isLoading={removing === m.userId}
                  onClick={() => handleRemoveMember(m.userId)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Smart Apartment Integration placeholder */}
      <div className="bg-slate-900/60 dark:bg-white/5 rounded-2xl border border-dashed border-slate-600/50 dark:border-white/15 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-slate-700/50 dark:bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-slate-300 dark:text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-100 dark:text-slate-300">Smart Apartment Integration</h3>
              <Badge variant="default" size="sm">Coming Soon</Badge>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Connect smart hardware to automate your household tracking. NARLA is architected to support future device integrations.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Scale, label: "Smart Pantry Sensors" },
                { icon: Cpu, label: "Raspberry Pi Integration" },
                { icon: Wifi, label: "Smart Fridge Tracking" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 dark:bg-white/5 rounded-full text-xs text-slate-400 border border-white/10"
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      <Modal isOpen={showPrefsModal} onClose={() => setShowPrefsModal(false)} title="Household Preferences">
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cleaning Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {["daily", "weekly", "biweekly", "monthly"].map((f) => (
                <button
                  key={f}
                  onClick={() => setPrefs((p) => ({ ...p, cleaningFrequency: f as any }))}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border capitalize transition",
                    prefs.cleaningFrequency === f
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Shopping Style</label>
            <div className="grid grid-cols-3 gap-2">
              {["bulk", "as-needed", "mixed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setPrefs((p) => ({ ...p, shoppingStyle: s as any }))}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border capitalize transition",
                    prefs.shoppingStyle === s
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reminder Style</label>
            <div className="grid grid-cols-3 gap-2">
              {["gentle", "aggressive", "minimal"].map((s) => (
                <button
                  key={s}
                  onClick={() => setPrefs((p) => ({ ...p, reminderStyle: s as any }))}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border capitalize transition",
                    prefs.reminderStyle === s
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowPrefsModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSavePreferences} className="flex-1">Save Preferences</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
